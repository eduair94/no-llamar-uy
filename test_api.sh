#!/bin/bash

# Test script for Uruguay Phone Validator API
# Run this script to test all endpoints

echo "🧪 Testing Uruguay Phone Validator API"
echo "======================================"

BASE_URL="http://localhost:3000"

echo ""
echo "1. Testing Health Check..."
curl -s "$BASE_URL/health" | jq '.'

echo ""
echo "2. Testing Phone Number Validation Only..."
curl -s "$BASE_URL/validate/98297150" | jq '.'

echo ""
echo "3. Testing Invalid Phone Number..."
curl -s "$BASE_URL/validate/1234567890" | jq '.'

echo ""
echo "4. Testing Different Phone Format..."
curl -s "$BASE_URL/validate/+59898297150" | jq '.'

echo ""
echo "5. Testing Main Endpoint (will fail portal check due to certificate)..."
curl -s "$BASE_URL/number/98297150" | jq '.'

echo ""
echo "6. Testing 404 Handler..."
curl -s "$BASE_URL/nonexistent" | jq '.'

echo ""
echo "======================================"
echo "✅ All tests completed!"
echo "Note: Portal checks may fail due to certificate issues, which is expected."
