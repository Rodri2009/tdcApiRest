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
# FLAGS DE SERVICIOS (Puppeteer):
#   --mp              : Habilita Mercado Pago (ENABLE_PUPPETEER_MP=true)
#   --wa              : Habilita WhatsApp (ENABLE_PUPPETEER_WA=true)
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
#   ./restart_backend.sh --mp --wa -d          # Con MP y WA + debug
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
ENABLE_MP=false
ENABLE_WA=false

show_help() {
  cat <<EOF
Uso: $0 [--rebuild] [--down] [--no-logs] [--mp] [--wa] [-v|-e|-d|-h]

FLAGS DE DOCKER:
  --rebuild         : reconstruye la imagen del backend
  --down            : hace docker compose down antes de rebuild
  --no-logs         : no muestra logs en foreground

FLAGS DE SERVICIOS (Puppeteer):
  --mp              : Habilita Mercado Pago (ENABLE_PUPPETEER_MP=true)
  --wa              : Habilita WhatsApp (ENABLE_PUPPETEER_WA=true)

FLAGS DE DEPURACIÓN (se pasan a node server.js):
  -v, --verbose     : muestra logs detallados de procesamiento
  -e, --error       : muestra solo errores
  -d, --debug       : combina verbose + error (máximo detalle)
  -h, --help        : muestra ayuda de node server.js

EOF
}

if [[ "$1" == "-h" || "$1" == "--help" ]]; then
  show_help
  exit 0
fi

# Parsear argumentos separando flags de Docker de flags de depuración
while [ $# -gt 0 ]; do
  case "$1" in
    --rebuild) REBUILD=1; shift;;
    --down) DO_DOWN=1; shift;;
    --no-logs) SHOW_LOGS=0; shift;;
    --mp) ENABLE_MP=true; shift;;
    --wa) ENABLE_WA=true; shift;;
    # Flags de depuración que se pasan a node
    -v|--verbose|-e|--error|-d|--debug)
      DEBUG_FLAGS="$DEBUG_FLAGS $1"
      shift
      ;;
    *)
      echo "❌ Argumento desconocido: $1"
      echo "Usa: $0 [--rebuild] [--down] [--no-logs] [--mp] [--wa] [-v|-e|-d|-h]"
      exit 1
      ;;
  esac
done

command_exists() { command -v "$1" >/dev/null 2>&1; }

# --- Función para crear .env.tmp ---
create_env_override() {
    local env_file="$ENV_FILE"
    local env_tmp="$ENV_FILE.tmp.$$"
    
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
echo -e "${BLUE}  TDC App - Reinicio del Backend${NC}"
echo -e "${BLUE}======================================================${NC}"
echo ""

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
  echo -e "${YELLOW}[*]${NC} Reconstruyendo imagen backend..."
  $COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE_TO_USE" build --no-cache backend
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
  $COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE_TO_USE" down
  echo -e "${GREEN}✓${NC}"
  
  # Exportar DEBUG_FLAGS para que docker-compose lo recoja
  export DEBUG_FLAGS
  echo -e "  → Debug flags detectados:$DEBUG_FLAGS"
  
  # Levantar SOLO mariadb
  echo -ne "  → Levantando MariaDB... "
  $COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE_TO_USE" up -d mariadb
  echo -e "${GREEN}✓${NC}"
  
  # Esperar a que mariadb esté listo
  echo -ne "  → Esperando que MariaDB esté listo... "
  sleep 5
  echo -e "${GREEN}✓${NC}"
  
  echo -e "${CYAN}[*] Levantando backend con flags:$DEBUG_FLAGS${NC}"
  # Usar up -d para levantar el backend con los variables de entorno exportadas
  $COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE_TO_USE" up -d backend
  
  sleep 2
  
  # Ahora levantar nginx
  echo -ne "  → Levantando nginx... "
  $COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE_TO_USE" up -d --no-deps nginx
  echo -e "${GREEN}✓${NC}"
  
  sleep 1
  
  # Mensaje final claro
  echo ""
  echo -e "${GREEN}======================================================${NC}"
  echo -e "${GREEN}  ✓ Backend reiniciado correctamente${NC}"
  echo -e "${GREEN}======================================================${NC}"
  echo ""
  echo -e "${CYAN}Servicios activos:${NC}"
  $COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE_TO_USE" ps
  echo ""
  echo -e "${YELLOW}¿Cómo probar la app?${NC}"
  echo -e "  - Frontend:     ${CYAN}http://localhost:8080${NC} (nginx)"
  echo -e "  - Backend API:  ${CYAN}http://localhost:3000${NC} (Node.js)"
  if [ "$ENABLE_MP" = true ] || [ "$ENABLE_WA" = true ]; then
    echo -e "  - VNC Backend:  ${CYAN}vncviewer localhost:5901${NC} (sin contraseña)"
    echo -e "  - Debug Chrome: ${CYAN}localhost:9001 (MP), localhost:9002 (WA)${NC}"
  fi
  echo ""
  echo -e "${YELLOW}¿Cómo ver logs en vivo?${NC}"
  echo -e "  Ejecuta: ${CYAN}./scripts/backend-logs.sh${NC}"
  echo ""
  echo -e "${YELLOW}¿Cómo reiniciar o resetear?${NC}"
  echo -e "  Reiniciar backend: ${CYAN}./scripts/restart_backend.sh${NC}"
  echo -e "  Resetear todo:     ${CYAN}./scripts/reset.sh${NC}"
  echo ""
  echo -e "${YELLOW}¿Ayuda?${NC}"
  echo -e "  Lee los README.md o ejecuta los scripts con -h"
  echo ""
  exit 0
else
  echo -ne "  → Levantando backend... "
  $COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE_TO_USE" up -d --no-deps backend
  echo -e "${GREEN}✓${NC}"
  
  # Esperar a que el contenedor esté listo
  echo -ne "  → Esperando a que el contenedor esté listo... "
  sleep 2
  echo -e "${GREEN}✓${NC}"
  
  if [ $SHOW_LOGS -eq 1 ]; then
    # Mensaje final claro
    echo ""
    echo -e "${GREEN}======================================================${NC}"
    echo -e "${GREEN}  ✓ Backend reiniciado correctamente${NC}"
    echo -e "${GREEN}======================================================${NC}"
    echo ""
    echo -e "${CYAN}Servicios activos:${NC}"
    $COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE_TO_USE" ps
    echo ""
    echo -e "${YELLOW}¿Cómo probar la app?${NC}"
    echo -e "  - Frontend:     ${CYAN}http://localhost:8080${NC} (nginx)"
    echo -e "  - Backend API:  ${CYAN}http://localhost:3000${NC} (Node.js)"
    if [ "$ENABLE_MP" = true ] || [ "$ENABLE_WA" = true ]; then
      echo -e "  - VNC Backend:  ${CYAN}vncviewer localhost:5901${NC} (sin contraseña)"
      echo -e "  - Debug Chrome: ${CYAN}localhost:9001 (MP), localhost:9002 (WA)${NC}"
    fi
    echo ""
    echo -e "${YELLOW}¿Cómo ver logs en vivo?${NC}"
    echo -e "  Ejecuta: ${CYAN}./scripts/backend-logs.sh${NC}"
    echo ""
    echo -e "${YELLOW}¿Cómo reiniciar o resetear?${NC}"
    echo -e "  Reiniciar backend: ${CYAN}./scripts/restart_backend.sh${NC}"
    echo -e "  Resetear todo:     ${CYAN}./scripts/reset.sh${NC}"
    echo ""
    echo -e "${YELLOW}¿Ayuda?${NC}"
    echo -e "  Lee los README.md o ejecuta los scripts con -h"
    echo ""

    exit 0
  fi
  fi

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  ✓ Operación completada${NC}"
echo -e "${GREEN}================================================${NC}"
