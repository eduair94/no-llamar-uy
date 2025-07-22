#!/bin/bash

# Test script for the No Llamar API (local and Vercel)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default to local testing
BASE_URL="http://localhost:3000"

# Check if URL argument is provided (for Vercel testing)
if [ "$1" != "" ]; then
    BASE_URL="$1"
    echo -e "${BLUE}🌐 Testing Vercel deployment at: $BASE_URL${NC}"
else
    echo -e "${BLUE}🏠 Testing local server at: $BASE_URL${NC}"
fi

echo -e "\n🧪 Starting API Tests...\n"

# Test 1: Health Check
echo -e "${YELLOW}Test 1: Health Check${NC}"
echo "GET $BASE_URL/api"
response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$BASE_URL/api")
http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
body=$(echo $response | sed -e 's/HTTPSTATUS\:.*//g')

if [ $http_code -eq 200 ]; then
    echo -e "${GREEN}✅ PASSED${NC} - Health check successful"
    echo "Response: $body"
else
    echo -e "${RED}❌ FAILED${NC} - Expected 200, got $http_code"
    echo "Response: $body"
fi

echo -e "\n---\n"

# Test 2: Valid Uruguayan phone number (8 digits)
echo -e "${YELLOW}Test 2: Valid 8-digit phone number${NC}"
echo "GET $BASE_URL/api/check/98297150"
response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$BASE_URL/api/check/98297150")
http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
body=$(echo $response | sed -e 's/HTTPSTATUS\:.*//g')

if [ $http_code -eq 200 ]; then
    echo -e "${GREEN}✅ PASSED${NC} - Valid phone number processed"
else
    echo -e "${RED}❌ FAILED${NC} - Expected 200, got $http_code"
fi
echo "Response: $body"

echo -e "\n---\n"

# Test 3: Valid Uruguayan phone number (with country code)
echo -e "${YELLOW}Test 3: Valid phone number with country code${NC}"
echo "GET $BASE_URL/api/check/59898297150"
response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$BASE_URL/api/check/59898297150")
http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
body=$(echo $response | sed -e 's/HTTPSTATUS\:.*//g')

if [ $http_code -eq 200 ]; then
    echo -e "${GREEN}✅ PASSED${NC} - Phone number with country code processed"
else
    echo -e "${RED}❌ FAILED${NC} - Expected 200, got $http_code"
fi
echo "Response: $body"

echo -e "\n---\n"

# Test 4: Invalid phone number
echo -e "${YELLOW}Test 4: Invalid phone number${NC}"
echo "GET $BASE_URL/api/check/123"
response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$BASE_URL/api/check/123")
http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
body=$(echo $response | sed -e 's/HTTPSTATUS\:.*//g')

if [ $http_code -eq 400 ]; then
    echo -e "${GREEN}✅ PASSED${NC} - Invalid phone number rejected"
else
    echo -e "${RED}❌ FAILED${NC} - Expected 400, got $http_code"
fi
echo "Response: $body"

echo -e "\n---\n"

# Test 5: Missing phone number
echo -e "${YELLOW}Test 5: Missing phone number parameter${NC}"
echo "GET $BASE_URL/api/check/"
response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$BASE_URL/api/check/")
http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
body=$(echo $response | sed -e 's/HTTPSTATUS\:.*//g')

if [ $http_code -eq 404 ] || [ $http_code -eq 400 ]; then
    echo -e "${GREEN}✅ PASSED${NC} - Missing parameter handled correctly"
else
    echo -e "${RED}❌ FAILED${NC} - Expected 404 or 400, got $http_code"
fi
echo "Response: $body"

echo -e "\n---\n"

# Test 6: CORS headers
echo -e "${YELLOW}Test 6: CORS headers${NC}"
echo "OPTIONS $BASE_URL/api"
response=$(curl -s -I -X OPTIONS "$BASE_URL/api")
cors_header=$(echo "$response" | grep -i "access-control-allow-origin")

if [[ $cors_header == *"*"* ]]; then
    echo -e "${GREEN}✅ PASSED${NC} - CORS headers present"
    echo "CORS header: $cors_header"
else
    echo -e "${RED}❌ FAILED${NC} - CORS headers missing"
    echo "Full response headers:"
    echo "$response"
fi

echo -e "\n🏁 Testing completed!\n"

if [ "$1" == "" ]; then
    echo -e "${BLUE}💡 To test your Vercel deployment, run:${NC}"
    echo -e "   ${YELLOW}./test-api.sh https://your-project.vercel.app${NC}"
fi
