#!/bin/bash

# CURL Request Test Script with Session Acquisition
# Goal: Get the expected response: <?xml version="1.0" encoding="iso-8859-1"?><result success="true" />

echo "=== CURL Request Test - Session Acquisition + Target Response ==="
echo "Target response: <?xml version=\"1.0\" encoding=\"iso-8859-1\"?><result success=\"true\" />"
echo "Target value: 98297150"
echo "================================================================="

# Step 1: Get a fresh session cookie
echo "STEP 1: Acquiring fresh session cookie..."
SESSION_URL="https://tramites.ursec.gub.uy/tramites-en-linea/TramitesEnLinea/apia.portal.PortalAction.run?dshId=1057"

# Create a temporary cookie jar
COOKIE_JAR=$(mktemp)
echo "Using cookie jar: $COOKIE_JAR"

# Get session cookie
echo "Getting session from: $SESSION_URL"
SESSION_RESPONSE=$(curl -s -c "$COOKIE_JAR" -w "HTTP_CODE:%{http_code}" "$SESSION_URL")
echo "Session acquisition response code: $(echo "$SESSION_RESPONSE" | grep -o 'HTTP_CODE:[0-9]*' | cut -d: -f2)"

# Extract JSESSIONID from cookie jar
if [ -f "$COOKIE_JAR" ]; then
    JSESSIONID=$(grep -o 'JSESSIONID[[:space:]]*[^[:space:]]*' "$COOKIE_JAR" | cut -f2)
    echo "Extracted JSESSIONID: $JSESSIONID"
else
    echo "❌ Failed to get session cookie"
    exit 1
fi

if [ -z "$JSESSIONID" ]; then
    echo "❌ JSESSIONID is empty"
    exit 1
fi

echo ""
echo "================================================================="

# Variables for main test
BASE_URL="https://tramites.ursec.gub.uy/tramites-en-linea/TramitesEnLinea//apia.execution.FormAction.run"
VALUE="98297150"
CURRENT_TIMESTAMP=$(date +%s)000

echo "STEP 2: Testing various parameter combinations with fresh session..."
echo "Base URL: $BASE_URL"
echo "Value: $VALUE"
echo "Current timestamp: $CURRENT_TIMESTAMP"
echo ""

# Test 1: Exact original request structure with fresh session
echo "=== TEST 1: Original Request Structure ==="
echo "Testing with original parameters..."
ORIGINAL_TIMESTAMP="1752693548989"
ORIGINAL_TOKENID="1752693543502"
ORIGINAL_TABID="1752693544034"

curl "$BASE_URL?action=processFieldSubmit&isAjax=true&frmId=6619&frmParent=E&timestamp=$ORIGINAL_TIMESTAMP&attId=11808&index=0&tabId=$ORIGINAL_TABID&tokenId=$ORIGINAL_TOKENID" \
  -H "Accept: text/javascript, text/html, application/xml, text/xml, */*" \
  -H "Content-type: application/x-www-form-urlencoded; charset=UTF-8" \
  -H "X-Requested-With: XMLHttpRequest" \
  -b "JSESSIONID=$JSESSIONID" \
  --data-raw "value=$VALUE" \
  -w "\n\nHTTP Status: %{http_code}\nTotal Time: %{time_total}s\nSize: %{size_download} bytes\n" \
  -s

echo ""
echo "================================================================="

# Test 2: Current timestamp with original structure
echo "=== TEST 2: Current Timestamp with Original Structure ==="
echo "Using current timestamp: $CURRENT_TIMESTAMP"

curl "$BASE_URL?action=processFieldSubmit&isAjax=true&frmId=6619&frmParent=E&timestamp=$CURRENT_TIMESTAMP&attId=11808&index=0&tabId=$CURRENT_TIMESTAMP&tokenId=$CURRENT_TIMESTAMP" \
  -H "Accept: text/javascript, text/html, application/xml, text/xml, */*" \
  -H "Content-type: application/x-www-form-urlencoded; charset=UTF-8" \
  -H "X-Requested-With: XMLHttpRequest" \
  -b "JSESSIONID=$JSESSIONID" \
  --data-raw "value=$VALUE" \
  -w "\n\nHTTP Status: %{http_code}\nTotal Time: %{time_total}s\nSize: %{size_download} bytes\n" \
  -s

echo ""
echo "================================================================="

# Test 3: Minimal parameters with fresh session
echo "=== TEST 3: Minimal Parameters ==="
echo "Testing minimal required parameters..."

curl "$BASE_URL?action=processFieldSubmit&isAjax=true&frmId=6619&attId=11808" \
  -H "Content-type: application/x-www-form-urlencoded; charset=UTF-8" \
  -H "X-Requested-With: XMLHttpRequest" \
  -b "JSESSIONID=$JSESSIONID" \
  --data-raw "value=$VALUE" \
  -w "\n\nHTTP Status: %{http_code}\nTotal Time: %{time_total}s\nSize: %{size_download} bytes\n" \
  -s

echo ""
echo "================================================================="

# Test 4: Try different action parameters
echo "=== TEST 4: Different Action Parameters ==="
for ACTION in "validateField" "checkField" "processField" "submitField" "validateValue"; do
    echo "Testing action: $ACTION"
    curl "$BASE_URL?action=$ACTION&isAjax=true&frmId=6619&attId=11808" \
      -H "Content-type: application/x-www-form-urlencoded; charset=UTF-8" \
      -H "X-Requested-With: XMLHttpRequest" \
      -b "JSESSIONID=$JSESSIONID" \
      --data-raw "value=$VALUE" \
      -w "\n\nHTTP Status: %{http_code}\nTotal Time: %{time_total}s\nSize: %{size_download} bytes\n" \
      -s
    echo ""
done

echo "================================================================="

# Test 5: Try GET request instead of POST
echo "=== TEST 5: GET Request ==="
echo "Testing GET request with value in URL..."

curl "$BASE_URL?action=processFieldSubmit&isAjax=true&frmId=6619&attId=11808&value=$VALUE" \
  -H "Accept: text/javascript, text/html, application/xml, text/xml, */*" \
  -H "X-Requested-With: XMLHttpRequest" \
  -b "JSESSIONID=$JSESSIONID" \
  -w "\n\nHTTP Status: %{http_code}\nTotal Time: %{time_total}s\nSize: %{size_download} bytes\n" \
  -s

echo ""
echo "================================================================="

# Test 6: Try without X-Requested-With header
echo "=== TEST 6: Without X-Requested-With Header ==="
curl "$BASE_URL?action=processFieldSubmit&isAjax=true&frmId=6619&attId=11808" \
  -H "Content-type: application/x-www-form-urlencoded; charset=UTF-8" \
  -b "JSESSIONID=$JSESSIONID" \
  --data-raw "value=$VALUE" \
  -w "\n\nHTTP Status: %{http_code}\nTotal Time: %{time_total}s\nSize: %{size_download} bytes\n" \
  -s

echo ""
echo "================================================================="

# Test 7: Try with different content types
echo "=== TEST 7: Different Content Types ==="
for CONTENT_TYPE in "application/json" "text/xml" "application/x-www-form-urlencoded"; do
    echo "Testing content-type: $CONTENT_TYPE"
    if [ "$CONTENT_TYPE" = "application/json" ]; then
        DATA='{"value":"'$VALUE'"}'
    else
        DATA="value=$VALUE"
    fi
    
    curl "$BASE_URL?action=processFieldSubmit&isAjax=true&frmId=6619&attId=11808" \
      -H "Content-type: $CONTENT_TYPE; charset=UTF-8" \
      -H "X-Requested-With: XMLHttpRequest" \
      -b "JSESSIONID=$JSESSIONID" \
      --data-raw "$DATA" \
      -w "\n\nHTTP Status: %{http_code}\nTotal Time: %{time_total}s\nSize: %{size_download} bytes\n" \
      -s
    echo ""
done

echo "================================================================="

# Test 8: Enumeration test with fresh session
echo "=== TEST 8: Enumeration Test ==="
for TEST_VALUE in "98297149" "98297150" "98297151"; do
    echo "Testing value: $TEST_VALUE"
    curl "$BASE_URL?action=processFieldSubmit&isAjax=true&frmId=6619&attId=11808" \
      -H "Content-type: application/x-www-form-urlencoded; charset=UTF-8" \
      -H "X-Requested-With: XMLHttpRequest" \
      -b "JSESSIONID=$JSESSIONID" \
      --data-raw "value=$TEST_VALUE" \
      -w "\n\nHTTP Status: %{http_code}\nTotal Time: %{time_total}s\nSize: %{size_download} bytes\n" \
      -s
    echo ""
done

echo "================================================================="

# Cleanup
rm -f "$COOKIE_JAR"

echo "Testing completed!"
echo "Look for the response: <?xml version=\"1.0\" encoding=\"iso-8859-1\"?><result success=\"true\" />"
echo "================================================================="
