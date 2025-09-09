from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
from datetime import datetime
from enum import Enum


class JobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class AnalysisResponse(BaseModel):
    job_id: str
    status: JobStatus
    message: str
    file_info: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class AnalysisJob(BaseModel):
    job_id: str
    status: JobStatus
    progress: float = Field(ge=0.0, le=100.0)
    message: Optional[str] = None
    results: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    created_at: datetime
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None