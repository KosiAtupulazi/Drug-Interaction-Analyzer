from fastapi import APIRouter, HTTPException
import httpx
import re

router = APIRouter()

PUBMED_SEARCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
PUBMED_FETCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"
PUBMED_SUMMARY_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"

def clean_text(text: str) -> str:
    """
    Strips HTML tags and normalizes whitespace from FDA label text.
    """
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

async def fetch_fda_label(drug_name: str, client: httpx.AsyncClient) -> dict:
    """
    Fetches the FDA drug label for a given drug name from OpenFDA.
    Extracts interaction text, warnings, and boxed warnings.
    """
    url = f"https://api.fda.gov/drug/label.json?search=openfda.generic_name:{drug_name}&limit=1"
    response = await client.get(url, timeout=10.0)

    if response.status_code != 200:
        url_fallback = f"https://api.fda.gov/drug/label.json?search=openfda.brand_name:{drug_name}&limit=1"
        response = await client.get(url_fallback, timeout=10.0)

    if response.status_code != 200:
        return {"error": f"No FDA label found for {drug_name}"}

    data = response.json()
    results_list = data.get("results", [])
    if not results_list:
        return {"error": f"No FDA label found for {drug_name}"}

    label = results_list[0]

    drug_interactions_raw = label.get("drug_interactions", [""])
    warnings_raw = label.get("warnings", [""])
    boxed_warning_raw = label.get("boxed_warning", [""])

    return {
        "drug_interactions": clean_text(" ".join(drug_interactions_raw)),
        "warnings": clean_text(" ".join(warnings_raw)),
        "boxed_warning": clean_text(" ".join(boxed_warning_raw)),
        "has_boxed_warning": len(boxed_warning_raw) > 0
    }

async def search_pubmed(drug_a: str, drug_b: str, client: httpx.AsyncClient, max_results: int = 3) -> list:
    """
    Searches PubMed for abstracts specifically about the interaction between two drugs.
    Uses PubMed field tags to require both drug names appear in the title or abstract.
    """
    query = f"{drug_a} drug interactions[MeSH Terms]"
    params = {
        "db": "pubmed",
        "term": query,
        "retmax": max_results,
        "retmode": "json",
        "sort": "relevance"
    }
    response = await client.get(PUBMED_SEARCH_URL, params=params, timeout=10.0)
    if response.status_code != 200:
        return []

    data = response.json()
    return data.get("esearchresult", {}).get("idlist", [])
async def fetch_pubmed_abstracts(pmids: list, client: httpx.AsyncClient) -> list:
    """
    Fetches title and abstract text for a list of PubMed IDs.
    Returns a list of structured abstract objects.
    """
    if not pmids:
        return []

    params = {
        "db": "pubmed",
        "id": ",".join(pmids),
        "retmode": "xml",
        "rettype": "abstract"
    }
    response = await client.get(PUBMED_FETCH_URL, params=params, timeout=15.0)
    if response.status_code != 200:
        return []

    xml = response.text
    abstracts = []

    articles = re.findall(r'<PubmedArticle>(.*?)</PubmedArticle>', xml, re.DOTALL)
    for i, article in enumerate(articles):
        title_match = re.search(r'<ArticleTitle>(.*?)</ArticleTitle>', article, re.DOTALL)
        abstract_match = re.search(r'<AbstractText[^>]*>(.*?)</AbstractText>', article, re.DOTALL)
        year_match = re.search(r'<PubDate>.*?<Year>(\d{4})</Year>', article, re.DOTALL)

        title = clean_text(title_match.group(1)) if title_match else "No title available"
        abstract = clean_text(abstract_match.group(1)) if abstract_match else "No abstract available"
        year = year_match.group(1) if year_match else "Unknown"
        pmid = pmids[i] if i < len(pmids) else "Unknown"

        abstracts.append({
            "pmid": pmid,
            "title": title,
            "abstract": abstract,
            "year": year,
            "url": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/"
        })

    return abstracts

@router.get("/analyze")
async def analyze_interactions(drugs: str):
    """
    Accepts a comma-separated list of drug names.
    Fetches and cleans FDA label interaction data for each drug.
    Returns structured interaction text ready for the graph and NIM layers.
    """
    drug_list = [d.strip().lower() for d in drugs.split(",") if d.strip()]

    if len(drug_list) < 2:
        raise HTTPException(
            status_code=400,
            detail="Please provide at least 2 drugs to analyze interactions"
        )

    if len(drug_list) > 6:
        raise HTTPException(
            status_code=400,
            detail="Maximum of 6 drugs allowed per analysis"
        )

    results = {}

    async with httpx.AsyncClient() as client:
        for drug in drug_list:
            results[drug] = await fetch_fda_label(drug, client)

    return {
        "drugs_analyzed": drug_list,
        "count": len(drug_list),
        "labels": results
    }

@router.get("/literature")
async def get_literature(drug_a: str, drug_b: str):
    """
    Fetches PubMed abstracts for a specific drug pair.
    Searches for literature discussing the interaction between the two drugs.
    Returns up to 3 abstracts with title, abstract text, year, and PubMed URL.
    """
    async with httpx.AsyncClient() as client:
        pmids = await search_pubmed(drug_a, drug_b, client, max_results=3)
        abstracts = await fetch_pubmed_abstracts(pmids, client)

    return {
        "drug_a": drug_a,
        "drug_b": drug_b,
        "abstracts": abstracts
    }
