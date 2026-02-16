#!/bin/bash

#
# Script robusto para hacer un backup de tablas sensibles y luego destruir el entorno Docker.
# - Resuelve rutas relativas automáticamente.
# - Detecta `docker compose` vs `docker-compose`.
# - Intenta usar las credenciales internas del contenedor (MARIADB_ROOT_PASSWORD o MARIADB_USER/MARIADB_PASSWORD).
# - Verifica disponibilidad de mysqldump.
#

set -euo pipefail

# --- Configuración por defecto (override mediante variables de entorno si se desea) ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$SCRIPT_DIR/docker/docker-compose.yml}"
BACKUP_DIR="${BACKUP_DIR:-$SCRIPT_DIR/data_migration}"
BACKUP_FILE="${BACKUP_FILE:-${BACKUP_DIR}/datos_sensibles_backup.sql}"
DB_SERVICE="${DB_SERVICE:-mariadb}"
TABLES_TO_BACKUP="${TABLES_TO_BACKUP:-solicitudes solicitudes_adicionales solicitudes_personal}"

# --- Helpers ---
function die() { echo "❌ $*" >&2; exit 1; }

echo "--- Iniciando proceso de Backup y Descenso ---"

# Detectar comando docker compose
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD=('docker' 'compose')
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD=('docker-compose')
else
  die "Ni 'docker compose' ni 'docker-compose' están disponibles en este equipo. Instala Docker Compose o asegúrate de que Docker esté disponible."
fi

# Verificar que el archivo docker-compose exista
if [ ! -f "$COMPOSE_FILE" ]; then
  die "No se encontró el archivo docker-compose en: $COMPOSE_FILE. Ejecuta el script desde el root del repo o ajusta COMPOSE_FILE."
fi

# 1. Comprobar si el servicio de la base de datos está en ejecución
DB_CONTAINER_ID="$(${COMPOSE_CMD[@]} -f "$COMPOSE_FILE" ps -q "$DB_SERVICE" 2>/dev/null || true)"
if [ -z "$DB_CONTAINER_ID" ]; then
  echo "AVISO: El servicio '$DB_SERVICE' no parece estar en ejecución (no se obtuvo container id). Saltando backup."
else
  # Verificar si el container está en estado "running"
  if [ "$(docker inspect -f '{{.State.Running}}' "$DB_CONTAINER_ID")" != "true" ]; then
    echo "AVISO: El contenedor de la DB ($DB_CONTAINER_ID) no está en estado 'running'. Saltando backup."
  else
    echo "Paso 1: Realizando backup de las tablas sensibles..."

    mkdir -p "$BACKUP_DIR"

    # Comprobar si mysqldump está disponible dentro del contenedor
    if ! ${COMPOSE_CMD[@]} -f "$COMPOSE_FILE" exec -T "$DB_SERVICE" sh -lc "command -v mysqldump >/dev/null 2>&1"; then
      die "mysqldump no está disponible dentro del contenedor '$DB_SERVICE'. No se puede realizar el backup."
    fi

    # Determinar qué tablas de las solicitadas existen realmente en la BD (evitar errores si alguna no existe)
    EXISTING_TABLES=$(${COMPOSE_CMD[@]} -f "$COMPOSE_FILE" exec -T "$DB_SERVICE" sh -lc 'mysql -u root -p"$MARIADB_ROOT_PASSWORD" -N -e "SHOW TABLES IN \"$MARIADB_DATABASE\";"' 2>/dev/null || true)

    TO_BACKUP=()
    for t in $TABLES_TO_BACKUP; do
        if echo "$EXISTING_TABLES" | grep -Fxq "$t"; then
            TO_BACKUP+=("$t")
        else
            echo "Aviso: la tabla '$t' no existe en la BD y será omitida del backup."
        fi
    done

    if [ ${#TO_BACKUP[@]} -eq 0 ]; then
        echo "No hay tablas existentes para respaldar. Saltando backup de tablas solicitadas."
        DUMP_PERFORMED=0
    else
        DUMP_PERFORMED=1
        TABLES_ARG="${TO_BACKUP[@]}"

        # Intentos de volcado (prioridad: root usando MARIADB_ROOT_PASSWORD, luego MARIADB_USER/MARIADB_PASSWORD, luego fallback a valores hardcodeados si existen en host)
        PASS_CMD_ROOT='mysqldump -u root -p"$MARIADB_ROOT_PASSWORD" "$MARIADB_DATABASE"'
        PASS_CMD_USER='mysqldump -u "$MARIADB_USER" -p"$MARIADB_PASSWORD" "$MARIADB_DATABASE"'

        set +e
        echo "Intentando volcado con credenciales de root (variables del contenedor)..."
        ${COMPOSE_CMD[@]} -f "$COMPOSE_FILE" exec -T "$DB_SERVICE" sh -lc "$PASS_CMD_ROOT $TABLES_ARG" > "$BACKUP_FILE"
        RC=$?

        if [ $RC -ne 0 ] || [ ! -s "$BACKUP_FILE" ]; then
          echo "Volcado con root falló (o archivo vacío). Intentando con usuario de servicio (MARIADB_USER)..."
          ${COMPOSE_CMD[@]} -f "$COMPOSE_FILE" exec -T "$DB_SERVICE" sh -lc "$PASS_CMD_USER $TABLES_ARG" > "$BACKUP_FILE"
          RC=$?
        fi

        # Si sigue fallando, intentar con variables DB_USER/DB_PASS del host (legacy)
        if [ $RC -ne 0 ] || [ ! -s "$BACKUP_FILE" ]; then
          if [ -n "${DB_USER:-}" ] && [ -n "${DB_PASS:-}" ] && [ -n "${DB_NAME:-}" ]; then
            echo "Intentando con credenciales locales DB_USER/DB_PASS..."
            docker exec -i "$DB_CONTAINER_ID" sh -lc "mysqldump -u $DB_USER -p\"$DB_PASS\" $DB_NAME $TABLES_ARG" > "$BACKUP_FILE"
            RC=$?
          fi
        fi
        set -e
    fi

    if [ "${DUMP_PERFORMED:-0}" -eq 0 ]; then
      echo "INFO: No se realizó ningún volcado (no había tablas solicitadas existentes). No se generó backup de tablas específicas."
    else
      if [ $RC -eq 0 ] && [ -s "$BACKUP_FILE" ]; then
        echo "✅ Backup realizado con éxito en '$BACKUP_FILE'."
      else
        die "El backup falló después de varios intentos. Revisa credenciales y el estado del contenedor. Aborto para proteger datos."
      fi
    fi
  fi
fi

# 2. Destruir el entorno Docker, incluyendo los volúmenes
if [ "${SKIP_DOWN:-0}" = "1" ]; then
  echo "SKIP_DOWN=1 detectado: se omitirá el paso de 'down' (solo se realizó el backup)."
  echo "--- Proceso completado (solo backup) ---"
  exit 0
fi

echo "Paso 2: Destruyendo el entorno Docker (contenedores, redes y volúmenes)..."
${COMPOSE_CMD[@]} -f "$COMPOSE_FILE" down --volumes

echo "--- Proceso completado ---"