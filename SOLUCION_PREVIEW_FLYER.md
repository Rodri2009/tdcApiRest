# SOLUCIÓN: Imagen del Flyer No Aparecía en Preview (Incluso cuando estaba guardada)

## Problema Reportado
- Usuario sube una imagen (JPG) correctamente
- La imagen se guarda en la base de datos: `url_flyer = "/uploads/flyers/1771436174139-dsvly0.jpeg"`
- El archivo existe en el servidor: `/app/uploads/flyers/1771436174139-dsvly0.jpeg` (145.1KB)
- Backend sirve la imagen con HTTP 200
- **PERO**: La imagen NO aparece en el preview al recargar la página

## Root Cause (Causa Raíz)
**Timing bug con imágenes en caché del navegador**

En la función `updateFlyerPreview()`, el código original era:
```javascript
const img = document.createElement('img');
img.src = url;  // ← Esto DISPARA la carga inmediatamente
img.alt = 'Flyer preview';

img.onload = function() {  // ← Listener asignado DESPUÉS que img.src
    // ...
};
```

### ¿Por qué falló?
1. Al establecer `img.src`, el navegador comienza a cargar la imagen
2. Si la imagen está **en caché del navegador**, el evento `onload` dispara **inmediatamente** (antes de que la siguiente línea se ejecute)
3. El listener `img.onload` se asigna **DESPUÉS** de que el evento ya ha disparado
4. Resultado: El listener nunca se ejecuta, y la imagen nunca se puede limpiar/agregar al DOM

### Analogía
Es como si intentaras coger una pelota que ya ha sido lanzada:
```
INCORRECTO:
1. Lanzar pelota (img.src = url)
2. Esperar a que alguien le diga "¡la atrapé!" (img.onload dispara)
3. Decirle a alguien que atrape la pelota (img.onload = function)  ← ¡Demasiado tarde!

CORRECTO:
1. Decirle a alguien que atrape la pelota (img.onload = function)
2. Lanzar pelota (img.src = url)  ← Ahora el listener está listo
```

## Solución
**Asignar los listeners ANTES de establecer `src`:**

```javascript
const img = document.createElement('img');
img.alt = 'Flyer preview';
img.style.maxWidth = '100%';
img.style.maxHeight = '100%';

// ✓ Asignar listeners PRIMERO
img.onload = function () {
    console.log('[FLYER] ✓ Imagen cargada exitosamente desde:', url);
    previewContainer.innerHTML = '';
    previewContainer.appendChild(img);
};

img.onerror = function () {
    console.warn('[FLYER] ✗ Error cargando imagen desde:', url);
    // ... mostrar error ...
};

// ✓ Establecer src ÚLTIMO (dispara la carga/caché)
img.src = url;
```

## Archivos Modificados
- **frontend/editar_solicitud_fecha_bandas.html** (líneas 1425-1450)
  - Reordenó las operaciones en `updateFlyerPreview()`
  - Los listeners se asignan ANTES de `img.src = url`

## Verificación
el comportamiento ahora es:

1. **Imagen en caché**: `onload` dispara correctamente → imagen se muestra
2. **Imagen nueva**: Se descarga, luego `onload` dispara → imagen se muestra
3. **Error de red**: `onerror` dispara → se muestra mensaje de error
4. **URL vacía**: Se muestra placeholder "Sin flyer"

## Lado técnico
Este es un problema **común** cuando se cargan imágenes dinámicamente:
- Images from Cache: The `onload` event fires immediately (synchronously)
- Images from Network: The `onload` event fires asynchronously
- Si asignas el listener DESPUÉS de `src`, puedes perder el evento sincrónico

**Best Practice**: Siempre asigna listeners antes de `src`
```javascript
// ✓ CORRECTO
const img = new Image();
img.onload = () => { /* ... */ };
img.onerror = () => { /* ... */ };
img.src = url;

// ✗ INCORRECTO
const img = new Image();
img.src = url;
img.onload = () => { /* ... */ };  // ← Puede no disparar para cachés
```

## Prueba
Para verificar que funciona:
1. Abre `editar_solicitud_fecha_bandas.html?bnd_11`
2. Espera a que cargue la página
3. La imagen del flyer debe aparecer en el preview (aunque sea desde caché)
4. Verifica la consola para logs `[FLYER] ✓ Imagen cargada exitosamente desde: /uploads/flyers/...`
