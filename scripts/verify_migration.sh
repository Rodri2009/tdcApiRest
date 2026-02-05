#!/usr/bin/env bash
set -euo pipefail

# verify_migration.sh
# Verifica que la migración a `eventos_confirmados` está completa:
# - endpoints nuevos responden
# - endpoints legacy NO responden (404)
# - no quedan referencias en el código a `fechas_bandas_confirmadas` (salvo migraciones/documentación)

BASE_URL="http://localhost"
EMAIL="rodrigo@rodrigo"
PASS="rodrigo"

echo "[verify] Autenticando..."
TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" | jq -r '.token')
if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "[verify] ERROR: No se pudo obtener token de auth" >&2
  exit 2
fi

check() {
  local method=$1; shift
  local path=$1; shift
  local expect=$1; shift

  echo -n "[verify] $method $path -> expecting $expect... "
  local resp
  if [ "$method" = "GET" ]; then
    resp=$(curl -s -o /dev/stderr -w "%{http_code}" -X GET "$BASE_URL$path" -H "Authorization: Bearer $TOKEN") || resp=$?
  else
    resp=$(curl -s -o /dev/stderr -w "%{http_code}" -X $method "$BASE_URL$path" -H "Authorization: Bearer $TOKEN") || resp=$?
  fi
  if [ "$resp" = "$expect" ]; then
    echo "OK"
    return 0
  else
    echo "FAIL (got $resp)"
    return 1
  fi
}

errors=0

# 1) New endpoints should respond 200
check GET /api/admin/eventos_confirmados/1 200 || errors=$((errors+1))
check GET /api/tickets/eventos_confirmados 200 || errors=$((errors+1))

# 2) Legacy endpoints SHOULD NOT exist (expecting 404). If they still respond, report WARNING but continue.
WARNINGS=0
# Legacy endpoints MUST NOT exist (expecting 404)
if check GET /api/admin/fechas_bandas_confirmadas/1 404; then
  :
else
  echo "[verify] FAILURE: legacy admin endpoint still responds (expected 404)." >&2
  errors=$((errors+1))
fi
if check GET /api/tickets/fechas_bandas_confirmadas 404; then
  :
else
  echo "[verify] FAILURE: legacy tickets endpoint still responds (expected 404)." >&2
  errors=$((errors+1))
fi

# 3) Search for references in source (excluding docs/migrations and schema)
echo -n "[verify] Buscando referencias a fechas_bandas_confirmadas en código (excluyendo migrations/docs/schema)... "
if grep -R "fechas_bandas_confirmadas" --exclude-dir=database/migrations --exclude-dir=migrations --exclude-dir=.git --exclude-dir=scripts --exclude=REFACTORIZACION_SOLICITUDES.md --exclude=README.md --exclude=01_schema.sql --exclude=03_test_data.sql --exclude=nginx.conf --exclude=verify_migration.sh -n . | wc -l | grep -q "0"; then
  echo "OK"
else
  echo "FOUND"; grep -R "fechas_bandas_confirmadas" --exclude-dir=database/migrations --exclude-dir=migrations --exclude-dir=.git --exclude-dir=scripts --exclude=REFACTORIZACION_SOLICITUDES.md --exclude=README.md --exclude=01_schema.sql --exclude=03_test_data.sql --exclude=nginx.conf --exclude=verify_migration.sh -n .
  errors=$((errors+1))
fi

if [ "$errors" -ne 0 ]; then
  echo "[verify] VERIFICACIÓN FALLIDA: hay $errors problema(s)." >&2
  exit 3
fi

if [ "$WARNINGS" -ne 0 ]; then
  echo "[verify] VERIFICACIÓN PASÓ CON ADVERTENCIAS: $WARNINGS advertencia(s)." >&2
  exit 2
fi

if [ "$errors" -ne 0 ]; then
  echo "[verify] VERIFICACIÓN FALLIDA: hay $errors problema(s)." >&2
  exit 3
fi

echo "[verify] Verificación pasada: migración y limpieza OK." 
exit 0
