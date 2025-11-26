#!/bin/bash
set -euo pipefail

# backup_and_stop.sh
# - Realiza un dump de la base de datos configurada en .env
# - Guarda el SQL en backups/<timestamp>/
# - Detiene los servicios con docker compose

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"
COMPOSE_FILE="$ROOT_DIR/docker/docker-compose.yml"
BACKUPS_DIR="$ROOT_DIR/backups"

timestamp() { date +"%Y%m%d_%H%M%S"; }

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Archivo .env no encontrado en $ROOT_DIR. Crea o copia el archivo antes de continuar."
  exit 1
fi

# Cargar variables del .env
set -a
source "$ENV_FILE"
set +a

command_exists() { command -v "$1" >/dev/null 2>&1; }

# Detectar docker compose
if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
elif command_exists docker-compose; then
  COMPOSE_CMD="docker-compose"
else
  echo "❌ No se encontró 'docker compose' ni 'docker-compose'. Instala Docker Compose."
  exit 1
fi

TS=$(timestamp)
DEST_DIR="$BACKUPS_DIR/$TS"
mkdir -p "$DEST_DIR"

DB_NAME="${MARIADB_DATABASE:-${DB_NAME:-}}"
if [ -z "$DB_NAME" ]; then
  echo "❌ No se encontró el nombre de la base de datos (MARIADB_DATABASE o DB_NAME) en .env"
  exit 1
fi

echo "🗂️  Realizando backup de la base de datos '$DB_NAME' -> $DEST_DIR"

# Ejecutar mysqldump dentro del contenedor y redirigir la salida al host
# Usamos single quotes para que la variable se evalúe dentro del contenedor (donde están las env vars)
SQL_FILE="$DEST_DIR/${DB_NAME}_dump_${TS}.sql"
${COMPOSE_CMD} -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T mariadb sh -c 'mysqldump -u root -p"$MARIADB_ROOT_PASSWORD" "$MARIADB_DATABASE"' > "$SQL_FILE"

echo "✅ Backup guardado en: $SQL_FILE"

echo "🛑 Deteniendo contenedores (docker compose down)..."
${COMPOSE_CMD} -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down

echo "✅ Contenedores detenidos. Backup finalizado."

echo "Nota: si quieres restaurar manualmente, usa scripts/import_sqls.sh o importa el archivo SQL con mysql."
