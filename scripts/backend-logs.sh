#!/bin/bash
set -euo pipefail

# backend-logs.sh - Muestra logs en tiempo real del contenedor backend
# NO modifica nada, solo toma logs del contenedor que ya está corriendo

# Flags:
#   --tdc       filtra solo logs de TDC (endpoints principales)
#   --mp        filtra solo logs de Mercado Pago
#   --wa        filtra solo logs de WhatsApp
#   --all       muestra todos los logs sin filtro (default)
#   -h/--help   muestra ayuda

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker/docker-compose.yml"

FILTER=""

show_help() {
  cat <<EOF
Usage: $0 [--tdc|--mp|--wa|--all] [-h]

Shows live logs from the running backend container.
Does NOT modify configuration or start new containers.

Flags:
  --tdc   filter logs for TDC service only (main endpoints)
  --mp    filter logs for Mercado Pago service only
  --wa    filter logs for WhatsApp service only
  --all   show all logs (default)
  -h, --help    show this help

Examples:
  $0          # show all backend logs
  $0 --tdc    # show only TDC-related logs
  $0 --mp     # show only MP-related logs
  $0 --wa     # show only WhatsApp-related logs
EOF
  exit 0
}

# parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        --tdc)
            FILTER="[TDC]"
            shift
            ;;
        --mp)
            FILTER="[MP]"
            shift
            ;;
        --wa)
            FILTER="[WA]"
            shift
            ;;
        --all)
            FILTER=""
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

# obtener nombre del contenedor backend
CONTAINER_NAME=$($COMPOSE_CMD -f "$COMPOSE_FILE" ps --format '{{.Names}}' backend 2>/dev/null | head -1)

if [ -z "$CONTAINER_NAME" ]; then
    echo -e "${RED}[✗] No hay contenedor backend corriendo${NC}"
    echo -e "${YELLOW}[*] Inicia con: ./scripts/up.sh${NC}"
    exit 1
fi

# mostrar logs
if [ -z "$FILTER" ]; then
    echo -e "${CYAN}[*] Mostrando logs de: $CONTAINER_NAME${NC}"
    docker logs -f "$CONTAINER_NAME"
else
    # Mapear el filtro a un nombre legible
    FILTER_NAME=""
    case "$FILTER" in
        "[TDC]") FILTER_NAME="TDC" ;;
        "[MP]") FILTER_NAME="Mercado Pago" ;;
        "[WA]") FILTER_NAME="WhatsApp" ;;
    esac
    echo -e "${CYAN}[*] Mostrando logs de: $CONTAINER_NAME (filtro: $FILTER_NAME)${NC}"
    docker logs -f "$CONTAINER_NAME" | grep -E "$FILTER" || true
fi
