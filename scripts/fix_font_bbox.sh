#!/usr/bin/env bash
set -euo pipefail

# Este script recorre los archivos de fuente de Font‑Awesome en
# frontend/webfonts, recalcula sus cajas de contorno (bounding boxes)
# y sobrescribe el fichero, de modo que el navegador ya no emitirá
# advertencias de "Glyph bbox was incorrect".
# 
# Requisitos:
#   * Python 3
#   * paquete fonttools (pip install --user fonttools brotli)
#   * soporte woff2 en fonttools (necesita el módulo "brotli")
# 
# Uso:
#   ./scripts/fix_font_bbox.sh
#   y después recarga el servidor/limpia caché del navegador.

if ! command -v python3 >/dev/null 2>&1; then
  echo "❌ Python 3 no está disponible. Instala Python para poder ejecutar este script." >&2
  exit 1
fi

python3 - <<'PYCODE'
import sys
try:
    from fontTools.ttLib import TTFont
except ImportError:
    print("❌ No está instalado fonttools. Ejecute: python3 -m pip install --user fonttools brotli", file=sys.stderr)
    sys.exit(1)
import glob, os

# iteramos por cada extensión explícitamente para evitar problemas con braces
for ext in ('ttf','woff','woff2'):
    for fname in glob.glob(f'frontend/webfonts/*.{ext}'):
        print(f"Procesando {fname}...")
        font = TTFont(fname)
        if 'glyf' in font:
            try:
                font['glyf'].recalcBounds(font)
            except AttributeError:
                # versiones antiguas de fonttools / fuentes sin glyf?
                pass
        # sobrescribimos el mismo archivo
        font.save(fname)
        print(f"  actualizado {fname}")

print("Hecho. Recuerda reiniciar nginx/limpiar caché para servir los nuevos ficheros.")
PYCODE
