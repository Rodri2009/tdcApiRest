#!/usr/bin/env bash
# Script helper para aplicar migraciones en el contenedor MariaDB usando docker
# Uso: ./scripts/apply_migrations.sh database/7_migration_add_precios_bandas.sql

set -euo pipefail
MIGRATION_FILE=${1:-}
if [ -z "$MIGRATION_FILE" ]; then
  echo "Uso: $0 <ruta/a/migration.sql>"
  exit 2
fi

# Leer .env si existe
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

DB_CONTAINER="docker-mariadb-1"
DB_NAME=${MARIADB_DATABASE:-tdc_db}
ROOT_PASS=${MARIADB_ROOT_PASSWORD:-}

if [ -z "$ROOT_PASS" ]; then
  echo "ERROR: MARIADB_ROOT_PASSWORD no está definido en .env"
  exit 3
fi

echo "Aplicando migración ${MIGRATION_FILE} en contenedor ${DB_CONTAINER} (DB: ${DB_NAME})..."

docker exec -i ${DB_CONTAINER} sh -c "mysql -u root -p\"${ROOT_PASS}\" ${DB_NAME}" < ${MIGRATION_FILE}

if [ $? -eq 0 ]; then
  echo "Migración aplicada correctamente."
else
  echo "Error al aplicar la migración." >&2
  exit 4
fi
