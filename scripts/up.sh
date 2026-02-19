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

# Ruta raíz del repo (útil para invocar scripts desde cualquier cwd)
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Permitir opción CLI: --migrate (o usar env var APPLY_MIGRATIONS=true)
APPLY_MIGRATIONS_CLI=0
while [ $# -gt 0 ]; do
    case "$1" in
        --migrate|--apply-migrations) APPLY_MIGRATIONS_CLI=1; shift;;
        -h|--help) echo "Usage: $0 [--migrate]"; exit 0;;
        *) echo "Unknown arg: $1"; exit 1;;
    esac
done

# --- Comprobaciones previas: comandos y daemon ---
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

echo "--- Verificando requisitos locales (Docker, Docker Compose, .env) ---"

# 1) Docker instalado
if ! command_exists docker; then
    echo "❌ ERROR: 'docker' no está instalado o no está en PATH. Instala Docker: https://docs.docker.com/engine/install/"
    exit 1
fi

# 2) Docker daemon corriendo
if ! docker info >/dev/null 2>&1; then
    echo "❌ ERROR: El daemon de Docker no parece estar corriendo o el usuario no tiene permisos para comunicarse con Docker."
    echo "   En Linux intenta: sudo systemctl start docker  (o revisa que el servicio docker esté activo)."
    exit 1
fi

# 3) Detectar comando de Compose: preferir 'docker compose' (plugin) y fallback a 'docker-compose' binario
COMPOSE_CMD=""
if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
elif command_exists docker-compose; then
    COMPOSE_CMD="docker-compose"
else
    echo "❌ ERROR: No se encontró Docker Compose ni el subcomando 'docker compose'."
    echo "   Instala Docker Compose o actualiza Docker para incluir el plugin 'compose'."
    echo "   Instrucciones: https://docs.docker.com/compose/install/"
    exit 1
fi

# 4) Comprobar que el archivo de compose existe
if [ ! -f "$COMPOSE_FILE" ]; then
    echo "❌ ERROR: No se encontró el archivo de Compose en '$COMPOSE_FILE'."
    echo "   Asegúrate de ejecutar este script desde la raíz del repo o de que el archivo exista en la ruta esperada."
    exit 1
fi

echo "✅ Requisitos locales verificados: docker + compose disponibles, daemon activo, archivos presentes."

# --- Comprobación de Node.js y npm ---
min_version_or_fail() {
    local current="$1"; shift
    local required="$1"; shift
    # Compara dos versiones semánticas simples. Retorna 0 si current >= required
    # Usa sort -V para comparación robusta.
    if [ "$(printf '%s\n%s' "$required" "$current" | sort -V | head -n1)" = "$required" ]; then
        return 0
    fi
    return 1
}

NODE_MIN_VERSION="14.0.0"
NPM_MIN_VERSION="6.0.0"

if ! command_exists node; then
    echo "❌ ERROR: 'node' no está instalado o no está en PATH. Instala Node.js (https://nodejs.org/)"
    exit 1
fi
if ! command_exists npm; then
    echo "❌ ERROR: 'npm' no está instalado o no está en PATH. Instala Node.js (npm viene incluido) https://nodejs.org/"
    exit 1
fi

NODE_VERSION="$(node --version | sed 's/^v//')"
NPM_VERSION="$(npm --version)"

if ! min_version_or_fail "$NODE_VERSION" "$NODE_MIN_VERSION"; then
    echo "❌ ERROR: Tu versión de Node es '$NODE_VERSION'. Se requiere al menos $NODE_MIN_VERSION."
    echo "   Actualiza Node.js: https://nodejs.org/"
    exit 1
fi
if ! min_version_or_fail "$NPM_VERSION" "$NPM_MIN_VERSION"; then
    echo "❌ ERROR: Tu versión de npm es '$NPM_VERSION'. Se requiere al menos $NPM_MIN_VERSION."
    echo "   Actualiza npm: 'npm install -g npm' o reinstala Node.js."
    exit 1
fi

echo "✅ Node.js y npm detectados: node $NODE_VERSION, npm $NPM_VERSION"

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


# --- Fase 2: Limpieza y Arranque de Docker ---

echo "--- Deteniendo contenedores existentes y eliminando volumen de base de datos... ---"
# Detenemos los contenedores primero para poder eliminar el volumen de MariaDB
eval "$COMPOSE_CMD -f $COMPOSE_FILE --env-file $ENV_FILE down" 2>/dev/null

# Eliminamos el volumen de MariaDB para forzar la recreación de la BD desde los SQLs
# Esto asegura que 01_schema.sql y 02_seed.sql se ejecuten siempre
MARIADB_VOLUME="docker_mariadb_data"
if docker volume ls -q | grep -q "^${MARIADB_VOLUME}$"; then
    echo "🗑️  Eliminando volumen '$MARIADB_VOLUME' para recrear la base de datos..."
    docker volume rm "$MARIADB_VOLUME" 2>/dev/null || true
fi

echo "--- Levantando los contenedores de Docker (la BD se creará desde los SQLs)... ---"
# Se ejecuta docker-compose pasando explícitamente tanto el archivo de compose como el de entorno.
# --build: Reconstruye las imágenes si hay cambios en los Dockerfiles.
# -d: Modo "detached", ejecuta los contenedores en segundo plano.
eval "$COMPOSE_CMD -f $COMPOSE_FILE --env-file $ENV_FILE up --build -d"

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
eval "$COMPOSE_CMD -f $COMPOSE_FILE --env-file $ENV_FILE ps"

# -- Opcional: aplicar migraciones si se solicitó (CLI o env var)
# Soporta: `./scripts/up.sh --migrate` o `APPLY_MIGRATIONS=true ./scripts/up.sh`
if [ "${APPLY_MIGRATIONS_CLI:-0}" = "1" ] || [ "${APPLY_MIGRATIONS,,}" = "true" ] || [ "${APPLY_MIGRATIONS:-0}" = "1" ]; then
    echo "--- ⤴️ Aplicando migraciones SQL desde database/migrations (solicitado) ---"
    MIG_DIR="database/migrations"
    if [ -d "$MIG_DIR" ] && ls $MIG_DIR/*.sql >/dev/null 2>&1; then
        # Esperar a que MariaDB esté lista
        TRIES=0
        MAX_TRIES=30
        until $COMPOSE_CMD -f $COMPOSE_FILE --env-file $ENV_FILE exec -T mariadb mysql -u root -p"$MARIADB_ROOT_PASSWORD" -e "SELECT 1" >/dev/null 2>&1; do
            TRIES=$((TRIES+1))
            if [ $TRIES -ge $MAX_TRIES ]; then
                echo "❌ ERROR: MariaDB no respondió después de $MAX_TRIES intentos. No se pueden aplicar migraciones."
                exit 1
            fi
            sleep 2
        done

        for sqlfile in $(ls $MIG_DIR/*.sql | sort); do
            if grep -q '^-- ARCHIVED:' "$sqlfile" 2>/dev/null; then
                echo "Saltando migración archivada: $sqlfile"
                continue
            fi
            echo "Aplicando: $sqlfile"
            if ! cat "$sqlfile" | $COMPOSE_CMD -f $COMPOSE_FILE --env-file $ENV_FILE exec -T mariadb sh -c "mysql -u root -p\"$MARIADB_ROOT_PASSWORD\" \"$MARIADB_DATABASE\""; then
                echo "❌ ERROR: Falló la migración $sqlfile."
                exit 1
            fi
        done
        echo "--- ✅ Migraciones aplicadas correctamente ---"
    else
        echo "--- ℹ️ No se encontraron migraciones en $MIG_DIR (o no hay archivos .sql) ---"
    fi
fi

echo ""

# Nota: las utilidades automáticas de verificación SQL fueron retiradas del repositorio.
# Si necesitas comprobar la integridad de la base de datos, sigue los pasos manuales
# documentados en README.md -> "Verificación manual (QA) — pasos rápidos".
# (originalmente se ejecutaba `verify_and_fix_inconsistencies.sql` aquí).

echo "--- Mostrando logs del backend en tiempo real (Presiona Ctrl+C para salir) ---"
eval "$COMPOSE_CMD -f $COMPOSE_FILE --env-file $ENV_FILE logs -f backend"