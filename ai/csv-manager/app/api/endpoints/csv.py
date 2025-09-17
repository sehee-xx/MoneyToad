"""
CSV management router with MinIO/S3 storage
"""
import asyncio
import logging
from typing import Optional
from datetime import datetime, timezone

from fastapi import APIRouter, File, Form, UploadFile, Query, Depends, HTTPException, status, BackgroundTasks
from fastapi.responses import Response

from app.deps.auth import Role, require_admin, require_user
from typing import Literal
from fastapi import Query as QueryParam
from app.models.schemas import (
    FileInfo, StatusResponse, ErrorResponse, 
    UploadResponse, Status
)
from app.repos.csv_repo import get_csv_repo, S3CsvRepo
from app.core.config import settings

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(
    prefix="/api/ai/csv",
    tags=["CSV Management"],
    responses={
        401: {"model": ErrorResponse, "description": "Unauthorized"},
        403: {"model": ErrorResponse, "description": "Forbidden"},
        500: {"model": ErrorResponse, "description": "Internal Server Error"}
    }
)


def validate_csv_file(file: UploadFile) -> None:
    """
    Validate that the uploaded file is a CSV.
    
    Args:
        file: Uploaded file to validate
    
    Raises:
        HTTPException: If file is not a valid CSV
    """
    # Check file extension
    if not file.filename.lower().endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="File must have .csv extension"
        )
    
    # Check content type
    valid_content_types = [
        'text/csv',
        'application/csv',
        'application/vnd.ms-excel',
        'text/plain'  # Sometimes CSV files are uploaded as plain text
    ]
    
    if file.content_type and file.content_type.lower() not in valid_content_types:
        logger.warning(f"Unusual content type for CSV: {file.content_type}")
        # Allow it but log warning - some browsers send wrong content type


async def auto_clear_status(
    csv_repo: S3CsvRepo,
    file_name: str,
    delay_seconds: int
):
    """
    Background task to automatically clear status after delay.
    
    Args:
        csv_repo: Repository instance
        file_name: File to clear status for
        delay_seconds: Delay before clearing
    """
    await asyncio.sleep(delay_seconds)
    await csv_repo.set_status(file_name, "none")
    logger.info(f"Auto-cleared status for '{file_name}' to 'none'")


@router.post(
    "/upload",
    response_model=FileInfo,
    status_code=status.HTTP_201_CREATED,
    summary="Upload CSV file",
    description="Upload a new CSV file to storage (Admin only)"
)
async def upload_csv(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="CSV file to upload"),
    role: Role = Depends(require_admin),
    csv_repo: S3CsvRepo = Depends(get_csv_repo)
) -> FileInfo:
    """
    Upload a new CSV file to MinIO/S3 storage.
    
    Requires admin role.
    Sets initial status to 'ingesting'.
    If CSV_STATUS_AUTO_CLEAR is enabled, status will be cleared to 'none' after a delay.
    
    Args:
        background_tasks: FastAPI background tasks
        file: CSV file to upload
        role: Current user role (must be admin)
        csv_repo: Repository instance
    
    Returns:
        FileInfo with upload details
    
    Raises:
        400: If file already exists
        401: If not authenticated
        403: If not admin
        415: If not a CSV file
        500: For storage errors
    """
    # Validate CSV file
    validate_csv_file(file)
    
    try:
        # Check if file already exists
        existing = await csv_repo.get_file_info(file.filename)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File '{file.filename}' already exists. Use PUT /change to replace it."
            )
        
        # Upload file
        file_info = await csv_repo.upload_file(
            file_name=file.filename,
            file_content=file.file
        )
        
        # Schedule status clear if enabled
        if settings.CSV_STATUS_AUTO_CLEAR:
            background_tasks.add_task(
                auto_clear_status,
                csv_repo,
                file.filename,
                settings.CSV_STATUS_CLEAR_DELAY
            )
        
        logger.info(f"Admin '{role}' uploaded CSV file '{file.filename}'")
        
        return file_info
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Upload failed for '{file.filename}': {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload file to storage"
        )


@router.delete(
    "/delete",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete CSV file",
    description="Delete a CSV file from storage (Admin only)"
)
async def delete_csv(
    csv_file: str = Query(..., description="Filename to delete"),
    role: Role = Depends(require_admin),
    csv_repo: S3CsvRepo = Depends(get_csv_repo)
) -> Response:
    """
    Delete a CSV file from MinIO/S3 storage.
    
    Requires admin role.
    Removes file from storage and clears all metadata/status.
    
    Args:
        csv_file: Filename to delete
        role: Current user role (must be admin)
        csv_repo: Repository instance
    
    Returns:
        204 No Content on success
    
    Raises:
        401: If not authenticated
        403: If not admin
        404: If file not found
        409: If file is being processed
        500: For storage errors
    """
    try:
        # Check if file exists
        file_info = await csv_repo.get_file_info(csv_file)
        if not file_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"File '{csv_file}' not found"
            )
        
        # Check if file is being processed (optional business logic)
        current_status = await csv_repo.get_status(csv_file)
        if current_status and current_status in ["ingesting", "leakage_calculating", "analyzing"]:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot delete file '{csv_file}' while status is '{current_status}'"
            )
        
        # Delete file
        await csv_repo.delete_file(csv_file)
        
        logger.info(f"Admin '{role}' deleted CSV file '{csv_file}'")
        
        return Response(status_code=status.HTTP_204_NO_CONTENT)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete failed for '{csv_file}': {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete file from storage"
        )


@router.put(
    "/change",
    response_model=FileInfo,
    summary="Replace CSV file",
    description="Replace an existing CSV file (Admin only)"
)
async def replace_csv(
    background_tasks: BackgroundTasks,
    csv_file: str = Query(..., description="Filename to replace"),
    file: UploadFile = File(..., description="New CSV file"),
    role: Role = Depends(require_admin),
    csv_repo: S3CsvRepo = Depends(get_csv_repo)
) -> FileInfo:
    """
    Replace an existing CSV file in MinIO/S3 storage.
    
    Requires admin role.
    Keeps the same logical filename but uploads new content.
    Updates replaced_at timestamp and resets status to 'ingesting'.
    
    Args:
        background_tasks: FastAPI background tasks
        csv_file: Filename to replace
        file: New CSV file content
        role: Current user role (must be admin)
        csv_repo: Repository instance
    
    Returns:
        FileInfo with updated details
    
    Raises:
        401: If not authenticated
        403: If not admin
        404: If original file not found
        409: If file is being processed
        415: If not a CSV file
        500: For storage errors
    """
    # Validate CSV file
    validate_csv_file(file)
    
    try:
        # Check if original file exists
        existing = await csv_repo.get_file_info(csv_file)
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"File '{csv_file}' not found. Use POST /upload for new files."
            )
        
        # Check if file is being processed (optional)
        current_status = await csv_repo.get_status(csv_file)
        if current_status and current_status in ["ingesting", "leakage_calculating", "analyzing"]:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot replace file '{csv_file}' while status is '{current_status}'"
            )
        
        # Replace file
        file_info = await csv_repo.replace_file(
            file_name=csv_file,
            file_content=file.file
        )
        
        # Schedule status clear if enabled
        if settings.CSV_STATUS_AUTO_CLEAR:
            background_tasks.add_task(
                auto_clear_status,
                csv_repo,
                csv_file,
                settings.CSV_STATUS_CLEAR_DELAY
            )
        
        logger.info(f"Admin '{role}' replaced CSV file '{csv_file}'")
        
        return file_info
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Replace failed for '{csv_file}': {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to replace file in storage"
        )


@router.get(
    "/status",
    response_model=StatusResponse,
    summary="Get CSV processing status",
    description="Get the current processing status of a CSV file (Admin/User)"
)
async def get_csv_status(
    csv_file: str = Query(..., description="Filename to check status"),
    role: Role = Depends(require_user),  # Both admin and user allowed
    csv_repo: S3CsvRepo = Depends(get_csv_repo)
) -> StatusResponse:
    """
    Get the current processing status of a CSV file.
    
    Accessible to both admin and regular users.
    Returns one of: 'ingesting', 'leakage_calculating', 'analyzing', 'none'
    
    Args:
        csv_file: Filename to check
        role: Current user role
        csv_repo: Repository instance
    
    Returns:
        StatusResponse with current status
    
    Raises:
        401: If not authenticated
        404: If file not found
        500: For storage errors
    """
    try:
        # Check if file exists
        file_info = await csv_repo.get_file_info(csv_file)
        if not file_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"File '{csv_file}' not found"
            )
        
        # Get current status
        current_status = await csv_repo.get_status(csv_file)
        if not current_status:
            current_status = "none"
        
        # Build response
        response = StatusResponse(
            csv_file=csv_file,
            status=current_status,
            progress=None,  # Could be calculated based on status
            last_updated=datetime.now(timezone.utc).isoformat(),
            details=None  # Could add processing details
        )
        
        logger.info(f"User '{role}' checked status for '{csv_file}': {current_status}")
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Status check failed for '{csv_file}': {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get file status"
        )


# Additional utility endpoints (optional)

@router.get(
    "/list",
    summary="List CSV files",
    description="List all uploaded CSV files (Admin only)",
    include_in_schema=False  # Hidden utility endpoint
)
async def list_csv_files(
    role: Role = Depends(require_admin),
    csv_repo: S3CsvRepo = Depends(get_csv_repo)
) -> dict:
    """
    List all CSV files (utility endpoint for debugging).
    
    Args:
        role: Current user role (must be admin)
        csv_repo: Repository instance
    
    Returns:
        Dictionary with file list
    """
    # This is a simple in-memory implementation
    # In production, this would query a database
    files = []
    for file_name, file_info in csv_repo._metadata.items():
        status = await csv_repo.get_status(file_name)
        files.append({
            "csv_file": file_name,
            "status": status or "none",
            "size_bytes": file_info.size_bytes,
            "uploaded_at": file_info.uploaded_at,
            "replaced_at": file_info.replaced_at
        })
    
    return {
        "total": len(files),
        "files": files
    }