#!/bin/bash
set -euo pipefail

# backend-logs.sh - Ejecuta el backend en primer plano con flags de depuración
# y publica puertos de servicios (VNC, debug). Útil durante desarrollo.
# Se comporta igual que './scripts/reset.sh -d --mp/--wa' pero sin tocar DB.

# Flags:
#   --mp        habilita servicio Mercado Pago (ENABLE_PUPPETEER_MP=true)
#   --wa        habilita servicio WhatsApp (ENABLE_PUPPETEER_WA=true)
#   -v/--verbose, -e/--error, -d/--debug : se pasan a node como DEBUG_FLAGS
#   -h/--help   : muestra ayuda

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"
COMPOSE_FILE="$ROOT_DIR/docker/docker-compose.yml"

ENABLE_MP=false
ENABLE_WA=false
DEBUG_FLAGS=""

show_help() {
  cat <<EOF
Usage: $0 [--mp] [--wa] [-v|-e|-d|-h]

Runs the backend container with debug flags in the foreground
and publishes service ports (3000,5901,9001-9002). This is handy
for live debugging during development.

Flags:
  --mp          enable Mercado Pago service
  --wa          enable WhatsApp service
  -v, --verbose show verbose logs (for Node)
  -e, --error   show only errors (for Node)
  -d, --debug   enable debug logging (for Node)
  -h, --help    show this help

Examples:
  $0            # just tail backend logs normally
  $0 --mp       # also enable MP service (VNC + headless=false)
  $0 -d --wa    # debug + WhatsApp service
EOF
  exit 0
}

# parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        --mp) ENABLE_MP=true; shift;;
        --wa) ENABLE_WA=true; shift;;
        -v|--verbose|-e|--error|-d|--debug)
            DEBUG_FLAGS="$DEBUG_FLAGS $1"
            shift
            ;;
        -h|--help)
            show_help
            ;;
        *)
            echo "Unknown option: $1" >&2
            show_help
            ;;
    esac
done

# detectar comando de compose
if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
else
    echo -e "${RED}[✗] Docker Compose no encontrado${NC}" >&2
    exit 1
fi

# helper para crear env override (copiado de up.sh)
create_env_override() {
    local env_file="$ROOT_DIR/docker/.env"
    local env_tmp="$ROOT_DIR/docker/.env.tmp.$$"
    
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
    
    # Force non-headless and enable VNC if any puppeteer service desired
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

# cleanup temporary env on exit
cleanup() {
    rm -f "$ROOT_DIR/docker/.env.tmp."* 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# if we need override
ENV_FILE_TO_USE="$ENV_FILE"
if [ "$ENABLE_MP" = true ] || [ "$ENABLE_WA" = true ]; then
    ENV_FILE_TO_USE=$(create_env_override)
    echo -e "${YELLOW}[*] Usando override: MP=$ENABLE_MP WA=$ENABLE_WA (HEADLESS forzado=false)${NC}"
fi

# ensure no old backend containers
cleanup_old_backend_containers() {
    docker ps -a --filter "ancestor=$(docker images --filter 'reference=docker-backend' -q 2>/dev/null)" -q | xargs -r docker rm -f 2>/dev/null || true
    docker ps -a --filter "name=docker-backend" -q | xargs -r docker rm -f 2>/dev/null || true
    docker ps -a --filter "name=docker-backend-run-" -q | xargs -r docker rm -f 2>/dev/null || true
}
cleanup_old_backend_containers

# run backend in foreground with debug flags
echo -e "${CYAN}[*] Ejecutando backend en primer plano con DEBUG_FLAGS='${DEBUG_FLAGS}'${NC}"
echo -e "${CYAN}[*] (puertos 3000,5901,9001-9002 estarán accesibles)${NC}"

# Usar rutas absolutas para docker compose
$COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE_TO_USE" run --rm --service-ports -e DEBUG_FLAGS="$DEBUG_FLAGS" backend
