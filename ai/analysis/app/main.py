from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings

app = FastAPI(
    title="Financial Analysis Service",
    version="1.0.0",
    description="CSV-based financial data analysis"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/ai")


@app.get("/")
async def root():
    return {
        "service": "Financial Analysis",
        "version": "1.0.0",
        "endpoint": "/ai/analysis - POST CSV file for analysis"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "analysis"}