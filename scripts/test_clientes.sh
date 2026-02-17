#!/usr/bin/env bash
# scripts/test_clientes.sh
# Test búsqueda y creación de clientes (admin)
# Uso: BASE_URL=http://localhost:3000 TOKEN=<jwt> ./scripts/test_clientes.sh

set -euo pipefail
IFS=$'\n\t'

BASE_URL=${BASE_URL:-http://localhost:3000}
TOKEN=${TOKEN:-}
TIMEOUT=${TIMEOUT:-10}

if [ -z "$TOKEN" ]; then
  echo "SKIP: TOKEN no definido. Ejecuta con TOKEN=<jwt> para pruebas admin."
  exit 78
fi

# 1) Crear cliente
TS=$(date +%s)
PAYLOAD=$(jq -nc --arg name "ClienteTest-$TS" --arg tel "112233$TS" --arg email "clientetest$TS@example.com" '{ nombre: $name, telefono: $tel, email: $email }')
HTTP=$(curl -sS -m "$TIMEOUT" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$PAYLOAD" -o /tmp/cli_create -w "%{http_code}" "$BASE_URL/api/admin/clientes") || HTTP=000
if [[ ! "$HTTP" =~ ^2[0-9][0-9]$ ]]; then
  echo "FAIL: crear cliente -> HTTP $HTTP"; cat /tmp/cli_create; exit 2
fi
ID=$(jq -r .id /tmp/cli_create)
if [ -z "$ID" ] || [ "$ID" = "null" ]; then echo "FAIL: no se recibió id"; exit 2; fi

echo "OK: creado cliente id=$ID"

# 2) Buscar por nombre
HTTP=$(curl -sS -m "$TIMEOUT" -H "Authorization: Bearer $TOKEN" -o /tmp/cli_search -w "%{http_code}" "$BASE_URL/api/admin/clientes/search?q=ClienteTest-$TS") || HTTP=000
if [[ ! "$HTTP" =~ ^2[0-9][0-9]$ ]]; then
  echo "FAIL: buscar cliente -> HTTP $HTTP"; cat /tmp/cli_search; exit 2
fi

if jq -e --arg id "$ID" '[.[] | select(.id == ($id|tonumber))] | length > 0' /tmp/cli_search >/dev/null; then
  echo "OK: cliente aparece en búsqueda"
else
  echo "FAIL: cliente no aparece en búsqueda"; cat /tmp/cli_search; exit 2
fi

echo "\n✅ Test clientes OK"
exit 0
