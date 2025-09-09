from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


class BaseResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    timestamp: datetime = datetime.utcnow()


class ErrorResponse(BaseResponse):
    success: bool = False
    error_code: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


class DataInput(BaseModel):
    data: Dict[str, Any]
    metadata: Optional[Dict[str, Any]] = None


class ModelInfo(BaseModel):
    model_id: str
    model_type: str
    version: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    metrics: Optional[Dict[str, float]] = None