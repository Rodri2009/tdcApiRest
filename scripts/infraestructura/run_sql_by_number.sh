#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
SQL_DIR="$PROJECT_DIR/database"

DB_NAME="${DB_NAME:-tdc_db}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-${MARIADB_ROOT_PASSWORD:-}}"
CONTAINER_NAME="${CONTAINER_NAME:-}"
DRY_RUN=false

usage() {
  cat <<'EOF'
Uso:
  ./scripts/infraestructura/run_sql_by_number.sh [opciones] <numero> [<numero> ...]

Ejemplos:
  ./scripts/infraestructura/run_sql_by_number.sh 04
  ./scripts/infraestructura/run_sql_by_number.sh 04 05 07
  ./scripts/infraestructura/run_sql_by_number.sh --all
  ./scripts/infraestructura/run_sql_by_number.sh --list

Opciones:
  --all             Ejecuta todos los archivos SQL que comienzan por número
  --list            Muestra los SQL disponibles
  --container NAME  Usa un contenedor MySQL específico
  --dry-run         Muestra qué archivos se ejecutarían sin lanzarlos
  -h, --help        Muestra esta ayuda

Notas:
  - Solo se ejecutan archivos que empiecen con el número indicado.
  - El archivo debe encontrarse en la carpeta database/.
  - La base de datos por defecto es 'tdc_db'.
EOF
}

resolve_container_name() {
  if [ -n "$CONTAINER_NAME" ]; then
    echo "$CONTAINER_NAME"
    return 0
  fi

  if docker ps --format '{{.Names}}' 2>/dev/null | grep -E 'mariadb|mysql|tdc' >/dev/null 2>&1; then
    docker ps --format '{{.Names}}' 2>/dev/null | grep -E 'mariadb|mysql|tdc' | head -n 1
    return 0
  fi

  if [ -f "$PROJECT_DIR/docker/docker-compose.yml" ]; then
    local compose_container
    compose_container="$(docker compose -f "$PROJECT_DIR/docker/docker-compose.yml" ps --format '{{.Names}}' 2>/dev/null | grep -E 'mariadb|mysql|tdc' | head -n 1 || true)"
    if [ -n "$compose_container" ]; then
      echo "$compose_container"
      return 0
    fi
  fi

  return 1
}

list_available_sql() {
  local files=()
  while IFS= read -r -d '' file; do
    files+=("$file")
  done < <(find "$SQL_DIR" -maxdepth 1 -type f -name '*.sql' -print0 | sort -z)

  if [ "${#files[@]}" -eq 0 ]; then
    echo "No se encontraron archivos SQL en $SQL_DIR"
    exit 1
  fi

  echo "SQL disponibles en $SQL_DIR:"
  for file in "${files[@]}"; do
    local base
    base="$(basename "$file")"
    printf '  - %s\n' "$base"
  done
}

parse_args() {
  if [ "$#" -eq 0 ]; then
    usage
    exit 1
  fi

  while [ "$#" -gt 0 ]; do
    case "$1" in
      -h|--help)
        usage
        exit 0
        ;;
      --list)
        list_available_sql
        exit 0
        ;;
      --all)
        ALL_MODE=true
        shift
        ;;
      --container)
        if [ "$#" -lt 2 ]; then
          echo "Error: faltó el valor para --container"
          exit 1
        fi
        CONTAINER_NAME="$2"
        shift 2
        ;;
      --dry-run)
        DRY_RUN=true
        shift
        ;;
      --)
        shift
        break
        ;;
      *)
        NUMBERS+=("$1")
        shift
        ;;
    esac
  done

  if [ "${ALL_MODE:-false}" = true ] && [ "${#NUMBERS[@]}" -gt 0 ]; then
    echo "Error: no mezcles --all con números específicos."
    exit 1
  fi
}

main() {
  NUMBERS=()
  ALL_MODE=false
  parse_args "$@"

  local files=()

  if [ "$ALL_MODE" = true ]; then
    while IFS= read -r -d '' file; do
      files+=("$file")
    done < <(find "$SQL_DIR" -maxdepth 1 -type f -name '*.sql' -print0 | sort -z)
  else
    if [ "${#NUMBERS[@]}" -eq 0 ]; then
      echo "Error: se requiere al menos un número o --all"
      usage
      exit 1
    fi

    for raw in "${NUMBERS[@]}"; do
      if [[ ! "$raw" =~ ^[0-9]{2,}$ ]]; then
        echo "Error: '$raw' no parece un número de migración válido (ej: 04, 05, 07)."
        exit 1
      fi

      while IFS= read -r -d '' file; do
        files+=("$file")
      done < <(find "$SQL_DIR" -maxdepth 1 -type f -name "${raw}_*.sql" -print0 | sort -z)
    done
  fi

  if [ "${#files[@]}" -eq 0 ]; then
    echo "No se encontraron archivos SQL para los números solicitados."
    echo "Revisa la carpeta $SQL_DIR y usa --list."
    exit 1
  fi

  local container
  if ! container="$(resolve_container_name)"; then
    echo "No se encontró un contenedor MySQL en ejecución."
    echo "Levanta primero el stack o usa --container <nombre-del-contendor>."
    exit 1
  fi

  echo "Contenedor MySQL: $container"
  echo "Base de datos: $DB_NAME"
  echo "Archivos a ejecutar:"
  for file in "${files[@]}"; do
    printf '  - %s\n' "$(basename "$file")"
  done

  if [ "$DRY_RUN" = true ]; then
    echo "Dry run: no se ejecutó ninguna migración."
    exit 0
  fi

  for file in "${files[@]}"; do
    local base
    base="$(basename "$file")"
    echo ""
    echo "Ejecutando $base ..."

    if [ -n "$DB_PASSWORD" ]; then
      docker exec -i "$container" mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$file"
    else
      docker exec -i "$container" mysql -u "$DB_USER" "$DB_NAME" < "$file"
    fi

    echo "OK: $base"
  done

  echo ""
  echo "Migraciones ejecutadas correctamente."
}

main "$@"
