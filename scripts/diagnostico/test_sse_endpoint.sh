#!/bin/bash
# =============================================================================
# test-sse-endpoint.sh
# Prueba el endpoint /api/mercadopago/watch/test para verificar que las
# notificaciones SSE llegan al navegador.
#
# Uso:
#   ./test-sse-endpoint.sh                         # usa defaults
#   ./test-sse-endpoint.sh "Maria Lopez" 12500      # nombre y monto custom
#   SECRET=miClave ./test-sse-endpoint.sh           # clave custom
#
# Por defecto la clave es "test123" (DEBUG_SECRET en el .env del backend)
# =============================================================================

SECRET="${SECRET:-test123}"
HOST="${HOST:-http://localhost}"
NAME="${1:-Test Ingreso SSE}"
AMOUNT="${2:-$((RANDOM % 50000 + 1000))}"

echo ""
echo "======================================="
echo "  Test de notificación SSE"
echo "======================================="
echo "  Host:   $HOST"
echo "  Nombre: $NAME"
echo "  Monto:  \$$AMOUNT"
echo "======================================="
echo ""

RESPONSE=$(curl -s -w "\n__HTTP_STATUS__%{http_code}" \
  -X POST "$HOST/api/mercadopago/watch/test" \
  -H 'Content-Type: application/json' \
  -d "{\"secret\":\"$SECRET\",\"name\":\"$NAME\",\"amount\":\"$AMOUNT\"}")

HTTP_STATUS=$(echo "$RESPONSE" | grep '__HTTP_STATUS__' | sed 's/__HTTP_STATUS__//')
BODY=$(echo "$RESPONSE" | grep -v '__HTTP_STATUS__')

echo "HTTP Status: $HTTP_STATUS"
echo ""

if command -v python3 &>/dev/null; then
  echo "$BODY" | python3 -m json.tool
else
  echo "$BODY"
fi

echo ""

# Evaluar resultado
SUCCESS=$(echo "$BODY" | grep -o '"success":true')
SUBS=$(echo "$BODY" | grep -oP '"subscribers":\K[0-9]+')

if [ "$SUCCESS" = '"success":true' ]; then
  if [ "${SUBS:-0}" -gt 0 ]; then
    echo "✅ ÉXITO — Notificación enviada a $SUBS cliente/s conectados."
    echo "   Deberías ver el banner verde en admin_balance.html"
  else
    echo "⚠️  Backend OK pero 0 suscriptores conectados."
    echo "   Abrí admin_balance.html en el navegador y reintentá."
  fi
else
  echo "❌ ERROR — verificá que:"
  echo "   1. El backend está corriendo: docker logs docker-backend-1 | tail -5"
  echo "   2. La clave DEBUG_SECRET coincide con '$SECRET'"
  echo "   3. nginx está sirviendo en $HOST"
fi

echo ""
