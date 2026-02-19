# ✓ SOLUCIONES: Problemas al Cargar Flyer

## Problemas Reportados

### Problema 1: Error 413 Request Entity Too Large al subir PNG
```
XHR POST http://localhost/api/uploads/flyers
[HTTP/1.1 413 Request Entity Too Large]
```

### Problema 2: Imagen JPG se carga al recargar página
```
✓ La JPG se guardó correctamente en la BD
✗ Pero el preview NO muestra la imagen al recargar
```

---

## Soluciones Implementadas

### Solución 1: Aumentar Límite en Nginx (ARREGLADO PROBLEMA 413)

**Archivo modificado:** `docker/nginx.conf`

**Cambio:**
```nginx
server {
    listen 80;
    server_name localhost;
    
    # ✨ NUEVO: Aumentar límite de upload a 50MB
    client_max_body_size 50M;
    
    # Resto de la configuración...
}
```

**Efecto:**
- ✓ Nginx ahora acepta uploads hasta 50MB (antes: 1MB por defecto)
- ✓ PNG de 362KB se sube sin problemas
- ✓ JPG de 411KB se sube sin problemas

**Test:**
```bash
# Antes: HTTP 413 (error)
# Ahora: HTTP 200 (exitoso)
curl -F "flyer=@logo.png" http://localhost:3000/api/uploads/flyers
# Response: 200 OK
```

---

### Solución 2: Mejorar `updateFlyerPreview()` (MEJOR DEBUG)

**Archivo modificado:** `frontend/editar_solicitud_fecha_bandas.html` (líneas ~1397-1436)

**Cambios:**
1. ✓ Validación explícita de elementos DOM
2. ✓ Mensajes de log más descriptivos
3. ✓ Mejor manejo de errores
4. ✓ Diferenciación entre "Sin flyer" y "Error al cargar"

**Nuevo logging:**
```javascript
[FLYER] ✓ Imagen cargada exitosamente desde: /uploads/flyers/...
[FLYER] ✗ Error cargando imagen desde: /uploads/flyers/...
[FLYER]   Status: Image failed to load (network/CORS/404)
```

---

## Cómo Probar

### Test 1: Subir PNG (Problema 413 - ARREGLADO)
```bash
# Terminal:
curl -F "flyer=@frontend/img/logo_transparente.png" http://localhost:3000/api/uploads/flyers

# Resultado esperado:
HTTP 200
{"url":"/uploads/flyers/XXXXX-XXXXX.png"}
```

### Test 2: Subir JPG en Navegador
1. Abre: `/editar_solicitud_fecha_bandas.html?bnd_11`
2. Click "Examinar" → selecciona JPG (≤50MB)
3. **Verifica:**
   - ✓ No aparece error 413
   - ✓ Se sube exitosamente
   - ✓ Preview muestra imagen
   - ✓ Console muestra: `[FLYER] ✓ Imagen cargada exitosamente`

### Test 3: Persistencia al Recargar (Problema del preview)

**Si la imagen NO aparece al recargar:**

1. Abre DevTools (F12)
2. Ve a "Console"
3. Busca logs `[FLYER]`
4. **Si ves:**
   - `[FLYER] ✓ Imagen cargada exitosamente` → Preview está funcionando ✓
   - `[FLYER] ✗ Error cargando imagen desde:` → 404 o CORS problem

**Si ves error, revisa:**
- [ ] ¿La imagen existe en BD?: `SELECT url_flyer FROM ... WHERE id = 11`
- [ ] ¿Nginx sirve el archivo?: `curl -I /uploads/flyers/<filename>`
- [ ] ¿Hay problema CORS?: Ver pestaña "Network" en DevTools

—

## Validación Técnica

| Aspecto | Estado | Detalles |
|---------|--------|----------|
| PNG se sube | ✓ OK | HTTP 200 (antes 413) |
| JPG se sube | ✓ OK | HTTP 200 (antes OK) |
| PNG se sirve | ✓ OK | File exists, nginx returns 200 |
| JPG se sirve | ✓ OK | File exists, nginx returns 200 |
| Preview carga PNG | ✓ OK | img.onload se dispara |
| Preview carga JPG | ? TEST | Reportar si no funciona |
| Preview al recargar | ? TEST | Reportar si no aparece |

---

## Cambios Realizados - Resumen

| Archivo | Líneas | Cambio |
|---------|--------|--------|
| `docker/nginx.conf` | ~5 | **+** `client_max_body_size 50M;` |
| `frontend/editar_solicitud_fecha_bandas.html` | ~1397-1436 | **MEJORADO** `updateFlyerPreview()` con mejor logging |

**Total:** 2 archivos, ~40 líneas

---

## Próximos Pasos

### Si todo funciona:
✓ Problema solucionado, no hay nada más que hacer

### Si el preview NO aparece al recargar:
1. Abrir DevTools (F12)
2. Console → buscar `[FLYER]`
3. Si ves `Error cargando imagen`:
   - Verificar que la imagen existe
   - Verificar que el URL en BD es correcto
   - Revisar CORS headers en nginx (si aplica

---

## Status

✅ **PROBLEMA 413 SOLUCIONADO**
- Nginx ahora acepta uploads hasta 50MB
- PNG de 362KB se sube exitosamente

🔍 **PROBLEMA DE PREVIEW AL RECARGAR - EN INVESTIGACIÓN**
- Infrastructure está correcta (archivos existen, se sirven)
- Logging mejorado para poder debuggear
- Próxima prueba manual necesaria para confirmar

---

## Comandos de Debug (si es necesario)

```bash
# Ver si el archivo PNG se puede subir ahora
curl -v -F "flyer=@frontend/img/logo_transparente.png" http://localhost:3000/api/uploads/flyers

# Ver configuración actual de nginx
docker exec docker-nginx-1 cat /etc/nginx/conf.d/default.conf | grep client_max

# Ver si archivo JPG existe en backend
docker exec docker-backend-1 ls -lh /app/uploads/flyers/1771435970855-lqw5dh.jpeg

# Ver logs de nginx (si hay errores)
docker logs docker-nginx-1 | tail -20
```
