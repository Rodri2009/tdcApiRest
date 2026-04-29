#!/bin/bash

###############################################################################
# recover_from_binlog.sh - Recupera BD desde Binary Logs de MariaDB
###############################################################################
# Permite restaurar la BD a un punto específico en el tiempo
# 
# USO:
#   ./scripts/recover_from_binlog.sh -t "2026-04-15 14:30:00"   # A un momento específico
#   ./scripts/recover_from_binlog.sh -f mariadb-bin.000042      # Desde un archivo binlog
#   ./scripts/recover_from_binlog.sh -l                         # Listar binlogs disponibles
#   ./scripts/recover_from_binlog.sh -l -v                      # Listar con detalle
###############################################################################

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DOCKER_DIR="$ROOT_DIR/docker"
COMPOSE_FILE="$DOCKER_DIR/docker-compose.yml"

# Detectar docker compose
if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD="docker-compose"
else
  echo -e "${RED}❌ No se encontró 'docker compose' ni 'docker-compose'${NC}"
  exit 1
fi

show_help() {
  cat <<EOF
${BLUE}Uso: $(basename "$0") [OPCIÓN]${NC}

Recupera la BD desde Binary Logs de MariaDB a un punto en el tiempo.

${YELLOW}OPCIONES:${NC}
  -t, --time YYYY-MM-DD HH:MM:SS    Restaurar BD a ese momento específico
  -f, --file BINLOG_FILE            Restaurar desde archivo binlog específico
  -l, --list                         Listar binlogs disponibles
  -v, --verbose                      Modo verbose (más detalles)
  -h, --help                         Muestra esta ayuda

${YELLOW}EJEMPLOS:${NC}
  # Restaurar a un momento específico
  $(basename "$0") -t "2026-04-15 14:30:00"

  # Restaurar desde un binlog
  $(basename "$0") -f mariadb-bin.000042

  # Listar binlogs disponibles
  $(basename "$0") -l -v

${YELLOW}NOTAS:${NC}
  - Los binlogs se guardan en: docker/binlogs/ (volumen mariadb_binlogs)
  - Retención: 7 días
  - Tamaño máximo por archivo: 1GB
  - Se recomienda hacer backup antes de restaurar

EOF
}

list_binlogs() {
  local verbose=${1:-0}
  
  echo -e "${YELLOW}[*]${NC} Listando Binary Logs disponibles..."
  echo ""
  
  # Acceder al contenedor MariaDB y listcar binlogs
  local container=$(docker compose -f "$COMPOSE_FILE" ps -q mariadb 2>/dev/null)
  if [ -z "$container" ]; then
    echo -e "${RED}❌ Contenedor mariadb no está ejecutándose${NC}"
    exit 1
  fi
  
  # Ejecutar comando mysql para listar binlogs
  docker exec "$container" mysql -u root -p"${MARIADB_ROOT_PASSWORD:-root}" -e "SHOW BINARY LOGS\G" 2>/dev/null | grep -E "(Log_name|File_size|Encrypted)"
  
  if [ $verbose -eq 1 ]; then
    echo ""
    echo -e "${CYAN}Detalles adicionales:${NC}"
    docker exec "$container" mysql -u root -p"${MARIADB_ROOT_PASSWORD:-root}" -e "SHOW MASTER STATUS\G" 2>/dev/null || true
  fi
}

recover_to_time() {
  local target_time="$1"
  
  echo -e "${YELLOW}[*]${NC} Recuperando BD al momento: ${CYAN}$target_time${NC}"
  echo -e "${YELLOW}[!]${NC} Esto puede tardar varios minutos..."
  echo ""
  
  local container=$(docker compose -f "$COMPOSE_FILE" ps -q mariadb 2>/dev/null)
  if [ -z "$container" ]; then
    echo -e "${RED}❌ Contenedor mariadb no está ejecutándose${NC}"
    exit 1
  fi
  
  # Convertir time string a formato que entienda mysqlbinlog
  local binlog_time=$(date -d "$target_time" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo "$target_time")
  
  # Obtener lista de binlogs
  local binlog_dir="/var/lib/docker/volumes/docker_mariadb_binlogs/_data"
  
  if [ ! -d "$binlog_dir" ]; then
    echo -e "${RED}❌ Directorio de binlogs no encontrado: $binlog_dir${NC}"
    exit 1
  fi
  
  # Extraer y combinar eventos de binlog hasta el momento especificado
  echo -e "${CYAN}[*] Procesando binlogs hasta ${binlog_time}...${NC}"
  
  # mysqlbinlog con stop-datetime
  local sql_file="/tmp/recovery_${RANDOM}.sql"
  
  docker exec "$container" sh -c "mysqlbinlog --force-if-open --stop-datetime='$binlog_time' /var/lib/mysql/binlogs/mariadb-bin.* 2>/dev/null" > "$sql_file"
  
  if [ ! -s "$sql_file" ]; then
    echo -e "${RED}❌ No se generó archivo de recuperación. Verifica la fecha.${NC}"
    rm -f "$sql_file"
    exit 1
  fi
  
  echo -e "${GREEN}✓${NC} Archivo SQL generado: $sql_file"
  echo -e "${YELLOW}[!]${NC} Revisar contenido antes de aplicar: ${CYAN}head -50 $sql_file${NC}"
  echo ""
  echo -e "${YELLOW}Para aplicar la recuperación:${NC}"
  echo -e "  ${CYAN}mysql -u root -p < $sql_file${NC}"
  echo ""
}

recover_from_binlog_file() {
  local binlog_file="$1"
  
  echo -e "${YELLOW}[*]${NC} Recuperando desde: ${CYAN}$binlog_file${NC}"
  echo ""
  
  local container=$(docker compose -f "$COMPOSE_FILE" ps -q mariadb 2>/dev/null)
  if [ -z "$container" ]; then
    echo -e "${RED}❌ Contenedor mariadb no está ejecutándose${NC}"
    exit 1
  fi
  
  # Generar SQL desde binlog
  local sql_file="/tmp/recovery_${RANDOM}.sql"
  
  docker exec "$container" sh -c "mysqlbinlog --force-if-open /var/lib/mysql/binlogs/$binlog_file 2>/dev/null" > "$sql_file"
  
  if [ ! -s "$sql_file" ]; then
    echo -e "${RED}❌ No se generó archivo de recuperación${NC}"
    rm -f "$sql_file"
    exit 1
  fi
  
  echo -e "${GREEN}✓${NC} Archivo SQL generado: $sql_file"
  echo -e "${YELLOW}Revisar antes de aplicar:${NC}"
  echo -e "  ${CYAN}head -100 $sql_file${NC}"
  echo ""
}

# Main
VERBOSE=0
ACTION=""
PARAM=""

if [ $# -eq 0 ]; then
  show_help
  exit 0
fi

while [ $# -gt 0 ]; do
  case "$1" in
    -h|--help)
      show_help
      exit 0
      ;;
    -v|--verbose)
      VERBOSE=1
      shift
      ;;
    -l|--list)
      ACTION="list"
      shift
      ;;
    -t|--time)
      ACTION="time"
      PARAM="$2"
      shift 2
      ;;
    -f|--file)
      ACTION="file"
      PARAM="$2"
      shift 2
      ;;
    *)
      echo -e "${RED}❌ Opción desconocida: $1${NC}"
      show_help
      exit 1
      ;;
  esac
done

# Cargar .env si existe
if [ -f "$ROOT_DIR/.env" ]; then
  export $(grep -v '^#' "$ROOT_DIR/.env" | xargs) 2>/dev/null || true
fi

echo -e "${BLUE}═════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  TDC - Recuperación desde Binary Logs${NC}"
echo -e "${BLUE}═════════════════════════════════════════════════════════════${NC}"
echo ""

case "$ACTION" in
  list)
    list_binlogs "$VERBOSE"
    ;;
  time)
    if [ -z "$PARAM" ]; then
      echo -e "${RED}❌ Debes especificar un tiempo: -t 'YYYY-MM-DD HH:MM:SS'${NC}"
      exit 1
    fi
    recover_to_time "$PARAM"
    ;;
  file)
    if [ -z "$PARAM" ]; then
      echo -e "${RED}❌ Debes especificar un archivo binlog: -f mariadb-bin.XXXXXX${NC}"
      exit 1
    fi
    recover_from_binlog_file "$PARAM"
    ;;
  *)
    show_help
    exit 1
    ;;
esac

echo -e "${GREEN}✓${NC} Operación completada"
echo ""
