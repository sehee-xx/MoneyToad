#!/usr/bin/env python3
"""
Simple Redis connection test
"""
import redis
import json
import os
from datetime import datetime

# Redis configuration
REDIS_HOST = os.getenv('REDIS_HOST', 'j13a409.p.ssafy.io')
REDIS_PORT = int(os.getenv('REDIS_PORT', '8379'))
REDIS_DB = int(os.getenv('REDIS_DB', '0'))
REDIS_PASSWORD = os.getenv('REDIS_PASSWORD', None)

print("=" * 60)
print("Testing Redis Connection")
print("=" * 60)
print(f"Host: {REDIS_HOST}")
print(f"Port: {REDIS_PORT}")
print(f"DB: {REDIS_DB}")
print()

try:
    # Create Redis client
    client = redis.Redis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        db=REDIS_DB,
        password=REDIS_PASSWORD,
        decode_responses=True,
        socket_connect_timeout=5,
        socket_timeout=5
    )
    
    # Test connection
    print("Testing connection...")
    client.ping()
    print("✅ Connection successful!")
    
    # Get server info
    info = client.info('server')
    print(f"✅ Redis Version: {info.get('redis_version', 'Unknown')}")
    
    # Test basic operations
    print("\nTesting basic operations...")
    
    # Set a test value
    test_key = "csv:test:connection"
    test_value = {"timestamp": datetime.now().isoformat(), "status": "connected"}
    client.set(test_key, json.dumps(test_value))
    print(f"✅ Set test value: {test_key}")
    
    # Get the test value
    retrieved = client.get(test_key)
    if retrieved:
        data = json.loads(retrieved)
        print(f"✅ Retrieved test value: {data}")
    
    # Clean up
    client.delete(test_key)
    print("✅ Cleaned up test data")
    
    # Check for existing CSV data
    print("\nChecking for existing CSV data...")
    
    # Count metadata keys
    metadata_keys = list(client.scan_iter("csv:metadata:*"))
    print(f"📊 Found {len(metadata_keys)} metadata entries")
    
    # Count status keys
    status_keys = list(client.scan_iter("csv:status:*"))
    print(f"📊 Found {len(status_keys)} status entries")
    
    # Show sample data if exists
    if metadata_keys:
        print("\nSample metadata entries (first 3):")
        for key in metadata_keys[:3]:
            print(f"  - {key}")
    
    if status_keys:
        print("\nSample status entries (first 3):")
        for key in status_keys[:3]:
            status = client.get(key)
            print(f"  - {key}: {status}")
    
    print("\n" + "=" * 60)
    print("🎉 Redis connection test completed successfully!")
    print("=" * 60)
    
except redis.ConnectionError as e:
    print(f"❌ Connection failed: {e}")
    print("\nPlease check:")
    print("1. Redis server is running")
    print("2. Host and port are correct")
    print("3. Network connectivity")
    
except redis.AuthenticationError as e:
    print(f"❌ Authentication failed: {e}")
    print("\nPlease check Redis password configuration")
    
except Exception as e:
    print(f"❌ Unexpected error: {e}")
    import traceback
    traceback.print_exc()