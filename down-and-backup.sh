#!/bin/bash

#
# Script para hacer un backup de los datos sensibles y luego destruir el entorno Docker.
# Reemplaza el uso de 'docker-compose down --volumes'.
#

# --- Configuración ---
COMPOSE_FILE="docker/docker-compose.yml"
BACKUP_DIR="data_migration" # Directorio donde se guardará el backup (debe estar en .gitignore)
BACKUP_FILE="${BACKUP_DIR}/datos_sensibles_backup.sql"
DB_SERVICE="mariadb"
DB_USER="rodrigo"
DB_PASS="desa8102test"
DB_NAME="tdc_db"
TABLES_TO_BACKUP="solicitudes solicitudes_adicionales solicitudes_personal"

# --- Lógica del Script ---

echo "--- Iniciando proceso de Backup y Descenso ---"

# 1. Comprobar si el servicio de la base de datos está en ejecución
if [ -z "$(docker-compose -f $COMPOSE_FILE ps -q $DB_SERVICE)" ] || [ -z "$(docker ps -q --no-trunc | grep $(docker-compose -f $COMPOSE_FILE ps -q $DB_SERVICE))" ]; then
  echo "AVISO: El contenedor de la base de datos ('$DB_SERVICE') no está en ejecución. Saltando el paso de backup."
else
  echo "Paso 1: Realizando backup de las tablas sensibles..."
  
  # Crear el directorio de backup si no existe
  mkdir -p $BACKUP_DIR
  
  # Ejecutar mysqldump para crear el backup
  docker-compose -f $COMPOSE_FILE exec -T $DB_SERVICE mysqldump -u $DB_USER -p$DB_PASS $DB_NAME $TABLES_TO_BACKUP > $BACKUP_FILE
  
  # Comprobar si el backup se creó correctamente
  if [ $? -eq 0 ] && [ -s $BACKUP_FILE ]; then
    echo "✅ Backup realizado con éxito en '$BACKUP_FILE'."
  else
    echo "❌ ERROR: El backup falló. Por favor, revisa los logs. Abortando el descenso para proteger los datos."
    exit 1
  fi
fi

# 2. Destruir el entorno Docker, incluyendo los volúmenes
echo "Paso 2: Destruyendo el entorno Docker (contenedores, redes y volúmenes)..."
docker-compose -f $COMPOSE_FILE down --volumes

echo "--- Proceso completado ---"