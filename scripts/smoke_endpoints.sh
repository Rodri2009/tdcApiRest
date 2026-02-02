#!/bin/sh
set -eu
BASE_URL="http://localhost:3000"

printf "Iniciando smoke tests contra %s\n" "$BASE_URL"

# helper
do_curl() {
  method="$1"; url="$2"; data=${3-}
  if [ "$method" = "GET" ]; then
    status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$url")
    printf "%s %-4s %s -> %s\n" "$(date +'%H:%M:%S')" "$method" "$url" "$status"
  else
    status=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" -H 'Content-Type: application/json' -d "$data" "$BASE_URL$url")
    printf "%s %-4s %s -> %s\n" "$(date +'%H:%M:%S')" "$method" "$url" "$status"
  fi
}

# GET endpoints (one per line)
ENDPOINTS_GET="
/api/opciones/tipos-evento
/api/opciones/adicionales
/api/opciones/config
/api/opciones/tarifas
/api/opciones/duraciones
/api/opciones/horarios
/api/opciones/cantidades
/api/opciones/fechas-ocupadas

/api/servicios/tipos
/api/servicios/catalogo
/api/servicios/profesionales/lista
/api/servicios/precios/lista
/api/servicios/turnos/disponibles

/api/bandas/instrumentos
/api/bandas/buscar?q=test
/api/bandas

/api/talleres/tipos
/api/talleres
/api/talleres/talleristas/lista
/api/talleres/precios/lista

/api/tickets/fechas_bandas_confirmadas
"

printf "\n--- GET endpoints ---\n"
printf "%s\n" "$ENDPOINTS_GET" | while IFS= read -r url; do
  [ -z "$url" ] && continue
  do_curl GET "$url"
done

# POSTs (method:path:payload)
POSTS="
POST:/api/solicitudes:{\"tipoEvento\":\"SERVICIOS\",\"cantidadPersonas\":1,\"duracionEvento\":\"1h\",\"fechaEvento\":\"2026-03-05\",\"horaInicio\":\"09:00\",\"precioBase\":1200,\"fingerprintId\":\"smoke_test_1\",\"servicio_id\":\"DEPILACION\",\"profesional_id\":5}
POST:/api/bandas/solicitudes:{\"nombre_banda\":\"SmokeTest Band\",\"contacto_nombre\":\"Smoke\",\"contacto_email\":\"smoke@example.local\",\"contacto_whatsapp\":\"+549112345000\",\"mensaje\":\"Prueba smoke\"}
POST:/api/test/email:{\"to\":\"admin@example.local\",\"subject\":\"Smoke test\",\"body\":\"Esto es una prueba\"}
"

printf "\n--- POST endpoints ---\n"
printf "%s\n" "$POSTS" | while IFS= read -r item; do
  [ -z "$item" ] && continue
  method=$(printf "%s" "$item" | awk -F: '{print $1}')
  path=$(printf "%s" "$item" | awk -F: '{print $2}')
  payload=$(printf "%s" "$item" | awk -F: '{print substr($0, index($0,$3))}')
  do_curl "$method" "$path" "$payload"
done

# Crear una solicitud y probar detail/finalizar
printf "\n--- Creación y verificación de detalle para /api/solicitudes ---\n"
created_id=$(curl -s -X POST -H 'Content-Type: application/json' -d '{"tipoEvento":"SERVICIOS","cantidadPersonas":1,"duracionEvento":"1h","fechaEvento":"2026-03-05","horaInicio":"09:00","precioBase":1200,"fingerprintId":"smoke_test_2","servicio_id":"DEPILACION","profesional_id":5}' "$BASE_URL/api/solicitudes" | sed -n 's/.*"id":\([0-9]*\).*/\1/p')
if [ -n "$created_id" ]; then
  printf "Creada solicitud id=%s\n" "$created_id"
  do_curl GET "/api/solicitudes/$created_id"
  do_curl PUT "/api/solicitudes/$created_id/finalizar" "{\"nombreCompleto\":\"Smoke Final\",\"celular\":\"+549112345000\",\"email\":\"smokefinal@example.local\",\"detallesAdicionales\":\"OK\"}"
else
  echo "No se pudo crear solicitud de prueba, saltando tests de detalle"
fi

printf "\nSmoke tests completados.\n"