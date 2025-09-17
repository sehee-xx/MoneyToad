"""
Redis client for managing CSV file metadata and status
"""
import json
import logging
from typing import Optional, Dict, Any
import redis
from redis.exceptions import RedisError
from app.core.config import settings

logger = logging.getLogger(__name__)


class RedisClient:
    """
    Redis client for persistent storage of file metadata and status
    """
    
    def __init__(self):
        """Initialize Redis connection"""
        self.redis_client = self._create_redis_client()
        self._test_connection()
    
    def _create_redis_client(self) -> redis.Redis:
        """Create and configure Redis client"""
        try:
            client = redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                db=settings.REDIS_DB,
                password=settings.REDIS_PASSWORD,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True,
                health_check_interval=30
            )
            logger.info(f"Redis client created for {settings.REDIS_HOST}:{settings.REDIS_PORT}")
            return client
        except Exception as e:
            logger.error(f"Failed to create Redis client: {e}")
            raise
    
    def _test_connection(self):
        """Test Redis connection"""
        try:
            self.redis_client.ping()
            logger.info("Redis connection successful")
        except RedisError as e:
            logger.error(f"Redis connection failed: {e}")
            raise
    
    # Metadata operations
    def set_file_metadata(self, file_name: str, metadata: Dict[str, Any]) -> bool:
        """Store file metadata by filename"""
        try:
            key = f"csv:metadata:name:{file_name}"
            self.redis_client.set(key, json.dumps(metadata))
            # Also store by file_id for quick lookup
            if 'file_id' in metadata:
                id_key = f"csv:metadata:id:{metadata['file_id']}"
                self.redis_client.set(id_key, json.dumps(metadata))
            return True
        except RedisError as e:
            logger.error(f"Failed to set metadata for {file_name}: {e}")
            return False
    
    def get_file_metadata(self, file_name: str) -> Optional[Dict[str, Any]]:
        """Get file metadata by filename"""
        try:
            key = f"csv:metadata:name:{file_name}"
            data = self.redis_client.get(key)
            return json.loads(data) if data else None
        except (RedisError, json.JSONDecodeError) as e:
            logger.error(f"Failed to get metadata for {file_name}: {e}")
            return None
    
    def get_file_metadata_by_id(self, file_id: str) -> Optional[Dict[str, Any]]:
        """Get file metadata by file_id"""
        try:
            key = f"csv:metadata:id:{file_id}"
            data = self.redis_client.get(key)
            return json.loads(data) if data else None
        except (RedisError, json.JSONDecodeError) as e:
            logger.error(f"Failed to get metadata for id {file_id}: {e}")
            return None
    
    def delete_file_metadata(self, file_name: str, file_id: str) -> bool:
        """Delete file metadata"""
        try:
            name_key = f"csv:metadata:name:{file_name}"
            id_key = f"csv:metadata:id:{file_id}"
            self.redis_client.delete(name_key, id_key)
            return True
        except RedisError as e:
            logger.error(f"Failed to delete metadata for {file_name}: {e}")
            return False
    
    def list_all_files(self) -> Dict[str, Dict[str, Any]]:
        """List all files with metadata"""
        try:
            pattern = "csv:metadata:name:*"
            files = {}
            for key in self.redis_client.scan_iter(pattern):
                file_name = key.replace("csv:metadata:name:", "")
                data = self.redis_client.get(key)
                if data:
                    files[file_name] = json.loads(data)
            return files
        except (RedisError, json.JSONDecodeError) as e:
            logger.error(f"Failed to list files: {e}")
            return {}
    
    # Status operations
    def set_status(self, file_id: str, status: str) -> bool:
        """Set processing status for a file"""
        try:
            key = f"csv:status:{file_id}"
            self.redis_client.set(key, status)
            return True
        except RedisError as e:
            logger.error(f"Failed to set status for {file_id}: {e}")
            return False
    
    def get_status(self, file_id: str) -> Optional[str]:
        """Get processing status for a file"""
        try:
            key = f"csv:status:{file_id}"
            status = self.redis_client.get(key)
            return status if status else "none"
        except RedisError as e:
            logger.error(f"Failed to get status for {file_id}: {e}")
            return None
    
    def delete_status(self, file_id: str) -> bool:
        """Delete processing status"""
        try:
            key = f"csv:status:{file_id}"
            self.redis_client.delete(key)
            return True
        except RedisError as e:
            logger.error(f"Failed to delete status for {file_id}: {e}")
            return False
    
    def clear_all(self) -> bool:
        """Clear all CSV-related data (use with caution!)"""
        try:
            # Delete all CSV-related keys
            for key in self.redis_client.scan_iter("csv:*"):
                self.redis_client.delete(key)
            logger.warning("All CSV data cleared from Redis")
            return True
        except RedisError as e:
            logger.error(f"Failed to clear all data: {e}")
            return False


# Singleton instance
_redis_client: Optional[RedisClient] = None


def get_redis_client() -> RedisClient:
    """Get or create Redis client singleton"""
    global _redis_client
    if _redis_client is None:
        _redis_client = RedisClient()
    return _redis_client