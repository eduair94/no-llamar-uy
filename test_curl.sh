#!/bin/bash

# CURL Request Test Script
# Testing the minimal request to check value 98297150

echo "=== CURL Request Security Test ==="
echo "Testing minimal request for value: 98297150"
echo "Target: tramites.ursec.gub.uy"
echo "========================================"

# Variables
BASE_URL="https://tramites.ursec.gub.uy/tramites-en-linea/TramitesEnLinea//apia.execution.FormAction.run"
SESSION="DD9E282C3B94631BAD1F0AD7A75B6477"
VALUE="98297150"

echo "1. Testing MINIMAL request (essential parameters only):"
echo "curl \"$BASE_URL?action=processFieldSubmit&frmId=6619&attId=11808\" \\"
echo "  -H \"Content-type: application/x-www-form-urlencoded\" \\"
echo "  -b \"JSESSIONID=$SESSION\" \\"
echo "  --data-raw \"value=$VALUE\""
echo ""

# Test 1: Minimal request
echo "=== RESPONSE 1: Minimal Request ==="
curl "$BASE_URL?action=processFieldSubmit&frmId=6619&attId=11808" \
  -H "Content-type: application/x-www-form-urlencoded" \
  -b "JSESSIONID=$SESSION" \
  --data-raw "value=$VALUE" \
  -w "\n\nHTTP Status: %{http_code}\nTotal Time: %{time_total}s\nSize: %{size_download} bytes\n" \
  -s

echo ""
echo "========================================"

# Test 2: With isAjax parameter (might be required)
echo "2. Testing with isAjax=true parameter:"
echo "=== RESPONSE 2: With isAjax Parameter ==="
curl "$BASE_URL?action=processFieldSubmit&isAjax=true&frmId=6619&attId=11808" \
  -H "Content-type: application/x-www-form-urlencoded" \
  -b "JSESSIONID=$SESSION" \
  --data-raw "value=$VALUE" \
  -w "\n\nHTTP Status: %{http_code}\nTotal Time: %{time_total}s\nSize: %{size_download} bytes\n" \
  -s

echo ""
echo "========================================"

# Test 3: With timestamp (current timestamp)
CURRENT_TIMESTAMP=$(date +%s)000
echo "3. Testing with current timestamp: $CURRENT_TIMESTAMP"
echo "=== RESPONSE 3: With Current Timestamp ==="
curl "$BASE_URL?action=processFieldSubmit&isAjax=true&frmId=6619&attId=11808&timestamp=$CURRENT_TIMESTAMP" \
  -H "Content-type: application/x-www-form-urlencoded" \
  -b "JSESSIONID=$SESSION" \
  --data-raw "value=$VALUE" \
  -w "\n\nHTTP Status: %{http_code}\nTotal Time: %{time_total}s\nSize: %{size_download} bytes\n" \
  -s

echo ""
echo "========================================"

# Test 4: Enumeration test (increment value)
NEW_VALUE="98297151"
echo "4. Testing ENUMERATION - Incremented value: $NEW_VALUE"
echo "=== RESPONSE 4: Enumeration Test ==="
curl "$BASE_URL?action=processFieldSubmit&isAjax=true&frmId=6619&attId=11808" \
  -H "Content-type: application/x-www-form-urlencoded" \
  -b "JSESSIONID=$SESSION" \
  --data-raw "value=$NEW_VALUE" \
  -w "\n\nHTTP Status: %{http_code}\nTotal Time: %{time_total}s\nSize: %{size_download} bytes\n" \
  -s

echo ""
echo "========================================"

# Test 5: Check if session is still valid (different endpoint)
echo "5. Testing SESSION VALIDITY:"
echo "=== RESPONSE 5: Session Validity Check ==="
curl "https://tramites.ursec.gub.uy/tramites-en-linea/TramitesEnLinea/" \
  -b "JSESSIONID=$SESSION" \
  -w "\n\nHTTP Status: %{http_code}\nTotal Time: %{time_total}s\nSize: %{size_download} bytes\n" \
  -s

echo ""
echo "========================================"
echo "Testing completed!"
echo "Analyze the responses above to determine:"
echo "1. Which parameters are actually required"
echo "2. If the session is still valid"
echo "3. If enumeration is possible"
echo "4. What type of data is returned"
echo "========================================"
