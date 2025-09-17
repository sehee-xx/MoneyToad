from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings

app = FastAPI(
    title="Data Analysis Service",
    version="1.0.0",
    description="Financial data analysis and leak calculation"
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
        "service": "Data Analysis",
        "version": "1.0.0",
        "endpoints": {
            "leak_calculation": "POST /ai/data/",
            "get_leak": "GET /ai/data/leak",
            "trigger_analysis": "POST /ai/data/analyze",
            "get_report": "GET /ai/data/report"
        }
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "analysis"}