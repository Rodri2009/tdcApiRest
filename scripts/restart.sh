#!/bin/bash
set -euo pipefail

###############################################################################
# restart.sh - Reinicia contenedores específicos con soporte para múltiples flags
###############################################################################
# FLAGS DE CONTENEDORES:
#   --backend         : reinicia solo el backend (Node.js)
#   --frontend        : reinicia solo el frontend (nginx)
#   --db              : reinicia solo la base de datos (MariaDB)
#   (por defecto reinicia solo backend si no se especifica)
#
# FLAGS DE DOCKER:
#   --rebuild         : reconstruye la imagen del contenedor
#   --down            : hace docker compose down antes de rebuild
#   --no-logs         : no muestra "¿Cómo..." info al finalizar
#
# FLAGS DE SERVICIOS (Puppeteer):
#   --mp              : Habilita Mercado Pago (ENABLE_PUPPETEER_MP=true)
#   --wa              : Habilita WhatsApp (ENABLE_PUPPETEER_WA=true)
#
# FLAGS DE DEPURACIÓN (se pasan a node server.js):
#   -v, --verbose     : muestra logs detallados de procesamiento
#   -e, --error       : muestra solo errores
#   -d, --debug       : combina verbose + error (máximo detalle)
#   -h, --help        : muestra esta ayuda
#
# EJEMPLOS:
#   ./restart.sh --backend -v                          # Reinicia backend con verbose
#   ./restart.sh --frontend --backend                  # Reinicia frontend y backend
#   ./restart.sh --db                                  # Reinicia solo MariaDB
#   ./restart.sh --backend --down --rebuild -d         # Rebuild backend + down + debug
#   ./restart.sh --backend --frontend --db --mp -d     # Todo con MP y debug
###############################################################################

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"
COMPOSE_FILE="$ROOT_DIR/docker/docker-compose.yml"

# Contenedores a reiniciar (empty = default backend)
RESTART_BACKEND=0
RESTART_FRONTEND=0
RESTART_DB=0

REBUILD=0
DO_DOWN=0
SHOW_HELP_AT_END=1
DEBUG_FLAGS=""
ENABLE_MP=false
ENABLE_WA=false

show_help() {
  cat <<EOF
Uso: $0 [--backend|--frontend|--db] [--rebuild] [--down] [--mp] [--wa] [-v|-e|-d|-h]

FLAGS DE CONTENEDORES (selecciona qué reiniciar):
  --backend         : reinicia solo el backend (Node.js)
  --frontend        : reinicia solo el frontend (nginx)
  --db              : reinicia solo la base de datos (MariaDB)
  (por defecto: reinicia solo backend si no se especifica)

FLAGS DE DOCKER:
  --rebuild         : reconstruye la imagen del contenedor a reiniciar
  --down            : hace docker compose down antes de rebuild

FLAGS DE SERVICIOS (Puppeteer):
  --mp              : Habilita Mercado Pago (ENABLE_PUPPETEER_MP=true)
  --wa              : Habilita WhatsApp (ENABLE_PUPPETEER_WA=true)

FLAGS DE DEPURACIÓN (se pasan a node server.js):
  -v, --verbose     : muestra logs detallados de procesamiento
  -e, --error       : muestra solo errores
  -d, --debug       : combina verbose + error (máximo detalle)
  -h, --help        : muestra esta ayuda

EJEMPLOS:
  ./restart.sh --backend -v                   # Reinicia backend con verbose
  ./restart.sh --frontend --backend           # Reinicia frontend y backend
  ./restart.sh --db                           # Reinicia solo MariaDB
  ./restart.sh --backend --down --rebuild -d  # Rebuild backend + down + debug

EOF
}

# Función para verificar si los contenedores levantaron correctamente
check_containers_health() {
  local sleep_time=5
  echo ""
  echo -e "${CYAN}[*] Verificando estado de contenedores en $sleep_time segundos...${NC}"
  sleep $sleep_time
  echo ""

  local has_critical_errors=0
  local has_warnings=0

  # Arrays de contenedores a verificar
  local check_containers=()
  [ $RESTART_BACKEND -eq 1 ] && check_containers+=("docker-backend-1")
  [ $RESTART_FRONTEND -eq 1 ] && check_containers+=("docker-nginx-1")
  [ $RESTART_DB -eq 1 ] && check_containers+=("docker-mariadb-1")

  for container in "${check_containers[@]}"; do
    local status=$(docker inspect -f '{{.State.Status}}' "$container" 2>/dev/null || echo "missing")
    
    if [ "$status" = "running" ]; then
      echo -e "  ${GREEN}✓${NC} $container: ${GREEN}running${NC}"
      
      # Revisar logs para errores críticos (ignorar warnings conocidas)
      local critical_errors=$(docker logs --tail 100 "$container" 2>&1 | grep -iE "(error|exception|failed|cannot|refused|fatal)" | grep -viE "(io_uring_queue_init|Chromium has locked|WhatsAppService|MercadoPagoService|PUPPETEER-WA|PUPPETEER-MP|BANDA-SYNC|FLYER-SYNC|Error al inicializar)" | head -2 || true)
      
      # Revisar warnings
      local all_warnings=$(docker logs --tail 100 "$container" 2>&1 | grep -iE "warning|warn" | head -2 || true)
      
      if [ -n "$critical_errors" ]; then
        echo -e "    ${RED}✗ Errores críticos:${NC}"
        echo "$critical_errors" | sed 's/^/      /'
        has_critical_errors=1
      elif [ -n "$all_warnings" ]; then
        echo -e "    ${YELLOW}⚠ Advertencias:${NC}"
        echo "$all_warnings" | sed 's/^/      /'
        has_warnings=1
      fi
    else
      echo -e "  ${RED}✗${NC} $container: ${RED}$status${NC}"
      echo -e "    ${RED}Últimos logs:${NC}"
      docker logs --tail 20 "$container" 2>&1 | tail -10 | sed 's/^/      /'
      has_critical_errors=1
    fi
  done

  echo ""
  if [ $has_critical_errors -eq 0 ]; then
    echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
    if [ $has_warnings -eq 0 ]; then
      echo -e "${GREEN}  ✓ Todos los contenedores funcionan correctamente${NC}"
    else
      echo -e "${GREEN}  ✓ Contenedores en ejecución (con advertencias)${NC}"
    fi
    echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
    return 0
  else
    echo -e "${RED}════════════════════════════════════════════════════${NC}"
    echo -e "${RED}  ✗ Se detectaron problemas críticos${NC}"
    echo -e "${RED}════════════════════════════════════════════════════${NC}"
    return 1
  fi
}

check_backend_http() {
  if [ $RESTART_BACKEND -eq 0 ]; then
    return 0
  fi

  if ! command_exists curl; then
    echo -e "${YELLOW}[*] curl no está instalado, omitiendo verificación HTTP del backend${NC}"
    return 0
  fi

  local health_urls=(
    "http://127.0.0.1:3001/health"
    "http://127.0.0.1:3000/health"
    "http://localhost:3001/health"
    "http://localhost:3000/health"
  )
  local max_wait=30
  local interval=2
  local waited=0
  local health_url=""

  echo ""
  echo -e "${CYAN}[*] Verificando disponibilidad del backend HTTP...${NC}"

  while [ $waited -lt $max_wait ]; do
    for health_url in "${health_urls[@]}"; do
      if curl -sS --max-time 3 "$health_url" >/dev/null 2>&1; then
        echo -e "  ${GREEN}✓ Backend HTTP responde correctamente en $health_url${NC}"
        return 0
      fi
    done

    sleep $interval
    waited=$((waited + interval))
    echo -e "  ${YELLOW}...esperando ${waited}/${max_wait}s${NC}"
  done

  echo -e "  ${RED}✗ El backend no responde en ninguno de los puertos probados (${health_urls[*]}) después de ${max_wait} segundos${NC}"
  echo -e "    ${YELLOW}Revisá los logs con: ./scripts/backend_logs.sh${NC}"
  echo -e "    ${YELLOW}Comprueba si el backend arrancó bien y si la DB está accesible.${NC}"
  return 1
}

if [[ ${1:-} == "-h" || ${1:-} == "--help" ]]; then
  show_help
  exit 0
fi

# Parsear argumentos
while [ $# -gt 0 ]; do
  case "$1" in
    --backend) RESTART_BACKEND=1; shift;;
    --frontend) RESTART_FRONTEND=1; shift;;
    --db) RESTART_DB=1; shift;;
    --rebuild) REBUILD=1; shift;;
    --down) DO_DOWN=1; shift;;
    --no-logs) SHOW_HELP_AT_END=0; shift;;
    --mp) ENABLE_MP=true; shift;;
    --wa) ENABLE_WA=true; shift;;
    # Flags de depuración que se pasan a node
    -v|--verbose|-e|--error|-d|--debug)
      DEBUG_FLAGS="$DEBUG_FLAGS $1"
      shift
      ;;
    *)
      echo "❌ Argumento desconocido: $1"
      echo "Usa: $0 [--backend|--frontend|--db] [--rebuild] [--down] [--mp] [--wa] [-v|-e|-d|-h]"
      exit 1
      ;;
  esac
done

# Si no se especificó contenedor, por defecto reiniciar backend
if [ $RESTART_BACKEND -eq 0 ] && [ $RESTART_FRONTEND -eq 0 ] && [ $RESTART_DB -eq 0 ]; then
  RESTART_BACKEND=1
fi

command_exists() { command -v "$1" >/dev/null 2>&1; }

# --- Función para crear .env.tmp ---
create_env_override() {
    # Fuente única de verdad: .env en la raíz del proyecto.
    # El archivo docker/.env se sincroniza como copia auxiliar.
    local env_file="$ENV_FILE"
    local env_tmp="$ROOT_DIR/.env.tmp.$$"
    
    if [ -f "$env_file" ]; then
        cp "$env_file" "$env_tmp"
    else
        touch "$env_tmp"
    fi
    
    if [ "$ENABLE_MP" = true ]; then
        sed -i 's/^ENABLE_PUPPETEER_MP=.*/ENABLE_PUPPETEER_MP=true/' "$env_tmp"
        if ! grep -q "^ENABLE_PUPPETEER_MP=" "$env_tmp"; then
            [ -n "$(tail -c1 "$env_tmp")" ] && echo "" >> "$env_tmp"
            echo "ENABLE_PUPPETEER_MP=true" >> "$env_tmp"
        fi
    else
        sed -i 's/^ENABLE_PUPPETEER_MP=.*/ENABLE_PUPPETEER_MP=false/' "$env_tmp"
        if ! grep -q "^ENABLE_PUPPETEER_MP=" "$env_tmp"; then
            [ -n "$(tail -c1 "$env_tmp")" ] && echo "" >> "$env_tmp"
            echo "ENABLE_PUPPETEER_MP=false" >> "$env_tmp"
        fi
    fi
    
    if [ "$ENABLE_WA" = true ]; then
        sed -i 's/^ENABLE_PUPPETEER_WA=.*/ENABLE_PUPPETEER_WA=true/' "$env_tmp"
        if ! grep -q "^ENABLE_PUPPETEER_WA=" "$env_tmp"; then
            [ -n "$(tail -c1 "$env_tmp")" ] && echo "" >> "$env_tmp"
            echo "ENABLE_PUPPETEER_WA=true" >> "$env_tmp"
        fi
    else
        sed -i 's/^ENABLE_PUPPETEER_WA=.*/ENABLE_PUPPETEER_WA=false/' "$env_tmp"
        if ! grep -q "^ENABLE_PUPPETEER_WA=" "$env_tmp"; then
            [ -n "$(tail -c1 "$env_tmp")" ] && echo "" >> "$env_tmp"
            echo "ENABLE_PUPPETEER_WA=false" >> "$env_tmp"
        fi
    fi
    
    # Forzar modo no-headless y activar VNC si se habilitan servicios Puppeteer
    if [ "$ENABLE_MP" = true ] || [ "$ENABLE_WA" = true ]; then
        sed -i 's/^HEADLESS=.*/HEADLESS=false/' "$env_tmp" || true
        if ! grep -q "^HEADLESS=" "$env_tmp"; then
            [ -n "$(tail -c1 "$env_tmp")" ] && echo "" >> "$env_tmp"
            echo "HEADLESS=false" >> "$env_tmp"
        fi
        sed -i 's/^ENABLE_VNC=.*/ENABLE_VNC=true/' "$env_tmp" || true
        if ! grep -q "^ENABLE_VNC=" "$env_tmp"; then
            [ -n "$(tail -c1 "$env_tmp")" ] && echo "" >> "$env_tmp"
            echo "ENABLE_VNC=true" >> "$env_tmp"
        fi
    fi
    
    echo "$env_tmp"
}

cleanup_env_tmp() {
    rm -f "$ROOT_DIR"/.env.tmp.* 2>/dev/null || true
}

# Trap para limpiar en caso de exit o interrupción (INT/TERM)
trap cleanup_env_tmp EXIT INT TERM

if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
elif command_exists docker-compose; then
  COMPOSE_CMD="docker-compose"
else
  echo "❌ No se encontró 'docker compose' ni 'docker-compose'. Instala Docker Compose."; exit 1
fi

echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}  TDC App - Reinicio de Contenedores${NC}"
echo -e "${BLUE}======================================================${NC}"
echo ""

# Determinar qué contenedores se van a reiniciar
CONTAINERS_MSG=""
[ $RESTART_BACKEND -eq 1 ] && CONTAINERS_MSG="${CONTAINERS_MSG}Backend "
[ $RESTART_FRONTEND -eq 1 ] && CONTAINERS_MSG="${CONTAINERS_MSG}Frontend "
[ $RESTART_DB -eq 1 ] && CONTAINERS_MSG="${CONTAINERS_MSG}DB "

echo -e "${YELLOW}[*] Contenedores a reiniciar: $CONTAINERS_MSG${NC}"

# Crear archivo .env.tmp con overrides si es necesario
ENV_FILE_TO_USE="$ENV_FILE"
if [ "$ENABLE_MP" = true ] || [ "$ENABLE_WA" = true ]; then
    ENV_FILE_TO_USE=$(create_env_override)
    echo -e "${CYAN}[*] Usando comando: $COMPOSE_CMD${NC}"
    echo -e "${CYAN}[*] Usando .env override con: MP=$ENABLE_MP, WA=$ENABLE_WA${NC}"
    echo -e "${YELLOW}[*] Puppeteer habilitado: MP=$ENABLE_MP WA=$ENABLE_WA${NC}"
    echo -e "${YELLOW}    Conectar VNC: vncviewer localhost:5901 (sin contraseña).${NC}"
    echo -e "${YELLOW}    Puertos de debug del navegador: 9001/9002 según corresponda.${NC}"
else
    echo -e "${CYAN}[*] Usando comando: $COMPOSE_CMD${NC}"
fi
echo ""

if [ $DO_DOWN -eq 1 ]; then
  echo -e "${YELLOW}[*]${NC} Ejecutando docker compose down..."
  $COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE_TO_USE" down
fi

if [ $REBUILD -eq 1 ]; then
  # Rebuild solo los contenedores especificados
  if [ $RESTART_BACKEND -eq 1 ]; then
    echo -e "${YELLOW}[*]${NC} Reconstruyendo imagen backend..."
    $COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE_TO_USE" build --no-cache backend
  fi
  if [ $RESTART_FRONTEND -eq 1 ]; then
    echo -e "${YELLOW}[*]${NC} Reconstruyendo imagen frontend..."
    $COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE_TO_USE" build --no-cache nginx
  fi
  if [ $RESTART_DB -eq 1 ]; then
    echo -e "${YELLOW}[*]${NC} Reconstruyendo imagen MariaDB..."
    $COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE_TO_USE" build --no-cache mariadb
  fi
fi

echo ""
echo -e "${YELLOW}[*]${NC} Controlando contenedores Docker..."

# ⚠️ Limpiar contenedores viejos de backend
if [ $RESTART_BACKEND -eq 1 ]; then
  echo -ne "  → Limpiando contenedores backend antiguos... "
  docker ps -a --filter "ancestor=$(docker images --filter 'reference=docker-backend' -q 2>/dev/null)" -q 2>/dev/null | xargs -r docker rm -f 2>/dev/null || true
  docker ps -a --filter "name=docker-backend" -q 2>/dev/null | xargs -r docker rm -f 2>/dev/null || true
  docker ps -a --filter "name=docker-backend-run-" -q 2>/dev/null | xargs -r docker rm -f 2>/dev/null || true
  echo -e "${GREEN}✓${NC}"
fi

# Si hay flags de debug Y estamos reiniciando backend, hacer down antes
if [ -n "$DEBUG_FLAGS" ] && [ $RESTART_BACKEND -eq 1 ]; then
  echo -ne "  → Ejecutando docker compose down... "
  $COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE_TO_USE" down
  echo -e "${GREEN}✓${NC}"
  
  export DEBUG_FLAGS
  echo -e "  → Debug flags detectados:$DEBUG_FLAGS"
  
  # Levantar MariaDB primero
  if [ $RESTART_DB -eq 1 ]; then
    echo -ne "  → Levantando MariaDB... "
    $COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE_TO_USE" up -d mariadb
    echo -e "${GREEN}✓${NC}"
    sleep 5
  elif $COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE_TO_USE" ps mariadb 2>/dev/null | grep -q "running"; then
    echo "  → MariaDB ya está ejecutándose"
  else
    echo "  → Asegurando que MariaDB esté disponible..."
    $COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE_TO_USE" up -d mariadb
    sleep 5
  fi
  
  echo -e "${CYAN}[*] Levantando backend con flags:$DEBUG_FLAGS${NC}"
  $COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE_TO_USE" up -d backend
  sleep 2
  
  # Levantar frontend si se solicita
  if [ $RESTART_FRONTEND -eq 1 ]; then
    echo -ne "  → Levantando nginx... "
    $COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE_TO_USE" up -d --no-deps nginx
    echo -e "${GREEN}✓${NC}"
    sleep 1
  fi
else
  # Modo normal sin debug flags
  
  if [ $RESTART_BACKEND -eq 1 ]; then
    echo -ne "  → Levantando backend... "
    $COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE_TO_USE" up -d --no-deps backend
    echo -e "${GREEN}✓${NC}"
    sleep 2
  fi
  
  if [ $RESTART_FRONTEND -eq 1 ]; then
    echo -ne "  → Levantando frontend... "
    $COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE_TO_USE" up -d --no-deps nginx
    echo -e "${GREEN}✓${NC}"
    sleep 1
  fi
  
  if [ $RESTART_DB -eq 1 ]; then
    echo -ne "  → Levantando MariaDB... "
    $COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE_TO_USE" up -d --no-deps mariadb
    echo -e "${GREEN}✓${NC}"
    sleep 3
  fi
fi

# Verificar salud de contenedores
check_containers_health
check_backend_http

# Mensaje final
echo ""
echo -e "${GREEN}======================================================${NC}"
echo -e "${GREEN}  ✓ Contenedores reiniciados correctamente${NC}"
echo -e "${GREEN}======================================================${NC}"
echo ""
echo -e "${CYAN}Servicios activos:${NC}"
$COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE_TO_USE" ps
echo ""

if [ $SHOW_HELP_AT_END -eq 1 ]; then
  echo -e "${YELLOW}¿Cómo probar la app?${NC}"
  echo -e "  - Frontend:     ${CYAN}http://localhost:8080${NC} (nginx)"
  echo -e "  - Backend API:  ${CYAN}http://localhost:3000${NC} (Node.js)"
  if [ "$ENABLE_MP" = true ] || [ "$ENABLE_WA" = true ]; then
    echo -e "  - VNC Backend:  ${CYAN}vncviewer localhost:5901${NC} (sin contraseña)"
    echo -e "  - Debug Chrome: ${CYAN}localhost:9001 (MP), localhost:9002 (WA)${NC}"
  fi
  echo ""
  echo -e "${YELLOW}¿Cómo ver logs en vivo?${NC}"
  echo -e "  Ejecuta: ${CYAN}./scripts/backend_logs.sh${NC}"
  echo ""
  echo -e "${YELLOW}¿Cómo reiniciar?${NC}"
  echo -e "  Solo backend:   ${CYAN}./scripts/restart.sh --backend${NC}"
  echo -e "  Solo frontend:  ${CYAN}./scripts/restart.sh --frontend${NC}"
  echo -e "  Solo BD:        ${CYAN}./scripts/restart.sh --db${NC}"
  echo -e "  Todo a la vez:  ${CYAN}./scripts/restart.sh --backend --frontend --db${NC}"
  echo -e "  Resetear todo:  ${CYAN}./scripts/reset.sh${NC}"
  echo ""
  echo -e "${YELLOW}¿Ayuda?${NC}"
  echo -e "  Lee los README.md o ejecuta: ${CYAN}./scripts/restart.sh -h${NC}"
  echo ""
fi

exit 0
