"""
Merchant message management endpoints
"""
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, status, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
import csv
import io
import logging

from app.db.database import get_db
from app.db import models
from app.deps.auth import get_current_user_id

router = APIRouter()
logger = logging.getLogger(__name__)


class MerchantMessageUploadResponse(BaseModel):
    """Response for merchant message upload"""
    total_uploaded: int
    most_spent_count: int
    most_frequent_count: int
    updated_count: int
    new_count: int
    errors: List[str]


class MerchantMessageResponse(BaseModel):
    """Response for single merchant message"""
    id: int
    merchant: str
    message_type: str
    message: str


class MerchantMessageListResponse(BaseModel):
    """Response for listing merchant messages"""
    messages: List[MerchantMessageResponse]
    total: int


@router.post(
    "/upload",
    response_model=MerchantMessageUploadResponse,
    summary="Upload merchant messages CSV 🔒",
    description="Upload CSV file with merchant-specific messages. **Requires JWT Bearer token**",
    responses={
        401: {"description": "Unauthorized - Invalid or missing JWT token"},
        400: {"description": "Invalid CSV format"}
    },
    tags=["Protected"]
)
async def upload_merchant_messages(
    file: UploadFile = File(..., description="CSV file with columns: merchant, message_type (most_spent/most_frequent), message"),
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
) -> MerchantMessageUploadResponse:
    """
    Upload merchant messages from CSV file.
    
    Expected CSV format:
    ```
    merchant,message_type,message
    스타벅스,most_spent,커피 지출이 많네요! 텀블러를 활용해보세요
    스타벅스,most_frequent,자주 방문하시네요! 리워드 혜택을 확인해보세요
    ```
    
    - message_type must be either 'most_spent' or 'most_frequent'
    - Duplicate merchant+message_type combinations will update the existing message
    """
    
    # Check file extension
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a CSV file"
        )
    
    # Read CSV content
    try:
        content = await file.read()
        csv_text = content.decode('utf-8-sig')  # Handle BOM if present
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read CSV file: {str(e)}"
        )
    
    # Parse CSV
    csv_reader = csv.DictReader(io.StringIO(csv_text))
    
    # Validate columns
    required_columns = {'merchant', 'message_type', 'message'}
    if csv_reader.fieldnames:
        missing_columns = required_columns - set(csv_reader.fieldnames)
        if missing_columns:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Missing required columns: {', '.join(missing_columns)}"
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CSV file is empty or invalid"
        )
    
    # Process messages
    total_uploaded = 0
    most_spent_count = 0
    most_frequent_count = 0
    updated_count = 0
    new_count = 0
    errors = []
    
    for row_num, row in enumerate(csv_reader, start=2):  # Start at 2 (header is row 1)
        try:
            merchant = row.get('merchant', '').strip()
            message_type = row.get('message_type', '').strip().lower()
            message = row.get('message', '').strip()
            
            # Validate row data
            if not merchant:
                errors.append(f"Row {row_num}: Missing merchant name")
                continue
            
            if message_type not in ['most_spent', 'most_frequent']:
                errors.append(f"Row {row_num}: Invalid message_type '{message_type}'. Must be 'most_spent' or 'most_frequent'")
                continue
            
            if not message:
                errors.append(f"Row {row_num}: Missing message")
                continue
            
            # Check if message already exists
            existing = db.query(models.MerchantMessage).filter(
                models.MerchantMessage.merchant == merchant,
                models.MerchantMessage.message_type == message_type
            ).first()
            
            if existing:
                # Update existing message
                existing.message = message
                updated_count += 1
            else:
                # Create new message
                new_message = models.MerchantMessage(
                    merchant=merchant,
                    message_type=message_type,
                    message=message
                )
                db.add(new_message)
                new_count += 1
            
            total_uploaded += 1
            
            if message_type == 'most_spent':
                most_spent_count += 1
            else:
                most_frequent_count += 1
                
        except Exception as e:
            errors.append(f"Row {row_num}: {str(e)}")
            continue
    
    # Commit changes
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save messages: {str(e)}"
        )
    
    logger.info(f"User {user_id} uploaded {total_uploaded} merchant messages ({new_count} new, {updated_count} updated)")
    
    return MerchantMessageUploadResponse(
        total_uploaded=total_uploaded,
        most_spent_count=most_spent_count,
        most_frequent_count=most_frequent_count,
        updated_count=updated_count,
        new_count=new_count,
        errors=errors
    )


@router.get(
    "",
    response_model=MerchantMessageListResponse,
    summary="List merchant messages 🔒",
    description="Get all merchant messages. **Requires JWT Bearer token**",
    responses={
        401: {"description": "Unauthorized - Invalid or missing JWT token"}
    },
    tags=["Protected"]
)
async def list_merchant_messages(
    merchant: Optional[str] = None,
    message_type: Optional[str] = None,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
) -> MerchantMessageListResponse:
    """
    List all merchant messages with optional filters.
    
    Args:
        merchant: Filter by merchant name
        message_type: Filter by message type (most_spent/most_frequent)
    """
    
    query = db.query(models.MerchantMessage)
    
    if merchant:
        query = query.filter(models.MerchantMessage.merchant == merchant)
    
    if message_type:
        if message_type not in ['most_spent', 'most_frequent']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid message_type. Must be 'most_spent' or 'most_frequent'"
            )
        query = query.filter(models.MerchantMessage.message_type == message_type)
    
    messages = query.all()
    
    return MerchantMessageListResponse(
        messages=[
            MerchantMessageResponse(
                id=msg.id,
                merchant=msg.merchant,
                message_type=msg.message_type,
                message=msg.message
            )
            for msg in messages
        ],
        total=len(messages)
    )


@router.delete(
    "/{message_id}",
    summary="Delete merchant message 🔒",
    description="Delete a specific merchant message. **Requires JWT Bearer token**",
    responses={
        401: {"description": "Unauthorized - Invalid or missing JWT token"},
        404: {"description": "Message not found"}
    },
    tags=["Protected"]
)
async def delete_merchant_message(
    message_id: int,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Delete a merchant message by ID.
    """
    
    message = db.query(models.MerchantMessage).filter(
        models.MerchantMessage.id == message_id
    ).first()
    
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Message with ID {message_id} not found"
        )
    
    db.delete(message)
    db.commit()
    
    logger.info(f"User {user_id} deleted merchant message {message_id}")
    
    return {"message": "Message deleted successfully"}