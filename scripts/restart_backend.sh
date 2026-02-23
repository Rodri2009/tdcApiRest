#!/bin/bash
set -euo pipefail

###############################################################################
# restart_backend.sh - Reinicia el backend con soporte para flags de depuración
###############################################################################
# FLAGS DE DOCKER:
#   --rebuild         : reconstruye la imagen del backend
#   --down            : hace docker compose down antes de rebuild
#   --no-logs         : no muestra logs en foreground
#
# FLAGS DE DEPURACIÓN (se pasan a node server.js):
#   -v, --verbose     : muestra logs detallados de procesamiento
#   -e, --error       : muestra solo errores
#   -d, --debug       : combina verbose + error (máximo detalle)
#   -h, --help        : muestra ayuda de node server.js
#
# EJEMPLOS:
#   ./restart_backend.sh -v                    # Levanta con verbose
#   ./restart_backend.sh --down --rebuild -d   # Rebuild + down + debug
#   ./restart_backend.sh --no-logs -e          # Sin logs de docker, solo errores
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

REBUILD=0
DO_DOWN=0
SHOW_LOGS=1
DEBUG_FLAGS=""

# Parsear argumentos separando flags de Docker de flags de depuración
while [ $# -gt 0 ]; do
  case "$1" in
    --rebuild) REBUILD=1; shift;;
    --down) DO_DOWN=1; shift;;
    --no-logs) SHOW_LOGS=0; shift;;
    # Flags de depuración que se pasan a node
    -v|--verbose|-e|--error|-d|--debug|-h|--help)
      DEBUG_FLAGS="$DEBUG_FLAGS $1"
      shift
      ;;
    *)
      echo "❌ Argumento desconocido: $1"
      echo "Usa: $0 [--rebuild] [--down] [--no-logs] [-v|-e|-d|-h]"
      exit 1
      ;;
  esac
done

command_exists() { command -v "$1" >/dev/null 2>&1; }
if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
elif command_exists docker-compose; then
  COMPOSE_CMD="docker-compose"
else
  echo "❌ No se encontró 'docker compose' ni 'docker-compose'. Instala Docker Compose."; exit 1
fi

echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}  TDC App - Reinicio del Backend${NC}"
echo -e "${BLUE}======================================================${NC}"
echo ""

echo -e "${CYAN}[*] Usando comando: $COMPOSE_CMD${NC}"
echo ""

if [ $DO_DOWN -eq 1 ]; then
  echo -e "${YELLOW}[*]${NC} Ejecutando docker compose down..."
  $COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down
fi

if [ $REBUILD -eq 1 ]; then
  echo -e "${YELLOW}[*]${NC} Reconstruyendo imagen backend..."
  $COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build --no-cache backend
fi

echo ""
echo -e "${YELLOW}[*]${NC} Controlando contenedores Docker..."

# ⚠️ Limpiar contenedores viejos de backend
echo -ne "  → Limpiando contenedores backend antiguos... "
docker ps -a --filter "ancestor=$(docker images --filter 'reference=docker-backend' -q 2>/dev/null)" -q 2>/dev/null | xargs -r docker rm -f 2>/dev/null || true
docker ps -a --filter "name=docker-backend" -q 2>/dev/null | xargs -r docker rm -f 2>/dev/null || true
docker ps -a --filter "name=docker-backend-run-" -q 2>/dev/null | xargs -r docker rm -f 2>/dev/null || true
echo -e "${GREEN}✓${NC}"

if [ -n "$DEBUG_FLAGS" ]; then
  # Si hay flags, hacer down completo para liberar puertos
  echo -ne "  → Ejecutando docker compose down... "
  $COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down
  echo -e "${GREEN}✓${NC}"
  
  # Exportar DEBUG_FLAGS para que docker-compose lo recoja
  export DEBUG_FLAGS
  echo -e "  → Debug flags detectados:$DEBUG_FLAGS"
  
  # Levantar SOLO mariadb
  echo -ne "  → Levantando MariaDB... "
  $COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d mariadb
  echo -e "${GREEN}✓${NC}"
  
  # Esperar a que mariadb esté listo
  echo -ne "  → Esperando que MariaDB esté listo... "
  sleep 5
  echo -e "${GREEN}✓${NC}"
  
  echo -e "${CYAN}[*] Levantando backend con flags:$DEBUG_FLAGS${NC}"
  # Usar up -d para levantar el backend con los variables de entorno exportadas
  $COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d backend
  
  sleep 2
  
  # Ahora levantar nginx
  echo -ne "  → Levantando nginx... "
  $COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --no-deps nginx
  echo -e "${GREEN}✓${NC}"
  
  sleep 1
  
  # Mostrar logs en foreground
  echo ""
  echo -e "${BLUE}======================================================${NC}"
  echo -e "${BLUE}  Logs del Backend en Tiempo Real${NC}"
  echo -e "${BLUE}  (Presiona Ctrl+C para salir)${NC}"
  echo -e "${BLUE}======================================================${NC}"
  echo ""
  $COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs -f backend
else
  echo -ne "  → Levantando backend... "
  $COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --no-deps backend
  echo -e "${GREEN}✓${NC}"
  
  # Esperar a que el contenedor esté listo
  echo -ne "  → Esperando a que el contenedor esté listo... "
  sleep 2
  echo -e "${GREEN}✓${NC}"
  
  if [ $SHOW_LOGS -eq 1 ]; then
    echo ""
    echo -e "${BLUE}======================================================${NC}"
    echo -e "${BLUE}  Logs del Backend en Tiempo Real${NC}"
    echo -e "${BLUE}  (Presiona Ctrl+C para salir)${NC}"
    echo -e "${BLUE}======================================================${NC}"
    echo ""
    $COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs -f backend
  else
    echo -e "${GREEN}✓${NC} Backend levantado en background"
  fi
fi

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  ✓ Operación completada${NC}"
echo -e "${GREEN}================================================${NC}"
