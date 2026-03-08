from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from routers import drugs, interactions, graph
import os

load_dotenv()

app = FastAPI(title="Drug Interaction Analyzer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://*.vercel.app",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(drugs.router, prefix="/api/drugs", tags=["drugs"])
app.include_router(interactions.router, prefix="/api/interactions", tags=["interactions"])
app.include_router(graph.router, prefix="/api/graph", tags=["graph"])

@app.get("/")
def health_check():
    return {"status": "ok", "message": "Drug Interaction Analyzer API is running"}