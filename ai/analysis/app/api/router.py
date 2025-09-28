from fastapi import APIRouter
from fastapi.security import HTTPBearer

from app.api.endpoints import data, merchant_messages

# Create HTTPBearer instance for Swagger UI
bearer_scheme = HTTPBearer()

api_router = APIRouter()

# New data analysis endpoints only
api_router.include_router(data.router, prefix="/data", tags=["Data Analysis"])

# Merchant messages endpoints
api_router.include_router(merchant_messages.router, prefix="/merchant-messages", tags=["Merchant Messages"])