#!/bin/bash
set -euo pipefail

# restart_backend.sh
# Script para reiniciar el backend con soporte para flags de depuración
#
# FLAGS DE DOCKER:
#   --rebuild         : reconstruye la imagen del backend antes de levantarla
#   --down            : hace docker compose down antes de rebuild/up
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
#   ./restart_backend.sh --no-logs -e          # Sin logs de docker, solo errores en app

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
if [ -n "$DEBUG_FLAGS" ]; then
  # Si hay flags, hacer down antes para matar completamente
  $COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down
  
  # Levantar solo los otros servicios primero
  $COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d mariadb nginx
  sleep 2
  
  echo "[restart_backend] Ejecutando backend con flags:$DEBUG_FLAGS"
  # Ejecutar el backend con un contenedor de una sola vez (interactivo)
  $COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm backend $DEBUG_FLAGS
else
  $COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d backend
  
  # Esperar a que el contenedor esté listo
  echo "[restart_backend] Esperando a que el contenedor esté listo..."
  sleep 2
  
  if [ $SHOW_LOGS -eq 1 ]; then
    echo "[restart_backend] Mostrando logs del backend (Ctrl+C para salir)..."
    $COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs -f backend
  else
    echo "[restart_backend] Backend levantado en background."
  fi
fi

echo "[restart_backend] Hecho."
