from fastapi import APIRouter, HTTPException, Query, BackgroundTasks, Depends
from fastapi.responses import FileResponse
from typing import Optional, List
from datetime import datetime
import uuid

from app.models.schemas import (
    SingleClassificationRequest,
    SingleClassificationResponse,
    BatchClassificationRequest,
    BatchClassificationResponse,
    ClassificationStatus,
    ClassificationJob
)
from app.services.classifier_service import ClassifierService

router = APIRouter()


@router.get("/", response_model=SingleClassificationResponse)
async def classify_single_expense(
    merchant: str = Query(..., description="Merchant name"),
    amount: float = Query(..., description="Transaction amount"),
    ts: Optional[datetime] = Query(None, description="Transaction timestamp"),
    description: Optional[str] = Query(None, description="Additional description"),
    classifier_service: ClassifierService = Depends(lambda: ClassifierService())
):
    """
    Classify a single expense transaction
    
    Example:
    GET /ai/classify?merchant=스타벅스%20강남역&amount=4800&ts=2025-09-05T10:12:00
    
    Returns:
        Category and confidence score for the transaction
    """
    try:
        result = await classifier_service.classify_single(
            merchant=merchant,
            amount=amount,
            timestamp=ts,
            description=description
        )
        
        return SingleClassificationResponse(
            merchant=merchant,
            amount=amount,
            category=result["category"],
            subcategory=result.get("subcategory"),
            confidence=result["confidence"],
            timestamp=ts
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=BatchClassificationResponse)
async def classify_batch_expenses(
    request: BatchClassificationRequest,
    background_tasks: BackgroundTasks,
    classifier_service: ClassifierService = Depends(lambda: ClassifierService())
):
    """
    Classify expenses from uploaded CSV file (batch processing)
    
    Accepts CSV file reference or data for batch classification
    Returns job ID for status tracking
    """
    try:
        # Generate job ID
        job_id = str(uuid.uuid4())
        
        # Start background task for batch processing
        background_tasks.add_task(
            classifier_service.process_batch,
            job_id=job_id,
            csv_key=request.csv_key,
            options=request.options
        )
        
        return BatchClassificationResponse(
            job_id=job_id,
            status="processing",
            message="Batch classification started",
            total_records=request.estimated_records
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status", response_model=ClassificationJob)
async def get_classification_status(
    job_id: str = Query(..., description="Job ID from batch classification"),
    classifier_service: ClassifierService = Depends(lambda: ClassifierService())
):
    """
    Get status of batch classification job
    
    Returns current status, progress, and results if completed
    """
    try:
        job_status = await classifier_service.get_job_status(job_id)
        
        if not job_status:
            raise HTTPException(status_code=404, detail="Job not found")
        
        return job_status
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/download")
async def download_classification_results(
    job_id: str = Query(..., description="Job ID from batch classification"),
    format: str = Query("csv", description="Output format (csv, json, excel)"),
    classifier_service: ClassifierService = Depends(lambda: ClassifierService())
):
    """
    Download classified results
    
    Returns processed file with categories added
    """
    try:
        # Check job status
        job_status = await classifier_service.get_job_status(job_id)
        
        if not job_status:
            raise HTTPException(status_code=404, detail="Job not found")
        
        if job_status.status != "completed":
            raise HTTPException(
                status_code=400, 
                detail=f"Job is {job_status.status}. Results only available for completed jobs."
            )
        
        # Get file path
        file_path = await classifier_service.get_result_file(job_id, format)
        
        if not file_path:
            raise HTTPException(status_code=404, detail="Result file not found")
        
        # Return file
        return FileResponse(
            path=file_path,
            filename=f"classified_expenses_{job_id}.{format}",
            media_type="application/octet-stream"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/categories")
async def get_available_categories(
    classifier_service: ClassifierService = Depends(lambda: ClassifierService())
):
    """
    Get list of available expense categories
    
    Returns hierarchy of categories and subcategories
    """
    try:
        categories = await classifier_service.get_categories()
        return {
            "categories": categories,
            "total": len(categories)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/train")
async def train_classifier(
    training_data_key: str,
    model_name: Optional[str] = None,
    classifier_service: ClassifierService = Depends(lambda: ClassifierService())
):
    """
    Train or retrain the classifier with new data
    
    Note: Admin endpoint - should be protected in production
    """
    try:
        result = await classifier_service.train_model(
            training_data_key=training_data_key,
            model_name=model_name
        )
        
        return {
            "success": True,
            "message": "Training started",
            "model_id": result["model_id"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))