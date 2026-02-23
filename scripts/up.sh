#!/bin/bash

###############################################################################
# up.sh - Levanta el entorno Docker completo de la App TDC
###############################################################################
# Uso: ./up.sh [opciones]
#
# FLAGS DE DEPURACIÓN (se pasan a node server.js):
#   -v, --verbose     : muestra logs detallados de procesamiento
#   -e, --error       : muestra solo errores
#   -d, --debug       : combina verbose + error (máximo detalle)
#   -h, --help        : muestra ayuda de node server.js
#   --migrate         : aplica migraciones SQL después de levantar
#
# EJEMPLOS:
#   ./up.sh              # Levanta todo con logs en vivo
#   ./up.sh -d           # Levanta con debug detallado
#   ./up.sh --migrate -d # Levanta, aplica migraciones y muestra debug
###############################################################################

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# --- Sección de Configuración ---

# Define la ubicación del archivo de entorno.
ENV_FILE=".env"

# Define la ubicación del archivo de Docker Compose.
COMPOSE_FILE="docker/docker-compose.yml"

# Ruta raíz del repo (útil para invocar scripts desde cualquier cwd)
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Permitir opción CLI: --migrate (o usar env var APPLY_MIGRATIONS=true)
# También soporta flags de depuración: -v, -e, -d, --verbose, --error, --debug
APPLY_MIGRATIONS_CLI=0
DEBUG_FLAGS=""

while [ $# -gt 0 ]; do
    case "$1" in
        --migrate|--apply-migrations) APPLY_MIGRATIONS_CLI=1; shift;;
        # Flags de depuración que se pasan a node
        -v|--verbose|-e|--error|-d|--debug|-h|--help)
          DEBUG_FLAGS="$DEBUG_FLAGS $1"
          shift
          ;;
        -h|--help)
          echo "Usage: $0 [--migrate] [-v|-e|-d|-h]"
          echo "Flags de depuración:"
          echo "  -v, --verbose    : muestra procesamiento detallado"
          echo "  -e, --error      : muestra solo errores"
          echo "  -d, --debug      : verbose + error (máximo detalle)"
          echo "  -h, --help       : muestra ayuda"
          exit 0
          ;;
        *) echo "Unknown arg: $1"; exit 1;;
    esac
done

# --- Comprobaciones previas: comandos y daemon ---
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}  TDC App - Levantamiento del Entorno${NC}"
echo -e "${BLUE}======================================================${NC}"
echo ""
echo -e "${YELLOW}[*]${NC} Verificando requisitos locales..."
echo ""

# 1) Docker instalado
if ! command_exists docker; then
    echo -e "${RED}[✗] ERROR: 'docker' no está instalado o no está en PATH.${NC}"
    echo "   Instala Docker: https://docs.docker.com/engine/install/"
    exit 1
fi

# 2) Docker daemon corriendo
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}[✗] ERROR: El daemon de Docker no parece estar corriendo.${NC}"
    echo "   En Linux intenta: sudo systemctl start docker"
    exit 1
fi

# 3) Detectar comando de Compose
COMPOSE_CMD=""
if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
elif command_exists docker-compose; then
    COMPOSE_CMD="docker-compose"
else
    echo -e "${RED}[✗] ERROR: No se encontró Docker Compose.${NC}"
    echo "   Instala Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

# 4) Comprobar que el archivo de compose existe
if [ ! -f "$COMPOSE_FILE" ]; then
    echo -e "${RED}[✗] ERROR: No se encontró $COMPOSE_FILE${NC}"
    exit 1
fi

echo -e "${GREEN}  ✓ Docker y Docker Compose detectados${NC}"

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
    echo -e "${RED}[✗] ERROR: 'node' no está instalado.${NC}"
    echo "   Instala Node.js: https://nodejs.org/"
    exit 1
fi
if ! command_exists npm; then
    echo -e "${RED}[✗] ERROR: 'npm' no está instalado.${NC}"
    exit 1
fi

NODE_VERSION="$(node --version | sed 's/^v//')"
NPM_VERSION="$(npm --version)"

if ! min_version_or_fail "$NODE_VERSION" "$NODE_MIN_VERSION"; then
    echo -e "${RED}[✗] ERROR: Node $NODE_VERSION encontrado, se requiere $NODE_MIN_VERSION+${NC}"
    exit 1
fi
if ! min_version_or_fail "$NPM_VERSION" "$NPM_MIN_VERSION"; then
    echo -e "${RED}[✗] ERROR: npm $NPM_VERSION encontrado, se requiere $NPM_MIN_VERSION+${NC}"
    exit 1
fi

echo -e "${GREEN}  ✓ Node.js $NODE_VERSION y npm $NPM_VERSION detectados${NC}"

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

echo ""
echo -e "${YELLOW}[*]${NC} Validando configuración del entorno..."
echo ""

# 1.1. Comprobar si el archivo .env existe
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}[✗] ERROR: No se encontró $ENV_FILE${NC}"
    exit 1
fi
echo -e "${GREEN}  ✓ Archivo .env encontrado${NC}"

# 1.2. Cargar las variables del .env en el shell actual para poder validarlas.
# El comando 'source' ejecuta el contenido del archivo, definiendo las variables.
set -a # Exporta automáticamente las variables que se definan
source "$ENV_FILE"
set +a # Desactiva la exportación automática

# 1.3. Iterar sobre la lista de variables requeridas
for VAR_NAME in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!VAR_NAME}" ]; then
        echo -e "${RED}[✗] ERROR: Variable '$VAR_NAME' no está definida en $ENV_FILE${NC}"
        exit 1
    fi
done
echo -e "${GREEN}  ✓ Todas las variables de entorno están configuradas${NC}"


# --- Fase 2: Limpieza y Arranque de Docker ---

echo ""
echo -e "${YELLOW}[*]${NC} Limpiando y levantando contenedores Docker..."
echo -ne "  → Deteniendo contenedores... "
eval "$COMPOSE_CMD -f $COMPOSE_FILE --env-file $ENV_FILE down" 2>/dev/null
echo -e "${GREEN}✓${NC}"

# Eliminar volumen de MariaDB
echo -ne "  → Eliminando volumen de BD... "
MARIADB_VOLUME="docker_mariadb_data"
if docker volume ls -q | grep -q "^${MARIADB_VOLUME}$"; then
    docker volume rm "$MARIADB_VOLUME" 2>/dev/null || true
fi
echo -e "${GREEN}✓${NC}"

echo -ne "  → Levantando contenedores... "
if [ -n "$DEBUG_FLAGS" ]; then
    echo ""
    eval "$COMPOSE_CMD -f $COMPOSE_FILE --env-file $ENV_FILE up --build -d mariadb"
else
    eval "$COMPOSE_CMD -f $COMPOSE_FILE --env-file $ENV_FILE up --build -d"
fi

if [ $? -ne 0 ]; then
    echo -e "${RED}[✗] ERROR: Docker Compose falló${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC}"

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  ✓ Entorno levantado exitosamente${NC}"
echo -e "${GREEN}================================================${NC}"


# --- Fase 3: Información y Monitoreo ---

echo ""
echo -e "${CYAN}[*] Status de contenedores:${NC}"
sleep 3
eval "$COMPOSE_CMD -f $COMPOSE_FILE --env-file $ENV_FILE ps"
echo ""

# Aplicar migraciones si se solicitó
if [ "${APPLY_MIGRATIONS_CLI:-0}" = "1" ] || [ "${APPLY_MIGRATIONS,,}" = "true" ] || [ "${APPLY_MIGRATIONS:-0}" = "1" ]; then
    echo -e "${YELLOW}[*]${NC} Aplicando migraciones SQL..."
    MIG_DIR="database/migrations"
    if [ -d "$MIG_DIR" ] && ls $MIG_DIR/*.sql >/dev/null 2>&1; then
        TRIES=0
        MAX_TRIES=30
        until $COMPOSE_CMD -f $COMPOSE_FILE --env-file $ENV_FILE exec -T mariadb mysql -u root -p"$MARIADB_ROOT_PASSWORD" -e "SELECT 1" >/dev/null 2>&1; do
            TRIES=$((TRIES+1))
            if [ $TRIES -ge $MAX_TRIES ]; then
                echo -e "${RED}[✗] ERROR: MariaDB no está listo${NC}"
                exit 1
            fi
            sleep 2
        done

        for sqlfile in $(ls $MIG_DIR/*.sql | sort); do
            if grep -q '^-- ARCHIVED:' "$sqlfile" 2>/dev/null; then
                continue
            fi
            echo -e "  → $(basename $sqlfile)... "
            if ! cat "$sqlfile" | $COMPOSE_CMD -f $COMPOSE_FILE --env-file $ENV_FILE exec -T mariadb sh -c "mysql -u root -p\"$MARIADB_ROOT_PASSWORD\" \"$MARIADB_DATABASE\""; then
                echo -e "${RED}[✗] ERROR en migración${NC}"
                exit 1
            fi
            echo -e "${GREEN}✓${NC}"
        done
        echo -e "${GREEN}  ✓ Migraciones completadas${NC}"
    fi
fi

echo ""

# Nota: las utilidades automáticas de verificación SQL fueron retiradas del repositorio.
# Si necesitas comprobar la integridad de la base de datos, sigue los pasos manuales
# documentados en README.md -> "Verificación manual (QA) — pasos rápidos".
# (originalmente se ejecutaba `verify_and_fix_inconsistencies.sql` aquí).

if [ -n "$DEBUG_FLAGS" ]; then
    echo -e "${BLUE}======================================================${NC}"
    echo -e "${BLUE}  🐛 Ejecutando Backend con Debug Flags${NC}"
    echo -e "${BLUE}======================================================${NC}"
    echo ""
    echo -e "${CYAN}[*] Esperando que MariaDB esté listo...${NC}"
    sleep 5
    
    echo -e "${CYAN}[*] Ejecutando backend en background con flags:$DEBUG_FLAGS${NC}"
    BACKEND_RUN_ID=$(eval "$COMPOSE_CMD -f $COMPOSE_FILE --env-file $ENV_FILE run -d --rm backend $DEBUG_FLAGS")
    
    NETWORK_NAME="docker_default"
    echo -ne "${CYAN}[*] Configurando red... ${NC}"
    docker network disconnect "$NETWORK_NAME" "$BACKEND_RUN_ID" 2>/dev/null || true
    docker network connect --alias backend "$NETWORK_NAME" "$BACKEND_RUN_ID" 2>/dev/null || true
    echo -e "${GREEN}✓${NC}"
    
    sleep 2
    
    echo -ne "${CYAN}[*] Levantando nginx... ${NC}"
    eval "$COMPOSE_CMD -f $COMPOSE_FILE --env-file $ENV_FILE up -d --no-deps nginx"
    echo -e "${GREEN}✓${NC}"
    
    sleep 1
    
    echo ""
    echo -e "${BLUE}======================================================${NC}"
    echo -e "${BLUE}  Logs del Backend en Tiempo Real${NC}"
    echo -e "${BLUE}  (Presiona Ctrl+C para salir)${NC}"
    echo -e "${BLUE}======================================================${NC}"
    echo ""
    docker logs -f "$BACKEND_RUN_ID" 2>/dev/null || eval "$COMPOSE_CMD -f $COMPOSE_FILE --env-file $ENV_FILE logs -f backend"
else
    echo ""
    echo -e "${BLUE}======================================================${NC}"
    echo -e "${BLUE}  Logs del Backend en Tiempo Real${NC}"
    echo -e "${BLUE}  (Presiona Ctrl+C para salir)${NC}"
    echo -e "${BLUE}======================================================${NC}"
    echo ""
    eval "$COMPOSE_CMD -f $COMPOSE_FILE --env-file $ENV_FILE logs -f backend"
fi