from fastapi import APIRouter

from app.api.endpoints import data

api_router = APIRouter()

# New data analysis endpoints only
api_router.include_router(data.router, prefix="/data", tags=["Data Analysis"])