from fastapi import APIRouter, HTTPException, Query, BackgroundTasks, Depends
from fastapi.responses import FileResponse, StreamingResponse
from typing import Optional
from datetime import datetime

from app.models.schemas import (
    SingleClassificationResponse,
    BatchClassificationResponse,
    ClassificationStatus
)
from app.services.classifier_service import ClassifierService

router = APIRouter()


@router.get("")
async def classify_single(
    merchant_name: str = Query(..., description="Merchant name"),
    amount: float = Query(..., description="Transaction amount"),
    transaction_date_time: datetime = Query(..., description="Transaction timestamp in ISO 8601 format"),
    classifier_service: ClassifierService = Depends(lambda: ClassifierService())
):
    """
    카테고리 분류 (단건)
    
    Classify a single transaction based on merchant_name, amount, and timestamp.

    Example:
    GET /api/ai/classify?merchant_name=스타벅스&amount=4800&transaction_date_time=2025-09-05T10:12:00Z
    
    Returns:
        Category classification result for the transaction
    """
    # TODO: Implementation to be added
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.post("")
async def classify_batch(
    file_id: str = Query(..., description="File ID from CSV upload"),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    classifier_service: ClassifierService = Depends(lambda: ClassifierService())
):
    """
    카테고리 분류 (배치)
    
    Classify all transactions in the CSV file identified by file_id.
    Processes the file asynchronously and adds category information.
    
    Example:
    POST /api/ai/classify?file_id=abc-123
    
    Returns:
        Job ID or status for tracking the classification process
    """
    # TODO: Implementation to be added
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.get("/download")
async def download_classified_file(
    file_id: str = Query(..., description="File ID of classified CSV"),
    classifier_service: ClassifierService = Depends(lambda: ClassifierService())
):
    """
    카테고리 분류된 파일 다운로드
    
    Download the CSV file with category classifications added.
    The file must have been previously processed through the classify endpoint.
    
    Example:
    GET /api/ai/classify/download?file_id=abc-123
    
    Returns:
        CSV file with category column added to original data
    """
    # TODO: Implementation to be added
    raise HTTPException(status_code=501, detail="Not implemented yet")