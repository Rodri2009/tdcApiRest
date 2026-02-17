#!/usr/bin/env bash
# scripts/test_profesionales.sh
# Test crear profesional vinculando a cliente
# Uso: BASE_URL=http://localhost:3000 TOKEN=<jwt> ./scripts/test_profesionales.sh

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
PAYLOAD_C=$(jq -nc --arg name "CliProf-$TS" --arg tel "115000$TS" --arg email "cli_prof$TS@example.com" '{ nombre: $name, telefono: $tel, email: $email }')
HTTP=$(curl -sS -m "$TIMEOUT" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$PAYLOAD_C" -o /tmp/cli_create -w "%{http_code}" "$BASE_URL/api/admin/clientes") || HTTP=000
if [[ ! "$HTTP" =~ ^2[0-9][0-9]$ ]]; then echo "FAIL: crear cliente -> HTTP $HTTP"; cat /tmp/cli_create; exit 2; fi
CLIENTE_ID=$(jq -r .id /tmp/cli_create)

# Crear profesional vinculado
PAYLOAD_P=$(jq -nc --arg name "Prof-$TS" --arg esp "Masajes" --arg tel "115000$TS" --arg email "prof$TS@example.com" --arg cid "$CLIENTE_ID" '{ nombre: $name, especialidad: $esp, telefono: $tel, email: $email, cliente_id: ($cid|tonumber) }')
HTTP=$(curl -sS -m "$TIMEOUT" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$PAYLOAD_P" -o /tmp/prof_create -w "%{http_code}" "$BASE_URL/api/servicios/profesionales") || HTTP=000
if [[ ! "$HTTP" =~ ^2[0-9][0-9]$ ]]; then echo "FAIL: crear profesional -> HTTP $HTTP"; cat /tmp/prof_create; exit 2; fi
PROFESIONAL_ID=$(jq -r .id /tmp/prof_create)

# Verificar profesional tiene cliente_id
HTTP=$(curl -sS -m "$TIMEOUT" -H "Authorization: Bearer $TOKEN" -o /tmp/prof_get -w "%{http_code}" "$BASE_URL/api/servicios/profesionales/$PROFESIONAL_ID") || HTTP=000
if [[ ! "$HTTP" =~ ^2[0-9][0-9]$ ]]; then echo "FAIL: obtener profesional -> HTTP $HTTP"; cat /tmp/prof_get; exit 2; fi
if jq -e --arg cid "$CLIENTE_ID" '.cliente_id == ($cid|tonumber) ' /tmp/prof_get >/dev/null; then
  echo "OK: profesional tiene cliente_id=$CLIENTE_ID"
else
  echo "FAIL: cliente_id no asociado correctamente"; cat /tmp/prof_get; exit 2
fi

echo "\n✅ Test profesionales OK"
exit 0
