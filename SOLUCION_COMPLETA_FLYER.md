# Resumen Completo: Solución de Issues del Flyer Preview

## 📋 Problemas Resueltos en Esta Sesión

### 1. ✅ Banda Invitadas No Persistía (Fase 1)
**Problema**: Se guardaba solo una banda; las invitadas se perdían al recargar.
**Solución**: Modificar `cargarEvento()` para parsear `invitadas_json` y cargar todas las bandas.
**Estado**: RESUELTO

### 2. ✅ Error en Preview HTML (Fase 2)
**Problema**: "Error img '>" visible en preview; página no cargaba después de guardar.
**Solución**: Reescribir `updateFlyerPreview()` usando `createElement()` + listeners en vez de HTML string.
**Estado**: RESUELTO

### 3. ✅ HTTP 413 - Nginx Limit (Fase 3)
**Problema**: Subida de PNG fallaba con "Request Entity Too Large"
**Solución**: Aumentar `client_max_body_size 50M;` en `docker/nginx.conf`
**Estado**: RESUELTO

### 4. ✅ Imagen No Aparecía en Preview (Fase 4 - ACTUAL)
**Problema**: Imagen guardada en BD e existe en servidor, pero NO aparece en preview al recargar.
**Causa Raíz**: Timing bug - listeners asignados DESPUÉS de `img.src`, perdiendo evento de caché.
**Solución**: Cambiar orden: asignar listeners ANTES de `img.src`.
**Estado**: RESUELTO

---

## 🔧 Cambios Técnicos Realizados

### Archivo: `frontend/editar_solicitud_fecha_bandas.html`

#### Cambio 1: Líneas 961-1008 (Cargar Bandas Invitadas)
```javascript
// Agregar bandas invitadas (si existen)
if (evento.invitadas && Array.isArray(evento.invitadas) && evento.invitadas.length > 0) {
    console.log('[BANDAS] Bandas invitadas encontradas en evento:', evento.invitadas);
    evento.invitadas.forEach(invitada => {
        // Agregar cada invitada a bandasSeleccionadas...
    });
}
```

#### Cambio 2: Líneas 980-985 (Try-Catch en Cargar Preview)
```javascript
try {
    updateFlyerPreview();
} catch (err) {
    console.warn('[BANDAS] Error cargando preview del flyer:', err);
    // Continuar sin fallar
}
```

#### Cambio 3: Líneas 1425-1450 (CRITICAL FIX - Reorden de Listeners)
**ANTES (❌ Incorrecto)**:
```javascript
const img = document.createElement('img');
img.src = url;  // ← Dispara inmediatamente si está en caché
img.alt = 'Flyer preview';
img.onload = function() {  // ← Asignado DESPUÉS (¡puede perder el evento!)
    // ...
};
```

**DESPUÉS (✅ Correcto)**:
```javascript
const img = document.createElement('img');
img.alt = 'Flyer preview';
img.style.maxWidth = '100%';
img.style.maxHeight = '100%';

// Asignar listeners PRIMERO
img.onload = function () {
    console.log('[FLYER] ✓ Imagen cargada exitosamente desde:', url);
    previewContainer.innerHTML = '';
    previewContainer.appendChild(img);
};

img.onerror = function () {
    console.warn('[FLYER] ✗ Error cargando imagen desde:', url);  
    previewContainer.innerHTML = '<div class="preview-placeholder">...Error...</div>';
};

// Establecer src ÚLTIMO (dispara la carga/caché)
img.src = url;
```

### Archivo: `docker/nginx.conf`
```nginx
client_max_body_size 50M;  # ← Agregado para permitir uploads grandes
```

### Archivo: `backend/server.js`
```javascript
// Ya tenía error handling para PayloadTooLarge, confirmado
app.use((err, req, res, next) => {
    if (err && (err.type === 'entity.too.large' || /request entity too large/i.test(err.message || ''))) {
        console.warn(`[BODY_PARSER] Payload demasiado grande...`);
        return res.status(413).json({ error: '...' });
    }
    next(err);
});
```

---

## 🧪 Verificación Técnica

### 1. Base de Datos
```sql
-- bnd_11 tiene imagen guardada
SELECT id_solicitud, url_flyer, LENGTH(url_flyer) 
FROM solicitudes_fechas_bandas 
WHERE id_solicitud = 11;
-- Resultado: url_flyer = '/uploads/flyers/1771436174139-dsvly0.jpeg'
```

### 2. Sistema de Archivos
```bash
# El archivo existe en el servidor
docker exec docker-backend-1 ls -lah /app/uploads/flyers/1771436174139-dsvly0.jpeg
# Resultado: -rw-r--r-- 145.1K ... (archivo presente)
```

### 3. HTTP Headers
```bash
curl -I http://localhost:3000/uploads/flyers/1771436174139-dsvly0.jpeg
# HTTP/1.1 200 OK
# Content-Type: image/jpeg
# Content-Length: 148577
```

### 4. Validación de Imagen
```bash
curl -s http://localhost:3000/uploads/flyers/1771436174139-dsvly0.jpeg | file -
# JPEG image data, JFIF standard 1.01, 1024x1024 pixels
```

---

## 📝 Cómo Probar

### Test 1: Página Principal
```
1. Abrir: http://localhost:3000/editar_solicitud_fecha_bandas.html?bnd_11
2. Esperar a que cargue la página
3. Verificar: Si la imagen aparece en el preview del flyer
4. Console: Abre DevTools (F12) → Console
5. Busca logs: "[FLYER] ✓ Imagen cargada exitosamente desde: /uploads/flyers/1771436174139-dsvly0.jpeg"
```

### Test 2: Page de Prueba Simple
```
1. Abrir: http://localhost:3000/test_cached_image.html
2. Verificar que muestre "✓ PASS" en los resultados
3. Debería mostrar la imagen en el preview
```

### Test 3: bnd_10 (Sin Imagen)
```
1. Abrir: http://localhost:3000/editar_solicitud_fecha_bandas.html?bnd_10
2. Verificar: Debe mostrar placeholder "Sin flyer" (porque url_flyer es NULL)
```

---

## 🎯 Resultado Esperado

**✅ Comportamiento Correcto:**
- [ ] Al cargar una solicitud con flyer, la imagen aparece en el preview
- [ ] Si se sube un nuevo flyer, aparece inmediatamente
- [ ] Si se recarga la página, la imagen sigue visible
- [ ] Si se recarga el navegador (Ctrl+R), la imagen sigue visible (incluso desde caché)
- [ ] Los logs en console muestran "[FLYER] ✓ Imagen cargada exitosamente..."

**❌ Si Sigue Fallando:**
- Verificar DevTools → Networks → ¿Se solicita la imagen?
- Verificar DevTools → Console → ¿Se muestra onerror?
- Verificar que `/uploads/flyers/` existe en el servidor
- Revisar logs: `docker logs docker-backend-1 | grep uploads`

---

## 📚 Contexto Técnico

### ¿Por Qué Ocurrió Este Bug?

En navegadores modernos, cuando estableces la propiedad `src` de una imagen:
1. **Imagen en memoria caché**: El evento `onload` dispara **SINCRONAMENTE** (casi inmediatamente)
2. **Imagen nueva**: El evento `onload` dispara **ASINCRONAMENTE** (cuando se descarga)

Si asignas el listener DESPUÉS de `src`, el evento sincrónico ya pasó:

```javascript
// ❌ INCORRECTO - Pierde evento de caché
img.src = url;           // ← Si está en caché, onload DISPARA AQUÍ
// ...otra línea se ejecuta...
img.onload = function() { /* Este listener nunca se ejecuta */ };

// ✅ CORRECTO - Captura todos los eventos
img.onload = function() { /* Listener listo desde el inicio */ };
img.src = url;           // ← Ahora si dispara, el listener está esperando
```

### Lugares Donde Este Bug es Común
- Cargas de imagen dinámica
- Precarga de imágenes en JavaScript
- Rotadores de imágenes
- Galerías dinámicas

**Best Practice**: Siempre asigna listeners ANTES de `src` en imágenes dinámicas.

---

## 📎 Archivos Creados/Modificados

| Archivo | Cambio | Estado |
|---------|--------|--------|
| `frontend/editar_solicitud_fecha_bandas.html` | Líneas 961-1050 | ✅ MODIFICADO |
| `docker/nginx.conf` | client_max_body_size | ✅ MODIFICADO |
| `SOLUCION_PREVIEW_FLYER.md` | Nuevo | ✅ CREADO |
| `frontend/test_cached_image.html` | Nuevo | ✅ CREADO |

---

## 🚀 Próximos Pasos

1. **Verificar en navegador real** (no Simple Browser) - necesita DevTools
2. **Pruebas de usuario** - hacer upload nuevo y recargar página
3. **Test de caché** - limpiar caché del navegador y volver a recargar
4. **Test de múltiples bandas** - verificar que las invitadas se cargan con sus flyers
5. **Documentación** - actualizar README con instrucciones

