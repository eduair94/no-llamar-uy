#!/bin/bash

# Advanced Session Acquisition Strategy
# Try different endpoints to find the correct authentication flow

echo "=== Advanced Session Acquisition Test ==="
echo "Trying different endpoints to find proper session for FormAction..."
echo "========================================================="

# Create cookie jar
COOKIE_JAR=$(mktemp)
echo "Using cookie jar: $COOKIE_JAR"

# Test different session endpoints
declare -a ENDPOINTS=(
    "https://tramites.ursec.gub.uy/tramites-en-linea/TramitesEnLinea/"
    "https://tramites.ursec.gub.uy/tramites-en-linea/TramitesEnLinea/apia.portal.PortalAction.run?dshId=1057"
    "https://tramites.ursec.gub.uy/tramites-en-linea/TramitesEnLinea/apia.execution.TaskAction.run?action=startCreationProcess&busEntId=3756&proId=1259"
    "https://tramites.ursec.gub.uy/tramites-en-linea/TramitesEnLinea/page/login/portal/login.jsp"
    "https://tramites.ursec.gub.uy/tramites-en-linea/TramitesEnLinea/apia.execution.TaskAction.run"
)

for endpoint in "${ENDPOINTS[@]}"; do
    echo ""
    echo "=== Testing endpoint: $endpoint ==="
    
    # Clear cookie jar
    rm -f "$COOKIE_JAR"
    COOKIE_JAR=$(mktemp)
    
    # Get session from endpoint
    SESSION_RESPONSE=$(curl -s -L -c "$COOKIE_JAR" -w "HTTP_CODE:%{http_code}" "$endpoint")
    HTTP_CODE=$(echo "$SESSION_RESPONSE" | grep -o 'HTTP_CODE:[0-9]*' | cut -d: -f2)
    echo "Response code: $HTTP_CODE"
    
    # Extract JSESSIONID
    if [ -f "$COOKIE_JAR" ]; then
        JSESSIONID=$(grep -o 'JSESSIONID[[:space:]]*[^[:space:]]*' "$COOKIE_JAR" | cut -f2)
        echo "JSESSIONID: $JSESSIONID"
        
        if [ -n "$JSESSIONID" ]; then
            echo "Testing this session with FormAction..."
            
            # Test with the extracted session
            FORM_RESPONSE=$(curl -s "https://tramites.ursec.gub.uy/tramites-en-linea/TramitesEnLinea//apia.execution.FormAction.run?action=processFieldSubmit&isAjax=true&frmId=6619&attId=11808" \
              -H "Content-type: application/x-www-form-urlencoded; charset=UTF-8" \
              -H "X-Requested-With: XMLHttpRequest" \
              -b "JSESSIONID=$JSESSIONID" \
              --data-raw "value=98297150" \
              -w "\nHTTP_STATUS:%{http_code}")
            
            echo "FormAction response:"
            echo "$FORM_RESPONSE"
            echo ""
            
            # Check if we got a different response
            if [[ "$FORM_RESPONSE" != *"Not Logged"* ]]; then
                echo "🎉 SUCCESS! Found working session!"
                echo "Working endpoint: $endpoint"
                echo "Working JSESSIONID: $JSESSIONID"
                break
            fi
        else
            echo "No JSESSIONID found in response"
        fi
    else
        echo "Cookie jar not created"
    fi
done

echo ""
echo "========================================================="

# Try accessing the TaskAction endpoint that was in the referer
echo "=== Testing TaskAction endpoint from original referer ==="
TASK_URL="https://tramites.ursec.gub.uy/tramites-en-linea/TramitesEnLinea//apia.execution.TaskAction.run?action=startCreationProcess&busEntId=3756&proId=1259"

echo "Getting session from TaskAction endpoint..."
rm -f "$COOKIE_JAR"
COOKIE_JAR=$(mktemp)

TASK_RESPONSE=$(curl -s -L -c "$COOKIE_JAR" -w "HTTP_CODE:%{http_code}" "$TASK_URL")
HTTP_CODE=$(echo "$TASK_RESPONSE" | grep -o 'HTTP_CODE:[0-9]*' | cut -d: -f2)
echo "TaskAction response code: $HTTP_CODE"

if [ -f "$COOKIE_JAR" ]; then
    JSESSIONID=$(grep -o 'JSESSIONID[[:space:]]*[^[:space:]]*' "$COOKIE_JAR" | cut -f2)
    echo "JSESSIONID from TaskAction: $JSESSIONID"
    
    if [ -n "$JSESSIONID" ]; then
        echo "Testing TaskAction session with FormAction..."
        
        # Test with all original parameters including timestamps
        CURRENT_TIMESTAMP=$(date +%s)000
        
        FORM_RESPONSE=$(curl -s "https://tramites.ursec.gub.uy/tramites-en-linea/TramitesEnLinea//apia.execution.FormAction.run?action=processFieldSubmit&isAjax=true&frmId=6619&frmParent=E&timestamp=$CURRENT_TIMESTAMP&attId=11808&index=0&tabId=$CURRENT_TIMESTAMP&tokenId=$CURRENT_TIMESTAMP" \
          -H "Accept: text/javascript, text/html, application/xml, text/xml, */*" \
          -H "Content-type: application/x-www-form-urlencoded; charset=UTF-8" \
          -H "X-Requested-With: XMLHttpRequest" \
          -H "Referer: https://tramites.ursec.gub.uy/tramites-en-linea/TramitesEnLinea//apia.execution.TaskAction.run?action=startCreationProcess&busEntId=3756&proId=1259&tokenId=$CURRENT_TIMESTAMP&tabId=$CURRENT_TIMESTAMP" \
          -b "JSESSIONID=$JSESSIONID" \
          --data-raw "value=98297150" \
          -w "\nHTTP_STATUS:%{http_code}")
        
        echo "FormAction response with full parameters:"
        echo "$FORM_RESPONSE"
        
        # Check if we got success
        if [[ "$FORM_RESPONSE" == *"success=\"true\""* ]]; then
            echo "🎉 SUCCESS! Found working combination!"
            echo "Working curl command:"
            echo "curl \"https://tramites.ursec.gub.uy/tramites-en-linea/TramitesEnLinea//apia.execution.FormAction.run?action=processFieldSubmit&isAjax=true&frmId=6619&frmParent=E&timestamp=$CURRENT_TIMESTAMP&attId=11808&index=0&tabId=$CURRENT_TIMESTAMP&tokenId=$CURRENT_TIMESTAMP\" \\"
            echo "  -H \"Accept: text/javascript, text/html, application/xml, text/xml, */*\" \\"
            echo "  -H \"Content-type: application/x-www-form-urlencoded; charset=UTF-8\" \\"
            echo "  -H \"X-Requested-With: XMLHttpRequest\" \\"
            echo "  -H \"Referer: https://tramites.ursec.gub.uy/tramites-en-linea/TramitesEnLinea//apia.execution.TaskAction.run?action=startCreationProcess&busEntId=3756&proId=1259&tokenId=$CURRENT_TIMESTAMP&tabId=$CURRENT_TIMESTAMP\" \\"
            echo "  -b \"JSESSIONID=$JSESSIONID\" \\"
            echo "  --data-raw \"value=98297150\""
        fi
    fi
fi

echo ""
echo "========================================================="

# Try a completely different approach - check if there's a public endpoint
echo "=== Testing for public/unauthenticated endpoints ==="

# Try without any session
echo "Testing without session cookie..."
NO_SESSION_RESPONSE=$(curl -s "https://tramites.ursec.gub.uy/tramites-en-linea/TramitesEnLinea//apia.execution.FormAction.run?action=processFieldSubmit&isAjax=true&frmId=6619&attId=11808" \
  -H "Content-type: application/x-www-form-urlencoded; charset=UTF-8" \
  --data-raw "value=98297150" \
  -w "\nHTTP_STATUS:%{http_code}")

echo "Response without session:"
echo "$NO_SESSION_RESPONSE"

# Try different form/attribute IDs
echo ""
echo "Testing different form/attribute ID combinations..."
for FRM_ID in 6619 1 0 6618 6620; do
    for ATT_ID in 11808 1 0 11807 11809; do
        echo "Testing frmId=$FRM_ID, attId=$ATT_ID"
        
        RESPONSE=$(curl -s "https://tramites.ursec.gub.uy/tramites-en-linea/TramitesEnLinea//apia.execution.FormAction.run?action=processFieldSubmit&isAjax=true&frmId=$FRM_ID&attId=$ATT_ID" \
          -H "Content-type: application/x-www-form-urlencoded; charset=UTF-8" \
          --data-raw "value=98297150" \
          -w "\nHTTP_STATUS:%{http_code}")
        
        if [[ "$RESPONSE" == *"success=\"true\""* ]]; then
            echo "🎉 SUCCESS! Found working combination without session!"
            echo "frmId=$FRM_ID, attId=$ATT_ID"
            echo "Response: $RESPONSE"
            break 2
        elif [[ "$RESPONSE" != *"Not Logged"* && "$RESPONSE" != *"invalid"* ]]; then
            echo "Different response (not 'Not Logged'): $RESPONSE"
        fi
    done
done

# Cleanup
rm -f "$COOKIE_JAR"

echo ""
echo "========================================================="
echo "Testing completed! Check above for any success responses."
echo "Target: <?xml version=\"1.0\" encoding=\"iso-8859-1\"?><result success=\"true\" />"
echo "========================================================"
