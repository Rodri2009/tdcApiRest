#!/usr/bin/env bash
# scripts/test_precios.sh
# Integration-ish tests for precios endpoint
# Usage: BASE_URL=http://localhost:3000 ./scripts/test_precios.sh

set -euo pipefail
BASE_URL=${BASE_URL:-http://localhost:3000}
EMAIL=${EMAIL:-rodrigo@rodrigo}
PASS=${PASS:-rodrigo}

echo "Login..."
RESP=$(curl -sS -X POST "$BASE_URL/api/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")
TOKEN=$(echo "$RESP" | jq -r .token)
if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "ERROR: could not obtain token" >&2
  exit 2
fi

echo "Fetching tipos..."
TIPOS=$(curl -sS -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/admin/alquiler/tipos")
TIPO_ID=$(echo "$TIPOS" | jq -r '.[0].id // empty')
if [ -z "$TIPO_ID" ]; then
  echo "ERROR: no tipos available" >&2
  exit 2
fi

echo "Using tipo id: $TIPO_ID"

# 1) Valid create
PAYLOAD_VALID=$(jq -n --arg t "$TIPO_ID" '{id_tipo_evento: $t, cantidad_min: 1, cantidad_max: 5, precio_por_hora: 1500}')
HTTP=$(curl -sS -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/admin/alquiler/precios" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$PAYLOAD_VALID")
if [ "$HTTP" != "201" ]; then
  echo "FAIL: expected 201 for valid create, got $HTTP" >&2
  exit 3
fi

echo "Valid create OK"

# 2) Invalid create (min > max)
PAYLOAD_BAD=$(jq -n --arg t "$TIPO_ID" '{id_tipo_evento: $t, cantidad_min: 10, cantidad_max: 5, precio_por_hora: 1500}')
HTTP=$(curl -sS -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/admin/alquiler/precios" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$PAYLOAD_BAD")
if [ "$HTTP" != "400" ]; then
  echo "FAIL: expected 400 for min>max, got $HTTP" >&2
  exit 4
fi

echo "Invalid create (min>max) OK"

# 3) Missing fields
PAYLOAD_MISS=$(jq -n --arg t "$TIPO_ID" '{id_tipo_evento: $t, cantidad_min: 1}')
HTTP=$(curl -sS -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/admin/alquiler/precios" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$PAYLOAD_MISS")
if [ "$HTTP" != "400" ]; then
  echo "FAIL: expected 400 for missing fields, got $HTTP" >&2
  exit 5
fi

echo "Missing fields test OK"

echo "All precio tests passed"