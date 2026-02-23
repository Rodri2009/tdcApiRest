#!/bin/bash

###############################################################################
# reset.sh - Reinicializa base de datos y/o contenedores Docker
###############################################################################
# Uso: ./reset.sh [opciones]
#
# Opciones de contenedores (destructivas):
#   --all            Destruye y levanta TODO (defecto si no usa flags)
#   --db             Solo base de datos (mariadb)
#   --backend        Solo backend (app node.js)
#   --frontend       Solo frontend (nginx)
#   --all-rebuild    Todo con rebuild de imágenes (--build)
#
# Opciones de SQL:
#   --no-sql         No ejecuta scripts SQL (solo levanta contenedores)
#   --skip-test      No carga 03_test_data.sql (solo schema + seed)
#   --only-schema    Solo carga 01_schema.sql
#   --only-seed      Solo carga 02_seed.sql
#   --only-test      Solo carga 03_test_data.sql
#
# Opciones de debug:
#   -d, --debug      Muestra debug detallado + logs en vivo
#   -l, --local      Fuerza MySQL local (sin Docker)
#   -h, --help       Muestra esta ayuda
#
# Ejemplos:
#   ./reset.sh                    # Todos los contenedores + reset BD
#   ./reset.sh --db               # Solo mariadb + reset BD
#   ./reset.sh --backend -d       # Solo backend con logs en vivo
#   ./reset.sh --db --skip-test   # DB sin datos de prueba
#   ./reset.sh --all-rebuild -d   # Todo con rebuild + logs
###############################################################################

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Directorios base
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Configuración por defecto
DB_NAME="tdc_db"
DB_USER="root"
DB_PASSWORD=""
DB_HOST="localhost"
DB_PORT="3306"
SQL_DIR="$PROJECT_DIR/database"
DOCKER_DIR="$PROJECT_DIR/docker"

# Flags
DEBUG=false
USE_LOCAL=false
USE_DOCKER=true
CONTAINERS_TO_RESET=""  # all, db, backend, frontend
REBUILD_IMAGES=false
SKIP_SQL=false
SQL_SCRIPTS=("01_schema.sql" "02_seed.sql" "03_test_data.sql")

# Cargar .env
if [ -f "$PROJECT_DIR/.env" ]; then
    set +e
    source "$PROJECT_DIR/.env"
    set -e
fi

# Parsear argumentos
show_help() {
    head -43 "$0" | tail -42
    exit 0
}

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            ;;
        -d|--debug)
            DEBUG=true
            shift
            ;;
        -l|--local)
            USE_LOCAL=true
            USE_DOCKER=false
            shift
            ;;
        --all)
            CONTAINERS_TO_RESET="all"
            shift
            ;;
        --db)
            CONTAINERS_TO_RESET="${CONTAINERS_TO_RESET:+$CONTAINERS_TO_RESET }db"
            shift
            ;;
        --backend)
            CONTAINERS_TO_RESET="${CONTAINERS_TO_RESET:+$CONTAINERS_TO_RESET }backend"
            shift
            ;;
        --frontend)
            CONTAINERS_TO_RESET="${CONTAINERS_TO_RESET:+$CONTAINERS_TO_RESET }frontend"
            shift
            ;;
        --all-rebuild)
            CONTAINERS_TO_RESET="all"
            REBUILD_IMAGES=true
            shift
            ;;
        --no-sql)
            SKIP_SQL=true
            shift
            ;;
        --skip-test)
            SQL_SCRIPTS=("01_schema.sql" "02_seed.sql")
            shift
            ;;
        --only-schema)
            SQL_SCRIPTS=("01_schema.sql")
            shift
            ;;
        --only-seed)
            SQL_SCRIPTS=("02_seed.sql")
            shift
            ;;
        --only-test)
            SQL_SCRIPTS=("03_test_data.sql")
            shift
            ;;
        *)
            echo -e "${RED}Opción desconocida: $1${NC}"
            show_help
            ;;
    esac
done

# Si no especificó contenedores, usar "all" por defecto
if [ -z "$CONTAINERS_TO_RESET" ]; then
    CONTAINERS_TO_RESET="all"
fi

# Auto-detectar Docker
if [ "$USE_LOCAL" = false ]; then
    if command -v docker &>/dev/null && docker --version &>/dev/null; then
        if [ -f "$DOCKER_DIR/docker-compose.yml" ]; then
            USE_DOCKER=true
        else
            USE_DOCKER=false
        fi
    else
        USE_DOCKER=false
    fi
else
    USE_DOCKER=false
fi

# ============================================================================
# FUNCIONES
# ============================================================================

get_container_name() {
    local docker_dir=$1
    if [ ! -f "$docker_dir/docker-compose.yml" ]; then
        return 1
    fi
    local container_name=$(docker ps --format "{{.Names}}" 2>/dev/null | grep -E '(mariadb|mysql|db)' | head -1)
    if [ -z "$container_name" ]; then
        return 1
    fi
    echo "$container_name"
    return 0
}

print_header() {
    echo -e "${YELLOW}=================================================${NC}"
    echo -e "${YELLOW}  TDC App - Database & Container Reset${NC}"
    echo -e "${YELLOW}=================================================${NC}"
    echo ""
}

print_debug_config() {
    if [ "$DEBUG" = true ]; then
        echo -e "${BLUE}[DEBUG] Configuración:${NC}"
        echo -e "${BLUE}  - USE_DOCKER: $USE_DOCKER${NC}"
        echo -e "${BLUE}  - CONTAINERS: $CONTAINERS_TO_RESET${NC}"
        echo -e "${BLUE}  - REBUILD: $REBUILD_IMAGES${NC}"
        echo -e "${BLUE}  - SKIP_SQL: $SKIP_SQL${NC}"
        echo -e "${BLUE}  - SQL_SCRIPTS: ${SQL_SCRIPTS[@]}${NC}"
        echo ""
    fi
}

reset_docker_containers() {
    if [ "$USE_DOCKER" = false ]; then
        return 0
    fi

    echo -e "${YELLOW}[*]${NC} Controlando contenedores Docker..."
    
    local compose_cmd="docker-compose --env-file ../.env"
    if command -v docker-compose &>/dev/null; then
        compose_cmd="docker-compose --env-file ../.env"
    elif docker compose version &>/dev/null; then
        compose_cmd="docker compose --env-file ../.env"
    fi

    local build_flag=""
    if [ "$REBUILD_IMAGES" = true ]; then
        build_flag="--build"
    fi

    if [[ " $CONTAINERS_TO_RESET " =~ " all " ]]; then
        echo -e "${YELLOW}  → Deteniendo y levantando TODOS los contenedores${NC}"
        cd "$DOCKER_DIR"
        
        # Detener
        echo -ne "    Deteniendo... "
        if [ "$DEBUG" = true ]; then
            echo ""
            $compose_cmd down 2>&1
        else
            $compose_cmd down 2>&1 | grep -v "^$" || true
        fi
        echo -e "${GREEN}✓${NC}"
        
        # Eliminar volumen de BD para forzar reset desde SQL
        echo -ne "    Eliminando volumen de BD... "
        docker volume rm docker_mariadb_data 2>/dev/null || true
        echo -e "${GREEN}✓${NC}"
        
        # Levantar
        echo -ne "    Levantando contenedores $build_flag... "
        if [ "$DEBUG" = true ]; then
            echo ""
            $compose_cmd up $build_flag -d 2>&1
        else
            $compose_cmd up $build_flag -d 2>&1 | grep -E '(Creating|Created|Starting|Started|Pulling)' || true
        fi
        echo -e "${GREEN}✓${NC}"
        
        # Esperar a que MariaDB esté listo
        echo -ne "    Esperando MariaDB... "
        sleep 5
        echo -e "${GREEN}✓${NC}"
    else
        # Resetear contenedores específicos
        cd "$DOCKER_DIR"
        
        if [[ " $CONTAINERS_TO_RESET " =~ " db " ]]; then
            echo -e "${YELLOW}  → Reseteando solo MariaDB${NC}"
            echo -ne "    Deteniendo mariadb... "
            $compose_cmd stop mariadb 2>/dev/null || true
            echo -e "${GREEN}✓${NC}"
            
            echo -ne "    Eliminando volumen... "
            docker volume rm docker_mariadb_data 2>/dev/null || true
            echo -e "${GREEN}✓${NC}"
            
            echo -ne "    Levantando mariadb... "
            $compose_cmd up $build_flag -d mariadb 2>&1 | grep -E '(Creating|Starting)' || true
            echo -e "${GREEN}✓${NC}"
            
            echo -ne "    Esperando MariaDB... "
            sleep 5
            echo -e "${GREEN}✓${NC}"
        fi
        
        if [[ " $CONTAINERS_TO_RESET " =~ " backend " ]]; then
            echo -e "${YELLOW}  → Reseteando solo Backend${NC}"
            echo -ne "    Deteniendo backend... "
            $compose_cmd stop backend 2>/dev/null || true
            echo -e "${GREEN}✓${NC}"
            
            echo -ne "    Levantando backend $build_flag... "
            $compose_cmd up $build_flag -d backend 2>&1 | grep -E '(Creating|Starting)' || true
            echo -e "${GREEN}✓${NC}"
            
            sleep 2
        fi
        
        if [[ " $CONTAINERS_TO_RESET " =~ " frontend " ]]; then
            echo -e "${YELLOW}  → Reseteando solo Frontend${NC}"
            echo -ne "    Deteniendo nginx... "
            $compose_cmd stop nginx 2>/dev/null || true
            echo -e "${GREEN}✓${NC}"
            
            echo -ne "    Levantando nginx... "
            $compose_cmd up $build_flag -d nginx 2>&1 | grep -E '(Creating|Starting)' || true
            echo -e "${GREEN}✓${NC}"
            
            sleep 1
        fi
    fi
    
    echo ""
}

verify_sql_files() {
    echo -e "${YELLOW}[*]${NC} Verificando archivos SQL..."
    for file in "${SQL_SCRIPTS[@]}"; do
        if [ ! -f "$SQL_DIR/$file" ]; then
            echo -e "${RED}[✗] ERROR: Archivo no encontrado: $SQL_DIR/$file${NC}"
            exit 1
        fi
        echo -e "${GREEN}    ✓${NC} $file"
    done
    echo ""
}

run_sql_docker() {
    local file=$1
    local description=$2
    local filename=$(basename "$file")
    
    echo -ne "${YELLOW}[*]${NC} Cargando: $description... "
    
    if [ "$DEBUG" = true ]; then
        echo ""
        CONTAINER_NAME=$(get_container_name "$DOCKER_DIR")
        echo -e "${BLUE}[DEBUG] Ejecutando: cat /docker-entrypoint-initdb.d/$filename | mysql ...${NC}"
        echo ""
    fi
    
    CONTAINER_NAME=$(get_container_name "$DOCKER_DIR")
    
    # Ejecutar SQL file dentro del contenedor usando cat
    # El archivo debe estar en /docker-entrypoint-initdb.d/ (montado desde database/)
    if [ "$DEBUG" = true ]; then
        docker exec "$CONTAINER_NAME" sh -c "cat /docker-entrypoint-initdb.d/$filename | mysql -u '$DB_USER' -p'$DB_PASSWORD' '$DB_NAME'" 2>&1
    else
        docker exec "$CONTAINER_NAME" sh -c "cat /docker-entrypoint-initdb.d/$filename | mysql -u '$DB_USER' -p'$DB_PASSWORD' '$DB_NAME'" 2>/dev/null
    fi
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ OK${NC}"
        return 0
    else
        echo -e "${RED}✗ FALLÓ${NC}"
        if [ "$DEBUG" = false ]; then
            echo -e "${RED}[!] Usa -d para ver los errores detallados${NC}"
        fi
        return 1
    fi
}

exec_sql_docker() {
    local sql=$1
    local description=$2
    
    echo -ne "${YELLOW}[*]${NC} $description... "
    
    if [ "$DEBUG" = true ]; then
        echo ""
        CONTAINER_NAME=$(get_container_name "$DOCKER_DIR")
        echo -e "${BLUE}[DEBUG] docker exec $CONTAINER_NAME mysql -u $DB_USER -p... -e '$sql'${NC}"
    fi
    
    CONTAINER_NAME=$(get_container_name "$DOCKER_DIR")
    
    if [ "$DEBUG" = true ]; then
        docker exec "$CONTAINER_NAME" mysql -u "$DB_USER" -p"$DB_PASSWORD" -e "$sql" 2>&1
    else
        docker exec "$CONTAINER_NAME" mysql -u "$DB_USER" -p"$DB_PASSWORD" -e "$sql" 2>/dev/null
    fi
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ OK${NC}"
        return 0
    else
        echo -e "${RED}✗ FALLÓ${NC}"
        if [ "$DEBUG" = false ]; then
            echo -e "${RED}[!] Usa -d para ver los errores detallados${NC}"
        fi
        return 1
    fi
}

# ============================================================================
# MAIN
# ============================================================================

print_header
print_debug_config

# Paso 1: Reset de contenedores Docker
if [ "$USE_DOCKER" = true ]; then
    reset_docker_containers
fi

# Paso 2: Reset de base de datos (SQL)
if [ "$SKIP_SQL" = false ] && [ "$USE_DOCKER" = true ]; then
    verify_sql_files
    
    # Drop & Create DB
    exec_sql_docker "DROP DATABASE IF EXISTS \`$DB_NAME\`;" "Eliminando base de datos"
    exec_sql_docker "CREATE DATABASE \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" "Creando base de datos"
    echo ""
    
    # Load SQL scripts
    for script in "${SQL_SCRIPTS[@]}"; do
        case $script in
            01_schema.sql)
                if ! run_sql_docker "$SQL_DIR/$script" "Schema (Estructura de tablas)"; then
                    echo -e "${RED}[✗] ERROR: No se pudo cargar el schema${NC}"
                    exit 1
                fi
                ;;
            02_seed.sql)
                if ! run_sql_docker "$SQL_DIR/$script" "Seed Data (Configuración y catálogos)"; then
                    echo -e "${RED}[✗] ERROR: No se pudo cargar los datos de semilla${NC}"
                    exit 1
                fi
                ;;
            03_test_data.sql)
                if ! run_sql_docker "$SQL_DIR/$script" "Test Data (Datos dinámicos de prueba)"; then
                    echo -e "${RED}[✗] ERROR: No se pudo cargar los datos de prueba${NC}"
                    exit 1
                fi
                ;;
        esac
    done
    
    echo ""
fi

# Paso 3: Resumen final
echo -e "${GREEN}=================================================${NC}"
echo -e "${GREEN}  ✓ Reset completado exitosamente${NC}"
echo -e "${GREEN}=================================================${NC}"
echo ""
echo -e "${YELLOW}Resumen:${NC}"
if [ "$USE_DOCKER" = true ]; then
    echo "  Contenedores: $CONTAINERS_TO_RESET"
    echo "  Rebuild: $([ "$REBUILD_IMAGES" = true ] && echo "SÍ" || echo "NO")"
    
    if [ "$DEBUG" = true ]; then
        echo ""
        echo -e "${CYAN}[DEBUG] Contenedores activos:${NC}"
        docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}" | grep -E 'docker-(mariadb|backend|nginx)' || echo "    (sin contenedores Docker TDC activos)"
    fi
fi
echo "  SQL ejecutado: $([ "$SKIP_SQL" = true ] && echo "NO" || echo "SÍ (${#SQL_SCRIPTS[@]} scripts)")"
echo ""

# Paso 4: Mostrar logs en vivo si se solicitó debug
if [ "$DEBUG" = true ] && [ "$USE_DOCKER" = true ]; then
    echo ""
    echo -e "${BLUE}======================================================${NC}"
    echo -e "${BLUE}  🐛 Mostrando logs del sistema en tiempo real${NC}"
    echo -e "${BLUE}  (Presiona Ctrl+C para salir)${NC}"
    echo -e "${BLUE}======================================================${NC}"
    echo ""
    
    sleep 1
    
    echo -e "${CYAN}[*] Status de contenedores:${NC}"
    docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E 'docker-(mariadb|backend|nginx)' || docker ps --all --format "table {{.Names}}\t{{.Status}}" | grep -E 'docker-(mariadb|backend|nginx)'
    echo ""
    
    # Mostrar logs de mariadb si está activo
    if docker ps --format "{{.Names}}" 2>/dev/null | grep -q docker-mariadb; then
        echo -e "${CYAN}[*] Logs de MariaDB (últimas líneas):${NC}"
        docker logs --tail=20 docker-mariadb-1 2>/dev/null | tail -15
        echo ""
    fi
    
    # Mostrar logs del backend con debug flags  
    if docker ps --format "{{.Names}}" 2>/dev/null | grep -q docker-backend; then
        echo -e "${CYAN}[*] Ejecutando backend en foreground con flags de debug...${NC}"
        cd "$DOCKER_DIR"
        
        # Detener el backend previo que está en background
        docker-compose --env-file ../.env stop backend 2>/dev/null || true
        sleep 1
        
        echo -e "${CYAN}[*] Mostrando output del backend con verbose logging:${NC}"
        echo ""
        
        # Ejecutar en foreground pasando DEBUG_FLAGS como variable de entorno
        # El --no-TTY asegura que docker-compose no intente usar terminal interactivo
        docker-compose --env-file ../.env run --rm --no-TTY -e DEBUG_FLAGS="-d" backend 2>&1 || true
        else
            echo -e "${YELLOW}[!] docker-compose.yml no encontrado${NC}"
        fi
    else
        echo -e "${YELLOW}[!] Backend no está corriendo${NC}"
    fi
fi

exit 0
