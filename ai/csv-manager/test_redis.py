#!/usr/bin/env python3
"""
Test Redis connection and CSV Manager Redis functionality
"""
import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.repos.redis_client import get_redis_client
from app.models.schemas import FileInfo
from datetime import datetime, timezone
import json


async def test_redis_connection():
    """Test Redis connection and basic operations"""
    print("=" * 60)
    print("Testing Redis Connection for CSV Manager")
    print("=" * 60)
    
    try:
        # Get Redis client
        redis_client = get_redis_client()
        print("✅ Redis client initialized")
        
        # Test basic connection
        redis_client.redis_client.ping()
        print("✅ Redis connection successful")
        
        # Get Redis info
        info = redis_client.redis_client.info('server')
        print(f"📍 Redis Host: {os.getenv('REDIS_HOST', 'localhost')}")
        print(f"📍 Redis Port: {os.getenv('REDIS_PORT', '6379')}")
        print(f"📍 Redis Version: {info.get('redis_version', 'Unknown')}")
        
    except Exception as e:
        print(f"❌ Redis connection failed: {e}")
        return False
    
    print("\n" + "=" * 60)
    print("Testing CSV Manager Redis Operations")
    print("=" * 60)
    
    try:
        # Test file metadata operations
        test_file_name = "test_transactions.csv"
        test_file_id = "test-uuid-12345"
        
        test_metadata = {
            "csv_file": test_file_name,
            "file_id": test_file_id,
            "checksum": "sha256_test_hash",
            "size_bytes": 1024,
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
            "replaced_at": None,
            "s3_key": f"{test_file_id}_{test_file_name}",
            "s3_url": "https://example.com/test.csv"
        }
        
        # 1. Test set metadata
        print("\n1. Testing metadata storage...")
        success = redis_client.set_file_metadata(test_file_name, test_metadata)
        if success:
            print(f"   ✅ Stored metadata for '{test_file_name}'")
        else:
            print(f"   ❌ Failed to store metadata")
            return False
        
        # 2. Test get metadata by name
        print("\n2. Testing metadata retrieval by name...")
        retrieved = redis_client.get_file_metadata(test_file_name)
        if retrieved and retrieved['file_id'] == test_file_id:
            print(f"   ✅ Retrieved metadata by name: {retrieved['csv_file']}")
        else:
            print(f"   ❌ Failed to retrieve metadata by name")
            return False
        
        # 3. Test get metadata by ID
        print("\n3. Testing metadata retrieval by ID...")
        retrieved_by_id = redis_client.get_file_metadata_by_id(test_file_id)
        if retrieved_by_id and retrieved_by_id['csv_file'] == test_file_name:
            print(f"   ✅ Retrieved metadata by ID: {retrieved_by_id['file_id']}")
        else:
            print(f"   ❌ Failed to retrieve metadata by ID")
            return False
        
        # 4. Test status operations
        print("\n4. Testing status management...")
        
        # Set status
        redis_client.set_status(test_file_id, "ingesting")
        print(f"   ✅ Set status to 'ingesting'")
        
        # Get status
        status = redis_client.get_status(test_file_id)
        if status == "ingesting":
            print(f"   ✅ Retrieved status: '{status}'")
        else:
            print(f"   ❌ Failed to retrieve correct status")
            return False
        
        # Update status
        redis_client.set_status(test_file_id, "analyzing")
        status = redis_client.get_status(test_file_id)
        if status == "analyzing":
            print(f"   ✅ Updated status to: '{status}'")
        else:
            print(f"   ❌ Failed to update status")
            return False
        
        # 5. Test list all files
        print("\n5. Testing list all files...")
        all_files = redis_client.list_all_files()
        if test_file_name in all_files:
            print(f"   ✅ Found test file in listing: {len(all_files)} total files")
        else:
            print(f"   ❌ Test file not found in listing")
            return False
        
        # 6. Test cleanup
        print("\n6. Testing cleanup operations...")
        
        # Delete status
        redis_client.delete_status(test_file_id)
        status = redis_client.get_status(test_file_id)
        if status == "none":
            print(f"   ✅ Status deleted successfully")
        else:
            print(f"   ❌ Failed to delete status")
        
        # Delete metadata
        redis_client.delete_file_metadata(test_file_name, test_file_id)
        retrieved = redis_client.get_file_metadata(test_file_name)
        if retrieved is None:
            print(f"   ✅ Metadata deleted successfully")
        else:
            print(f"   ❌ Failed to delete metadata")
            return False
        
        print("\n" + "=" * 60)
        print("✅ All Redis tests passed successfully!")
        print("=" * 60)
        return True
        
    except Exception as e:
        print(f"\n❌ Error during Redis operations: {e}")
        import traceback
        traceback.print_exc()
        return False


async def main():
    """Main test function"""
    # Set up environment variables if not set
    if not os.getenv('REDIS_HOST'):
        os.environ['REDIS_HOST'] = 'j13a409.p.ssafy.io'
    if not os.getenv('REDIS_PORT'):
        os.environ['REDIS_PORT'] = '8379'
    if not os.getenv('REDIS_DB'):
        os.environ['REDIS_DB'] = '0'
    
    print(f"\nUsing Redis configuration:")
    print(f"  REDIS_HOST: {os.getenv('REDIS_HOST')}")
    print(f"  REDIS_PORT: {os.getenv('REDIS_PORT')}")
    print(f"  REDIS_DB: {os.getenv('REDIS_DB')}")
    print()
    
    success = await test_redis_connection()
    
    if success:
        print("\n🎉 Redis integration is working correctly!")
        sys.exit(0)
    else:
        print("\n❌ Redis integration test failed!")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())