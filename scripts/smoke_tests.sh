#!/usr/bin/env bash
# scripts/smoke_tests.sh
# Smoke tests rápidos para verificar endpoints críticos.
# Uso:
#   BASE_URL=http://localhost:3000 TOKEN=<jwt> ./scripts/smoke_tests.sh
# Devuelve 0 si todos pasan, >0 si alguno falla.

set -euo pipefail
IFS=$'\n\t'

BASE_URL=${BASE_URL:-http://localhost:3000}
TOKEN=${TOKEN:-}
TIMEOUT=${TIMEOUT:-10}

# Lista de endpoints a comprobar (método GET, sin mutaciones)
declare -a ENDPOINTS=(
  "/"
  "/health"
  "/api/admin/alquiler/precios?vigentes=1"
  "/api/admin/alquiler/duraciones"
  "/api/admin/alquiler/tipos"
  "/api/admin/personal"
  "/api/admin/bandas/instrumentos"
  "/api/admin/eventos_confirmados"
  "/api/eventos/publicos"
)

# Prints a header
echo "-- Smoke tests: $BASE_URL --"

fail_count=0

for ep in "${ENDPOINTS[@]}"; do
  url="$BASE_URL$ep"
  printf "Checking %-48s " "$ep"

  # Build curl command
  headers=(-sS -m "$TIMEOUT" -w "%{http_code}" -o /tmp/smoke_resp)
  if [ -n "$TOKEN" ]; then
    headers+=( -H "Authorization: Bearer $TOKEN" )
  fi
  headers+=( -H "Accept: application/json" )

  http_code=$(curl "${headers[@]}" "$url" 2>/dev/null | tr -d '\n') || http_code="000"

  if [[ "$http_code" =~ ^2[0-9][0-9]$ ]]; then
    # Try to parse JSON if possible
    if command -v jq >/dev/null 2>&1; then
      if jq -e . >/dev/null 2>&1 < /tmp/smoke_resp; then
        printf "OK (HTTP %s, valid JSON)\n" "$http_code"
      else
        printf "WARN (HTTP %s, invalid JSON)\n" "$http_code"
        fail_count=$((fail_count+1))
        echo "---- response:"
        sed -n '1,200p' /tmp/smoke_resp
      fi
    else
      printf "OK (HTTP %s)\n" "$http_code"
    fi
  else
    printf "FAIL (HTTP %s)\n" "$http_code"
    fail_count=$((fail_count+1))
    echo "---- response (first 200 chars):"
    head -c 200 /tmp/smoke_resp || true
    echo
  fi
done

if [ $fail_count -eq 0 ]; then
  echo "\n✅ Smoke tests PASSED: $BASE_URL"
  exit 0
else
  echo "\n❌ Smoke tests FAILED: $fail_count endpoint(s) con errores"
  exit 2
fi
