#!/bin/bash

# Test script for the complete postcard API flow

echo "============================================"
echo "FAM MAIL COMPLETE END-TO-END API TEST"
echo "============================================"

# Test data
SAMPLE_IMAGE="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="

SAMPLE_ADDRESS='{
  "firstName": "Test",
  "lastName": "User",
  "addressLine1": "123 Test Street",
  "addressLine2": "Apt 4B",
  "city": "Testville",
  "provinceOrState": "TS",
  "postalOrZip": "12345",
  "country": "United States",
  "countryCode": "US"
}'

SAMPLE_MESSAGE="Hello from the test! This is a comprehensive **end-to-end** verification with *markdown* support."

SAMPLE_POSTCARD_DATA="{
  \"to\": $(echo $SAMPLE_ADDRESS),
  \"frontHTML\": \"<!DOCTYPE html><html><body style='width:100%;height:100%;margin:0;padding:0;background:white;'><img src='$SAMPLE_IMAGE' alt='Test Image' style='width:100%;height:100%;object-fit:cover;'></body></html>\",
  \"message\": \"$SAMPLE_MESSAGE\",
  \"size\": \"6x4\"
}"

echo -e "\n1. Testing Backend Health Endpoint..."
curl -s http://localhost:3001/api/health | jq '.' || echo "Backend not responding on port 3001"

echo -e "\n2. Testing Postcard Creation Endpoint..."
echo "Request data:"
echo "$SAMPLE_POSTCARD_DATA" | jq '.'

RESPONSE=$(curl -s -X POST http://localhost:3001/api/postcards \
  -H "Content-Type: application/json" \
  -d "$SAMPLE_POSTCARD_DATA")

echo -e "\nResponse:"
echo "$RESPONSE" | jq '.' || echo "$RESPONSE"

echo -e "\n3. Analyzing Response..."
if echo "$RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    echo "✅ SUCCESS: Postcard creation successful!"
    echo "Postcard ID: $(echo "$RESPONSE" | jq -r '.postcard.id // "N/A"')"
    echo "Status: $(echo "$RESPONSE" | jq -r '.postcard.status // "N/A"')"
    echo "Test Mode: $(echo "$RESPONSE" | jq -r '.testMode // "N/A"')"
else
    echo "❌ ERROR: Postcard creation failed"
    echo "Error: $(echo "$RESPONSE" | jq -r '.error // "Unknown error"')"
fi

echo -e "\n============================================"
echo "API TEST COMPLETE"
echo "============================================"