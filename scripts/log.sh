#!/bin/bash

###############################################################################
# log.sh - Visualiza logs de contenedores Docker (backend, mariadb, nginx)
###############################################################################
# Uso: ./log.sh [opciones]
#
# FLAGS DE CONTENEDORES (selecciona qué logs ver):
#   --backend         : logs del backend (Node.js) - defecto si no especificas
#   --mariadb, --bd   : logs de la base de datos (MariaDB)
#   --frontend, --nginx : logs del proxy (nginx)
#   (sin flags)       : muestra logs de TODOS los contenedores (--tdc)
#
# FLAGS DE SERVICIOS (filtrado de logs):
#   --mp              : filtra solo logs de Mercado Pago
#   --wa              : filtra solo logs de WhatsApp
#
# FLAGS DE VISUALIZACIÓN:
#   -f, --follow      : sigue los logs en tiempo real (default para todos)
#   --tail N          : muestra últimas N líneas (default 100)
#   --no-follow       : no sigue logs, solo muestra histórico
#   --timestamps      : muestra timestamp de cada línea
#
# FLAGS DE DEPURACIÓN:
#   -d, --debug       : muestra comandos que se ejecutan
#   -h, --help        : muestra esta ayuda
#
# EJEMPLOS:
#   ./log.sh                           # Todos los logs en tiempo real
#   ./log.sh --backend                 # Logs del backend en vivo
#   ./log.sh --backend --follow        # Logs del backend (explícito follow)
#   ./log.sh --backend --tail 50       # Últimas 50 líneas del backend
#   ./log.sh --mariadb --no-follow     # Histórico de BD sin seguimiento
#   ./log.sh --backend --mp            # Logs del backend filtrados solo MP
#   ./log.sh --backend --wa            # Logs del backend filtrados solo WA
#   ./log.sh --backend --mp --wa       # Logs de MP y WA juntos
#   ./log.sh --backend -d              # Con debug (muestra comandos)
#   ./log.sh --frontend --timestamps   # Logs nginx con timestamps
###############################################################################

set -euo pipefail

# === COLORES Y FORMATOS ===
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# === CONFIGURACIÓN BASE ===
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$PROJECT_DIR/docker/docker-compose.yml"

# === FLAGS Y VARIABLES ===
SHOW_BACKEND=0
SHOW_MARIADB=0
SHOW_FRONTEND=0
SHOW_ALL=1
FILTER_MP=0
FILTER_WA=0
FOLLOW_LOGS=1
TAIL_LINES=100
SHOW_TIMESTAMPS=0
DEBUG_MODE=0

# === FUNCIONES AUXILIARES ===

show_help() {
    cat <<EOF
${CYAN}${BOLD}log.sh - Visualiza logs de contenedores Docker${NC}

${BOLD}USO:${NC}
  $0 [opciones]

${BOLD}FLAGS DE CONTENEDORES:${NC}
  --backend         logs del backend (Node.js)
  --mariadb, --bd   logs de MariaDB
  --frontend, --nginx logs de nginx
  (sin flags)       muestra todos los logs (defecto)

${BOLD}FLAGS DE FILTRADO:${NC}
  --mp              filtra solo logs de Mercado Pago
  --wa              filtra solo logs de WhatsApp

${BOLD}FLAGS DE VISUALIZACIÓN:${NC}
  -f, --follow      sigue los logs en tiempo real (defecto)
  --tail N          muestra últimas N líneas (defecto 100)
  --no-follow       no sigue logs, solo muestra histórico
  --timestamps      muestra timestamp de cada línea

${BOLD}FLAGS DE DEPURACIÓN:${NC}
  -d, --debug       muestra comandos que se ejecutan
  -h, --help        muestra esta ayuda

${BOLD}EJEMPLOS:${NC}
  $0                          # Todos los logs en tiempo real
  $0 --backend                # Logs del backend
  $0 --backend --mp           # Logs del backend filtrados solo MP
  $0 --mariadb --tail 50      # Últimas 50 líneas de MariaDB
  $0 --frontend -f            # Logs de nginx en vivo

EOF
}

debug_echo() {
    if [ "$DEBUG_MODE" = "1" ]; then
        echo -e "${MAGENTA}[DEBUG]${NC} $*" >&2
    fi
}

error_echo() {
    echo -e "${RED}[ERROR]${NC} $*" >&2
}

success_echo() {
    echo -e "${GREEN}[✓]${NC} $*"
}

info_echo() {
    echo -e "${CYAN}[*]${NC} $*"
}

# Valida que Docker esté disponible
check_docker() {
    if ! command -v docker &>/dev/null; then
        error_echo "docker no está instalado o no está en PATH"
        exit 1
    fi

    if ! docker ps &>/dev/null; then
        error_echo "No se puede conectar a Docker. ¿Está el daemon corriendo?"
        exit 1
    fi
}

# Verifica si un contenedor existe y está corriendo
check_container() {
    local container_name=$1
    local status=$(docker inspect -f '{{.State.Status}}' "$container_name" 2>/dev/null || echo "missing")
    
    if [ "$status" = "missing" ]; then
        return 1
    fi
    return 0
}

# Aplica filtros a los logs
apply_filters() {
    if [ "$FILTER_MP" = "1" ] && [ "$FILTER_WA" = "0" ]; then
        grep -i "MP\|Mercado\|mercado-pago\|mercadopago" || true
    elif [ "$FILTER_WA" = "1" ] && [ "$FILTER_MP" = "0" ]; then
        grep -i "WA\|WhatsApp\|whatsapp" || true
    elif [ "$FILTER_MP" = "1" ] && [ "$FILTER_WA" = "1" ]; then
        grep -iE "MP\|Mercado|mercado-pago|mercadopago|WA|WhatsApp|whatsapp" || true
    else
        cat
    fi
}

# Muestra logs de un contenedor específico
show_container_logs() {
    local container_name=$1
    local display_name=$2
    
    if ! check_container "$container_name"; then
        error_echo "Contenedor '$container_name' no encontrado o no está corriendo"
        return 1
    fi

    info_echo "Mostrando logs de ${BOLD}$display_name${NC}..."
    echo ""
    
    # Construir comando base de docker logs
    local docker_cmd="docker logs"
    
    if [ "$SHOW_TIMESTAMPS" = "1" ]; then
        docker_cmd="$docker_cmd --timestamps"
    fi
    
    docker_cmd="$docker_cmd --tail $TAIL_LINES"
    
    if [ "$FOLLOW_LOGS" = "1" ]; then
        docker_cmd="$docker_cmd -f"
    fi
    
    debug_echo "Ejecutando: $docker_cmd $container_name"
    
    # Ejecutar comando y aplicar filtros
    $docker_cmd "$container_name" 2>&1 | apply_filters
    
    echo ""
}

# Muestra logs de múltiples contenedores simultáneamente
show_all_logs() {
    info_echo "Mostrando logs de ${BOLD}TODOS${NC} los contenedores..."
    echo ""
    
    # Construir comando base
    local docker_cmd="docker logs"
    
    if [ "$SHOW_TIMESTAMPS" = "1" ]; then
        docker_cmd="$docker_cmd --timestamps"
    fi
    
    docker_cmd="$docker_cmd --tail $TAIL_LINES"
    
    if [ "$FOLLOW_LOGS" = "1" ]; then
        docker_cmd="$docker_cmd -f"
    fi
    
    # Usar docker compose logs si es posible (mejor para múltiples contenedores)
    if [ -f "$COMPOSE_FILE" ]; then
        local compose_cmd="docker compose -f $COMPOSE_FILE logs"
        
        if [ "$FOLLOW_LOGS" = "1" ]; then
            compose_cmd="$compose_cmd -f"
        fi
        
        compose_cmd="$compose_cmd --tail $TAIL_LINES"
        
        if [ "$SHOW_TIMESTAMPS" = "1" ]; then
            compose_cmd="$compose_cmd --timestamps"
        fi
        
        debug_echo "Ejecutando: $compose_cmd"
        
        # Cambiar al directorio de docker compose
        cd "$PROJECT_DIR/docker" || exit 1
        eval "$compose_cmd" 2>&1 | apply_filters
        cd - > /dev/null
    else
        error_echo "No se encontró docker-compose.yml en $COMPOSE_FILE"
        exit 1
    fi
    
    echo ""
}

# === MAIN ===

# Parsear argumentos
while [ $# -gt 0 ]; do
    case "$1" in
        --backend)
            SHOW_BACKEND=1
            SHOW_ALL=0
            shift
            ;;
        --mariadb|--bd)
            SHOW_MARIADB=1
            SHOW_ALL=0
            shift
            ;;
        --frontend|--nginx)
            SHOW_FRONTEND=1
            SHOW_ALL=0
            shift
            ;;
        --mp)
            FILTER_MP=1
            shift
            ;;
        --wa)
            FILTER_WA=1
            shift
            ;;
        -f|--follow)
            FOLLOW_LOGS=1
            shift
            ;;
        --no-follow)
            FOLLOW_LOGS=0
            shift
            ;;
        --tail)
            if [ -z "${2:-}" ]; then
                error_echo "--tail requiere un número como argumento"
                exit 1
            fi
            TAIL_LINES="$2"
            shift 2
            ;;
        --timestamps)
            SHOW_TIMESTAMPS=1
            shift
            ;;
        -d|--debug)
            DEBUG_MODE=1
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            error_echo "Argumento desconocido: $1"
            echo "Usa: $0 --help para más información"
            exit 1
            ;;
    esac
done

# === VALIDACIONES ===

check_docker

# Si no se especificó ningún contenedor, mostrar todos
if [ "$SHOW_ALL" = "1" ]; then
    debug_echo "Modo: mostrar TODOS los contenedores"
    show_all_logs
else
    # Mostrar solo los especificados
    if [ "$SHOW_BACKEND" = "1" ]; then
        show_container_logs "docker-backend-1" "Backend (Node.js)" || exit 1
    fi
    
    if [ "$SHOW_MARIADB" = "1" ]; then
        show_container_logs "docker-mariadb-1" "MariaDB" || exit 1
    fi
    
    if [ "$SHOW_FRONTEND" = "1" ]; then
        show_container_logs "docker-nginx-1" "Frontend (nginx)" || exit 1
    fi
fi

success_echo "Visualización de logs completada"
