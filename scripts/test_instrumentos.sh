#!/usr/bin/env bash
# scripts/test_instrumentos.sh
# Test CRUD para /api/admin/bandas/instrumentos
# Uso: BASE_URL=http://localhost:3000 TOKEN=<jwt> ./scripts/test_instrumentos.sh

set -euo pipefail
IFS=$'\n\t'

BASE_URL=${BASE_URL:-http://localhost:3000}
TOKEN=${TOKEN:-}
TIMEOUT=${TIMEOUT:-10}

if [ -z "$TOKEN" ]; then
  echo "SKIP: TOKEN no definido. Ejecuta con TOKEN=<jwt> para pruebas admin."
  exit 78
fi

# 1) Crear instrumento
TS=$(date +%s)
PAYLOAD=$(jq -nc --arg name "PruebaInst-$TS" '{ nombre: $name, categoria: "Otros", icono: "fa-music" }')

HTTP=$(curl -sS -m "$TIMEOUT" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$PAYLOAD" -o /tmp/inst_create -w "%{http_code}" "$BASE_URL/api/admin/bandas/instrumentos") || HTTP=000
if [[ ! "$HTTP" =~ ^2[0-9][0-9]$ ]]; then
  echo "FAIL: crear instrumento -> HTTP $HTTP"; cat /tmp/inst_create; exit 2
fi

ID=$(jq -r .id /tmp/inst_create)
if [ -z "$ID" ] || [ "$ID" = "null" ]; then echo "FAIL: no se recibió id"; cat /tmp/inst_create; exit 2; fi

echo "OK: creado instrumento id=$ID"

# 2) Actualizar
PAYLOAD_UPD='{"nombre":"PruebaInst-UPDATED","categoria":"Cuerdas"}'
HTTP=$(curl -sS -m "$TIMEOUT" -X PUT -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$PAYLOAD_UPD" -o /tmp/inst_upd -w "%{http_code}" "$BASE_URL/api/admin/bandas/instrumentos/$ID") || HTTP=000
if [[ ! "$HTTP" =~ ^2[0-9][0-9]$ ]]; then
  echo "FAIL: actualizar instrumento -> HTTP $HTTP"; cat /tmp/inst_upd; exit 2
fi

echo "OK: actualizado instrumento"

# 3) Eliminar
HTTP=$(curl -sS -m "$TIMEOUT" -X DELETE -H "Authorization: Bearer $TOKEN" -o /tmp/inst_del -w "%{http_code}" "$BASE_URL/api/admin/bandas/instrumentos/$ID") || HTTP=000
if [[ ! "$HTTP" =~ ^2[0-9][0-9]$ ]]; then
  echo "FAIL: eliminar instrumento -> HTTP $HTTP"; cat /tmp/inst_del; exit 2
fi

echo "OK: eliminado instrumento id=$ID"

echo "\n✅ Test instrumentos OK"
exit 0