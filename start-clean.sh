#!/bin/bash

# Script de inicio con limpieza preventiva de Docker para tdcApiRest
# Uso: ./start-clean.sh [up|down|logs]

set -e

PROJECT_DIR="/home/almacen/tdcApiRest"
DOCKER_DIR="$PROJECT_DIR/docker"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir secciones
print_section() {
    echo -e "\n${BLUE}════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}════════════════════════════════════════${NC}\n"
}

# Función para imprimir progress
print_progress() {
    echo -e "${GREEN}✓${NC} $1"
}

# Función para imprimir warnings
print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Función para imprimir errores
print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Verificar que Docker está corriendo
check_docker() {
    if ! docker ps > /dev/null 2>&1; then
        print_error "Docker no está corriendo. Inicia Docker e intenta de nuevo."
        exit 1
    fi
    print_progress "Docker está corriendo"
}

# Limpieza preventiva
cleanup_docker() {
    print_section "Limpieza Preventiva de Docker"
    
    # Obtener espacio antes
    local space_before=$(df -h / | tail -1 | awk '{print $4}')
    echo "Espacio libre antes: ${YELLOW}$space_before${NC}"
    
    print_warning "Eliminando imágenes huérfanas, contenedores detenidos y capas sin usar..."
    
    # Limpieza agresiva sin afectar volúmenes persistentes
    docker image prune -a -f --filter "until=0h" > /dev/null 2>&1 || true
    docker container prune -f > /dev/null 2>&1 || true
    docker volume prune -f > /dev/null 2>&1 || true
    docker builder prune -a -f > /dev/null 2>&1 || true
    
    # Sincronizar filesystem
    sync
    sleep 1
    
    # Obtener espacio después
    local space_after=$(df -h / | tail -1 | awk '{print $4}')
    echo "Espacio libre después: ${GREEN}$space_after${NC}"
    
    print_progress "Limpieza completada"
}

# Iniciar servicios
start_services() {
    print_section "Iniciando tdcApiRest"
    
    cd "$DOCKER_DIR"
    
    print_warning "Construyendo e iniciando contenedores (esto puede tomar 2-5 minutos)..."
    docker-compose up -d --build
    
    print_progress "Contenedores iniciados"
    
    # Esperar a que los servicios estén listos
    print_warning "Esperando a que los servicios estén listos..."
    sleep 10
    
    # Verificar que los contenedores están corriendo
    echo ""
    docker-compose ps
}

# Detener servicios
stop_services() {
    print_section "Deteniendo tdcApiRest"
    
    cd "$DOCKER_DIR"
    docker-compose down
    
    print_progress "Contenedores detenidos"
}

# Mostrar logs
show_logs() {
    print_section "Logs de tdcApiRest"
    
    cd "$DOCKER_DIR"
    docker-compose logs -f --tail=50
}

# Mostrar status
show_status() {
    print_section "Estado de tdcApiRest"
    
    cd "$DOCKER_DIR"
    
    echo "Contenedores en ejecución:"
    docker-compose ps
    
    echo ""
    echo "Recursos utilizados:"
    docker stats --no-stream $(docker-compose ps -q 2>/dev/null | head -3) 2>/dev/null || true
    
    echo ""
    echo "Espacio en disco:"
    df -h / | tail -1
}

# Mostrar ayuda
show_help() {
    cat << EOF
${BLUE}tdcApiRest - Script de Inicio con Limpieza Preventiva${NC}

${GREEN}Uso:${NC}
    ./start-clean.sh [comando]

${GREEN}Comandos:${NC}
    up      - Limpia Docker e inicia tdcApiRest (por defecto)
    down    - Detiene tdcApiRest
    clean   - Solo hace limpieza preventiva sin iniciar
    logs    - Muestra logs en tiempo real
    status  - Muestra estado de servicios
    help    - Muestra esta ayuda

${GREEN}Ejemplos:${NC}
    ./start-clean.sh               # Limpia e inicia
    ./start-clean.sh up            # Limpia e inicia
    ./start-clean.sh down          # Detiene servicios
    ./start-clean.sh logs          # Ver logs en vivo
    ./start-clean.sh status        # Ver estado actual

${YELLOW}Nota:${NC}
    - Los datos de la BD (mariadb_data) se preservan siempre
    - Los volúmenes persistentes NO se eliminan en la limpieza
    - Puedes mantener los logs de mercadopago-session intactos

EOF
}

# Main
main() {
    local command="${1:-up}"
    
    case "$command" in
        up)
            check_docker
            cleanup_docker
            start_services
            print_section "✓ tdcApiRest está listo"
            echo -e "${GREEN}Frontend:${NC}   http://localhost"
            echo -e "${GREEN}Backend API:${NC} http://localhost:3000"
            echo -e "${GREEN}Base de datos:${NC} localhost:3306"
            echo ""
            ;;
        down)
            check_docker
            stop_services
            ;;
        clean)
            check_docker
            cleanup_docker
            ;;
        logs)
            check_docker
            show_logs
            ;;
        status)
            check_docker
            show_status
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "Comando desconocido: $command"
            echo "Usa './start-clean.sh help' para ver opciones disponibles"
            exit 1
            ;;
    esac
}

main "$@"
