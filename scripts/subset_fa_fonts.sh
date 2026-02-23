#!/usr/bin/env bash
set -euo pipefail

# Genera versiones "subset" de las fuentes de Font Awesome que contienen
# únicamente los glifos realmente usados en los HTML del frontend.
#
# 1. Analiza los HTML en frontend/ buscando clases como "fa-...".
# 2. Extrae de fontawesome.min.css el código unicode asociado a cada clase.
# 3. Invoca pyftsubset para recortar cada fichero .woff2/.ttf con la lista de
#    unidades necesarias.
#
# El script crea un entorno virtual temporal para instalar fonttools y brotli,
# lo utiliza y lo borra al terminar.

FRONTEND="$(cd "$(dirname "$0")/../frontend" && pwd)"
CSS="$FRONTEND/css/fontawesome.min.css"
WEBFONTS="$FRONTEND/webfonts"

if [ ! -f "$CSS" ]; then
  echo "❌ No se encontró $CSS" >&2
  exit 1
fi

# 1. encontrar todas las clases fa-* usadas en html
echo "🔍 Escaneando HTML en $FRONTEND para clases fa-..."
CLASSES=$(grep -rhoP "fa-[a-z0-9-]+" "$FRONTEND" | sort -u)
[ -z "$CLASSES" ] && {
  echo "⚠️  No se detectaron clases fa- en el frontend. Abortando." >&2
  exit 1
}

# 2/3. construir mapa y filtrar con Python para evitar fallos de regex
UNICODES=()
PYCODE=$(cat <<'PYTH'
import re, sys, json
css_path = sys.argv[1]
classes = sys.argv[2].split()
# extraer todos los pares clase->codigo del CSS
dict_map = {}
pattern = re.compile(r"\.fa-([a-z0-9-]+):before\{content:[\"']\\f([0-9a-fA-F]+)[\"']")
with open(css_path, 'r', encoding='utf-8') as f:
    for m in pattern.finditer(f.read()):
        dict_map['fa-'+m.group(1)] = m.group(2)
used = set()
for cls in classes:
    if cls in dict_map:
        used.add('U+' + dict_map[cls])
# print result
print(' '.join(sorted(used)))
PYTH
)


# call python snippet
UNITEXT=$(python3 -c "$PYCODE" "$CSS" "$CLASSES")
IFS=' ' read -r -a UNICODES <<< "$UNITEXT"

if [ ${#UNICODES[@]} -eq 0 ]; then
  echo "⛔ no se pudo compilar ninguna unicode. Revise HTML/CSS." >&2
  exit 1
fi

if [ ${#UNICODES[@]} -eq 0 ]; then
  echo "⛔ no se pudo compilar ninguna unicode. Revise HTML/CSS." >&2
  exit 1
fi

UNITEXT=$(IFS=, ; echo "${UNICODES[*]}")
echo "✅ Unicodes usados: $UNITEXT"

# preparar entorno temporal
TMPVENV=$(mktemp -d)
python3 -m venv "$TMPVENV"
# shellcheck source=/dev/null
source "$TMPVENV/bin/activate"
pip install --upgrade pip >/dev/null
pip install fonttools brotli >/dev/null

# 4. subset cada fuente (trabajamos sobre TTF y derivamos WOFF2)
mkdir -p "$WEBFONTS/originals"
for src in "$WEBFONTS"/*.ttf; do
  [ -f "$src" ] || continue
  base=$(basename "$src")
  echo "🔧 Generando subset para $base (TTF)"
  cp "$src" "$WEBFONTS/originals/" 2>/dev/null || true
  # también copiamos el WOFF2 correspondiente si existe, para guardarlo
  w2="${src%.ttf}.woff2"
  [ -f "$w2" ] && cp "$w2" "$WEBFONTS/originals/" 2>/dev/null || true

  # reemplazamos la TTF con la subset (por omisión el formato es ttf)
  pyftsubset "$src" --unicodes="$UNITEXT" --layout-features='*' --output-file="$src"
  # regeneramos WOFF2 a partir de la TTF subset
  if [ -f "$w2" ]; then
    echo "🔧 Generando subset para $(basename "$w2") desde TTF"
    pyftsubset "$src" --unicodes="$UNITEXT" --flavor=woff2 --layout-features='*' --output-file="$w2"
  fi
done

# 5. corregir bounding boxes llamando al script dedicado
# éste usará el Python/global fonttools de sistema y ya ha demostrado funcionar
echo "🔄 Ejecutando fix_font_bbox.sh para ajustar cajas de los subset..."
bash "$(dirname "$0")/fix_font_bbox.sh"

deactivate
rm -rf "$TMPVENV"

echo "¡Listo! Las fuentes han sido reducidas a los glifos realmente usados."
echo "Recuerda reiniciar nginx/limpiar caché del navegador para aplicar los nuevos"