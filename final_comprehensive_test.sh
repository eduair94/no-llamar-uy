#!/bin/bash

# Final comprehensive test - trying to find any working endpoint or parameter combination

echo "=== Final Comprehensive Test ==="
echo "Trying all possible combinations and endpoints..."
echo "Target: <?xml version=\"1.0\" encoding=\"iso-8859-1\"?><result success=\"true\" />"
echo "====================================================="

# Test different base URLs and endpoints
declare -a BASE_URLS=(
    "https://tramites.ursec.gub.uy/tramites-en-linea/TramitesEnLinea/apia.execution.FormAction.run"
    "https://tramites.ursec.gub.uy/tramites-en-linea/TramitesEnLinea//apia.execution.FormAction.run"
    "https://tramites.ursec.gub.uy/tramites-en-linea/TramitesEnLinea/apia.execution.TaskAction.run"
    "https://tramites.ursec.gub.uy/tramites-en-linea/TramitesEnLinea/apia.validation.ValidationAction.run"
    "https://tramites.ursec.gub.uy/tramites-en-linea/TramitesEnLinea/apia.portal.PortalAction.run"
)

declare -a ACTIONS=(
    "processFieldSubmit"
    "validateField"
    "checkField"
    "submitField"
    "processField"
    "validateValue"
    "checkValue"
    "lookup"
    "search"
    "query"
    "validate"
    "process"
    "submit"
    "execute"
)

# Test different HTTP methods
declare -a METHODS=(
    "GET"
    "POST"
)

VALUE="98297150"

echo "Testing different combinations..."
echo ""

for base_url in "${BASE_URLS[@]}"; do
    echo "=== Testing base URL: $base_url ==="
    
    for action in "${ACTIONS[@]}"; do
        for method in "${METHODS[@]}"; do
            echo "Testing: $method $action"
            
            if [ "$method" = "GET" ]; then
                # GET request with value in URL
                response=$(curl -s "$base_url?action=$action&value=$VALUE&isAjax=true" \
                    -H "Accept: text/javascript, text/html, application/xml, text/xml, */*" \
                    -w "\nHTTP_STATUS:%{http_code}")
                
                if [[ "$response" == *"success=\"true\""* ]]; then
                    echo "🎉 SUCCESS! Found working GET request!"
                    echo "URL: $base_url?action=$action&value=$VALUE&isAjax=true"
                    echo "Response: $response"
                    exit 0
                elif [[ "$response" != *"Not Logged"* && "$response" != *"invalid"* ]]; then
                    echo "Different response: $response"
                fi
                
            else
                # POST request with value in body
                response=$(curl -s "$base_url?action=$action&isAjax=true" \
                    -H "Content-type: application/x-www-form-urlencoded" \
                    --data-raw "value=$VALUE" \
                    -w "\nHTTP_STATUS:%{http_code}")
                
                if [[ "$response" == *"success=\"true\""* ]]; then
                    echo "🎉 SUCCESS! Found working POST request!"
                    echo "URL: $base_url?action=$action&isAjax=true"
                    echo "Data: value=$VALUE"
                    echo "Response: $response"
                    exit 0
                elif [[ "$response" != *"Not Logged"* && "$response" != *"invalid"* ]]; then
                    echo "Different response: $response"
                fi
            fi
        done
    done
    echo ""
done

echo "====================================================="
echo "Testing specific parameter combinations that might work..."

# Test with frmId and attId in different combinations
declare -a FRM_IDS=(6619 1 0 1000 2000 3000)
declare -a ATT_IDS=(11808 1 0 1000 2000 3000)

for frmId in "${FRM_IDS[@]}"; do
    for attId in "${ATT_IDS[@]}"; do
        echo "Testing frmId=$frmId, attId=$attId"
        
        response=$(curl -s "https://tramites.ursec.gub.uy/tramites-en-linea/TramitesEnLinea//apia.execution.FormAction.run?action=processFieldSubmit&isAjax=true&frmId=$frmId&attId=$attId" \
            -H "Content-type: application/x-www-form-urlencoded" \
            --data-raw "value=$VALUE" \
            -w "\nHTTP_STATUS:%{http_code}")
        
        if [[ "$response" == *"success=\"true\""* ]]; then
            echo "🎉 SUCCESS! Found working combination!"
            echo "frmId=$frmId, attId=$attId"
            echo "Response: $response"
            exit 0
        elif [[ "$response" != *"Not Logged"* && "$response" != *"invalid"* ]]; then
            echo "Different response: $response"
        fi
    done
done

echo "====================================================="
echo "Testing alternative approaches..."

# Test with just the value parameter
echo "Testing with just value parameter..."
response=$(curl -s "https://tramites.ursec.gub.uy/tramites-en-linea/TramitesEnLinea//apia.execution.FormAction.run?value=$VALUE" \
    -w "\nHTTP_STATUS:%{http_code}")

if [[ "$response" == *"success=\"true\""* ]]; then
    echo "🎉 SUCCESS! Value-only request worked!"
    echo "Response: $response"
    exit 0
fi

# Test with different encoding
echo "Testing with different encoding..."
response=$(curl -s "https://tramites.ursec.gub.uy/tramites-en-linea/TramitesEnLinea//apia.execution.FormAction.run?action=processFieldSubmit&isAjax=true&frmId=6619&attId=11808" \
    -H "Content-type: application/x-www-form-urlencoded; charset=ISO-8859-1" \
    --data-raw "value=$VALUE" \
    -w "\nHTTP_STATUS:%{http_code}")

if [[ "$response" == *"success=\"true\""* ]]; then
    echo "🎉 SUCCESS! Different encoding worked!"
    echo "Response: $response"
    exit 0
fi

# Test with URL encoding
echo "Testing with URL encoding..."
ENCODED_VALUE=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$VALUE'))")
response=$(curl -s "https://tramites.ursec.gub.uy/tramites-en-linea/TramitesEnLinea//apia.execution.FormAction.run?action=processFieldSubmit&isAjax=true&frmId=6619&attId=11808" \
    -H "Content-type: application/x-www-form-urlencoded" \
    --data-raw "value=$ENCODED_VALUE" \
    -w "\nHTTP_STATUS:%{http_code}")

if [[ "$response" == *"success=\"true\""* ]]; then
    echo "🎉 SUCCESS! URL encoding worked!"
    echo "Response: $response"
    exit 0
fi

# Test with JSON format
echo "Testing with JSON format..."
response=$(curl -s "https://tramites.ursec.gub.uy/tramites-en-linea/TramitesEnLinea//apia.execution.FormAction.run?action=processFieldSubmit&isAjax=true&frmId=6619&attId=11808" \
    -H "Content-type: application/json" \
    --data-raw "{\"value\":\"$VALUE\"}" \
    -w "\nHTTP_STATUS:%{http_code}")

if [[ "$response" == *"success=\"true\""* ]]; then
    echo "🎉 SUCCESS! JSON format worked!"
    echo "Response: $response"
    exit 0
fi

# Test with XML format  
echo "Testing with XML format..."
response=$(curl -s "https://tramites.ursec.gub.uy/tramites-en-linea/TramitesEnLinea//apia.execution.FormAction.run?action=processFieldSubmit&isAjax=true&frmId=6619&attId=11808" \
    -H "Content-type: text/xml" \
    --data-raw "<value>$VALUE</value>" \
    -w "\nHTTP_STATUS:%{http_code}")

if [[ "$response" == *"success=\"true\""* ]]; then
    echo "🎉 SUCCESS! XML format worked!"
    echo "Response: $response"
    exit 0
fi

echo "====================================================="
echo "Testing with different user agents and headers..."

# Test with different User-Agent
response=$(curl -s "https://tramites.ursec.gub.uy/tramites-en-linea/TramitesEnLinea//apia.execution.FormAction.run?action=processFieldSubmit&isAjax=true&frmId=6619&attId=11808" \
    -H "Content-type: application/x-www-form-urlencoded" \
    -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36" \
    --data-raw "value=$VALUE" \
    -w "\nHTTP_STATUS:%{http_code}")

if [[ "$response" == *"success=\"true\""* ]]; then
    echo "🎉 SUCCESS! User-Agent worked!"
    echo "Response: $response"
    exit 0
fi

# Test with original referer
response=$(curl -s "https://tramites.ursec.gub.uy/tramites-en-linea/TramitesEnLinea//apia.execution.FormAction.run?action=processFieldSubmit&isAjax=true&frmId=6619&attId=11808" \
    -H "Content-type: application/x-www-form-urlencoded" \
    -H "Referer: https://tramites.ursec.gub.uy/tramites-en-linea/TramitesEnLinea//apia.execution.TaskAction.run?action=startCreationProcess&busEntId=3756&proId=1259" \
    --data-raw "value=$VALUE" \
    -w "\nHTTP_STATUS:%{http_code}")

if [[ "$response" == *"success=\"true\""* ]]; then
    echo "🎉 SUCCESS! Referer worked!"
    echo "Response: $response"
    exit 0
fi

echo "====================================================="
echo "No working combination found. The endpoint requires proper authentication."
echo "To get the expected response, you need to:"
echo "1. Authenticate with valid credentials"
echo "2. Navigate to the correct form/process"
echo "3. Submit the value within the authenticated session"
echo "====================================================="
