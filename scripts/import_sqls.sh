#!/bin/bash
set -euo pipefail

# import_sqls.sh
# - Detecta archivos .sql en backups/ (recursivo en subcarpetas) y los importa a la base de datos
# - Opciones:
#    --dry-run       : muestra lo que haría sin ejecutar imports
#    --prefix <str>  : solo importa archivos cuyo nombre empiece con <str>
#    --order chrono|reverse : orden de import (por fecha de modificación). Default: chrono
# - Tras import exitoso, mueve el archivo a backups/imported/
# - Tras fallo, mueve el archivo a backups/failed/ y continúa con el siguiente

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"
COMPOSE_FILE="$ROOT_DIR/docker/docker-compose.yml"
BACKUPS_DIR="$ROOT_DIR/backups"
IMPORTED_DIR="$BACKUPS_DIR/imported"
FAILED_DIR="$BACKUPS_DIR/failed"

DRY_RUN=0
PREFIX=""
ORDER="chrono"
WAIT_TIMEOUT=60

usage() {
  cat <<EOF
Usage: $(basename "$0") [--dry-run] [--prefix <str>] [--order chrono|reverse]

Examples:
  $(basename "$0") --dry-run
  $(basename "$0") --prefix RESTORE_
EOF
  exit 1
}

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift;;
    --prefix) PREFIX="$2"; shift 2;;
    --order) ORDER="$2"; shift 2;;
    -h|--help) usage;;
    *) echo "Unknown arg: $1"; usage;;
  esac
done

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Archivo .env no encontrado en $ROOT_DIR."
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

command_exists() { command -v "$1" >/dev/null 2>&1; }

if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
elif command_exists docker-compose; then
  COMPOSE_CMD="docker-compose"
else
  echo "❌ No se encontró 'docker compose' ni 'docker-compose'. Instala Docker Compose."
  exit 1
fi

mkdir -p "$IMPORTED_DIR" "$FAILED_DIR"

# Determinar DB y credenciales: preferir MARIADB_USER si existe, sino usar root
DB_NAME="${MARIADB_DATABASE:-${DB_NAME:-}}"
if [ -z "$DB_NAME" ]; then
  echo "❌ No se encontró el nombre de la base de datos (MARIADB_DATABASE o DB_NAME) en .env"
  exit 1
fi

if [ -n "${MARIADB_USER:-}" ] && [ -n "${MARIADB_PASSWORD:-}" ]; then
  DB_USER="$MARIADB_USER"
  DB_PASS="$MARIADB_PASSWORD"
else
  DB_USER="root"
  DB_PASS="$MARIADB_ROOT_PASSWORD"
fi

echo "🔎 Buscando archivos .sql en $BACKUPS_DIR para importar... (prefix='$PREFIX', order=$ORDER, dry-run=$DRY_RUN)"

wait_for_mariadb() {
  local elapsed=0
  echo "⏳ Esperando a que MariaDB esté disponible (timeout ${WAIT_TIMEOUT}s)..."
  while ! ${COMPOSE_CMD} -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T mariadb sh -c "mysqladmin ping -h localhost -u $DB_USER -p\"$DB_PASS\" >/dev/null 2>&1" >/dev/null 2>&1; do
    sleep 2
    elapsed=$((elapsed+2))
    if [ $elapsed -ge $WAIT_TIMEOUT ]; then
      echo "❌ Timeout esperando a MariaDB."
      return 1
    fi
  done
  echo "✅ MariaDB responde."
  return 0
}

if [ "$DRY_RUN" -eq 0 ]; then
  # Intentamos esperar por MariaDB solo si vamos a ejecutar imports
  if ! wait_for_mariadb; then
    echo "No se puede continuar sin MariaDB disponible. Usa --dry-run para simular."
    exit 1
  fi
fi

# Recopilar archivos .sql de forma ordenada por fecha de modificación
mapfile -t SQL_FILES < <(find "$BACKUPS_DIR" -type f -name "*.sql" -print0 | xargs -0 ls -1t --full-time 2>/dev/null | awk '{print $NF}' )

# ls -1t orders by mtime desc; we want asc for chrono
if [ "$ORDER" = "chrono" ]; then
  # reverse the array to ascending (oldest first)
  SQL_FILES=("${SQL_FILES[@]}" )
  SQL_FILES=( $(printf "%s\n" "${SQL_FILES[@]}" | tac) )
fi

# filter by prefix if provided
if [ -n "$PREFIX" ]; then
  mapfile -t FILTERED < <(printf "%s\n" "${SQL_FILES[@]}" | grep "/${PREFIX}" -E || true)
  SQL_FILES=("${FILTERED[@]}")
fi

if [ ${#SQL_FILES[@]} -eq 0 ]; then
  echo "ℹ️  No se encontraron archivos .sql a importar con los criterios establecidos."
  exit 0
fi

for file in "${SQL_FILES[@]}"; do
  echo "➡️  Importando $file ..."
  if [ "$DRY_RUN" -eq 1 ]; then
    echo "[DRY-RUN] Se ejecutaría: ${COMPOSE_CMD} -f $COMPOSE_FILE --env-file $ENV_FILE exec -T mariadb mysql -u$DB_USER -p'***' $DB_NAME < $file"
    continue
  fi

  # Ejecutar import
  if ${COMPOSE_CMD} -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T mariadb sh -c "mysql -u$DB_USER -p\"$DB_PASS\" $DB_NAME" < "$file"; then
    echo "✅ Import exitoso: $file"
    # preservar ruta relativa dentro de IMPORTED_DIR
    relpath="${file#$BACKUPS_DIR/}"
    dest="$IMPORTED_DIR/$relpath"
    mkdir -p "$(dirname "$dest")"
    mv "$file" "$dest"
  else
    echo "❌ Import falló: $file"
    relpath="${file#$BACKUPS_DIR/}"
    dest="$FAILED_DIR/$relpath"
    mkdir -p "$(dirname "$dest")"
    mv "$file" "$dest"
  fi
done

echo "🎉 Import finalizado. Archivos importados en: $IMPORTED_DIR . Fallidos en: $FAILED_DIR"
