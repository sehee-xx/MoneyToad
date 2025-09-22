from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.api.router import api_router
from app.core.config import settings
from app.models.database import init_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup"""
    logger.info("Initializing database...")
    await init_db()
    logger.info("Database initialized")
    yield
    logger.info("Shutting down...")


app = FastAPI(
    title="Data Analysis Service",
    version="1.0.0",
    description="Financial data analysis with Prophet forecasting",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan
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
            "start_analysis": "POST /ai/data",
            "get_predictions": "GET /ai/data/leak",
            "get_baseline": "GET /ai/data/baseline"
        }
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "analysis"}