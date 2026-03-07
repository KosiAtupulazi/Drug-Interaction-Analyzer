from fastapi import APIRouter, HTTPException
import httpx

router = APIRouter()

async def search_by_approximate_term(query: str, client: httpx.AsyncClient) -> list:
    """
    Used for short partial queries (under 4 characters).
    The approximateTerm endpoint handles partial strings and returns
    candidates ranked by relevance score.
    """
    url = f"https://rxnav.nlm.nih.gov/REST/approximateTerm.json?term={query}&maxEntries=8"
    response = await client.get(url, timeout=10.0)
    if response.status_code != 200:
        return []

    data = response.json()
    candidates = data.get("approximateGroup", {}).get("candidate", [])

    results = []
    seen_rxcuis = set()

    for candidate in candidates:
        rxcui = candidate.get("rxcui")
        name = candidate.get("name")
        if rxcui and name and rxcui not in seen_rxcuis:
            seen_rxcuis.add(rxcui)
            results.append({
                "name": name.capitalize(),
                "rxcui": rxcui
            })

    return results

async def search_by_spelling(query: str, client: httpx.AsyncClient) -> list:
    """
    Used for longer or misspelled queries (4 or more characters).
    The spellingsuggestions endpoint corrects typos and returns
    complete drug name matches.
    """
    url = f"https://rxnav.nlm.nih.gov/REST/spellingsuggestions.json?name={query}"
    response = await client.get(url, timeout=10.0)
    if response.status_code != 200:
        return []

    data = response.json()
    suggestion_list = data.get("suggestionGroup", {}).get("suggestionList", {})
    suggestions = suggestion_list.get("suggestion", []) if suggestion_list else []

    if not suggestions:
        suggestions = [query]

    results = []
    seen_names = set()

    for suggestion in suggestions[:5]:
        rxcui_url = f"https://rxnav.nlm.nih.gov/REST/rxcui.json?name={suggestion}&search=1"
        rxcui_response = await client.get(rxcui_url, timeout=10.0)
        if rxcui_response.status_code != 200:
            continue

        rxcui_data = rxcui_response.json()
        rxcui_list = rxcui_data.get("idGroup", {}).get("rxnormId", [])

        if rxcui_list and suggestion.lower() not in seen_names:
            seen_names.add(suggestion.lower())
            results.append({
                "name": suggestion.capitalize(),
                "rxcui": rxcui_list[0]
            })

    return results

@router.get("/search")
async def search_drugs(query: str):
    """
    Search for drugs by name using RxNorm.
    Uses approximateTerm for short partial queries and
    spellingsuggestions for longer or misspelled queries.
    Returns one clean result per unique drug with its RxCUI.
    """
    if not query or len(query) < 4:
        return {"results": []}

    async with httpx.AsyncClient() as client:
        results = await search_by_spelling(query, client)
    return {"results": results}


@router.get("/details")
async def get_drug_details(rxcui: str):
    """
    Get details for a specific drug by its RxCUI.
    Returns the drug name, RxCUI, and related properties.
    """
    url = f"https://rxnav.nlm.nih.gov/REST/rxcui/{rxcui}/properties.json"

    async with httpx.AsyncClient() as client:
        response = await client.get(url, timeout=10.0)
        if response.status_code != 200:
            raise HTTPException(status_code=404, detail="Drug not found")
        data = response.json()

    properties = data.get("properties", {})
    return {
        "rxcui": rxcui,
        "name": properties.get("name"),
        "synonym": properties.get("synonym"),
        "drug_class": properties.get("tty")
    }
