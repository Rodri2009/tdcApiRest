#!/bin/bash

#
# Script robusto para levantar el entorno Docker.
# 1. Valida que las variables de entorno existan.
# 2. Levanta los contenedores.
#

# --- Configuración ---
ENV_FILE=".env"
COMPOSE_FILE="docker/docker-compose.yml"

# Lista de variables REQUERIDAS en el archivo .env
REQUIRED_VARS=(
    "PORT"
    "DB_HOST"
    "DB_NAME"
    "DB_USER"
    "DB_PASSWORD"
    "MARIADB_DATABASE"
    "MARIADB_USER"
    "MARIADB_PASSWORD"
    "MARIADB_ROOT_PASSWORD"
)

# --- Lógica de Validación ---

echo "--- Iniciando el arranque del entorno TDC ---"

# 1. Comprobar si el archivo .env existe
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ ERROR CRÍTICO: El archivo de configuración '$ENV_FILE' no fue encontrado."
    echo "Por favor, crea el archivo '$ENV_FILE' en la raíz del proyecto antes de continuar."
    exit 1
fi

echo "✅ Archivo '$ENV_FILE' encontrado."

# 2. Comprobar que todas las variables requeridas están en el archivo .env
# Usamos 'grep' para leer el archivo y 'cut' para obtener la parte antes del '='
# Luego comparamos con nuestra lista de variables requeridas.
source $ENV_FILE
for VAR_NAME in "${REQUIRED_VARS[@]}"; do
    # Comprobamos si la variable está definida y no está vacía
    if [ -z "${!VAR_NAME}" ]; then
        echo "❌ ERROR CRÍTICO: La variable '$VAR_NAME' no está definida o está vacía en tu archivo '$ENV_FILE'."
        echo "Por favor, añade esta variable y su valor a '$ENV_FILE' para continuar."
        exit 1
    fi
done

echo "✅ Todas las variables de entorno requeridas están presentes."

# --- Arranque de Docker ---
echo "Paso 3: Levantando los contenedores de Docker..."
docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE up --build -d

echo ""
echo "--- 🚀 Entorno levantado con éxito ---"
echo "Puedes ver los logs del backend con:"
echo "docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE logs -f backend"
echo "Para detener los contenedores:"
echo "docker-compose -f docker/docker-compose.yml down --volumes"
echo ""
echo "Paso 4: Mostrando estado de los contenedores..."
echo "Ejecutando: docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE ps"
sleep 2
docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE ps
echo ""
echo ""
echo "Paso 5: Mostrando logs del backend en tiempo real..."
echo "docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE logs -f backend"
docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE logs -f backend
