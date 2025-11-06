#!/bin/bash

# ==============================================================================
# Script robusto para levantar el entorno Docker completo de la App TDC.
#
# Uso: ./up.sh
#
# Este script realiza las siguientes acciones:
#   1. Valida que el archivo de configuración `.env` exista en la raíz.
#   2. Valida que todas las variables de entorno críticas estén definidas en `.env`.
#   3. Levanta todos los servicios (nginx, backend, mariadb) usando Docker Compose.
#   4. Muestra el estado final de los contenedores y los logs del backend.
# ==============================================================================


# --- Sección de Configuración ---

# Define la ubicación del archivo de entorno.
ENV_FILE=".env"

# Define la ubicación del archivo de Docker Compose.
COMPOSE_FILE="docker/docker-compose.yml"

# --- Lista de Variables de Entorno Requeridas ---
# Aquí se listan todas las variables que DEBEN existir en el archivo .env
# para que la aplicación funcione correctamente. Si alguna falta, el script se detendrá.
REQUIRED_VARS=(
    # Variables para el Backend (Node.js)
    "PORT"
    "DB_HOST"
    "DB_NAME"
    "DB_USER"
    "DB_PASSWORD"
    "MARIADB_DATABASE"
    "MARIADB_USER"
    "MARIADB_PASSWORD"
    "MARIADB_ROOT_PASSWORD"
    "EMAIL_SERVICE"
    "EMAIL_USER"
    "EMAIL_PASS"
    "EMAIL_ADMIN"
    "JWT_SECRET"
)


# --- Inicio de la Lógica del Script ---

echo "--- Iniciando el arranque del entorno TDC ---"

# --- Fase 1: Validación del Entorno ---

# 1.1. Comprobar si el archivo .env existe.
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ ERROR CRÍTICO: El archivo de configuración '$ENV_FILE' no fue encontrado."
    echo "   Por favor, crea el archivo '$ENV_FILE' en la raíz del proyecto antes de continuar."
    exit 1 # Termina el script con un código de error.
fi
echo "✅ Archivo de configuración '$ENV_FILE' encontrado."

# 1.2. Cargar las variables del .env en el shell actual para poder validarlas.
# El comando 'source' ejecuta el contenido del archivo, definiendo las variables.
set -a # Exporta automáticamente las variables que se definan
source "$ENV_FILE"
set +a # Desactiva la exportación automática

# 1.3. Iterar sobre la lista de variables requeridas y comprobar que cada una tiene un valor.
for VAR_NAME in "${REQUIRED_VARS[@]}"; do
    # La sintaxis `${!VAR_NAME}` es una forma de "indirección": obtiene el valor de la variable
    # cuyo nombre está almacenado en VAR_NAME.
    # [ -z "..." ] comprueba si la cadena está vacía.
    if [ -z "${!VAR_NAME}" ]; then
        echo "❌ ERROR CRÍTICO: La variable requerida '$VAR_NAME' no está definida o está vacía en tu archivo '$ENV_FILE'."
        echo "   Por favor, añade esta variable y su valor a '$ENV_FILE' para continuar."
        exit 1 # Termina el script con un código de error.
    fi
done
echo "✅ Todas las variables de entorno requeridas están presentes y tienen valor."


# --- Fase 2: Arranque de Docker ---

echo "--- Levantando los contenedores de Docker (esto puede tardar la primera vez)... ---"
# Se ejecuta docker-compose pasando explícitamente tanto el archivo de compose como el de entorno.
# --build: Reconstruye las imágenes si hay cambios en los Dockerfiles.
# -d: Modo "detached", ejecuta los contenedores en segundo plano.
docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE up --build -d

# Comprobar el código de salida del comando anterior. Si es diferente de 0, algo falló.
if [ $? -ne 0 ]; then
    echo "❌ ERROR: Docker Compose falló al intentar levantar los contenedores."
    echo "   Revisa los mensajes de error de arriba para más detalles."
    exit 1
fi

echo ""
echo "--- 🚀 Entorno levantado con éxito ---"


# --- Fase 3: Información y Monitoreo ---

echo "--- Mostrando estado de los contenedores... ---"
# Damos una pequeña pausa para que los servicios terminen de estabilizarse.
sleep 3
docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE ps

echo ""
echo "--- Mostrando logs del backend en tiempo real (Presiona Ctrl+C para salir) ---"
docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE logs -f backend