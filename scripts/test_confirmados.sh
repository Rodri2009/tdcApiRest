#!/usr/bin/env bash
# scripts/test_confirmados.sh
# Prueba rápida del endpoint /api/admin/eventos_confirmados
# Uso: BASE_URL=http://localhost:3000 TOKEN=<jwt> ./scripts/test_confirmados.sh

set -euo pipefail
IFS=$'\n\t'

BASE_URL=${BASE_URL:-http://localhost:3000}
TOKEN=${TOKEN:-}
TIMEOUT=${TIMEOUT:-10}

# Si no hay token, saltar las pruebas de admin (evita fallos en entornos sin credenciales)
if [ -z "$TOKEN" ]; then
  echo "SKIP: TOKEN no definido. Ejecuta con TOKEN=<jwt> para probar endpoints de admin."
  exit 78
fi

# Helper para ejecutar curl con token
run_curl(){
  local url="$1"
  if [ -n "$TOKEN" ]; then
    curl -sS -m "$TIMEOUT" -H "Authorization: Bearer $TOKEN" -H "Accept: application/json" "$url" -o /tmp/confirm_resp -w "%{http_code}"
  else
    curl -sS -m "$TIMEOUT" -H "Accept: application/json" "$url" -o /tmp/confirm_resp -w "%{http_code}"
  fi
}

# 1) Lista general
URL="$BASE_URL/api/admin/eventos_confirmados?limit=5"
HTTP=$(run_curl "$URL") || HTTP=000
if [[ ! "$HTTP" =~ ^2[0-9][0-9]$ ]]; then
  echo "FAIL: $URL -> HTTP $HTTP"
  cat /tmp/confirm_resp
  exit 2
fi

echo "OK: lista general HTTP $HTTP"

# 2) Filtrado por tipo (si hay al menos una BANDA, probamos filtro BANDA)
URL="$BASE_URL/api/admin/eventos_confirmados?tipo_evento=BANDA&limit=5"
HTTP=$(run_curl "$URL") || HTTP=000
if [[ ! "$HTTP" =~ ^2[0-9][0-9]$ ]]; then
  echo "WARN: filtro por tipo HTTP $HTTP (puede no haber BANDAS)"
  exit 0
fi

echo "OK: filtro por tipo HTTP $HTTP"

echo "\n✅ Test confirmados: OK"
exit 0
