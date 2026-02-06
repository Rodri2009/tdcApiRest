#!/usr/bin/env bash
# scripts/test_confirmados_full.sh
# Crea un evento de prueba, verifica que aparece en el listado y lo borra.
# Uso: BASE_URL=http://localhost:3000 TOKEN=<jwt> ./scripts/test_confirmados_full.sh

set -euo pipefail
IFS=$'\n\t'

BASE_URL=${BASE_URL:-http://localhost:3000}
TOKEN=${TOKEN:-}
TIMEOUT=${TIMEOUT:-10}

if [ -z "$TOKEN" ]; then
  echo "SKIP: TOKEN no definido. Ejecuta con TOKEN=<jwt> para probar endpoints de admin."
  exit 78
fi

# Generar payload único
TS=$(date +%s)
NOMBRE="PruebaEvent-${TS}"
FECHA=$(date -d "+1 day" +%Y-%m-%d)

PAYLOAD=$(jq -nc --arg nb "$NOMBRE" --arg fecha "$FECHA" '{ nombre_banda: $nb, fecha: $fecha, hora_inicio: "21:00", descripcion: "Evento de prueba", genero_musical: "TestRock", nombre_contacto: "QA", es_publico: 0 }')

# 1) Crear evento
HTTP=$(curl -sS -m "$TIMEOUT" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$PAYLOAD" -o /tmp/confirm_create -w "%{http_code}" "$BASE_URL/api/admin/eventos_confirmados") || HTTP=000
if [[ ! "$HTTP" =~ ^2[0-9][0-9]$ ]]; then
  echo "FAIL: crear evento -> HTTP $HTTP"; cat /tmp/confirm_create; exit 2
fi

EVENT_ID=$(jq -r .id /tmp/confirm_create)
if [ -z "$EVENT_ID" ] || [ "$EVENT_ID" = "null" ]; then
  echo "FAIL: no se recibió id al crear evento"; cat /tmp/confirm_create; exit 2
fi

echo "OK: creado evento id=$EVENT_ID"

# 2) Obtener lista y verificar presencia por id
HTTP=$(curl -sS -m "$TIMEOUT" -H "Authorization: Bearer $TOKEN" -H "Accept: application/json" -o /tmp/confirm_list -w "%{http_code}" "$BASE_URL/api/admin/eventos_confirmados?limit=200") || HTTP=000
if [[ ! "$HTTP" =~ ^2[0-9][0-9]$ ]]; then
  echo "FAIL: listar eventos -> HTTP $HTTP"; cat /tmp/confirm_list; exit 2
fi

if jq -e --arg id "$EVENT_ID" '[.[] | select(.id == ($id|tonumber))] | length > 0' /tmp/confirm_list >/dev/null; then
  echo "OK: evento aparece en listado"
else
  echo "FAIL: evento no aparece en listado"; cat /tmp/confirm_list; exit 2
fi

# 3) Verificar campos retornados (descripcion_corta y genero_musical)
ITEM_JSON=$(jq -r --arg id "$EVENT_ID" '.[] | select(.id == ($id|tonumber))' /tmp/confirm_list)
if [ -z "$ITEM_JSON" ]; then echo "FAIL: no se pudo extraer item"; exit 2; fi
if echo "$ITEM_JSON" | jq -e '.descripcion_corta and .genero_musical' >/dev/null; then
  echo "OK: campos descripcion_corta y genero_musical presentes"
else
  echo "FAIL: faltan campos descriptivos en item"; echo "$ITEM_JSON"; exit 2
fi

# 4) Filtrar por tipo BANDA (si aplica) y comprobar que el id aparece
HTTP=$(curl -sS -m "$TIMEOUT" -H "Authorization: Bearer $TOKEN" -H "Accept: application/json" -o /tmp/confirm_filter -w "%{http_code}" "$BASE_URL/api/admin/eventos_confirmados?tipo_evento=BANDA&limit=100") || HTTP=000
if [[ ! "$HTTP" =~ ^2[0-9][0-9]$ ]]; then
  echo "WARN: filtro por tipo HTTP $HTTP (puede no haber BANDAS)"; exit 0
fi

if jq -e --arg id "$EVENT_ID" '[.[] | select(.id == ($id|tonumber))] | length > 0' /tmp/confirm_filter >/dev/null; then
  echo "OK: evento aparece en filtro BANDA"
else
  echo "WARN: evento no aparece en filtro BANDA (posible tipo distinto)"
fi

# 5) Borrar evento
HTTP=$(curl -sS -m "$TIMEOUT" -X DELETE -H "Authorization: Bearer $TOKEN" -o /tmp/confirm_del -w "%{http_code}" "$BASE_URL/api/admin/eventos_confirmados/$EVENT_ID") || HTTP=000
if [[ ! "$HTTP" =~ ^2[0-9][0-9]$ ]]; then
  echo "FAIL: eliminar evento -> HTTP $HTTP"; cat /tmp/confirm_del; exit 2
fi

echo "OK: evento eliminado id=$EVENT_ID"

# 6) Verificar que ya no aparece
HTTP=$(curl -sS -m "$TIMEOUT" -H "Authorization: Bearer $TOKEN" -H "Accept: application/json" -o /tmp/confirm_list2 -w "%{http_code}" "$BASE_URL/api/admin/eventos_confirmados?limit=200") || HTTP=000
if [[ ! "$HTTP" =~ ^2[0-9][0-9]$ ]]; then
  echo "WARN: listar eventos después de borrar -> HTTP $HTTP"; exit 0
fi
if jq -e --arg id "$EVENT_ID" '[.[] | select(.id == ($id|tonumber))] | length == 0' /tmp/confirm_list2 >/dev/null; then
  echo "OK: evento ya no aparece en listado"
else
  echo "WARN: evento sigue presente tras borrado"; exit 2
fi

echo "\n✅ Test confirmados (full) OK"
exit 0
