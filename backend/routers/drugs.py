from fastapi import APIRouter
import httpx

router = APIRouter()

@router.get("/search")
async def search_drugs(query: str):
    """
    Search for drugs by name using RxNorm API.
    Returns a list of matching drug names and their RxCUI identifiers.
    """
    url = f"https://rxnav.nlm.nih.gov/REST/drugs.json?name={query}"
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        data = response.json()

    results = []
    concept_group = data.get("drugGroup", {}).get("conceptGroup", [])
    for group in concept_group:
        concepts = group.get("conceptProperties", [])
        for concept in concepts:
            results.append({
                "name": concept.get("name"),
                "rxcui": concept.get("rxcui")
            })

    return {"results": results}