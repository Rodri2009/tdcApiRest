# Scripts de Optimización

Herramientas para optimizar recursos (imágenes, fuentes, etc).

## fix_font_bbox.sh
Corrige problemas con bounding box de fuentes.
- Usa fonttools para validar/reparar fuentes
- Previene errores de renderizado

```bash
./optimizacion/fix_font_bbox.sh
```

## optimize_images.js
Optimiza imágenes del proyecto para web.
- Compresión sin pérdida
- Reduce tamaño de carga

```bash
node ./optimizacion/optimize_images.js
```

## subset_fa_fonts.sh
Genera subsets de FontAwesome optimizados.
- Reduce tamaño de fuentes icónicas
- Incluye solo iconos utilizados

```bash
./optimizacion/subset_fa_fonts.sh
```
