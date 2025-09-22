"""
Data analysis endpoints for financial data processing
"""
from typing import Optional, Dict, Any
from fastapi import APIRouter, Query, HTTPException, status, BackgroundTasks, Depends
from pydantic import BaseModel
from datetime import datetime
from sqlalchemy.orm import Session
import uuid
import logging

from app.services.prophet_service import ProphetService
from app.services.redis_client import RedisClient
from app.services.s3_client import S3Client
from app.db.database import get_db
from app.db import models

router = APIRouter()
logger = logging.getLogger(__name__)

# Initialize services
prophet_service = ProphetService()
redis_client = RedisClient()
s3_client = S3Client()


# Response models
class LeakCalculationResponse(BaseModel):
    file_id: str
    year: int
    month: int
    total_leak: float
    message: str


class LeakDataResponse(BaseModel):
    file_id: str
    year: int
    month: int
    leak_amount: float
    transactions_count: int
    details: dict


class AnalysisResponse(BaseModel):
    file_id: str
    analysis_id: str
    status: str
    message: str


class AnalysisReportResponse(BaseModel):
    file_id: str
    year: int
    month: int
    report: dict
    generated_at: str


async def run_prophet_analysis(
    file_id: str,
    job_id: str,
    db: Session
):
    """
    Background task to run Prophet analysis
    """
    try:
        # Update status to analyzing
        redis_client.set_csv_status(file_id, "analyzing")
        
        # Get file metadata from Redis
        file_metadata = redis_client.get_file_metadata(file_id)
        if not file_metadata:
            raise ValueError(f"File metadata not found for {file_id}")
        
        # Fetch CSV data from S3
        s3_key = file_metadata.get('s3_key')
        if not s3_key:
            raise ValueError(f"S3 key not found for {file_id}")
        
        csv_data = await s3_client.fetch_csv_data(file_id, s3_key)
        if csv_data is None:
            raise ValueError(f"Failed to fetch CSV data for {file_id}")
        
        # STEP 1: Run current month prediction first
        logger.info(f"Starting current month prediction for {file_id}")
        current_month_result = await prophet_service.predict_by_category(csv_data)
        
        # Process current month results first
        if current_month_result.get('prediction_id'):
            category_predictions = current_month_result.get('category_predictions', {})
            year = current_month_result.get('year')
            month = current_month_result.get('month')
            
            # Save predictions for each category
            for category, cat_data in category_predictions.items():
                if 'error' in cat_data:
                    logger.warning(f"Skipping category '{category}' due to error: {cat_data['error']}")
                    continue
                    
                current_month = cat_data.get('current_month', {})
                
                # Save current month prediction for this category
                if year and month and current_month:
                    current_date = f"{year}-{month:02d}-01"
                    
                    # Check existing prediction
                    prediction = db.query(models.Prediction).filter(
                        models.Prediction.file_id == file_id,
                        models.Prediction.category == category,
                        models.Prediction.prediction_date == current_date
                    ).first()
                    
                    if not prediction:
                        prediction = models.Prediction(
                            file_id=file_id,
                            category=category,
                            prediction_date=current_date,
                            predicted_amount=current_month.get('predicted', 0),
                            lower_bound=current_month.get('lower_bound'),
                            upper_bound=current_month.get('upper_bound')
                        )
                        db.add(prediction)
                    else:
                        prediction.predicted_amount = current_month.get('predicted', 0)
                        prediction.lower_bound = current_month.get('lower_bound')
                        prediction.upper_bound = current_month.get('upper_bound')
                    
                    # Save leak analysis if actual data exists for this category
                    if current_month.get('actual') is not None:
                        leak_calc = prophet_service.calculate_category_leak(
                            actual_spending=current_month['actual'],
                            predicted_spending=current_month['predicted'],
                            category=category
                        )
                        
                        # Note: You may want to add category field to LeakAnalysis model
                        leak = db.query(models.LeakAnalysis).filter(
                            models.LeakAnalysis.file_id == file_id,
                            models.LeakAnalysis.year == year,
                            models.LeakAnalysis.month == month
                        ).first()
                        
                        if not leak:
                            leak = models.LeakAnalysis(
                                file_id=file_id,
                                year=year,
                                month=month,
                                actual_amount=current_month.get('actual'),
                                predicted_amount=current_month_result.get('total_current_predicted'),
                                leak_amount=0,  # Will calculate total leak later
                                analysis_data={'categories': category_predictions}
                            )
                            db.add(leak)
                
                # Next month predictions removed - no longer needed

            # Commit current month predictions first
            db.commit()
            logger.info(f"Current month predictions saved for {file_id}")

            # STEP 2: Now calculate baseline for past 11 months
            logger.info(f"Starting baseline calculation for past 11 months for {file_id}")
            baseline_predictions = await prophet_service.calculate_baseline_predictions_async(csv_data)
            if baseline_predictions and baseline_predictions.get('baseline_months'):
                logger.info(f"Saving {len(baseline_predictions['baseline_months'])} months of baseline data")
                for month_key, month_data in baseline_predictions['baseline_months'].items():
                    if month_data['status'] != 'completed':
                        continue
                    
                    baseline_year = month_data['year']
                    baseline_month = month_data['month']
                    cutoff_date = month_data.get('training_data_until', '').split('T')[0] if month_data.get('training_data_until') else None
                    
                    # Save baseline for each category
                    for category, cat_baseline in month_data.get('categories', {}).items():
                        # Check existing baseline
                        existing = db.query(models.BaselinePrediction).filter(
                            models.BaselinePrediction.file_id == file_id,
                            models.BaselinePrediction.category == category,
                            models.BaselinePrediction.year == baseline_year,
                            models.BaselinePrediction.month == baseline_month
                        ).first()
                        
                        if not existing:
                            baseline_pred = models.BaselinePrediction(
                                file_id=file_id,
                                category=category,
                                year=baseline_year,
                                month=baseline_month,
                                predicted_amount=cat_baseline.get('predicted', 0),
                                lower_bound=cat_baseline.get('lower_bound'),
                                upper_bound=cat_baseline.get('upper_bound'),
                                training_cutoff_date=cutoff_date
                            )
                            db.add(baseline_pred)
                        else:
                            existing.predicted_amount = cat_baseline.get('predicted', 0)
                            existing.lower_bound = cat_baseline.get('lower_bound')
                            existing.upper_bound = cat_baseline.get('upper_bound')
                            existing.training_cutoff_date = cutoff_date
            
            # Update job status
            job = db.query(models.AnalysisJob).filter(
                models.AnalysisJob.job_id == job_id
            ).first()
            if job:
                job.status = "completed"
                job.completed_at = datetime.now()
                job.job_metadata = {
                    'prediction_id': current_month_result.get('prediction_id'),
                    'categories_analyzed': current_month_result.get('categories_analyzed'),
                    'total_current_predicted': current_month_result.get('total_current_predicted'),
                    'trend': current_month_result.get('trend'),
                    'baseline_months_calculated': baseline_predictions.get('months_calculated', 0) if baseline_predictions else 0
                }
            
            db.commit()
            
            # Update Redis status to none (idle state)
            redis_client.set_csv_status(file_id, "none")
            
            # Store analysis metadata separately if needed
            if current_month_result:
                analysis_metadata = {
                    **current_month_result,
                    'baseline_predictions': baseline_predictions
                }
                redis_client.set_analysis_metadata(file_id, analysis_metadata)
            
            logger.info(f"Prophet analysis completed for {file_id}, status set to none")
        else:
            raise Exception("Prophet analysis failed - no prediction ID")
            
    except Exception as e:
        logger.error(f"Prophet analysis failed for {file_id}: {str(e)}")
        
        # Update job status to failed
        try:
            job = db.query(models.AnalysisJob).filter(
                models.AnalysisJob.job_id == job_id
            ).first()
            if job:
                job.status = "failed"
                job.error_message = str(e)
                job.completed_at = datetime.now()
            db.commit()
        except:
            pass
        
        # Update Redis status back to none (idle) even on failure
        redis_client.set_csv_status(file_id, "none")
        
        # Store error metadata for debugging
        redis_client.set_analysis_metadata(file_id, {"error": str(e)})


@router.post(
    "",
    response_model=LeakCalculationResponse,
    summary="Calculate monthly leak",
    description="Calculate financial leak and predict future spending using Prophet"
)
async def calculate_monthly_leak(
    background_tasks: BackgroundTasks,
    file_id: str = Query(..., description="File ID to analyze"),
    db: Session = Depends(get_db)
) -> LeakCalculationResponse:
    """
    Start async Prophet analysis for spending prediction.
    
    Args:
        file_id: ID of the CSV file to analyze
        background_tasks: FastAPI background tasks
        db: Database session
    
    Returns:
        LeakCalculationResponse with job information
    """
    # Check if file exists in Redis
    file_metadata = redis_client.get_file_metadata(file_id)
    if not file_metadata:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File with ID '{file_id}' not found"
        )
    
    # Check if analysis is already running
    current_status = redis_client.get_csv_status(file_id)
    if current_status == 'analyzing':
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Analysis is already in progress for this file"
        )
    
    # Create analysis job
    job_id = str(uuid.uuid4())
    job = models.AnalysisJob(
        job_id=job_id,
        file_id=file_id,
        status="pending"
    )
    db.add(job)
    db.commit()
    
    # Start background task
    background_tasks.add_task(
        run_prophet_analysis,
        file_id,
        job_id,
        db
    )
    
    return LeakCalculationResponse(
        file_id=file_id,
        year=datetime.now().year,
        month=datetime.now().month,
        total_leak=0.0,
        message=f"Prophet analysis started. Job ID: {job_id}"
    )


@router.get(
    "/leak",
    response_model=LeakDataResponse,
    summary="Get leak data",
    description="Retrieve spending predictions and leak analysis by category"
)
async def get_leak_data(
    file_id: str = Query(..., description="File ID"),
    category: Optional[str] = Query(None, description="Category to filter (optional)"),
    year: Optional[int] = Query(None, description="Year to query (default: current year)"),
    month: Optional[int] = Query(None, ge=1, le=12, description="Month to query (1-12, default: current month)"),
    db: Session = Depends(get_db)
) -> LeakDataResponse:
    """
    Get spending predictions and leak analysis.
    
    Args:
        file_id: ID of the file
        year: Year to query (optional, defaults to current year)
        month: Month to query (optional, defaults to current month)
        db: Database session
    
    Returns:
        LeakDataResponse with predictions and leak analysis
    """
    # Use current date if not specified
    if year is None:
        year = datetime.now().year
    if month is None:
        month = datetime.now().month
    
    # Build query based on whether category is specified
    query = db.query(models.Prediction).filter(
        models.Prediction.file_id == file_id,
        models.Prediction.prediction_date == f"{year}-{month:02d}-01"
    )
    
    if category:
        # Get specific category prediction
        query = query.filter(models.Prediction.category == category)
        predictions = query.all()
    else:
        # Get all category predictions
        predictions = query.all()
    
    if not predictions:
        # Check if analysis is in progress
        analysis_status = redis_client.get_csv_status(file_id)
        if analysis_status == 'analyzing':
            raise HTTPException(
                status_code=status.HTTP_202_ACCEPTED,
                detail="Analysis is still in progress. Please try again later."
            )
        
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No prediction data found for {year}-{month:02d}. Please run analysis first."
        )
    
    # Get leak analysis if available
    leak_analysis = db.query(models.LeakAnalysis).filter(
        models.LeakAnalysis.file_id == file_id,
        models.LeakAnalysis.year == year,
        models.LeakAnalysis.month == month
    ).first()
    
    # Prepare response based on whether single category or all
    if category and len(predictions) == 1:
        # Single category response
        prediction = predictions[0]
        details = {
            "category": prediction.category,
            "predicted_amount": float(prediction.predicted_amount),
            "lower_bound": float(prediction.lower_bound) if prediction.lower_bound else None,
            "upper_bound": float(prediction.upper_bound) if prediction.upper_bound else None,
            "prediction_date": prediction.prediction_date.isoformat(),
            "created_at": prediction.created_at.isoformat()
        }
        total_predicted = prediction.predicted_amount
    else:
        # Multiple categories response
        category_predictions = {}
        total_predicted = 0
        
        for pred in predictions:
            category_predictions[pred.category] = {
                "predicted_amount": float(pred.predicted_amount),
                "lower_bound": float(pred.lower_bound) if pred.lower_bound else None,
                "upper_bound": float(pred.upper_bound) if pred.upper_bound else None
            }
            total_predicted += pred.predicted_amount
        
        details = {
            "total_predicted": float(total_predicted),
            "categories_count": len(predictions),
            "category_predictions": category_predictions,
            "prediction_date": predictions[0].prediction_date.isoformat() if predictions else None,
            "created_at": predictions[0].created_at.isoformat() if predictions else None
        }
    
    if leak_analysis:
        details.update({
            "actual_amount": float(leak_analysis.actual_amount) if leak_analysis.actual_amount else None,
            "leak_amount": float(leak_analysis.leak_amount) if leak_analysis.leak_amount else None,
            "analysis_data": leak_analysis.analysis_data
        })
    
    # Next month predictions removed - focusing on current month and baseline only
    
    return LeakDataResponse(
        file_id=file_id,
        year=year,
        month=month,
        leak_amount=float(leak_analysis.leak_amount) if leak_analysis and leak_analysis.leak_amount else 0.0,
        transactions_count=len(predictions),  # Number of categories analyzed
        details=details
    )


@router.post(
    "/analyze",
    response_model=AnalysisResponse,
    summary="Trigger data analysis",
    description="Start comprehensive data analysis"
)
async def trigger_analysis(
    file_id: str = Query(..., description="File ID to analyze")
) -> AnalysisResponse:
    """
    Trigger comprehensive analysis (alias for calculate_monthly_leak).
    """
    # This is an alias endpoint that calls the same analysis
    # Redirect to calculate_monthly_leak
    return AnalysisResponse(
        file_id=file_id,
        analysis_id=str(uuid.uuid4()),
        status="started",
        message="Analysis started. Use POST /api/ai/data endpoint for Prophet analysis."
    )


@router.get(
    "/baseline",
    summary="Get baseline predictions",
    description="Retrieve baseline predictions for past 11 months (소비 기준 금액)"
)
async def get_baseline_predictions(
    file_id: str = Query(..., description="File ID"),
    category: Optional[str] = Query(None, description="Filter by category"),
    db: Session = Depends(get_db)
):
    """
    Get baseline predictions (소비 기준 금액) for past 11 months
    Each month's prediction is calculated using only prior data
    """
    # Build query
    query = db.query(models.BaselinePrediction).filter(
        models.BaselinePrediction.file_id == file_id
    )
    
    if category:
        query = query.filter(models.BaselinePrediction.category == category)
    
    # Order by year and month descending (most recent first)
    baselines = query.order_by(
        models.BaselinePrediction.year.desc(),
        models.BaselinePrediction.month.desc()
    ).all()
    
    if not baselines:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No baseline predictions found. Please run analysis first."
        )
    
    # Group by month
    monthly_baselines = {}
    for baseline in baselines:
        month_key = f"{baseline.year}-{baseline.month:02d}"
        
        if month_key not in monthly_baselines:
            monthly_baselines[month_key] = {
                "year": baseline.year,
                "month": baseline.month,
                "total": 0,
                "categories": {},
                "training_cutoff": baseline.training_cutoff_date.isoformat() if baseline.training_cutoff_date else None
            }
        
        monthly_baselines[month_key]["categories"][baseline.category] = {
            "predicted_amount": float(baseline.predicted_amount),
            "lower_bound": float(baseline.lower_bound) if baseline.lower_bound else None,
            "upper_bound": float(baseline.upper_bound) if baseline.upper_bound else None
        }
        monthly_baselines[month_key]["total"] += baseline.predicted_amount
    
    # Sort months chronologically
    sorted_months = sorted(monthly_baselines.keys(), reverse=True)
    
    return {
        "file_id": file_id,
        "baseline_months": [
            {
                "month": monthly_baselines[month]["month"],
                "year": monthly_baselines[month]["year"],
                "total_predicted": float(monthly_baselines[month]["total"]),
                "categories_count": len(monthly_baselines[month]["categories"]),
                "category_predictions": monthly_baselines[month]["categories"] if not category else {
                    category: monthly_baselines[month]["categories"].get(category)
                },
                "training_data_until": monthly_baselines[month]["training_cutoff"]
            }
            for month in sorted_months
        ],
        "months_count": len(sorted_months),
        "category_filter": category
    }


@router.get(
    "/report",
    response_model=AnalysisReportResponse,
    summary="Get analysis report",
    description="Retrieve comprehensive analysis report"
)
async def get_analysis_report(
    file_id: str = Query(..., description="File ID"),
    year: int = Query(..., description="Year for the report"),
    month: int = Query(..., ge=1, le=12, description="Month for the report (1-12)"),
    db: Session = Depends(get_db)
) -> AnalysisReportResponse:
    """
    Get comprehensive analysis report.
    """
    # Get all predictions for the file
    predictions = db.query(models.Prediction).filter(
        models.Prediction.file_id == file_id
    ).all()
    
    # Get leak analysis
    leak_analyses = db.query(models.LeakAnalysis).filter(
        models.LeakAnalysis.file_id == file_id
    ).all()
    
    report = {
        "predictions_count": len(predictions),
        "leak_analyses_count": len(leak_analyses),
        "monthly_predictions": {},
        "leak_summary": {}
    }
    
    for pred in predictions:
        month_key = pred.prediction_date.strftime("%Y-%m")
        report["monthly_predictions"][month_key] = {
            "predicted_amount": float(pred.predicted_amount),
            "lower_bound": float(pred.lower_bound) if pred.lower_bound else None,
            "upper_bound": float(pred.upper_bound) if pred.upper_bound else None
        }
    
    for leak in leak_analyses:
        month_key = f"{leak.year}-{leak.month:02d}"
        report["leak_summary"][month_key] = {
            "actual": float(leak.actual_amount) if leak.actual_amount else None,
            "predicted": float(leak.predicted_amount) if leak.predicted_amount else None,
            "leak": float(leak.leak_amount) if leak.leak_amount else None
        }
    
    return AnalysisReportResponse(
        file_id=file_id,
        year=year,
        month=month,
        report=report,
        generated_at=datetime.now().isoformat()
    )