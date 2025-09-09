"""
Test script for POST /ai/analysis endpoint
"""
import requests
import pandas as pd
import io

# Create sample CSV data
sample_data = """date,merchant,amount,category
2024-01-01,Starbucks,4800,Food
2024-01-02,Uber,15000,Transport
2024-01-03,Amazon,35000,Shopping
2024-01-04,Netflix,17000,Entertainment
2024-01-05,Korean Restaurant,25000,Food
"""

# Save to CSV file
df = pd.read_csv(io.StringIO(sample_data))
df.to_csv('test_transactions.csv', index=False)

# Test the endpoint
url = "http://localhost:8002/ai/analysis"

with open('test_transactions.csv', 'rb') as f:
    files = {'file': ('test_transactions.csv', f, 'text/csv')}
    response = requests.post(url, files=files)

print("Status Code:", response.status_code)
print("Response:", response.json())