#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROFILE_DIR="$PROJECT_DIR/backend/profile"
TMP_DIR="${TMPDIR:-/tmp}"

usage() {
  cat <<EOF
Usage: $0 <command> [options]

Commands:
  pack      Empaqueta y cifra los profiles wa-profile y/o mp-profile
  push      Sube un archivo cifrado a un servidor remoto usando SSH (puerto 443 por defecto)
  pull      Descarga un archivo cifrado desde un servidor remoto usando SSH
  restore   Descifra y extrae un archivo cifrado al profile local
  help      Muestra esta ayuda

Examples:
  $0 pack --profiles wa,mp --output /tmp/tdc-profile.tar.gz.gpg
  $0 push --input /tmp/tdc-profile.tar.gz.gpg --remote user@server:/tmp --port 443
  $0 pull --remote user@server:/tmp/tdc-profile.tar.gz.gpg --output /tmp/tdc-profile.tar.gz.gpg --port 443
  $0 restore --input /tmp/tdc-profile.tar.gz.gpg

Flags comunes:
  --profiles wa|mp|both   Perfíl a empaquetar (default: both)
  --input PATH            Archivo de entrada (tar.gz.gpg)
  --output PATH           Archivo de salida
  --remote TARGET         Destino SSH remoto en formato user@host:/path
  --port PORT             Puerto SSH remoto (default: 443)
  --dest PATH             Carpeta de destino local para extracción
EOF
  exit 1
}

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

require_command() {
  if ! command_exists "$1"; then
    echo "Error: required command '$1' not found." >&2
    exit 1
  fi
}

ensure_profile_dir() {
  if [ ! -d "$PROFILE_DIR" ]; then
    echo "Error: profile directory not found: $PROFILE_DIR" >&2
    exit 1
  fi
}

pack_profiles() {
  local profiles="${PROFILES:-both}"
  local output_path="${OUTPUT:-$TMP_DIR/tdc-profile.tar.gz.gpg}"
  local tarball="${output_path%.gpg}"

  ensure_profile_dir

  local items=()
  case "$profiles" in
    wa)
      items+=("wa-profile")
      ;;
    mp)
      items+=("mp-profile")
      ;;
    both)
      items+=("wa-profile" "mp-profile")
      ;;
    *)
      echo "Error: unknown profile set '$profiles'. Use wa, mp or both." >&2
      exit 1
      ;;
  esac

  echo "[share_profile] Empaquetando perfiles: ${items[*]}"
  for item in "${items[@]}"; do
    if [ ! -e "$PROFILE_DIR/$item" ]; then
      echo "Error: el profile '$item' no existe en $PROFILE_DIR" >&2
      exit 1
    fi
  done

  echo "[share_profile] Creando tarball temporal..."
  tar czf "$tarball" -C "$PROFILE_DIR" "${items[@]}"

  echo "[share_profile] Cifrando tarball con GPG..."
  require_command gpg
  gpg --batch --yes --symmetric --cipher-algo AES256 --output "$output_path" "$tarball"

  rm -f "$tarball"

  echo "[share_profile] Perfil cifrado listo: $output_path"
}

push_file() {
  local input_path="${INPUT:?--input is required}"
  local remote_target="${REMOTE:?--remote is required}"
  local ssh_port="${PORT:-443}"

  if [ ! -f "$input_path" ]; then
    echo "Error: input file not found: $input_path" >&2
    exit 1
  fi

  echo "[share_profile] Subiendo $input_path a $remote_target usando SSH:$ssh_port"
  scp -P "$ssh_port" "$input_path" "$remote_target"
  echo "[share_profile] Archivo subido correctamente"
}

pull_file() {
  local remote_target="${REMOTE:?--remote is required}"
  local output_path="${OUTPUT:-$TMP_DIR/tdc-profile.tar.gz.gpg}"
  local ssh_port="${PORT:-443}"

  echo "[share_profile] Descargando $remote_target a $output_path usando SSH:$ssh_port"
  scp -P "$ssh_port" "$remote_target" "$output_path"
  echo "[share_profile] Archivo descargado correctamente"
}

restore_profile() {
  local input_path="${INPUT:?--input is required}"
  local dest_dir="${DEST:-$PROJECT_DIR/backend/profile}"
  local tmp_tar="${TMP_DIR}/tdc-profile.restore.tar.gz"

  if [ ! -f "$input_path" ]; then
    echo "Error: input file not found: $input_path" >&2
    exit 1
  fi

  mkdir -p "$dest_dir"

  echo "[share_profile] Descifrando archivo $input_path"
  require_command gpg
  gpg --batch --yes --output "$tmp_tar" --decrypt "$input_path"

  echo "[share_profile] Extrayendo contenido a $dest_dir"
  tar xzf "$tmp_tar" -C "$dest_dir"
  rm -f "$tmp_tar"

  echo "[share_profile] Restauración completa en $dest_dir"
}

if [ $# -lt 1 ]; then
  usage
fi

CMD="$1"
shift

# Default values
PROFILES="both"
OUTPUT=""
INPUT=""
REMOTE=""
PORT="443"
DEST=""

while [ $# -gt 0 ]; do
  case "$1" in
    --profiles)
      PROFILES="$2"; shift 2;;
    --output)
      OUTPUT="$2"; shift 2;;
    --input)
      INPUT="$2"; shift 2;;
    --remote)
      REMOTE="$2"; shift 2;;
    --port)
      PORT="$2"; shift 2;;
    --dest)
      DEST="$2"; shift 2;;
    -h|--help)
      usage;;
    *)
      echo "Unknown option: $1" >&2
      usage;;
  esac
done

case "$CMD" in
  pack)
    pack_profiles;;
  push)
    push_file;;
  pull)
    pull_file;;
  restore)
    restore_profile;;
  help)
    usage;;
  *)
    echo "Unknown command: $CMD" >&2
    usage;;
esac
