#!/bin/bash
set -euo pipefail

# restart_backend.sh
# Opciones:
#   --rebuild    : reconstruye la imagen del backend antes de levantarla
#   --down       : hace docker compose down antes de rebuild/up
#   --no-logs    : no muestra logs en foreground

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"
COMPOSE_FILE="$ROOT_DIR/docker/docker-compose.yml"

REBUILD=0
DO_DOWN=0
SHOW_LOGS=1

while [ $# -gt 0 ]; do
  case "$1" in
    --rebuild) REBUILD=1; shift;;
    --down) DO_DOWN=1; shift;;
    --no-logs) SHOW_LOGS=0; shift;;
    -h|--help) echo "Usage: $0 [--rebuild] [--down] [--no-logs]"; exit 0;;
    *) echo "Unknown arg: $1"; exit 1;;
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

echo "[restart_backend] Usando comando: $COMPOSE_CMD"

if [ $DO_DOWN -eq 1 ]; then
  echo "[restart_backend] Ejecutando down..."
  $COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down
fi

if [ $REBUILD -eq 1 ]; then
  echo "[restart_backend] Reconstruyendo imagen backend..."
  $COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build --no-cache backend
fi

echo "[restart_backend] Levantando backend..."
$COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d backend

if [ $SHOW_LOGS -eq 1 ]; then
  echo "[restart_backend] Mostrando logs del backend (Ctrl+C para salir)..."
  $COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs -f backend
fi

echo "[restart_backend] Hecho."
