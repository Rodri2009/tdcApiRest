# Candidatos a Eliminar - Scripts

Análisis de scripts de utilidades que podrían no ser necesarios.

---

## 🔴 CANDIDATOS A ELIMINAR

### 1. **optimizacion/fix_font_bbox.sh**
**Riesgo:** BAJO  
**Frecuencia de uso:** Muy Rara (una sola vez en setup)

- Corrige problemas de fuentes (bounding box)
- Se usa **solo si hay errores de renderizado de fonts**
- En producción, las fuentes ya están validadas
- **Decisión:** Guardar (puede ser útil si surge problema con fuentes)

---

### 2. **optimizacion/optimize_images.js**
**Riesgo:** BAJO  
**Frecuencia de uso:** Nunca (en desarrollo actual)

- Comprime imágenes del proyecto
- No hay pipeline de CI/CD que lo ejecute
- Las imágenes se optimizan manualmente cuando se suben
- **Decisión:** ✅ **ELIMINAR** - No se usa, optimización manual es suficiente

---

### 3. **optimizacion/subset_fa_fonts.sh**
**Riesgo:** BAJO  
**Frecuencia de uso:** Una sola vez (setup inicial)

- Reduce tamaño de FontAwesome
- Ya está configurado en build
- No necesita ejecución manual regularmente
- **Decisión:** Guardar (es parte del setup de build)

---

### 4. **infraestructura/fetch_frontend_assets.sh**
**Riesgo:** BAJO  
**Frecuencia de uso:** Nunca (assets se gestionan en git)

- Descarga assets estáticos
- Los assets están versionados en git/npm
- No es necesario descargar manualmente
- **Decisión:** ✅ **ELIMINAR** - Assets están en repo, no necesita descarga manual

---

### 5. **infraestructura/update_logging.sh**
**Riesgo:** BAJO  
**Frecuencia de uso:** Casi Nunca

- Actualiza configuración de logging
- Los logs se configuran en .env y backend
- No se usa en operación normal
- **Decisión:** ⚠️ **REVISAR** - Pregunta: ¿lo necesitas para cambiar niveles de log?

---

### 6. **infraestructura/cleanup_duplicate_containers.sh**
**Riesgo:** BAJO  
**Frecuencia de uso:** Rara (solo si hay problema)

- Limpia contenedores huérfanos
- Docker Compose maneja esto automáticamente
- Solo necesario si hay error manual
- **Decisión:** ✅ **ELIMINAR** - Docker Compose lo hace automáticamente

---

### 7. **herramientas/backfill_confirmed_solicitudes.js**
**Riesgo:** ALTO (Datos)  
**Frecuencia de uso:** Una sola vez (migración histórica)

- Migración de datos histórica (ya hecha)
- Sincroniza solicitudes ↔ eventos_confirmados
- Ya fue ejecutada, datos migramos
- **Decisión:** ✅ **ELIMINAR** - Fue migración puntual, no se necesita más

---

### 8. **herramientas/generar_contexto.js**
**Riesgo:** BAJO  
**Frecuencia de uso:** Nunca (documental)

- Genera archivo de contexto del proyecto
- Uso: documentación/referencia manual
- No es parte del workflow automático
- **Decisión:** ✅ **ELIMINAR** - Solo genera doc, no es esencial

---

### 9. **herramientas/test_email_validation.js**
**Riesgo:** BAJO  
**Frecuencia de uso:** Nunca

- Prueba validación de emails
- Podría estar en test suite, no como script standalone
- No se ejecuta automáticamente
- **Decisión:** ✅ **ELIMINAR** - Debería estar en test suite, no en scripts

---

## 📊 RESUMEN

| Script | Guardar | Eliminar | Revisar |
|--------|---------|----------|---------|
| fix_font_bbox.sh | ✅ | | |
| optimize_images.js | | ✅ | |
| subset_fa_fonts.sh | ✅ | | |
| fetch_frontend_assets.sh | | ✅ | |
| update_logging.sh | | | ⚠️ |
| cleanup_duplicate_containers.sh | | ✅ | |
| backfill_confirmed_solicitudes.js | | ✅ | |
| generar_contexto.js | | ✅ | |
| test_email_validation.js | | ✅ | |

---

## 🎯 RECOMENDACIÓN

**Eliminar inmediatamente (7 scripts):**
1. optimize_images.js
2. fetch_frontend_assets.sh
3. cleanup_duplicate_containers.sh
4. backfill_confirmed_solicitudes.js
5. generar_contexto.js
6. test_email_validation.js

**Guardar (3 scripts):**
1. fix_font_bbox.sh (si surge problema con fuentes)
2. subset_fa_fonts.sh (parte del setup)

**Revisar antes de eliminar (1 script):**
1. update_logging.sh - ¿Lo usas para cambiar niveles de log?

**Totales:**
- **Antes:** 13 scripts de utilidades
- **Después:** ~5-6 scripts (eliminando los 7 no esenciales)
- **Reducción:** ~50%

---

## ❓ PREGUNTAS ANTES DE PROCEDER

1. **update_logging.sh** - ¿Lo necesitas para cambiar niveles de logging en producción?
2. **generar_contexto.js** - ¿Lo usas para generar documentación automática?
3. **test_email_validation.js** - ¿Está integrado en tu test suite?

Responde estas preguntas y procedo con la limpieza.
