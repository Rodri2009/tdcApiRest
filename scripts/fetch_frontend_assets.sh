#!/usr/bin/env bash
set -euo pipefail

# Descarga versiones locales de Tailwind CSS y Font Awesome,
# copia fuentes a directorio propio y actualiza los HTML para
# dejar de depender de CDNs.

FRONTEND_DIR="$(cd "$(dirname "$0")/../frontend" && pwd)"
CSS_DIR="$FRONTEND_DIR/css"
WEBFONTS_DIR="$FRONTEND_DIR/webfonts"
FA_VER="6.4.0"

mkdir -p "$CSS_DIR" "$WEBFONTS_DIR"

# Generate Tailwind CSS locally using the CLI (requires Node/npx).
# This avoids the tiny placeholder that unpkg returns and gives us a full
# stylesheet including preflight, utilities and components.
echo "🛠️  Generando Tailwind CSS localmente..."
# create a minimal input file with the three @tailwind directives
TMP_IN="/tmp/tailwind-input.css"
cat > "$TMP_IN" <<'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;
EOF

# run tailwindcli via npx; this will download the package if necessary
if ! command -v npx >/dev/null 2>&1; then
  echo "❌ npx no está disponible. Instala Node.js para generar Tailwind localmente."
  exit 1
fi

# pin a version from the 3.x branch (latest v3) to ensure the CLI binary is available
npx tailwindcss@^3 -i "$TMP_IN" -o "$CSS_DIR/tailwind.min.css" --minify \
    --content "./frontend/**/*.html"

# clean up
rm -f "$TMP_IN"

echo "⬇️  Descargando Font Awesome CSS..."
curl -sL "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/$FA_VER/css/all.min.css" -o "$CSS_DIR/fontawesome.min.css"

# Extraer URLs de fuentes de la hoja de estilo y descargarlas
echo "⬇️  Descargando fuentes de Font Awesome..."
# remove any leftover parenthesized filenames from previous runs
rm -f "$WEBFONTS_DIR"/*\) || true

# Extraer URLs de fuentes de la hoja de estilo y descargarlas
echo "⬇️  Descargando fuentes de Font Awesome..."
grep -o "url([^)]*webfonts[^)]*)" "$CSS_DIR/fontawesome.min.css" | \
  sed -E "s/^url\(['\"]?//; s/['\"]?\)\$//" | sort -u | \
  while read -r path; do
    fname=$(basename "$path")
    echo "    -> $fname"
    curl -sL "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/$FA_VER/webfonts/$fname" -o "$WEBFONTS_DIR/$fname"
  done

# Ajustar rutas en la hoja de estilo para apuntar al directorio /webfonts
sed -i 's@https://cdnjs.cloudflare.com/ajax/libs/font-awesome/[^/]*/webfonts/@/webfonts/@g' "$CSS_DIR/fontawesome.min.css"

# Actualizar referencias en todos los HTML del frontend
echo "🔧 Actualizando referencias en HTML..."
find "$FRONTEND_DIR" -name "*.html" | while read -r html; do
  sed -i \
    -e 's@<script src="https://cdn.tailwindcss.com"></script>@<link rel="stylesheet" href="/css/tailwind.min.css">@g' \
    -e 's@https://cdnjs.cloudflare.com/ajax/libs/font-awesome/$FA_VER/css/all.min.css@/css/fontawesome.min.css@g' \
    "$html"
done

echo "✅ Recursos descargados y HTML actualizados. Asegúrate de servir '/css' y '/webfonts' desde el frontend."