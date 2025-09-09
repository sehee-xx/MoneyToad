from fastapi import APIRouter

from app.api.endpoints import health, analysis, prediction

api_router = APIRouter()

api_router.include_router(health.router, tags=["health"])
api_router.include_router(analysis.router, prefix="/analysis", tags=["analysis"])
api_router.include_router(prediction.router, prefix="/prediction", tags=["prediction"])