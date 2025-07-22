#!/bin/bash

# Advanced CURL Testing Script
# Goal: Find the curl request that returns: <?xml version="1.0" encoding="iso-8859-1"?><result success="true" />
# For value: 98297150

echo "=== ADVANCED CURL TESTING FOR SUCCESS RESPONSE ==="
echo "Target Response: <?xml version=\"1.0\" encoding=\"iso-8859-1\"?><result success=\"true\" />"
echo "Test Value: 98297150"
echo "============================================================="

# Variables
BASE_URL="https://tramites.ursec.gub.uy/tramites-en-linea/TramitesEnLinea//apia.execution.FormAction.run"
VALUE="98297150"
CURRENT_TIMESTAMP=$(date +%s)000

# Test different session approaches
echo "1. Testing WITHOUT session cookie (anonymous access):"
echo "=== RESPONSE 1: No Session ==="
curl "$BASE_URL?action=processFieldSubmit&isAjax=true&frmId=6619&attId=11808" \
  -H "Content-type: application/x-www-form-urlencoded" \
  -H "X-Requested-With: XMLHttpRequest" \
  --data-raw "value=$VALUE" \
  -w "\n\nHTTP Status: %{http_code}\nTotal Time: %{time_total}s\n" \
  -s

echo -e "\n============================================================="

# Test with different action parameters
echo "2. Testing different ACTION parameters:"
actions=("processFieldSubmit" "validateField" "checkField" "submitField" "processField")

for action in "${actions[@]}"; do
    echo "=== Testing action: $action ==="
    curl "$BASE_URL?action=$action&isAjax=true&frmId=6619&attId=11808" \
      -H "Content-type: application/x-www-form-urlencoded" \
      -H "X-Requested-With: XMLHttpRequest" \
      --data-raw "value=$VALUE" \
      -w "\n\nHTTP Status: %{http_code}\n" \
      -s
    echo -e "\n---"
done

echo -e "\n============================================================="

# Test with different HTTP methods
echo "3. Testing different HTTP METHODS:"
echo "=== Testing GET method ==="
curl "$BASE_URL?action=processFieldSubmit&isAjax=true&frmId=6619&attId=11808&value=$VALUE" \
  -H "X-Requested-With: XMLHttpRequest" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s

echo -e "\n============================================================="

# Test with minimal headers
echo "4. Testing MINIMAL headers approach:"
echo "=== RESPONSE 4: Minimal Headers ==="
curl "$BASE_URL?action=processFieldSubmit&isAjax=true&frmId=6619&attId=11808" \
  --data-raw "value=$VALUE" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s

echo -e "\n============================================================="

# Test with different form IDs (enumeration)
echo "5. Testing FORM ID enumeration:"
form_ids=("6619" "6620" "6618" "6621" "6617")

for frmId in "${form_ids[@]}"; do
    echo "=== Testing frmId: $frmId ==="
    curl "$BASE_URL?action=processFieldSubmit&isAjax=true&frmId=$frmId&attId=11808" \
      -H "Content-type: application/x-www-form-urlencoded" \
      --data-raw "value=$VALUE" \
      -w "\n\nHTTP Status: %{http_code}\n" \
      -s
    echo -e "\n---"
done

echo -e "\n============================================================="

# Test with different attribute IDs
echo "6. Testing ATTRIBUTE ID enumeration:"
att_ids=("11808" "11807" "11809" "11810" "11806")

for attId in "${att_ids[@]}"; do
    echo "=== Testing attId: $attId ==="
    curl "$BASE_URL?action=processFieldSubmit&isAjax=true&frmId=6619&attId=$attId" \
      -H "Content-type: application/x-www-form-urlencoded" \
      --data-raw "value=$VALUE" \
      -w "\n\nHTTP Status: %{http_code}\n" \
      -s
    echo -e "\n---"
done

echo -e "\n============================================================="

# Test with original timestamp and tokens
echo "7. Testing with ORIGINAL tokens:"
echo "=== RESPONSE 7: Original Tokens ==="
curl "$BASE_URL?action=processFieldSubmit&isAjax=true&frmId=6619&attId=11808&timestamp=1752693548989&tokenId=1752693543502&tabId=1752693544034" \
  -H "Content-type: application/x-www-form-urlencoded" \
  -H "X-Requested-With: XMLHttpRequest" \
  --data-raw "value=$VALUE" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s

echo -e "\n============================================================="

# Test with different data formats
echo "8. Testing different DATA formats:"
echo "=== Testing JSON format ==="
curl "$BASE_URL?action=processFieldSubmit&isAjax=true&frmId=6619&attId=11808" \
  -H "Content-type: application/json" \
  --data-raw '{"value":"98297150"}' \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s

echo -e "\n---"
echo "=== Testing XML format ==="
curl "$BASE_URL?action=processFieldSubmit&isAjax=true&frmId=6619&attId=11808" \
  -H "Content-type: application/xml" \
  --data-raw '<value>98297150</value>' \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s

echo -e "\n============================================================="

# Test with different field names
echo "9. Testing different FIELD names:"
field_names=("value" "fieldValue" "inputValue" "data" "content")

for field in "${field_names[@]}"; do
    echo "=== Testing field: $field ==="
    curl "$BASE_URL?action=processFieldSubmit&isAjax=true&frmId=6619&attId=11808" \
      -H "Content-type: application/x-www-form-urlencoded" \
      --data-raw "$field=$VALUE" \
      -w "\n\nHTTP Status: %{http_code}\n" \
      -s
    echo -e "\n---"
done

echo -e "\n============================================================="

# Test with Accept headers
echo "10. Testing with specific ACCEPT headers:"
echo "=== Testing XML Accept header ==="
curl "$BASE_URL?action=processFieldSubmit&isAjax=true&frmId=6619&attId=11808" \
  -H "Content-type: application/x-www-form-urlencoded" \
  -H "Accept: application/xml, text/xml" \
  --data-raw "value=$VALUE" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s

echo -e "\n============================================================="
echo "Testing completed! Look for the response that matches:"
echo "<?xml version=\"1.0\" encoding=\"iso-8859-1\"?><result success=\"true\" />"
echo "============================================================="
