"""
CSV Repository with MinIO/S3 storage backend
"""
import io
import hashlib
import uuid
import logging
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Optional, Dict, Any, BinaryIO
from pathlib import Path

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError, NoCredentialsError

from app.core.config import settings
from app.models.schemas import FileInfo, Status

logger = logging.getLogger(__name__)


class StreamingHashWrapper:
    """
    A file-like wrapper that calculates SHA-256 hash while streaming.
    Compatible with boto3's upload_fileobj.
    """
    
    def __init__(self, file_obj: BinaryIO):
        self.file_obj = file_obj
        self.hasher = hashlib.sha256()
        self.size = 0
        
    def read(self, size: int = -1) -> bytes:
        """Read and update hash"""
        data = self.file_obj.read(size)
        if data:
            self.hasher.update(data)
            self.size += len(data)
        return data
    
    def seek(self, *args, **kwargs):
        """Delegate seek to underlying file"""
        return self.file_obj.seek(*args, **kwargs)
    
    def tell(self):
        """Delegate tell to underlying file"""
        return self.file_obj.tell()
    
    def close(self):
        """Delegate close to underlying file"""
        if hasattr(self.file_obj, 'close'):
            self.file_obj.close()
    
    @property
    def checksum(self) -> str:
        """Get hex digest of current hash"""
        return self.hasher.hexdigest()


class CsvRepo(ABC):
    """Abstract interface for CSV storage operations"""
    
    @abstractmethod
    async def upload_file(
        self, 
        file_name: str, 
        file_content: BinaryIO
    ) -> FileInfo:
        """Upload a new CSV file"""
        pass
    
    @abstractmethod
    async def replace_file(
        self, 
        file_name: str, 
        file_content: BinaryIO
    ) -> FileInfo:
        """Replace an existing CSV file"""
        pass
    
    @abstractmethod
    async def delete_file(self, file_name: str) -> bool:
        """Delete a CSV file"""
        pass
    
    @abstractmethod
    async def get_file_info(self, file_name: str) -> Optional[FileInfo]:
        """Get file metadata"""
        pass
    
    @abstractmethod
    async def set_status(self, file_name: str, status: Status) -> bool:
        """Set processing status for a file"""
        pass
    
    @abstractmethod
    async def get_status(self, file_name: str) -> Optional[Status]:
        """Get current processing status"""
        pass


class S3CsvRepo(CsvRepo):
    """
    CSV Repository implementation using MinIO/S3 for storage.
    File metadata and status are kept in memory (can be replaced with DB/Redis).
    """
    
    def __init__(self):
        """Initialize S3 client and ensure bucket exists"""
        self.bucket_name = settings.MINIO_BUCKET
        
        # In-memory storage for metadata and status
        # In production, replace with database or Redis
        self._metadata: Dict[str, FileInfo] = {}
        self._status: Dict[str, Status] = {}
        
        # Configure S3 client for MinIO
        self.s3_client = self._create_s3_client()
        
        # Ensure bucket exists
        self._ensure_bucket()
    
    def _create_s3_client(self):
        """Create and configure boto3 S3 client for MinIO"""
        try:
            # Parse endpoint URL
            endpoint_url = settings.MINIO_ENDPOINT
            if not endpoint_url.startswith(('http://', 'https://')):
                endpoint_url = f"{'https' if settings.MINIO_SECURE else 'http'}://{endpoint_url}"
            
            # Create S3 client with MinIO configuration
            s3_config = Config(
                s3={'addressing_style': 'path'},  # Required for MinIO
                signature_version='s3v4',
                retries={'max_attempts': 3, 'mode': 'standard'},
                region_name=settings.MINIO_REGION
            )
            
            # SSL verification setting
            verify_ssl = settings.VERIFY_SSL
            if not verify_ssl:
                logger.warning("SSL verification disabled - not recommended for production!")
                # Suppress SSL warnings if verification is disabled
                import urllib3
                urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
            
            client = boto3.client(
                's3',
                endpoint_url=endpoint_url,
                aws_access_key_id=settings.MINIO_ACCESS_KEY,
                aws_secret_access_key=settings.MINIO_SECRET_KEY,
                config=s3_config,
                verify=verify_ssl  # False for self-signed certificates (dev only)
            )
            
            logger.info(f"S3 client created for endpoint: {endpoint_url}")
            return client
            
        except Exception as e:
            logger.error(f"Failed to create S3 client: {e}")
            raise
    
    def _ensure_bucket(self):
        """Ensure the bucket exists, create if not"""
        try:
            # Check if bucket exists
            self.s3_client.head_bucket(Bucket=self.bucket_name)
            logger.info(f"Bucket '{self.bucket_name}' exists")
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', '')
            if error_code == '404' or error_code == '403':
                # Bucket doesn't exist or no access, try to create it
                try:
                    self.s3_client.create_bucket(Bucket=self.bucket_name)
                    logger.info(f"Created bucket '{self.bucket_name}'")
                except ClientError as create_error:
                    # If creation fails, try to use the bucket anyway
                    # (it might exist but we don't have list permissions)
                    error_code_create = create_error.response.get('Error', {}).get('Code', '')
                    if error_code_create == 'BucketAlreadyOwnedByYou' or error_code_create == 'BucketAlreadyExists':
                        logger.info(f"Bucket '{self.bucket_name}' already exists")
                    else:
                        logger.warning(f"Could not verify/create bucket: {create_error}")
                        logger.info(f"Will attempt to use bucket '{self.bucket_name}' anyway")
            else:
                logger.error(f"Error checking bucket: {e}")
                # Don't raise - try to continue anyway
                logger.info(f"Will attempt to use bucket '{self.bucket_name}' despite error")
    
    def _generate_s3_key(self, file_name: str) -> str:
        """Generate S3 object key - store directly in root"""
        file_id = str(uuid.uuid4())
        
        # Clean filename
        safe_filename = Path(file_name).name.replace(' ', '_')
        
        # Simple key: just uuid_filename in root directory
        key = f"{file_id}_{safe_filename}"
        return key
    
    def _generate_presigned_url(self, key: str) -> Optional[str]:
        """Generate a presigned URL for downloading the file"""
        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': key
                },
                ExpiresIn=settings.PRESIGNED_URL_EXPIRY
            )
            return url
        except Exception as e:
            logger.warning(f"Failed to generate presigned URL: {e}")
            return None
    
    async def upload_file(
        self, 
        file_name: str, 
        file_content: BinaryIO
    ) -> FileInfo:
        """
        Upload a new CSV file to MinIO/S3.
        
        Args:
            file_name: Original filename
            file_content: Binary file content
        
        Returns:
            FileInfo with upload details
        
        Raises:
            ValueError: If file already exists
            Exception: For S3 operation failures
        """
        # Check if file already exists
        if file_name in self._metadata:
            raise ValueError(f"File '{file_name}' already exists. Use replace_file to update.")
        
        try:
            # Generate S3 key and file ID
            s3_key = self._generate_s3_key(file_name)
            file_id = s3_key.split('_')[0]  # Extract UUID from key
            
            # Wrap file stream for hash calculation
            hash_wrapper = StreamingHashWrapper(file_content)
            
            # Upload to S3
            # Note: MinIO may have issues with certain metadata headers
            # Use minimal metadata for compatibility
            extra_args = {'ContentType': 'text/csv'}
            
            self.s3_client.upload_fileobj(
                hash_wrapper,
                self.bucket_name,
                s3_key,
                ExtraArgs=extra_args
            )
            
            # Generate presigned URL (optional)
            presigned_url = self._generate_presigned_url(s3_key)
            
            # Create file info
            file_info = FileInfo(
                csv_file=file_name,
                file_id=file_id,
                checksum=hash_wrapper.checksum,
                size_bytes=hash_wrapper.size,
                uploaded_at=datetime.now(timezone.utc).isoformat(),
                replaced_at=None,
                s3_key=s3_key,
                s3_url=presigned_url
            )
            
            # Store metadata
            self._metadata[file_name] = file_info
            
            # Set initial status
            self._status[file_name] = "ingesting"
            
            logger.info(f"Uploaded file '{file_name}' to S3 key '{s3_key}' (size: {hash_wrapper.size} bytes)")
            
            return file_info
            
        except Exception as e:
            logger.error(f"Failed to upload file '{file_name}': {e}")
            raise
    
    async def replace_file(
        self, 
        file_name: str, 
        file_content: BinaryIO
    ) -> FileInfo:
        """
        Replace an existing CSV file in MinIO/S3.
        
        Args:
            file_name: Original filename to replace
            file_content: New binary file content
        
        Returns:
            FileInfo with updated details
        
        Raises:
            ValueError: If file doesn't exist
            Exception: For S3 operation failures
        """
        # Check if file exists
        if file_name not in self._metadata:
            raise ValueError(f"File '{file_name}' not found. Use upload_file for new files.")
        
        try:
            # Get old metadata
            old_info = self._metadata[file_name]
            
            # Delete old S3 object (optional - could keep for versioning)
            if old_info.s3_key:
                try:
                    self.s3_client.delete_object(
                        Bucket=self.bucket_name,
                        Key=old_info.s3_key
                    )
                except Exception as e:
                    logger.warning(f"Failed to delete old object: {e}")
            
            # Generate new S3 key
            s3_key = self._generate_s3_key(file_name)
            file_id = s3_key.split('_')[0]  # Extract UUID from key
            
            # Wrap file stream for hash calculation
            hash_wrapper = StreamingHashWrapper(file_content)
            
            # Upload new file
            # Use minimal metadata for MinIO compatibility
            extra_args = {'ContentType': 'text/csv'}
            
            self.s3_client.upload_fileobj(
                hash_wrapper,
                self.bucket_name,
                s3_key,
                ExtraArgs=extra_args
            )
            
            # Generate presigned URL
            presigned_url = self._generate_presigned_url(s3_key)
            
            # Update file info
            file_info = FileInfo(
                csv_file=file_name,
                file_id=file_id,
                checksum=hash_wrapper.checksum,
                size_bytes=hash_wrapper.size,
                uploaded_at=old_info.uploaded_at,  # Keep original upload time
                replaced_at=datetime.now(timezone.utc).isoformat(),
                s3_key=s3_key,
                s3_url=presigned_url
            )
            
            # Update metadata
            self._metadata[file_name] = file_info
            
            # Reset status
            self._status[file_name] = "ingesting"
            
            logger.info(f"Replaced file '{file_name}' with new S3 key '{s3_key}'")
            
            return file_info
            
        except Exception as e:
            logger.error(f"Failed to replace file '{file_name}': {e}")
            raise
    
    async def delete_file(self, file_name: str) -> bool:
        """
        Delete a CSV file from MinIO/S3 and remove metadata.
        
        Args:
            file_name: File to delete
        
        Returns:
            True if deleted successfully
        
        Raises:
            ValueError: If file doesn't exist
        """
        # Check if file exists
        if file_name not in self._metadata:
            raise ValueError(f"File '{file_name}' not found")
        
        try:
            file_info = self._metadata[file_name]
            
            # Delete from S3
            if file_info.s3_key:
                self.s3_client.delete_object(
                    Bucket=self.bucket_name,
                    Key=file_info.s3_key
                )
                logger.info(f"Deleted S3 object: {file_info.s3_key}")
            
            # Remove metadata and status
            del self._metadata[file_name]
            self._status.pop(file_name, None)
            
            logger.info(f"Deleted file '{file_name}' completely")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete file '{file_name}': {e}")
            raise
    
    async def get_file_info(self, file_name: str) -> Optional[FileInfo]:
        """Get file metadata"""
        return self._metadata.get(file_name)
    
    async def set_status(self, file_name: str, status: Status) -> bool:
        """Set processing status for a file"""
        if file_name in self._metadata:
            self._status[file_name] = status
            logger.debug(f"Set status for '{file_name}' to '{status}'")
            return True
        return False
    
    async def get_status(self, file_name: str) -> Optional[Status]:
        """Get current processing status"""
        return self._status.get(file_name, "none")


# Singleton instance
_csv_repo: Optional[S3CsvRepo] = None


def get_csv_repo() -> S3CsvRepo:
    """Get or create singleton CSV repository instance"""
    global _csv_repo
    if _csv_repo is None:
        _csv_repo = S3CsvRepo()
    return _csv_repo