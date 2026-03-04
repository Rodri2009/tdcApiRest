#!/bin/bash

# Script para realizar un backup completo de la base de datos en docker-mariadb-1
# y actualizar los archivos SQL dentro de la carpeta database (excepto 01_schema.sql).

set -euo pipefail

show_help() {
  cat <<EOF
Usage: $(basename "$0") [--help]

Realiza un backup de tablas sensibles y actualiza archivos SQL en database/.

Opciones:
  -h, --help   Muestra esta ayuda y sale.
EOF
}

if [[ "$1" == "-h" || "$1" == "--help" ]]; then
  show_help
  exit 0
fi

# Cargar variables desde el archivo .env
if [ -f "$(dirname "$0")/../.env" ]; then
  export $(grep -v '^#' "$(dirname "$0")/../.env" | xargs)
else
  echo "❌ No se encontró el archivo .env. Asegúrate de que exista."
  exit 1
fi

# Configuración
CONTAINER_NAME="docker-mariadb-1"
DB_NAME="${MARIADB_DATABASE}"
DB_USER="${MARIADB_USER}"
DB_PASSWORD="${MARIADB_PASSWORD}"
OUTPUT_DIR="$(cd "$(dirname "$0")/../database" && pwd)"

# Archivos SQL
SCHEMA_FILE="$OUTPUT_DIR/01_schema.sql"
SEED_FILE="$OUTPUT_DIR/02_seed.sql"
TEST_DATA_FILE="$OUTPUT_DIR/03_test_data.sql"

# Verificar que el contenedor esté corriendo
if ! docker ps --format '{{.Names}}' | grep -q "$CONTAINER_NAME"; then
  echo "❌ El contenedor $CONTAINER_NAME no está corriendo. Asegúrate de que MariaDB esté levantado."
  exit 1
fi

# Crear backups temporales
TEMP_SEED="/tmp/seed.sql"
TEMP_TEST_DATA="/tmp/test_data.sql"

# Exportar datos necesarios para 02_seed.sql
echo "📦 Exportando datos iniciales a $SEED_FILE..."
docker exec -i "$CONTAINER_NAME" sh -c \
  "mysqldump -u$DB_USER -p$DB_PASSWORD --no-create-info --skip-add-drop-table --complete-insert --ignore-table=$DB_NAME.eventos_confirmados $DB_NAME" > "$TEMP_SEED"

# Exportar datos de prueba para 03_test_data.sql
echo "📦 Exportando datos de prueba a $TEST_DATA_FILE..."
docker exec -i "$CONTAINER_NAME" sh -c \
  "mysqldump -u$DB_USER -p$DB_PASSWORD --no-create-info --skip-add-drop-table --complete-insert $DB_NAME eventos_confirmados" > "$TEMP_TEST_DATA"

# Reemplazar archivos en la carpeta database
if [ -f "$SCHEMA_FILE" ]; then
  echo "✅ Conservando $SCHEMA_FILE (estructura de la base)."
else
  echo "❌ No se encontró $SCHEMA_FILE. Asegúrate de que la estructura esté definida."
  exit 1
fi

mv "$TEMP_SEED" "$SEED_FILE"
echo "✅ Archivo actualizado: $SEED_FILE"

mv "$TEMP_TEST_DATA" "$TEST_DATA_FILE"
echo "✅ Archivo actualizado: $TEST_DATA_FILE"

echo "🎉 Proceso completado. Los archivos SQL han sido actualizados."