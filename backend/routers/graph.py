from fastapi import APIRouter, HTTPException
import httpx
import networkx as nx
import re
from nim_client import explain_interaction, generate_summary

router = APIRouter()

SEVERITY_PATTERNS = {
    "contraindicated": [
        "contraindicated", "must not", "should not be used", "do not use"
    ],
    "major": [
        "serious", "severe", "life-threatening", "fatal", "major",
        "significant risk", "bleeding risk", "hemorrhage", "toxic"
    ],
    "moderate": [
        "monitor", "caution", "moderate", "may increase", "may decrease",
        "closely monitor", "adjust dose"
    ],
    "minor": [
        "minor", "minimal", "unlikely", "small risk"
    ]
}

PUBMED_SEARCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
PUBMED_FETCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"

def clean_text(text: str) -> str:
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def detect_severity(text: str) -> str:
    text_lower = text.lower()
    for level in ["contraindicated", "major", "moderate", "minor"]:
        for keyword in SEVERITY_PATTERNS[level]:
            if keyword in text_lower:
                return level
    return "moderate"

def extract_mechanism(text: str, drug_a: str, drug_b: str) -> str:
    sentences = re.split(r'(?<=[.!?])\s+', text)
    relevant = []
    keywords = [
        drug_a.lower(), drug_b.lower(),
        "cyp", "enzyme", "inhibit", "induc", "binding",
        "metabolism", "clearance", "plasma", "anticoagul",
        "bleeding", "platelet", "serotonin", "renal", "hepatic"
    ]
    for sentence in sentences:
        sentence_lower = sentence.lower()
        if any(kw in sentence_lower for kw in keywords):
            relevant.append(sentence.strip())
    if not relevant:
        return text[:500]
    return " ".join(relevant[:5])

def build_drug_graph(drug_labels: dict) -> nx.Graph:
    G = nx.Graph()
    drug_names = list(drug_labels.keys())
    for drug in drug_names:
        label = drug_labels[drug]
        has_error = "error" in label
        G.add_node(drug,
            type="drug",
            has_data=not has_error,
            has_boxed_warning=label.get("has_boxed_warning", False)
        )
    for i in range(len(drug_names)):
        for j in range(i + 1, len(drug_names)):
            drug_a = drug_names[i]
            drug_b = drug_names[j]
            label_a = drug_labels.get(drug_a, {})
            label_b = drug_labels.get(drug_b, {})
            interaction_text_a = label_a.get("drug_interactions", "")
            interaction_text_b = label_b.get("drug_interactions", "")
            a_mentions_b = drug_b.lower() in interaction_text_a.lower()
            b_mentions_a = drug_a.lower() in interaction_text_b.lower()
            if a_mentions_b or b_mentions_a:
                combined_text = interaction_text_a + " " + interaction_text_b
                severity = detect_severity(combined_text)
                mechanism = extract_mechanism(
                    interaction_text_a if a_mentions_b else interaction_text_b,
                    drug_a, drug_b
                )
                G.add_edge(drug_a, drug_b,
                    severity=severity,
                    mechanism=mechanism[:800],
                    confirmed=True,
                    fda_text_a=interaction_text_a,
                    fda_text_b=interaction_text_b
                )
            else:
                G.add_edge(drug_a, drug_b,
                    severity="unknown",
                    mechanism="No direct mention found in FDA label data.",
                    confirmed=False,
                    fda_text_a=interaction_text_a,
                    fda_text_b=interaction_text_b
                )
    return G

async def fetch_pubmed_for_pair(drug_a: str, drug_b: str, client: httpx.AsyncClient) -> list:
    try:
        query = f"{drug_a} drug interactions[MeSH Terms]"
        params = {
            "db": "pubmed",
            "term": query,
            "retmax": 2,
            "retmode": "json",
            "sort": "relevance"
        }
        response = await client.get(PUBMED_SEARCH_URL, params=params, timeout=10.0)
        if response.status_code != 200:
            return []

        data = response.json()
        pmids = data.get("esearchresult", {}).get("idlist", [])
        if not pmids:
            return []

        fetch_params = {
            "db": "pubmed",
            "id": ",".join(pmids),
            "retmode": "xml",
            "rettype": "abstract"
        }
        fetch_response = await client.get(PUBMED_FETCH_URL, params=fetch_params, timeout=15.0)
        if fetch_response.status_code != 200:
            return []

        xml = fetch_response.text
        abstracts = []
        articles = re.findall(r'<PubmedArticle>(.*?)</PubmedArticle>', xml, re.DOTALL)

        for i, article in enumerate(articles):
            title_match = re.search(r'<ArticleTitle>(.*?)</ArticleTitle>', article, re.DOTALL)
            abstract_match = re.search(r'<AbstractText[^>]*>(.*?)</AbstractText>', article, re.DOTALL)
            year_match = re.search(r'<PubDate>.*?<Year>(\d{4})</Year>', article, re.DOTALL)
            title = clean_text(title_match.group(1)) if title_match else "No title"
            abstract = clean_text(abstract_match.group(1)) if abstract_match else "No abstract"
            year = year_match.group(1) if year_match else "Unknown"
            pmid = pmids[i] if i < len(pmids) else "Unknown"
            abstracts.append({
                "pmid": pmid,
                "title": title,
                "abstract": abstract[:400],
                "year": year,
                "url": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/"
            })

        return abstracts
    except Exception:
        return []

@router.get("/build")
async def build_graph(drugs: str):
    drug_list = [d.strip().lower() for d in drugs.split(",") if d.strip()]

    if len(drug_list) < 2:
        raise HTTPException(status_code=400, detail="Please provide at least 2 drugs")
    if len(drug_list) > 6:
        raise HTTPException(status_code=400, detail="Maximum of 6 drugs allowed")

    # Step 1 — fetch FDA labels for all drugs
    drug_labels = {}
    async with httpx.AsyncClient() as client:
        for drug in drug_list:
            try:
                url = f"https://api.fda.gov/drug/label.json?search=openfda.generic_name:{drug}&limit=1"
                response = await client.get(url, timeout=10.0)
                if response.status_code == 200:
                    data = response.json()
                    results_list = data.get("results", [])
                    if results_list:
                        label = results_list[0]
                        raw_interactions = label.get("drug_interactions", [""])
                        raw_boxed = label.get("boxed_warning", [])
                        drug_labels[drug] = {
                            "drug_interactions": clean_text(" ".join(raw_interactions)),
                            "has_boxed_warning": len(raw_boxed) > 0
                        }
                    else:
                        drug_labels[drug] = {"error": "Not found", "drug_interactions": "", "has_boxed_warning": False}
                else:
                    drug_labels[drug] = {"error": "FDA API error", "drug_interactions": "", "has_boxed_warning": False}
            except Exception:
                drug_labels[drug] = {"error": "Request failed", "drug_interactions": "", "has_boxed_warning": False}

    # Step 2 — build the knowledge graph
    G = build_drug_graph(drug_labels)

    # Step 3 — call NIM for each drug pair and fetch PubMed citations
    enriched_interactions = []
    severity_order = ["contraindicated", "major", "moderate", "minor", "unknown"]
    interactions_by_severity = {s: [] for s in severity_order}

    async with httpx.AsyncClient() as client:
        for drug_a, drug_b, edge_data in G.edges(data=True):
            try:
                nim_result = explain_interaction(
                    drug_a,
                    drug_b,
                    edge_data.get("fda_text_a", ""),
                    edge_data.get("fda_text_b", "")
                )
            except Exception:
                nim_result = {
                    "severity": edge_data.get("severity", "unknown"),
                    "interaction_exists": edge_data.get("confirmed", False),
                    "mechanism": edge_data.get("mechanism", ""),
                    "clinical_significance": "",
                    "monitoring": "",
                    "confidence": "low"
                }

            citations = await fetch_pubmed_for_pair(drug_a, drug_b, client)

            interaction = {
                "drug_a": drug_a,
                "drug_b": drug_b,
                "severity": nim_result.get("severity", edge_data.get("severity", "unknown")),
                "interaction_exists": nim_result.get("interaction_exists", edge_data.get("confirmed", False)),
                "mechanism": nim_result.get("mechanism", edge_data.get("mechanism", "")),
                "clinical_significance": nim_result.get("clinical_significance", ""),
                "monitoring": nim_result.get("monitoring", ""),
                "confidence": nim_result.get("confidence", "low"),
                "citations": citations
            }

            enriched_interactions.append(interaction)
            severity = interaction["severity"]
            if severity not in interactions_by_severity:
                severity = "unknown"
            interactions_by_severity[severity].append(interaction)

    # Step 4 — generate overall summary
    try:
        summary = generate_summary(drug_list, enriched_interactions)
    except Exception:
        summary = "Unable to generate summary. Please review individual interactions below."

    # Step 5 — build node and edge lists for the graph visualization
    nodes = []
    for node, data in G.nodes(data=True):
        nodes.append({
            "id": node,
            "type": "drug",
            "has_boxed_warning": data.get("has_boxed_warning", False)
        })

    edges = []
    for interaction in enriched_interactions:
        edges.append({
            "source": interaction["drug_a"],
            "target": interaction["drug_b"],
            "severity": interaction["severity"],
            "confirmed": interaction["interaction_exists"]
        })

    return {
        "drugs": drug_list,
        "summary": summary,
        "nodes": nodes,
        "edges": edges,
        "interactions_by_severity": interactions_by_severity,
        "total_interactions": sum(
            len(v) for k, v in interactions_by_severity.items() if k != "unknown"
        ),
        "drug_count": len(drug_list)
    }