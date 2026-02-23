# B3 Band Management Architecture - Testing Instructions

## ✅ Todas las Mejoras Implementadas

### 1. **Frontend** (`editar_solicitud_fecha_bandas.html`)
- ✅ Líneas 1203-1215: Construye `bandas_json` con TODAS las bandas (principal + invitadas)
- ✅ Primera banda marcada como `es_principal: true`, resto como `false`
- ✅ Orden_show automáticamente asignado (0, 1, 2, ...)
- ✅ Borrado de `datos.id_banda` para evitar duplicación

### 2. **Backend** (`solicitudFechaBandaController.js`)

#### Corregidas Incompatibilidades de Node.js:
- ✅ **Línea 352**: Removido `invitadas?.length ?? 0` → Reemplazado con construcción segura
- ✅ **Línea 787**: Removido `gandasArrayParaGuardar?.length` → Reemplazado con construcción segura

#### Implementada Lógica Inteligente:
- ✅ **Líneas 600-665**: Manejo de 3 escenarios:
  1. `bandas_json` COMPLETO (con principal): Usarlo directamente
  2. `bandas_json` PARCIAL (solo invitadas): Combinar con principal existente
  3. `id_banda` solo (compatibilidad): Queryar desde DB y usar como principal

#### Sincronización de Bandas-Invitadas:
- ✅ **Líneas 785-833**: Sincronización automática con tabla `eventos_lineup`
- ✅ Borra invitadas previas y las inserta nuevas
- ✅ Error en sincronización NO rompe el PUT

#### Mapeo de Precios:
- ✅ **Líneas 697-702**: `precio_base` → `precio_basico` y `precio_puerta` → `precio_puerta`
- ✅ Usa `parseFloat()` para conversión segura

#### Logging Mejorado:
- ✅ **Líneas 485-503**: Logging detallado de parámetros desestructurados
- ✅ **Líneas 968-972**: Respuesta incluye campo `debug` con detalles de error

### 3. **Base de Datos**
- ✅ `solicitudes_fechas_bandas.bandas_json`: JSON con estructura `[{id_banda, nombre, orden_show, es_principal}, ...]`
- ✅ Precios solo en `solicitudes_fechas_bandas`, NO en `eventos_confirmados`

---

## 🚀 PASOS A SEGUIR PARA VALIDAR

### PASO 1: Hard Refresh del Navegador (CRÍTICO)
**Por qué**: El navegador tiene cache de la versión anterior del HTML que enviaba `invitadas_json` por separado.

**Cómo hacer hard refresh**:
- **Windows/Linux**: `Ctrl+Shift+R`
- **Mac**: `Cmd+Shift+R`
- **Chrome/Firefox**: Ir a DevTools (F12) → Settings → Network → Check "Disable cache"

**Verificación**: En la consola del navegador, al guardar, debe mostrar:
```
[BANDAS] Todas las bandas a enviar: [
  {id_banda: 1, nombre: "Reite", orden_show: 0, es_principal: true},
  {id_banda: 4, nombre: "Cumbia Sudaka", orden_show: 1, es_principal: false},
  ...
]
```

---

### PASO 2: Probar Actualización de Solicitud (PUT)

1. **Ir a la página**: `http://localhost/editar_solicitud_fecha_bandas.html?solicitudId=bnd_11`
2. **Seleccionar bandas**:
   - Principal: "Reite"  
   - Invitadas: "Cumbia Sudaka", "Pateando Bares"
3. **Modificar precios**:
   - Precio Anticipada: `2500`
   - Precio Puerta: `3000`
4. **Guardar** (clic en botón Save/Submit)

**Resultado esperado**:
- ✅ Console muestra logs `[BANDAS]` con payload completo
- ✅ Response status: `200` (y mensaje "Solicitud actualizada exitosamente")
- ✅ Form se recarga automáticamente con datos guardados
- ✅ NO debe mostrar error 500 ni "No autorizado"

**Si hay error 500**:
- Revisa la consola del navegador (devTools F12)
- Revisa docker logs: `docker logs docker-backend-1 | tail -100`
- Busca tags `[FECHA_BANDA]` con mensaje de error

---

### PASO 3: Verificar Persistencia en Base de Datos

```bash
# Conectar a MariaDB
docker exec -it docker-mariadb-1 mysql -u root -p -D tdc_bandas

# Query para verificar bandas_json
SELECT id_solicitud, bandas_json, cantidad_bandas 
FROM solicitudes_fechas_bandas 
WHERE id_solicitud = 11;

# Resultado esperado:
# bandas_json: [{"id_banda":1,"nombre":"Reite","orden_show":0,"es_principal":true},{"id_banda":4,...},{"id_banda":2,...}]
# cantidad_bandas: 3

# Verificar precios
SELECT id_solicitud, precio_basico, precio_puerta 
FROM solicitudes_fechas_bandas 
WHERE id_solicitud = 11;

# Resultado esperado:
# precio_basico: 2500.00
# precio_puerta: 3000.00
```

---

### PASO 4: Verificar GET devuelve datos correctly

```bash
curl -s -H "Authorization: Bearer any-token" http://localhost:3000/api/solicitudes-fechas-bandas/11 | jq '.' | head -50
```

**Debe contener**:
- ✅ `bandas_json`: String con array `[{...},...]`
- ✅ `banda_nombre`: "Reite" (principal)
- ✅ `invitadas`: Array con 2 elementos (Cumbia Sudaka, Pateando Bares)
- ✅ `precio_base`: "2500.00"
- ✅ `precio_puerta_propuesto`: "3000.00"

---

### PASO 5: Hard Refresh Nuevamente y Abrir Formulario

1. **Hard Refresh otra vez**: `Ctrl+Shift+R` (o `Cmd+Shift+R`)
2. **Abrir el formulario**: `http://localhost/editar_solicitud_fecha_bandas.html?solicitudId=bnd_11`
3. **Verificar carga**:
   - ✅ Principal seleccionada: "Reite"
   - ✅ Invitadas seleccionadas: "Cumbia Sudaka", "Pateando Bares"
   - ✅ Precio Anticipada: 2500
   - ✅ Precio Puerta: 3000

---

## 📋 Datos de Prueba Recomendados

### Solicitud Existente para Test:
- **ID**: `bnd_11`
- **Banda Principal Actual**: Cumbia Sudaka (id_banda=4)
- **Invitadas Actuales**: Reite (1), Pateando Bares (2)
- **Precios Actuales**: 2700 base, 3000 puerta

### Test Changesets:
```javascript
// Test 1: Cambiar principal y reordenar invitadas
{
  bandas_json: [
    {id_banda: 1, nombre: "Reite", orden_show: 0, es_principal: true},
    {id_banda: 2, nombre: "Pateando Bares", orden_show: 1, es_principal: false},
    {id_banda: 4, nombre: "Cumbia Sudaka", orden_show: 2, es_principal: false}
  ],
  precio_base: 2800,
  precio_puerta: 3100
}

// Test 2: Agregar una banda invitada más
{
  bandas_json: [
    {id_banda: 1, nombre: "Reite", orden_show: 0, es_principal: true},
    {id_banda: 2, nombre: "Pateando Bares", orden_show: 1, es_principal: false},
    {id_banda: 4, nombre: "Cumbia Sudaka", orden_show: 2, es_principal: false},
    {id_banda: 5, nombre: "Nueva Banda", orden_show: 3, es_principal: false}
  ],
  precio_base: 3000,
  precio_puerta: 3500
}

// Test 3: Volver solo a una banda (principal, sin invitadas)
{
  bandas_json: [
    {id_banda: 1, nombre: "Reite", orden_show: 0, es_principal: true}
  ],
  precio_base: 2000,
  precio_puerta: 2500
}
```

---

## 🔍 Troubleshooting

### Problema: "No autorizado, no hay token"
**Causa**: Falta autenticación
**Solución**: Asegúrate de tener un token Bearer válido en el header Authorization

### Problema: Error 500 "Solicitud actualizada exitosamente" no aparece
**Causa**: Puede ser error en sincronización de bandas o en la construcción de bandas_json
**Solución**:
1. Verifica docker logs: `docker logs docker-backend-1 | grep FECHA_BANDA`
2. Revisa que bandas_json sea un array válido
3. Verifica que `es_principal` sea `true` (boolean) o `false` (boolean), no strings

### Problema: Form no se recarga después de guardar
**Causa**: Función `cargarEvento()` puede estar teniendo problemas
**Solución**:
1. Haz refresh manual de la página (F5)
2. Verifica que el GET devuelve datos correctamente
3. Revisa la consola para errores en cargarEvento()

### Problema: Bandas no aparecen en eventos_lineup
**Causa**: Puede que no exista el evento_confirmado
**Solución**:
1. Verifica que el evento existe: `SELECT id FROM eventos_confirmados WHERE id_solicitud = 11`
2. Si no existe, crea uno o verifica que el estado es 'Confirmado'

---

## ✨ Características Implementadas

| Feature | Status | File | Lines |
|---------|--------|------|-------|
| Bandas_json único fuente de verdad | ✅ | Backend PUT | 600-665 |
| Manejo inteligente de arrays parciales | ✅ | Backend PUT | 619-642 |
| Sincronización con eventos_lineup | ✅ | Backend PUT | 785-833 |
| Mapeo de precio_base → precio_basico | ✅ | Backend PUT | 697-702 |
| Logging detallado de operaciones | ✅ | Backend PUT | 485-503 |
| Error handling con debug info | ✅ | Backend PUT | 968-972 |
| Frontend construye bandas_json completo | ✅ | Frontend | 1203-1215 |
| Auto-refresh después de guardar | ✅ | Frontend | 1267-1276 |
| Hard refresh instructions | ✅ | Este documento | - |

---

## 📝 Notas Importantes

1. **Bandas_json must be valid JSON**: Si hay errores de parsing, el sistema fallará
2. **es_principal must be boolean**: No strings like "true" o "false"
3. **id_banda must be integer or null**: ID válido o null, nunca string
4. **orden_show must be sequential 0,1,2,...**: Aunque tecnicamente puede saltarse
5. **Cache es crítico**: Múltiples hard refreshes pueden ser necesarios

---

## 🎯 Criterios de Éxito

✅ **Validación Correcta**:
1. Frontend envía `bandas_json` con todas las bandas
2. Backend recibe, procesa y guarda correctamente
3. GET devuelve datos en formato esperado
4. Form recarga con datos guardados
5. Base de datos contiene datos consistentes
6. No hay errores en docker logs con tag `[FECHA_BANDA]`

✅ **Performance**:
- PUT response < 2 segundos
- GET response < 1 segundo
- Auto-refresh < 3 segundos

✅ **User Experience**:
- Guardado muestra notificación de éxito
- Form recarga automáticamente
- No hay mensajes de error al usuario
- Precios se guardan y cargan correctamente

---

**Generado**: 2026-02-21
**Versión**: B3 Architecture v1.0
**Estado**: Ready for User Validation
