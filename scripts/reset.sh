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
#   --use-latest-dump Usa database/mysqldump_latest.sql para restaurar todo (ignore 01/02/03).
#
# Opciones de Servicios (Puppeteer):
#   --mp             Habilita Mercado Pago (ENABLE_PUPPETEER_MP=true)
#   --wa             Habilita WhatsApp (ENABLE_PUPPETEER_WA=true)
#
# Opciones de respaldo de sesión (no destruyen datos existentes, simplemente
# copian/recuperan carpetas en backend/profile):
#   --save-mp        Si va a reiniciar contenedores con MP, guarda/restaura
#                   la carpeta mp-profile antes/después del reset
#   --save-wa        parecido para wa-profile
#   --save-all       alias para los dos anteriores (mp+wa)
#
# Opciones de backup:
#   --no-backup      Omite el backup automático previo al reset
#
# Opciones de debug:
#   -d, --debug      Muestra debug detallado (no engancha logs en tiempo real)
#   -l, --local      Fuerza MySQL local (sin Docker)
#   -h, --help       Muestra esta ayuda
#
# Ejemplos:
#   ./reset.sh                    # Todos los contenedores + reset BD
#   ./reset.sh --db               # Solo mariadb + reset BD
#   ./reset.sh --backend -d       # Solo backend (usa backend_logs.sh para ver salida)
#   ./reset.sh --db --skip-test   # DB sin datos de prueba
#   ./reset.sh --all-rebuild -d   # Todo con rebuild + logs
#   ./reset.sh --mp --wa -d       # Con WA y MP habilitados + debug
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
SKIP_BACKUP=false
ENABLE_MP=false
ENABLE_WA=false
USE_LATEST_DUMP=false
# session backup flags (nuevos)
SAVE_MP_SESSION=false
SAVE_WA_SESSION=false
SAVE_ALL_SESSION=false
SQL_SCRIPTS=("01_schema.sql" "02_seed.sql" "03_test_data.sql")

# Cargar .env
if [ -f "$PROJECT_DIR/.env" ]; then
    set +e
    source "$PROJECT_DIR/.env"
    set -e
fi

# Credenciales de administrador para DROP/CREATE DATABASE (requieren SUPER)
# Usa root + MARIADB_ROOT_PASSWORD si está disponible; si no, cae en DB_USER/DB_PASSWORD
DB_ADMIN_USER="root"
DB_ADMIN_PASSWORD="${MARIADB_ROOT_PASSWORD:-${DB_PASSWORD:-}}"

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
        --mp)
            ENABLE_MP=true
            shift
            ;;
        --wa)
            ENABLE_WA=true
            shift
            ;;
        --save-mp)
            SAVE_MP_SESSION=true
            shift
            ;;
        --save-wa)
            SAVE_WA_SESSION=true
            shift
            ;;
        --save-all)
            SAVE_ALL_SESSION=true
            shift
            ;;
        --no-backup)
            SKIP_BACKUP=true
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
        --use-latest-dump)
            USE_LATEST_DUMP=true
            shift
            ;;
        *)
            echo -e "${RED}Opción desconocida: $1${NC}"
            show_help
            ;;
    esac
done

# Si --save-all se pidió, activar ambas banderas específicas
if [ "$SAVE_ALL_SESSION" = true ]; then
    SAVE_MP_SESSION=true
    SAVE_WA_SESSION=true
fi

# Si no especificó contenedores, usar "all" por defecto
if [ -z "$CONTAINERS_TO_RESET" ]; then
    CONTAINERS_TO_RESET="all"
fi

# Auto-detectar Docker
# antes de tocar contenedores, podemos respaldar perfiles si se pidió
PROFILE_BACKUP_DIR=""
backup_profiles() {
    PROFILE_BACKUP_DIR="$PROJECT_DIR/backend/profile-backup-$$"
    mkdir -p "$PROFILE_BACKUP_DIR"
    if [ "$SAVE_ALL_SESSION" = true ] || [ "$SAVE_MP_SESSION" = true ]; then
        cp -a "$PROJECT_DIR/backend/profile/mp-profile" "$PROFILE_BACKUP_DIR/" 2>/dev/null || true
    fi
    if [ "$SAVE_ALL_SESSION" = true ] || [ "$SAVE_WA_SESSION" = true ]; then
        cp -a "$PROJECT_DIR/backend/profile/wa-profile" "$PROFILE_BACKUP_DIR/" 2>/dev/null || true
    fi
}
restore_profiles() {
    if [ -d "$PROFILE_BACKUP_DIR" ]; then
        if [ "$SAVE_ALL_SESSION" = true ] || [ "$SAVE_MP_SESSION" = true ]; then
            cp -a "$PROFILE_BACKUP_DIR/mp-profile" "$PROJECT_DIR/backend/profile/" 2>/dev/null || true
        fi
        if [ "$SAVE_ALL_SESSION" = true ] || [ "$SAVE_WA_SESSION" = true ]; then
            cp -a "$PROFILE_BACKUP_DIR/wa-profile" "$PROJECT_DIR/backend/profile/" 2>/dev/null || true
        fi
        rm -rf "$PROFILE_BACKUP_DIR"
    fi
}

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

# similar cleanup helper used by restart_backend.sh

# La función sync_env_file también se puede reutilizar aquí para que los
# scripts utilitarios mantengan la coherencia del archivo .env dentro de
# docker/, evitando tener que copiar manualmente en cada ocasión.
sync_env_file() {
    local src="$ROOT_DIR/.env"
    local dst="$ROOT_DIR/docker/.env"
    if [ -f "$src" ]; then
        cp "$src" "$dst" 2>/dev/null || true
    fi
}

cleanup_old_backend_containers() {
    echo -ne "  → Eliminando contenedores backend antiguos... "
    docker ps -a --filter "ancestor=$(docker images --filter 'reference=docker-backend' -q 2>/dev/null)" -q | xargs -r docker rm -f 2>/dev/null || true
    docker ps -a --filter "name=docker-backend" -q | xargs -r docker rm -f 2>/dev/null || true
    docker ps -a --filter "name=docker-backend-run-" -q | xargs -r docker rm -f 2>/dev/null || true
    echo -e "${GREEN}✓${NC}"
}

# Función para verificar si los contenedores levantaron correctamente
check_containers_health() {
  local sleep_time=5
  echo ""
  echo -e "${CYAN}[*] Verificando estado de contenedores en $sleep_time segundos...${NC}"
  sleep $sleep_time
  echo ""

  local has_critical_errors=0
  local has_warnings=0
  local check_containers=("docker-mariadb-1" "docker-backend-1" "docker-nginx-1")

  for container in "${check_containers[@]}"; do
    local status=$(docker inspect -f '{{.State.Status}}' "$container" 2>/dev/null || echo "missing")
    
    if [ "$status" = "running" ]; then
      echo -e "  ${GREEN}✓${NC} $container: ${GREEN}running${NC}"
      
      # Revisar logs para errores críticos (ignorar warnings conocidas)
      local critical_errors=$(docker logs --tail 100 "$container" 2>&1 | grep -iE "(error|exception|failed|cannot|refused|fatal)" | grep -viE "(io_uring_queue_init|Chromium has locked|WhatsAppService|MercadoPagoService|PUPPETEER-WA|PUPPETEER-MP|BANDA-SYNC|FLYER-SYNC|Error al inicializar|Aborted connection|Got an error reading communication packets|reading communication packets)" | head -2 || true)
      
      # Revisar warnings
      local all_warnings=$(docker logs --tail 100 "$container" 2>&1 | grep -iE "warning|warn" | head -2 || true)
      
      if [ -n "$critical_errors" ]; then
        echo -e "    ${RED}✗ Errores críticos:${NC}"
        echo "$critical_errors" | sed 's/^/      /'
        has_critical_errors=1
      elif [ -n "$all_warnings" ]; then
        echo -e "    ${YELLOW}⚠ Advertencias:${NC}"
        echo "$all_warnings" | sed 's/^/      /'
        has_warnings=1
      fi
    else
      echo -e "  ${RED}✗${NC} $container: ${RED}$status${NC}"
      echo -e "    ${RED}Últimos logs:${NC}"
      docker logs --tail 20 "$container" 2>&1 | tail -10 | sed 's/^/      /'
      has_critical_errors=1
    fi
  done

  echo ""
  if [ $has_critical_errors -eq 0 ]; then
    echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
    if [ $has_warnings -eq 0 ]; then
      echo -e "${GREEN}  ✓ Todos los contenedores funcionan correctamente${NC}"
    else
      echo -e "${GREEN}  ✓ Contenedores en ejecución (con advertencias)${NC}"
    fi
    echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
    return 0
  else
    echo -e "${RED}════════════════════════════════════════════════════${NC}"
    echo -e "${RED}  ✗ Se detectaron problemas críticos${NC}"
    echo -e "${RED}════════════════════════════════════════════════════${NC}"
    return 1
  fi
}

check_backend_http() {
  if ! command -v curl >/dev/null 2>&1; then
    echo -e "${YELLOW}[*] curl no está instalado, omitiendo verificación HTTP del backend${NC}"
    return 0
  fi

  echo ""
  echo -e "${CYAN}[*] Verificando disponibilidad del backend HTTP...${NC}"
  if curl -sS --max-time 5 http://localhost:3000/health >/dev/null 2>&1; then
    echo -e "  ${GREEN}✓ Backend HTTP responde correctamente en http://localhost:3000/health${NC}"
  else
    echo -e "  ${RED}✗ El backend no responde en http://localhost:3000/health${NC}"
    echo -e "    ${YELLOW}Revisá los logs con: ./scripts/backend_logs.sh${NC}"
    echo -e "    ${YELLOW}Comprueba si el backend arrancó bien y si la DB está accesible.${NC}"
  fi
}
create_env_override() {
    # Crea un archivo .env.tmp con overrides de variables
    # Copia el .env original y sobrescribe ENABLE_PUPPETEER_MP y ENABLE_PUPPETEER_WA
    local env_file="$DOCKER_DIR/.env"
    local env_tmp="$DOCKER_DIR/.env.tmp.$$"
    
    if [ -f "$env_file" ]; then
        cp "$env_file" "$env_tmp"
    else
        touch "$env_tmp"
    fi
    
    if [ "$ENABLE_MP" = true ]; then
        sed -i 's/^ENABLE_PUPPETEER_MP=.*/ENABLE_PUPPETEER_MP=true/' "$env_tmp"
        if ! grep -q "^ENABLE_PUPPETEER_MP=" "$env_tmp"; then
            [ -n "$(tail -c1 "$env_tmp")" ] && echo "" >> "$env_tmp"
            echo "ENABLE_PUPPETEER_MP=true" >> "$env_tmp"
        fi
    else
        sed -i 's/^ENABLE_PUPPETEER_MP=.*/ENABLE_PUPPETEER_MP=false/' "$env_tmp"
        if ! grep -q "^ENABLE_PUPPETEER_MP=" "$env_tmp"; then
            [ -n "$(tail -c1 "$env_tmp")" ] && echo "" >> "$env_tmp"
            echo "ENABLE_PUPPETEER_MP=false" >> "$env_tmp"
        fi
    fi
    
    if [ "$ENABLE_WA" = true ]; then
        sed -i 's/^ENABLE_PUPPETEER_WA=.*/ENABLE_PUPPETEER_WA=true/' "$env_tmp"
        if ! grep -q "^ENABLE_PUPPETEER_WA=" "$env_tmp"; then
            [ -n "$(tail -c1 "$env_tmp")" ] && echo "" >> "$env_tmp"
            echo "ENABLE_PUPPETEER_WA=true" >> "$env_tmp"
        fi
    else
        sed -i 's/^ENABLE_PUPPETEER_WA=.*/ENABLE_PUPPETEER_WA=false/' "$env_tmp"
        if ! grep -q "^ENABLE_PUPPETEER_WA=" "$env_tmp"; then
            [ -n "$(tail -c1 "$env_tmp")" ] && echo "" >> "$env_tmp"
            echo "ENABLE_PUPPETEER_WA=false" >> "$env_tmp"
        fi
    fi
    
    # Ajuste del modo HEADLESS y VNC cuando se habilita MP/WA
    if [ "$ENABLE_MP" = true ] || [ "$ENABLE_WA" = true ]; then
        sed -i 's/^HEADLESS=.*/HEADLESS=false/' "$env_tmp" || true
        if ! grep -q "^HEADLESS=" "$env_tmp"; then
            [ -n "$(tail -c1 "$env_tmp")" ] && echo "" >> "$env_tmp"
            echo "HEADLESS=false" >> "$env_tmp"
        fi
        sed -i 's/^ENABLE_VNC=.*/ENABLE_VNC=true/' "$env_tmp" || true
        if ! grep -q "^ENABLE_VNC=" "$env_tmp"; then
            [ -n "$(tail -c1 "$env_tmp")" ] && echo "" >> "$env_tmp"
            echo "ENABLE_VNC=true" >> "$env_tmp"
        fi
    fi
    
    echo "$env_tmp"
}

cleanup_env_tmp() {
    # Limpia los archivos temporales .env
    rm -f "$DOCKER_DIR"/.env.tmp.* 2>/dev/null || true
}

# Trap para limpiar en caso de exit o señales de terminación
# incluye INT/TERM para que Ctrl+C no deje temp files
trap cleanup_env_tmp EXIT INT TERM

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
        echo -e "${BLUE}  - ENABLE_MP: $ENABLE_MP${NC}"
        echo -e "${BLUE}  - ENABLE_WA: $ENABLE_WA${NC}"
        echo -e "${BLUE}  - SQL_SCRIPTS: ${SQL_SCRIPTS[@]}${NC}"
        echo -e "${BLUE}  - DB_USER: $DB_USER${NC}"
        echo -e "${BLUE}  - DB_PASSWORD: $( [ -n "$DB_PASSWORD" ] && echo '***' || echo '(empty)' )${NC}"
        echo ""
    if [ "$ENABLE_MP" = true ] || [ "$ENABLE_WA" = true ]; then
        echo -e "${YELLOW}[*] Puppeteer flags detectadas: MP=$ENABLE_MP WA=$ENABLE_WA${NC}"
        echo -e "${YELLOW}    Para ver el navegador use vncviewer localhost:5901 (sin contraseña).${NC}"
    fi
    fi
}

wait_for_mysql_ready() {
    # Espera hasta que MariaDB acepte conexiones TCP (no socket).
    # Usar 127.0.0.1 fuerza TCP: el socket unix está disponible durante la fase
    # de inicialización (init-mode), pero el puerto TCP solo abre en normal-mode.
    # Esto evita la race condition donde el ping pasa durante init y luego el
    # contenedor reinicia al pasar a normal-mode.
    CONTAINER_NAME=$(get_container_name "$DOCKER_DIR")
    if [ -z "$CONTAINER_NAME" ]; then
        echo -e "${RED}\n[!] No se encontró el contenedor de MariaDB${NC}"
        return 1
    fi
    until docker exec "$CONTAINER_NAME" mysqladmin ping -h 127.0.0.1 -u"$DB_ADMIN_USER" -p"$DB_ADMIN_PASSWORD" --silent &>/dev/null; do
        echo -n "."
        sleep 1
    done
    echo -e " ${GREEN}✓${NC}"
}

wait_for_backend_ready() {
    # Espera hasta que el backend HTTP responda correctamente
    # Aumenta espera si hay MP o WA habilitado (toman mucho más tiempo para iniciar)
    local max_wait=30
    
    # Detectar MP/WA desde banderas o desde .env
    local has_mp=false
    local has_wa=false
    
    if [ "$ENABLE_MP" = true ]; then
        has_mp=true
    fi
    if [ "$ENABLE_WA" = true ]; then
        has_wa=true
    fi
    
    # Si no estaban seteados por banderas, revisar .env
    if [ "$has_mp" = false ] && [ "$has_wa" = false ]; then
        if [ -f "$PROJECT_DIR/.env" ]; then
            grep -q "^ENABLE_PUPPETEER_MP=true" "$PROJECT_DIR/.env" && has_mp=true
            grep -q "^ENABLE_PUPPETEER_WA=true" "$PROJECT_DIR/.env" && has_wa=true
        fi
    fi
    
    if [ "$has_mp" = true ] || [ "$has_wa" = true ]; then
        # Primera inicialización de WA/MP puede tomar 120-180s (descarga browser, autenticación y VNC)
        max_wait=180
    fi
    
    echo -e "    ${CYAN}[INFO]${NC} Backend wait timeout configurado en ${max_wait}s (ENABLE_PUPPETEER_MP=${has_mp}, ENABLE_PUPPETEER_WA=${has_wa})"
    local elapsed=0
    echo -ne "    Esperando backend... "
    
    while [ $elapsed -lt $max_wait ]; do
        if curl -sS --max-time 2 http://localhost:3000/health >/dev/null 2>&1; then
            echo -e "${GREEN}✓${NC}"
            return 0
        fi
        echo -n "."
        sleep 2
        elapsed=$((elapsed + 2))
    done
    
    # Si llegamos acá, el backend no respondió en tiempo
    echo -e " ${YELLOW}⚠${NC}"
    
    # Verificar si el contenedor sigue corriendo
    local backend_status=$(docker inspect -f '{{.State.Status}}' "docker-backend-1" 2>/dev/null || echo "missing")
    if [ "$backend_status" != "running" ]; then
        echo -e "    ${RED}✗ ERROR: Backend no está corriendo (estado: $backend_status)${NC}"
        echo -e "    ${YELLOW}Últimos logs del backend:${NC}"
        docker logs --tail 30 "docker-backend-1" 2>&1 | tail -15 | sed 's/^/      /'
        return 1
    fi
    
    echo -e "    ${YELLOW}[!] Backend no respondió en ${max_wait}s pero el contenedor está corriendo${NC}"
    echo -e "    ${YELLOW}Podría estar inicializando Puppeteer (MP/WA). Último logs:${NC}"
    docker logs --tail 20 "docker-backend-1" 2>&1 | tail -10 | sed 's/^/      /'
    return 1
}

# Función para ocultar credenciales sensibles en outputs de debug
mask_sensitive_values() {
    # Oculta valores sensibles en el .env para debug seguro
    # Reemplaza contraseñas, tokens y secretos con ****
    sed -E \
        -e 's/(DB_PASSWORD=).+/\1****/' \
        -e 's/(DB_ADMIN_PASSWORD=).+/\1****/' \
        -e 's/(EMAIL_PASS=).+/\1****/' \
        -e 's/(JWT_SECRET=).+/\1****/' \
        -e 's/(MARIADB_ROOT_PASSWORD=).+/\1****/' \
        -e 's/(EMAIL_USER=).+/\1***@.../' \
        -e 's/(MP_SERVER_URL=).+/\1***/' \
        -e 's/(WA_SERVER_URL=).+/\1***/'
}

reset_docker_containers() {
    if [ "$USE_DOCKER" = false ]; then
        return 0
    fi

    # si se solicitan respaldos de sesión, hacer copia previa
    if [ "$SAVE_ALL_SESSION" = true ] || [ "$SAVE_MP_SESSION" = true ] || [ "$SAVE_WA_SESSION" = true ]; then
        echo -e "${YELLOW}[*]${NC} Respaldando perfiles de Puppeteer..."
        backup_profiles
        echo -e "${GREEN}✓${NC}"
    fi

    echo -e "${YELLOW}[*]${NC} Controlando contenedores Docker..."

    # Limpiar contenedores backend sobrantes solo si se resetea todo
    if [[ " $CONTAINERS_TO_RESET " =~ " all " ]]; then
        cleanup_old_backend_containers
    fi
    
    # Crear archivo .env.tmp con overrides si es necesario
    local env_file_to_use=".env"
    if [ "$ENABLE_MP" = true ] || [ "$ENABLE_WA" = true ]; then
        env_file_to_use=$(create_env_override)
        echo -e "${YELLOW}[*] Puppeteer habilitado: MP=$ENABLE_MP WA=$ENABLE_WA${NC}"
        echo -e "${YELLOW}    VNC disponible en localhost:5901 → vncviewer localhost:5901${NC}"
    fi

    # DEBUG: mostrar ruta que usará docker-compose y su contenido
    echo -e "${CYAN}[DEBUG]${NC} env_file_to_use = $env_file_to_use"
    if [ -f "$env_file_to_use" ]; then
        echo -e "${CYAN}[DEBUG]${NC} Contenido de $env_file_to_use (credenciales ocultas):";
        sed -n '1,40p' "$env_file_to_use" | mask_sensitive_values;
    else
        echo -e "${CYAN}[DEBUG]${NC} Archivo $env_file_to_use no existe";
    fi
    
    local compose_cmd="docker-compose --env-file $env_file_to_use"
    if command -v docker-compose &>/dev/null; then
        compose_cmd="docker-compose --env-file $env_file_to_use"
    elif docker compose version &>/dev/null; then
        compose_cmd="docker compose --env-file $env_file_to_use"
    fi

    local build_flag=""
    if [ "$REBUILD_IMAGES" = true ]; then
        build_flag="--build"
    fi

    if [[ " $CONTAINERS_TO_RESET " =~ " all " ]]; then
        echo -e "${YELLOW}  → Deteniendo y levantando TODOS los contenedores${NC}"
        cd "$DOCKER_DIR"
        # asegurarnos que el .env dentro de docker esté al día
        sync_env_file
        
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
                $compose_cmd up $build_flag -d --force-recreate 2>&1
            else
                $compose_cmd up $build_flag -d --force-recreate 2>&1 | grep -E '(Creating|Created|Starting|Started|Pulling)' || true
            echo -ne "    Eliminando volumen... "
            docker volume rm docker_mariadb_data 2>/dev/null || true
            echo -e "${GREEN}✓${NC}"
            
            echo -ne "    Levantando mariadb... "
            $compose_cmd up $build_flag -d mariadb 2>&1 | grep -E '(Creating|Starting)' || true
            echo -e "${GREEN}✓${NC}"
            
            echo -ne "    Esperando MariaDB... "
            wait_for_mysql_ready

            # Reiniciar backend para que reconecte a la nueva instancia de MariaDB
            echo -ne "    Reiniciando backend... "
            $compose_cmd up $build_flag -d --force-recreate backend 2>&1 | grep -E '(Creating|Starting|Started)' || true
            echo -e "${GREEN}✓${NC}"
            
            # Esperar a que el backend esté listo (puede tomar más tiempo si hay MP/WA)
            wait_for_backend_ready
        fi
        
        if [[ " $CONTAINERS_TO_RESET " =~ " backend " ]]; then
            echo -e "${YELLOW}  → Reseteando solo Backend${NC}"
            
            # Primero asegurar que MariaDB está listo
            echo -ne "    Verificando MariaDB... "
            if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "mariadb"; then
                # MariaDB existe, verificar que responde
                if docker exec "$(docker ps -f 'name=mariadb' -q)" mysqladmin ping -h 127.0.0.1 -u"$DB_ADMIN_USER" -p"$DB_ADMIN_PASSWORD" --silent &>/dev/null; then
                    echo -e "${GREEN}✓${NC}"
                else
                    # MariaDB no responde, intentar levantar
                    echo -ne "${YELLOW}no responde${NC}, levantando... "
                    $compose_cmd up -d mariadb 2>&1 | grep -E '(Starting)' || true
                    wait_for_mysql_ready
                fi
            else
                # MariaDB no existe, levantar
                echo -ne "${YELLOW}no corre${NC}, levantando... "
                $compose_cmd up -d mariadb 2>&1 | grep -E '(Creating|Starting)' || true
                wait_for_mysql_ready
            fi
            
            # Ahora detener y levantar backend
            echo -ne "    Deteniendo backend... "
            $compose_cmd stop backend 2>/dev/null || true
            echo -e "${GREEN}✓${NC}"
            
            echo -ne "    Levantando backend $build_flag... "
            $compose_cmd up $build_flag -d --force-recreate backend 2>&1 | grep -E '(Creating|Starting)' || true
            echo -e "${GREEN}✓${NC}"
            
            # Esperar a que el backend esté listo (incluye MP/WA si está habilitado)
            wait_for_backend_ready
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
    if [ "$USE_LATEST_DUMP" = true ]; then
        local latest="$SQL_DIR/mysqldump_latest.sql"
        if [ ! -f "$latest" ]; then
            echo -e "${RED}[✗] ERROR: Archivo no encontrado: $latest${NC}"
            exit 1
        fi
        echo -e "${GREEN}    ✓${NC} mysqldump_latest.sql"
        echo ""
        return
    fi

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
    local output exit_code
    if [ "$DEBUG" = true ]; then
        output=$(docker exec "$CONTAINER_NAME" sh -c "cat /docker-entrypoint-initdb.d/$filename | mysql -u '$DB_ADMIN_USER' -p'$DB_ADMIN_PASSWORD' '$DB_NAME'" 2>&1) && exit_code=0 || exit_code=$?
        [ -n "$output" ] && echo "$output"
    else
        output=$(docker exec "$CONTAINER_NAME" sh -c "cat /docker-entrypoint-initdb.d/$filename | mysql -u '$DB_ADMIN_USER' -p'$DB_ADMIN_PASSWORD' '$DB_NAME'" 2>&1) && exit_code=0 || exit_code=$?
    fi

    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✓ OK${NC}"
        return 0
    else
        echo -e "${RED}✗ FALLÓ${NC}"
        if [ "$DEBUG" = false ]; then
            echo -e "${RED}[!] Usa -d para ver los errores detallados${NC}"
        else
            echo -e "${RED}[!] Salida: $output${NC}"
        fi
        return 1
    fi
}

exec_sql_docker() {
    local sql=$1
    local description=$2
    local max_retries=5
    local attempt=0
    local exit_code
    local output

    echo -ne "${YELLOW}[*]${NC} $description... "

    if [ "$DEBUG" = true ]; then
        echo ""
        CONTAINER_NAME=$(get_container_name "$DOCKER_DIR")
        echo -e "${BLUE}[DEBUG] docker exec $CONTAINER_NAME mysql -u $DB_ADMIN_USER -p... -e '$sql'${NC}"
    fi

    while [ $attempt -lt $max_retries ]; do
        attempt=$((attempt + 1))
        CONTAINER_NAME=$(get_container_name "$DOCKER_DIR")

        output=$(docker exec "$CONTAINER_NAME" mysql -u "$DB_ADMIN_USER" -p"$DB_ADMIN_PASSWORD" -e "$sql" 2>&1) && exit_code=0 || exit_code=$?

        if [ $exit_code -eq 0 ]; then
            echo -e "${GREEN}✓ OK${NC}"
            [ "$DEBUG" = true ] && [ -n "$output" ] && echo "$output"
            return 0
        fi

        # Retry si es un error de runtime del contenedor o de conexión MySQL
        # (MariaDB aún reiniciando entre init-mode y normal-mode)
        if echo "$output" | grep -qiE "OCI runtime|unable to start container|exec failed|setns|Can't connect|Connection refused|Lost connection|HY000|server has gone away"; then
            if [ $attempt -lt $max_retries ]; then
                echo -n "."
                sleep 5
                continue
            fi
        fi

        break
    done

    echo -e "${RED}✗ FALLÓ${NC}"
    if [ "$DEBUG" = true ]; then
        echo -e "${RED}[!] Salida: $output${NC}"
    else
        echo -e "${RED}[!] Usa -d para ver los errores detallados${NC}"
    fi
    return 1
}

# ============================================================================
# MAIN
# ============================================================================

print_header

# Backup automático antes del reset (solo cuando se resetea todo, sin --no-backup)
BACKUP_SCRIPT="$SCRIPT_DIR/backup_and_update_sql.sh"
if [ "$SKIP_BACKUP" = false ] && [ "$CONTAINERS_TO_RESET" = "all" ] && [ -x "$BACKUP_SCRIPT" ]; then
    # Si MariaDB no está corriendo no hay nada que respaldar: saltar backup automáticamente
    if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -q "mariadb"; then
        echo -e "${YELLOW}[*]${NC} MariaDB no está corriendo — backup omitido${NC}"
    else
        echo -e "${YELLOW}[*]${NC} Ejecutando backup previo al reset..."
        if "$BACKUP_SCRIPT"; then
            echo -e "${GREEN}  ✓ Backup completado${NC}\n"
        else
            echo -e "${RED}  ✗ El backup falló. Abortando reset para proteger los datos.${NC}"
            echo -e "${YELLOW}  Usá --no-backup para omitir el backup y forzar el reset.${NC}"
            exit 1
        fi
    fi
fi

print_debug_config

# Paso 1: Reset de contenedores Docker
if [ "$USE_DOCKER" = true ]; then
    reset_docker_containers
fi

# Paso 2: Reset de base de datos (SQL)
SHOULD_RESET_DB=false
if [[ " $CONTAINERS_TO_RESET " =~ " all " ]] || [[ " $CONTAINERS_TO_RESET " =~ " db " ]]; then
    SHOULD_RESET_DB=true
fi

if [ "$SKIP_SQL" = false ] && [ "$USE_DOCKER" = true ] && [ "$SHOULD_RESET_DB" = true ]; then
    verify_sql_files
    
    # Drop & Create DB
    exec_sql_docker "DROP DATABASE IF EXISTS \`$DB_NAME\`;" "Eliminando base de datos"
    exec_sql_docker "CREATE DATABASE \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" "Creando base de datos"
    exec_sql_docker "CREATE USER IF NOT EXISTS 'rodrigo'@'%' IDENTIFIED BY '$DB_PASSWORD';" "Creando usuario de conexión rodrigo"
    exec_sql_docker "GRANT ALL PRIVILEGES ON \`$DB_NAME\`.* TO 'rodrigo'@'%';" "Otorgando permisos al usuario rodrigo"
    exec_sql_docker "FLUSH PRIVILEGES;" "Aplicando permisos"
    echo ""

    if [ "$USE_LATEST_DUMP" = true ]; then
        latest_dump="$SQL_DIR/mysqldump_latest.sql"
        echo -e "${YELLOW}[*]${NC} Restaurando desde mysqldump_latest.sql..."
        docker exec -i "$(get_container_name "$DOCKER_DIR")" mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$latest_dump"
        if [ $? -ne 0 ]; then
            echo -e "${RED}[✗] ERROR: Falló restaurar desde $latest_dump${NC}"
            exit 1
        fi
        echo -e "${GREEN}✓ OK${NC}"
    else
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
    fi
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

# Verificar salud de contenedores si se usó Docker
if [ "$USE_DOCKER" = true ]; then
    check_containers_health
    check_backend_http
fi

# --- Mensaje Final Claro ---
echo -e "${GREEN}======================================================${NC}"
echo -e "${GREEN}  ✓ Reset de entorno TDC completado${NC}"
echo -e "${GREEN}======================================================${NC}"
echo ""
if [ "$USE_DOCKER" = true ]; then
    echo -e "${CYAN}Servicios activos:${NC}"
    docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}" | grep -E 'docker-(mariadb|backend|nginx)' || echo "    (sin contenedores Docker TDC activos)"
    echo ""
fi
echo -e "${YELLOW}¿Cómo probar la app?${NC}"
echo -e "  - Frontend:     ${CYAN}http://localhost:8080${NC} (nginx)"
echo -e "  - Backend API:  ${CYAN}http://localhost:3000${NC} (Node.js)"
if [ "$ENABLE_MP" = true ] || [ "$ENABLE_WA" = true ]; then
    echo -e "  - VNC Backend:  ${CYAN}vncviewer localhost:5901${NC} (sin contraseña)"
    echo -e "  - Debug Chrome: ${CYAN}localhost:9001 (MP), localhost:9002 (WA)${NC}"
fi
echo ""
echo -e "${YELLOW}¿Cómo ver logs en vivo?${NC}"
echo -e "  Ejecuta: ${CYAN}./scripts/backend_logs.sh${NC}"
echo ""
echo -e "${YELLOW}¿Cómo reiniciar o resetear?${NC}"
echo -e "  Reiniciar backend: ${CYAN}./scripts/infraestructura/restart_backend.sh${NC}"
echo -e "  Resetear todo:     ${CYAN}./scripts/reset.sh${NC}"
echo ""
echo -e "${YELLOW}¿Ayuda?${NC}"
echo -e "  Lee los README.md o ejecuta los scripts con -h"
echo ""
exit 0

exit 0
