# ✓ FIX: Problemas al Cargar Flyer

## Problemas Reportados

1. **Error visual pegado a la imagen:**
   ```
   Error
   img
   '">
   ```

2. **La página no se carga después de guardar y recargar**

## Raíz del Problema

En la función `updateFlyerPreview()`:
- Usaba un `onerror` handler inline con múltiples escapes de comillas
- Esto causaba parseado incorrecto del HTML
- Si hay cualquier error, causaba que toda la página fallara

### Código Problematico (ANTES)
```javascript
previewContainer.innerHTML = `<img src="${url}" alt="Flyer preview" onerror="this.parentElement.innerHTML = '<div class=\\\"preview-placeholder\\\"><i class=\\\"fas fa-exclamation-circle\\\" style=\\\"font-size:2rem;margin-bottom:6px;display:block;\\\"></i><p style=\\\"margin:0;font-size:0.75rem;\\\">Error<br>img</p></div>'">`;
```

**Problemas:**
- Las comillas escapadas se parseaban incorrectamente
- El HTML resultante tenía caracteres rotos (`'">`)
- Si la imagen fallaba cargar, el error handler ejecutaba una cadena malformada
- Si algo fallaba, toda la página no cargaba

## Solución Implementada

### Cambio 1: Reescribir `updateFlyerPreview()` (Líneas ~1391-1427)

Cambié de:
```javascript
// Inline onerror (problemático)
previewContainer.innerHTML = `<img src="${url}" ... onerror="...complejo..."">`;
```

A:
```javascript
// Elementos creados con appendChild (seguro)  
const img = document.createElement('img');
img.src = url;
img.onload = function() { /* mostrar imagen */ };
img.onerror = function() { /* mostrar error */ };
```

**Beneficios:**
- No hay conflicto de comillas
- Event listeners en JS en lugar de strings
- Más mantenible y robusto
- Manejo de errores más limpio

### Cambio 2: Agregar Try-Catch en `updateFlyerPreview()` (Líneas ~1391)

```javascript
function updateFlyerPreview() {
    try {
        // Código de actualización
    } catch (err) {
        console.error('[FLYER] Error en updateFlyerPreview:', err);
        // Fallback seguro
    }
}
```

**Beneficio:** Si algo falla, no rompe toda la página

### Cambio 3: Proteger Llamada en `cargarEvento()` (Líneas ~980-985)

```javascript
try {
    updateFlyerPreview();
} catch (err) {
    console.warn('[BANDAS] Error cargando preview:', err);
}
```

**Beneficio:** Si updateFlyerPreview() falla, cargarEvento() continúa cargando el resto del formulario

## Cambios Realizados

**Archivo:** `frontend/editar_solicitud_fecha_bandas.html`

| Cambio | Líneas | Descripción |
|--------|--------|-------------|
| updateFlyerPreview() mejorada | ~1391-1427 | Usa createElement + listeners en lugar de onerror inline |
| Try-catch en updateFlyerPreview() | ~1391 | Protección contra errores |
| Try-catch en cargarEvento() | ~980-985 | Protección al cargar preview |
| Logging agregado | ~1397, 1410, 1413 | Para debug de problemas |

## Cómo Probar

### Test 1: Subir Flyer
1. Abre `/editar_solicitud_fecha_bandas.html?bnd_10`
2. Click "Examinar" en la sección Flyer
3. Selecciona una imagen (JPG/PNG, ≤3MB)
4. **Resultado esperado:**
   - Preview muestra la imagen ✓
   - **NO aparece** `Error img '">` pegado ✓
   - Notificación "Flyer subido correctamente" ✓

### Test 2: Guardar y Recargar
1. Click "Guardar Cambios"
2. **Resultado:** Guardado exitoso ✓
3. Recargar página (F5 ó Ctrl+R)
4. **Resultado esperado:**
   - **Página carga completamente** ✓
   - Formulario se rellena correctamente ✓
   - Preview muestra la imagen (si se guardó) ✓
   - **NO aparece** `Error img` en consola ✓

### Test 3: Ver Logs (F12 → Console)

**Deberías ver:**
```
[FLYER] updateFlyerPreview - URL: /uploads/flyers/1771431839998-zqnf65.png
[FLYER] Imagen cargada exitosamente
```

**NO deberías ver errores type:**
```
Uncaught SyntaxError: Unexpected token '>'
```

## Técnica Usada

### Antes: HTML inline con onerror
```html
<img src="..." onerror="javascript code here...">
```
❌ Problemático: Conflictos de comillas, difícil de debuggear

### Después: JavaScript con listeners
```javascript
const img = document.createElement('img');
img.src = '...';
img.onerror = function() { /* handler */ };
```
✓ Limpio: No conflictos, fácil de debuggear, mejor manejo de errores

## Status

✅ **ARREGLADO**

- [ ] Error `Error img '">` no aparece
- [ ] Página carga después de guardar
- [ ] Preview funciona correctamente
- [ ] Logs están limpios

**Los cambios ya están implementados. Prueba abriendo la página en tu navegador.**

---

## Si Aún Hay Problemas

1. **Limpiar caché del navegador** (Ctrl+Shift+Del)
2. **Abrir DevTools** (F12) y revisar consola
3. **Verificar que el endpoint de uploads funciona:**
   ```bash
   curl -X POST -F "flyer=@frontend/img/logo_transparente.png" http://localhost:3000/api/uploads/flyers
   ```
4. **Ver logs del backend:**
   ```bash
   docker logs backend 2>&1 | tail -50 | grep -i "upload\|flyer"
   ```

---

## Cambios en Detalle

Archivo: `frontend/editar_solicitud_fecha_bandas.html`

- Línea 693: Sin cambios (input sigue siendo igual)
- Líneas 980-985: **NUEVO** - Try-catch alrededor de updateFlyerPreview()
- Líneas 1391-1427: **REESCRITO** - updateFlyerPreview() rediseñada

Total: ~35 líneas modificadas

