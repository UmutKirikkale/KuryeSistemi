#!/bin/bash
set -e

BASE="http://localhost:5001"

# Admin token
TOKEN=$(curl -s -X POST $BASE/api/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@test.com","password":"123456"}' | jq -r '.token')
echo "Admin token: ${TOKEN:0:30}..."

# Create test restaurant
echo ""
echo "Creating test restaurant..."
RESP=$(curl -s -X POST $BASE/api/auth/register -H 'Content-Type: application/json' -d '{
  "email": "delete-test-4@test.com",
  "password": "123456",
  "name": "Test Res 4",
  "role": "RESTAURANT",
  "restaurantData": {"name": "Test Res 4", "address": "TX", "phone": "+905551234567", "commissionPerOrder": 50}
}')
USER_ID=$(echo $RESP | jq -r '.user.id')
echo "User ID: ${USER_ID:0:8}..."

# Get restaurants list to find restaurant ID
echo ""
echo "Getting restaurant ID..."
RESP=$(curl -s -X GET "$BASE/api/admin/restaurants" -H "Authorization: Bearer $TOKEN")
REST_ID=$(echo $RESP | jq -r ".restaurants[] | select(.user.id==\"$USER_ID\") | .id")
echo "Restaurant ID: ${REST_ID:0:8}..."

# Delete restaurant
echo ""
echo "Deleting restaurant..."
curl -s -X DELETE "$BASE/api/admin/restaurants/$REST_ID" -H "Authorization: Bearer $TOKEN" -w '\nStatus: %{http_code}\n' | jq '.'
