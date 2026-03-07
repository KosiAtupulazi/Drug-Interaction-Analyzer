from fastapi import APIRouter

router = APIRouter()

@router.get("/build")
async def build_graph(drugs: str):
    """
    Placeholder for the knowledge graph builder.
    Will be fully implemented on Day 3.
    """
    return {"message": "Graph builder coming on Day 3", "drugs": drugs.split(",")}