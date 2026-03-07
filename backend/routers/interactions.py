from fastapi import APIRouter
import httpx

router = APIRouter()

@router.get("/analyze")
async def analyze_interactions(drugs: str):
    """
    Takes a comma-separated list of drug names.
    Fetches FDA label interaction text for each drug from OpenFDA.
    Returns raw interaction text per drug to be processed by the graph layer.
    """
    drug_list = [d.strip() for d in drugs.split(",")]
    results = {}

    async with httpx.AsyncClient() as client:
        for drug in drug_list:
            url = f"https://api.fda.gov/drug/label.json?search=openfda.generic_name:{drug}&limit=1"
            response = await client.get(url)
            if response.status_code == 200:
                data = response.json()
                results_list = data.get("results", [])
                if results_list:
                    label = results_list[0]
                    results[drug] = {
                        "drug_interactions": label.get("drug_interactions", ["No interaction data found"]),
                        "warnings": label.get("warnings", ["No warnings found"]),
                        "boxed_warning": label.get("boxed_warning", [])
                    }
            else:
                results[drug] = {"error": "Drug not found in FDA database"}

    return {"interactions": results}