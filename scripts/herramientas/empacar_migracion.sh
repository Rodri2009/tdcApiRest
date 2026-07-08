#!/usr/bin/env bash
set -euo pipefail

# Empaca todo lo necesario para mover el proyecto TDC a un nuevo servidor.
# Incluye:
#   - el código del repositorio (sin node_modules ni .git)
#   - los perfiles de Puppeteer de MercadoPago y WhatsApp
#   - los volúmenes Docker de MariaDB

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(realpath "$SCRIPT_DIR/../..")"
OUTPUT_DIR="${1:-/tmp/tdcApiRest-migracion-$(date +%Y%m%d-%H%M%S)}"
FINAL_PACKAGE="$OUTPUT_DIR/tdcApiRest-migracion-$(date +%Y%m%d-%H%M%S).tar.gz"

REPO_TAR="$OUTPUT_DIR/tdcApiRest-repo.tar.gz"
MP_PROFILE_TAR="$OUTPUT_DIR/mp-profile.tar.gz"
WA_PROFILE_TAR="$OUTPUT_DIR/wa-profile.tar.gz"
MARIADB_DATA_TAR="$OUTPUT_DIR/mariadb_data.tgz"
MARIADB_BINLOGS_TAR="$OUTPUT_DIR/mariadb_binlogs.tgz"

function error() {
  echo "ERROR: $*" >&2
  exit 1
}

function require_command() {
  command -v "$1" >/dev/null 2>&1 || error "No se encontró '$1'. Instalalo y volvé a ejecutar."
}

require_command docker
require_command tar
require_command realpath
require_command mkdir

mkdir -p "$OUTPUT_DIR"

if ! docker info >/dev/null 2>&1; then
  error "Docker no está disponible. Iniciá Docker antes de ejecutar este script."
fi

cd "$REPO_ROOT"

echo "[*] Ruta del repositorio: $REPO_ROOT"
echo "[*] Carpeta de salida: $OUTPUT_DIR"

echo "[*] Creando tar del repositorio (sin node_modules ni .git)..."
tar --exclude-vcs --exclude='node_modules' --exclude='*/node_modules' --exclude='.git' -czf "$REPO_TAR" .

echo "[*] Empacando perfiles Puppeteer..."
PROFILE_DIR="$REPO_ROOT/backend/profile"

if [ -d "$PROFILE_DIR/mp-profile" ]; then
  tar -C "$PROFILE_DIR" -czf "$MP_PROFILE_TAR" mp-profile
  echo "    - mp-profile incluido"
else
  echo "    - advertencia: no existe $PROFILE_DIR/mp-profile"
fi

if [ -d "$PROFILE_DIR/wa-profile" ]; then
  tar -C "$PROFILE_DIR" -czf "$WA_PROFILE_TAR" wa-profile
  echo "    - wa-profile incluido"
else
  echo "    - advertencia: no existe $PROFILE_DIR/wa-profile"
fi

function pack_volume() {
  local volume_name="$1"
  local output_file="$2"

  if docker volume inspect "$volume_name" >/dev/null 2>&1; then
    echo "[*] Empacando volumen Docker: $volume_name"
    docker run --rm -v "$volume_name":/volume -v "$OUTPUT_DIR":/backup alpine sh -c "cd /volume && tar czf /backup/$(basename "$output_file") ."
  else
    echo "    - advertencia: el volumen Docker '$volume_name' no existe"
  fi
}

pack_volume mariadb_data "$MARIADB_DATA_TAR"
pack_volume mariadb_binlogs "$MARIADB_BINLOGS_TAR"

cd "$OUTPUT_DIR"

echo "[*] Creando paquete final: $FINAL_PACKAGE"
tar -czf "$FINAL_PACKAGE" "$(basename "$REPO_TAR")" "$(basename "$MP_PROFILE_TAR")" "$(basename "$WA_PROFILE_TAR")" "$(basename "$MARIADB_DATA_TAR")" "$(basename "$MARIADB_BINLOGS_TAR")"

cat <<EOF

Listo.
Archivos generados en: $OUTPUT_DIR
Paquete final: $FINAL_PACKAGE

Copialo al nuevo servidor y descomprimilo allí.

Nota: para que todas las sesiones funcionen igual, el volumen MariaDB y los perfiles
mp-profile / wa-profile deben ser restaurados correctamente en el nuevo servidor.
EOF
