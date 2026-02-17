#!/usr/bin/env bash
# scripts/test_talleristas.sh
# Test crear tallerista vinculando a cliente
# Uso: BASE_URL=http://localhost:3000 TOKEN=<jwt> ./scripts/test_talleristas.sh

set -euo pipefail
IFS=$'\n\t'

BASE_URL=${BASE_URL:-http://localhost:3000}
TOKEN=${TOKEN:-}
TIMEOUT=${TIMEOUT:-10}

if [ -z "$TOKEN" ]; then
  echo "SKIP: TOKEN no definido. Ejecuta con TOKEN=<jwt> para pruebas admin."
  exit 78
fi

# Crear cliente
TS=$(date +%s)
PAYLOAD_C=$(jq -nc --arg name "CliTaller-$TS" --arg tel "115000$TS" --arg email "cli$TS@example.com" '{ nombre: $name, telefono: $tel, email: $email }')
HTTP=$(curl -sS -m "$TIMEOUT" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$PAYLOAD_C" -o /tmp/cli_create -w "%{http_code}" "$BASE_URL/api/admin/clientes") || HTTP=000
if [[ ! "$HTTP" =~ ^2[0-9][0-9]$ ]]; then echo "FAIL: crear cliente -> HTTP $HTTP"; cat /tmp/cli_create; exit 2; fi
CLIENTE_ID=$(jq -r .id /tmp/cli_create)

# Crear tallerista vinculado
PAYLOAD_T=$(jq -nc --arg name "Tallerista-$TS" --arg esp "Yoga" --arg tel "115000$TS" --arg email "tallerista$TS@example.com" --arg cid "$CLIENTE_ID" '{ nombre: $name, especialidad: $esp, telefono: $tel, email: $email, cliente_id: ($cid|tonumber) }')
HTTP=$(curl -sS -m "$TIMEOUT" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$PAYLOAD_T" -o /tmp/taller_create -w "%{http_code}" "$BASE_URL/api/talleres/talleristas") || HTTP=000
if [[ ! "$HTTP" =~ ^2[0-9][0-9]$ ]]; then echo "FAIL: crear tallerista -> HTTP $HTTP"; cat /tmp/taller_create; exit 2; fi
TALLERISTA_ID=$(jq -r .id /tmp/taller_create)

# Verificar tallerista tiene cliente_id
HTTP=$(curl -sS -m "$TIMEOUT" -H "Authorization: Bearer $TOKEN" -o /tmp/taller_get -w "%{http_code}" "$BASE_URL/api/talleres/talleristas/$TALLERISTA_ID") || HTTP=000
if [[ ! "$HTTP" =~ ^2[0-9][0-9]$ ]]; then echo "FAIL: obtener tallerista -> HTTP $HTTP"; cat /tmp/taller_get; exit 2; fi
if jq -e --arg cid "$CLIENTE_ID" '.cliente_id == ($cid|tonumber) ' /tmp/taller_get >/dev/null; then
  echo "OK: tallerista tiene cliente_id=$CLIENTE_ID"
else
  echo "FAIL: cliente_id no asociado correctamente"; cat /tmp/taller_get; exit 2
fi

echo "\n✅ Test talleristas OK"
exit 0
