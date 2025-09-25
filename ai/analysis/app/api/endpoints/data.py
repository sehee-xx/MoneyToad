"""
Data analysis endpoints for financial data processing
"""
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Query, HTTPException, status, Depends, BackgroundTasks
from pydantic import BaseModel
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import uuid
import logging

from app.services.prophet_service import ProphetService
from app.services.redis_client import RedisClient
from app.services.s3_client import S3Client
from app.db.database import get_db
from app.db import models
from app.deps.auth import get_current_user_id

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


async def run_baseline_analysis(
    file_id: str,
    csv_data
):
    """
    Background task to run baseline analysis for past 11 months
    """
    db = None
    try:
        # Get fresh DB session for background task
        db = next(get_db())

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

            db.commit()
            logger.info(f"Baseline predictions saved for {file_id}")

        # Update Redis status to none after baseline completion
        redis_client.set_csv_status(file_id, "none")
        logger.info(f"All analysis completed for {file_id}, status set to none")

    except Exception as e:
        logger.error(f"Baseline analysis failed for {file_id}: {str(e)}")
        # Update Redis status to none even on failure
        redis_client.set_csv_status(file_id, "none")
    finally:
        if db:
            db.close()


async def run_prophet_analysis(
    file_id: str,
    job_id: str,
    db: Session = None,
    background_tasks: BackgroundTasks = None
):
    """
    Run Prophet analysis - current month immediately, baseline in background
    """
    try:
        # Get fresh DB session for task
        if db is None:
            db = next(get_db())

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

        # Calculate doojo statistics (min/max per category)
        import pandas as pd
        # Use 'transaction_date_time' column instead of 'date' as per Prophet service expectations
        csv_data['year_month'] = pd.to_datetime(csv_data['transaction_date_time']).dt.to_period('M')
        monthly_spending = csv_data.groupby(['category', 'year_month'])['amount'].sum().reset_index()
        category_stats = monthly_spending.groupby('category')['amount'].agg(['min', 'max']).to_dict('index')

        # Get current month actual spending if available
        current_date = datetime.now()
        current_year = current_date.year
        current_month = current_date.month
        current_period = f"{current_year}-{current_month:02d}"
        current_month_data = csv_data[csv_data['year_month'].astype(str) == current_period]
        current_month_actual = {}
        if not current_month_data.empty:
            current_month_actual = current_month_data.groupby('category')['amount'].sum().to_dict()

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
                            try:
                                db.add(leak)
                                db.flush()  # Try to insert immediately to detect duplicate key
                            except Exception as e:
                                db.rollback()
                                # If duplicate key error, fetch and update existing record
                                leak = db.query(models.LeakAnalysis).filter(
                                    models.LeakAnalysis.file_id == file_id,
                                    models.LeakAnalysis.year == year,
                                    models.LeakAnalysis.month == month
                                ).first()
                                if leak:
                                    leak.actual_amount = current_month.get('actual')
                                    leak.predicted_amount = current_month_result.get('total_current_predicted')
                                    leak.leak_amount = 0
                                    leak.analysis_data = {'categories': category_predictions}
                                else:
                                    raise e
                        else:
                            # Update existing leak analysis
                            leak.actual_amount = current_month.get('actual')
                            leak.predicted_amount = current_month_result.get('total_current_predicted')
                            leak.leak_amount = 0
                            leak.analysis_data = {'categories': category_predictions}

                    # Save doojo analysis for this category
                    cat_stats = category_stats.get(category, {'min': 0, 'max': 0})
                    real_amount = current_month_actual.get(category, None)
                    result = None
                    if real_amount is not None:
                        result = 'true' if real_amount > current_month.get('predicted', 0) else 'false'

                    # Check if doojo analysis exists
                    doojo = db.query(models.DoojoAnalysis).filter(
                        models.DoojoAnalysis.file_id == file_id,
                        models.DoojoAnalysis.category == category,
                        models.DoojoAnalysis.year == year,
                        models.DoojoAnalysis.month == month
                    ).first()

                    if not doojo:
                        doojo = models.DoojoAnalysis(
                            file_id=file_id,
                            category=category,
                            year=year,
                            month=month,
                            min_amount=float(cat_stats['min']),
                            max_amount=float(cat_stats['max']),
                            current_threshold=current_month.get('predicted', 0),
                            real_amount=real_amount,
                            result=result
                        )
                        db.add(doojo)
                    else:
                        doojo.min_amount = float(cat_stats['min'])
                        doojo.max_amount = float(cat_stats['max'])
                        doojo.current_threshold = current_month.get('predicted', 0)
                        doojo.real_amount = real_amount
                        doojo.result = result
                
                # Next month predictions removed - no longer needed

            # Commit current month predictions first
            db.commit()
            logger.info(f"Current month predictions saved for {file_id}")

            # STEP 2: Start baseline calculation in background
            if background_tasks:
                logger.info(f"Starting baseline calculation in background for {file_id}")
                background_tasks.add_task(
                    run_baseline_analysis,
                    file_id,
                    csv_data
                )
            
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

            # Don't update Redis status here - wait for baseline to complete
            # redis_client.set_csv_status(file_id, "none")  # Moved to baseline completion

            # Store analysis metadata separately if needed
            if current_month_result:
                analysis_metadata = {
                    **current_month_result,
                    'baseline_predictions': baseline_predictions
                }
                redis_client.set_analysis_metadata(file_id, analysis_metadata)

            logger.info(f"Current month analysis completed for {file_id}, baseline running in background")
        else:
            raise Exception("Prophet analysis failed - no prediction ID")
            
    except Exception as e:
        logger.error(f"Prophet analysis failed for {file_id}: {str(e)}")

        # Update job status to failed
        try:
            if db is None:
                db = next(get_db())
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
        finally:
            if db:
                db.close()

        # Store error metadata for debugging
        redis_client.set_analysis_metadata(file_id, {"error": str(e)})

        # Update Redis status to none on failure (since baseline won't run)
        redis_client.set_csv_status(file_id, "none")
    finally:
        # Always close the db connection
        if db:
            db.close()


@router.post(
    "",
    response_model=LeakDataResponse,
    summary="Calculate monthly leak",
    description="Calculate financial leak and predict future spending using Prophet"
)
async def calculate_monthly_leak(
    background_tasks: BackgroundTasks,
    file_id: str = Query(..., description="File ID to analyze"),
    db: Session = Depends(get_db)
) -> LeakDataResponse:
    """
    Start Prophet analysis and return leak data.
    If data already exists, return it immediately.
    Otherwise, start analysis and return results.
    """
    # First check if we already have predictions
    year = datetime.now().year
    month = datetime.now().month

    predictions = db.query(models.Prediction).filter(
        models.Prediction.file_id == file_id,
        models.Prediction.prediction_date == f"{year}-{month:02d}-01"
    ).all()

    if predictions:
        # We already have predictions, return them immediately
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

        leak_analysis = db.query(models.LeakAnalysis).filter(
            models.LeakAnalysis.file_id == file_id,
            models.LeakAnalysis.year == year,
            models.LeakAnalysis.month == month
        ).first()

        return LeakDataResponse(
            file_id=file_id,
            year=year,
            month=month,
            leak_amount=float(leak_analysis.leak_amount) if leak_analysis and leak_analysis.leak_amount else 0.0,
            transactions_count=len(predictions),
            details=details
        )

    # No predictions yet, need to run analysis
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

    # Run analysis (current month sync, baseline in background)
    await run_prophet_analysis(file_id, job_id, db, background_tasks)

    # Analysis completed, now get the results
    predictions = db.query(models.Prediction).filter(
        models.Prediction.file_id == file_id,
        models.Prediction.prediction_date == f"{year}-{month:02d}-01"
    ).all()

    if not predictions:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis completed but no predictions found"
        )

    # Build response
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

    leak_analysis = db.query(models.LeakAnalysis).filter(
        models.LeakAnalysis.file_id == file_id,
        models.LeakAnalysis.year == year,
        models.LeakAnalysis.month == month
    ).first()

    return LeakDataResponse(
        file_id=file_id,
        year=year,
        month=month,
        leak_amount=float(leak_analysis.leak_amount) if leak_analysis and leak_analysis.leak_amount else 0.0,
        transactions_count=len(predictions),
        details=details
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
    
    # Remove analysis_data from response to ensure consistency
    # Only keep prediction data without actual values
    
    # Next month predictions removed - focusing on current month and baseline only
    
    return LeakDataResponse(
        file_id=file_id,
        year=year,
        month=month,
        leak_amount=float(leak_analysis.leak_amount) if leak_analysis and leak_analysis.leak_amount else 0.0,
        transactions_count=len(predictions),  # Number of categories analyzed
        details=details
    )


# /analyze endpoint removed - use POST /api/ai/data instead


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
    # Don't check Redis status - baseline runs in background
    # Just return what's available in the database

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

    # Check data availability and provide detailed feedback
    current_date = datetime.now()
    expected_months = []
    for i in range(11, 0, -1):  # Past 11 months
        calc_date = current_date - timedelta(days=30 * i)
        expected_months.append(f"{calc_date.year}-{calc_date.month:02d}")

    if not baselines:
        # Get file metadata to check data range
        file_metadata = redis_client.get_file_metadata(file_id)

        error_detail = {
            "error": "No baseline predictions available",
            "reason": "Insufficient historical data for baseline analysis",
            "requirements": {
                "minimum_days": 30,
                "minimum_transactions": 30,
                "description": "Baseline analysis requires at least 30 days of historical data"
            },
            "expected_months": expected_months,
            "available_months": [],
            "suggestion": "Please upload a CSV file with at least 2-3 months of transaction history"
        }

        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=error_detail
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

    # Check if we have all expected months
    missing_months = [month for month in expected_months if month not in monthly_baselines]

    response = {
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

    # Add warnings if some months are missing
    if missing_months:
        response["warnings"] = {
            "missing_months": missing_months,
            "message": f"Baseline predictions not available for {len(missing_months)} months due to insufficient historical data",
            "available_coverage": f"{len(sorted_months)} out of 11 months"
        }

    return response


# /report endpoint removed - use GET /api/ai/data/leak and GET /api/ai/data/baseline instead


class CategoryDoojo(BaseModel):
    """두꺼비 조언 카테고리별 데이터"""
    min: float
    max: float
    current: float
    real: Optional[float] = None
    result: Optional[bool] = None
    avg: float


class MostSpentDetail(BaseModel):
    """최대 지출 거래 정보"""
    merchant: str
    amount: float
    date: str


class MostFrequentDetail(BaseModel):
    """최다 이용 가맹점 정보"""
    merchant: str
    count: int
    total_amount: float


class CategoryDetail(BaseModel):
    """카테고리별 상세 분석"""
    most_spent: MostSpentDetail
    most_frequent: MostFrequentDetail


class DoojoMonthData(BaseModel):
    """두꺼비 조언 월별 데이터"""
    month: int
    year: int
    categories_count: int
    categories_prediction: Dict[str, CategoryDoojo]
    categories_detail: Dict[str, CategoryDetail]


class DoojoResponse(BaseModel):
    """두꺼비 조언 응답 모델"""
    file_id: str
    doojo: List[DoojoMonthData]


@router.get(
    "/doojo",
    response_model=DoojoResponse,
    summary="Get doojo (stamp breaking) data 🔒",
    description="Get category spending analysis with min/max ranges and leak thresholds from MySQL. **Requires JWT Bearer token**",
    responses={
        401: {"description": "Unauthorized - Invalid or missing JWT token"},
        404: {"description": "User not found or no analysis data"}
    },
    tags=["Protected"]
)
async def get_doojo_data(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
) -> DoojoResponse:
    """
    두꺼비 조언 데이터 조회 - JWT 토큰의 user_id를 통해 카테고리별 지출 분석 조회

    JWT 토큰에서 user_id를 추출하고, users 테이블에서 해당 user의 file_id를 찾아
    doojo analysis 데이터를 조회합니다.

    각 카테고리별로 다음 정보를 제공:
    - min: 과거 12개월간 최소 지출액
    - max: 과거 12개월간 최대 지출액
    - current: 이번달 누수 기준 (예측값)
    - real: 실제 사용 금액
    - result: real > current 이면 true, 아니면 false

    Args:
        user_id: JWT 토큰에서 추출한 사용자 ID
        db: Database session

    Returns:
        DoojoResponse with category analysis from MySQL

    Raises:
        401: Invalid or missing JWT token
        404: User not found or no analysis data
    """
    # Get user's file_id from users table (using parameterized query to prevent SQL injection)
    from sqlalchemy import text
    user_query = text("SELECT file_id FROM users WHERE id = :user_id")
    result = db.execute(user_query, {"user_id": user_id}).first()

    if not result or not result.file_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No analysis file found for user {user_id}. Please upload and analyze transaction data first."
        )

    file_id = result.file_id
    logger.info(f"User {user_id} has file_id: {file_id}")

    # Check if analysis is in progress
    analysis_status = redis_client.get_csv_status(file_id)
    if analysis_status == 'analyzing':
        raise HTTPException(
            status_code=status.HTTP_202_ACCEPTED,
            detail="Analysis is still in progress. Please try again later."
        )

    # Get current month and year
    current_date = datetime.now()
    current_year = current_date.year
    current_month = current_date.month

    # Get doojo data from MySQL using file_id
    doojo_data = db.query(models.DoojoAnalysis).filter(
        models.DoojoAnalysis.file_id == file_id,
        models.DoojoAnalysis.year == current_year,
        models.DoojoAnalysis.month == current_month
    ).all()

    if not doojo_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No doojo analysis data found for {current_year}-{current_month:02d}. Please run analysis first."
        )

    # Get user's cards to fetch transactions from MySQL
    from sqlalchemy import text, and_, extract
    from sqlalchemy.sql import func

    # Get all card_ids for this user
    cards_query = text("SELECT c.id FROM cards c JOIN users u ON c.user_id = u.id WHERE u.id = :user_id")
    card_results = db.execute(cards_query, {"user_id": user_id}).fetchall()
    card_ids = [row[0] for row in card_results]

    categories_detail = {}
    real_amounts = {}
    historical_avg = {}

    if card_ids:
        # Import Transaction model if not already imported
        from sqlalchemy.orm import aliased
        import pandas as pd

        # Get current month transactions from transactions table
        # Using DATE_FORMAT for better compatibility
        transactions_query = text("""
            SELECT category, merchant_name, amount, transaction_date_time
            FROM transactions
            WHERE card_id IN :card_ids
            AND DATE_FORMAT(transaction_date_time, '%Y-%m') = :year_month
        """)

        year_month = f"{current_year}-{current_month:02d}"
        current_month_transactions = db.execute(
            transactions_query,
            {"card_ids": tuple(card_ids), "year_month": year_month}
        ).fetchall()

        # Calculate real_amount and details per category
        category_data = {}

        for txn in current_month_transactions:
            category = txn.category
            if category not in category_data:
                category_data[category] = {
                    'total': 0,
                    'transactions': []
                }

            category_data[category]['total'] += txn.amount
            category_data[category]['transactions'].append({
                'merchant': txn.merchant_name,
                'amount': txn.amount,
                'date': txn.transaction_date_time
            })

        # Process each category
        for category, data in category_data.items():
            # Skip "보험 / 세금" category
            if category == "보험 / 세금":
                continue

            real_amounts[category] = data['total']

            if data['transactions']:
                # Find most spent transaction
                max_txn = max(data['transactions'], key=lambda x: x['amount'])

                # Calculate most frequent merchant
                merchant_stats = {}
                for txn in data['transactions']:
                    merchant = txn['merchant']
                    if merchant not in merchant_stats:
                        merchant_stats[merchant] = {'count': 0, 'total': 0}
                    merchant_stats[merchant]['count'] += 1
                    merchant_stats[merchant]['total'] += txn['amount']

                # Find most frequent merchant
                most_freq_merchant = max(merchant_stats.keys(), key=lambda m: merchant_stats[m]['count'])

                categories_detail[category] = CategoryDetail(
                    most_spent=MostSpentDetail(
                        merchant=max_txn['merchant'],
                        amount=float(max_txn['amount']),
                        date=max_txn['date'].isoformat()
                    ),
                    most_frequent=MostFrequentDetail(
                        merchant=most_freq_merchant,
                        count=merchant_stats[most_freq_merchant]['count'],
                        total_amount=float(merchant_stats[most_freq_merchant]['total'])
                    )
                )

        # Calculate historical average for each category
        avg_query = text("""
            SELECT category, AVG(amount) as avg_amount
            FROM transactions
            WHERE card_id IN :card_ids
            GROUP BY category
        """)

        avg_results = db.execute(avg_query, {"card_ids": tuple(card_ids)}).fetchall()
        for row in avg_results:
            historical_avg[row.category] = float(row.avg_amount) if row.avg_amount else 0.0

    # Fallback to S3 data if no transactions in MySQL
    if not categories_detail:
        file_metadata = redis_client.get_file_metadata(file_id)
        s3_key = file_metadata.get('s3_key') if file_metadata else None

        if s3_key:
            try:
                csv_data = await s3_client.fetch_csv_data(file_id, s3_key)
                if csv_data is not None:
                    import pandas as pd
                    csv_data['transaction_date_time'] = pd.to_datetime(csv_data['transaction_date_time'])
                    current_month_data = csv_data[
                        (csv_data['transaction_date_time'].dt.year == current_year) &
                        (csv_data['transaction_date_time'].dt.month == current_month)
                    ]

                    for category in csv_data['category'].unique():
                        cat_data = current_month_data[current_month_data['category'] == category]
                        if not cat_data.empty:
                            real_amounts[category] = float(cat_data['amount'].sum())
                            max_transaction = cat_data.loc[cat_data['amount'].idxmax()]
                            merchant_counts = cat_data.groupby('merchant').agg({
                                'amount': ['count', 'sum']
                            }).reset_index()
                            merchant_counts.columns = ['merchant', 'count', 'total_amount']
                            most_frequent = merchant_counts.loc[merchant_counts['count'].idxmax()]

                            categories_detail[category] = CategoryDetail(
                                most_spent=MostSpentDetail(
                                    merchant=str(max_transaction['merchant']),
                                    amount=float(max_transaction['amount']),
                                    date=max_transaction['transaction_date_time'].isoformat()
                                ),
                                most_frequent=MostFrequentDetail(
                                    merchant=str(most_frequent['merchant']),
                                    count=int(most_frequent['count']),
                                    total_amount=float(most_frequent['total_amount'])
                                )
                            )

                    historical_avg = csv_data.groupby('category')['amount'].mean().to_dict()
            except Exception as e:
                logger.warning(f"Could not fetch CSV data for detailed analysis: {e}")

    # Get budget data from budgets table for current month
    # budget_date is VARCHAR(7) in format 'YYYY-MM'
    budget_date = f"{current_year}-{current_month:02d}"
    budgets_query = text("""
        SELECT category, amount
        FROM budgets
        WHERE user_id = :user_id
        AND CAST(budget_date AS CHAR) = :budget_date
        AND category IS NOT NULL
    """)

    budget_results = db.execute(
        budgets_query,
        {"user_id": user_id, "budget_date": budget_date}
    ).fetchall()

    # Create budget dictionary
    budgets_by_category = {}
    for budget in budget_results:
        budgets_by_category[budget.category] = float(budget.amount)

    logger.info(f"Found {len(budgets_by_category)} budgets for user {user_id} in {budget_date}")

    # Build categories prediction data from MySQL
    categories_prediction = {}

    for doojo in doojo_data:
        # Skip "보험 / 세금" category
        if doojo.category == "보험 / 세금":
            continue

        # Convert result string to boolean
        result = None
        if doojo.result == 'true':
            result = True
        elif doojo.result == 'false':
            result = False

        # Calculate avg (use historical average if available, otherwise use current threshold)
        avg_value = historical_avg.get(doojo.category, float(doojo.current_threshold))

        # Use real amount from transactions table if available
        real_value = real_amounts.get(doojo.category, None)

        # Use budget amount as current threshold if available, otherwise use Prophet prediction
        current_value = budgets_by_category.get(doojo.category, float(doojo.current_threshold))

        # Recalculate result based on real transactions data vs budget
        if real_value is not None:
            result = real_value > current_value
        else:
            # If no real data, result should be None or false
            result = None

        categories_prediction[doojo.category] = CategoryDoojo(
            min=float(doojo.min_amount),
            max=float(doojo.max_amount),
            current=current_value,  # Now uses budget amount if available
            real=real_value,
            result=result,
            avg=avg_value
        )

        # Only add detail if we don't have real transaction data
        # Don't create fake merchant names
        if doojo.category not in categories_detail:
            # Leave categories_detail empty for categories without transactions
            pass

    # Create month data
    doojo_month = DoojoMonthData(
        month=current_month,
        year=current_year,
        categories_count=len(categories_prediction),
        categories_prediction=categories_prediction,
        categories_detail=categories_detail
    )

    return DoojoResponse(
        file_id=file_id,
        doojo=[doojo_month]
    )