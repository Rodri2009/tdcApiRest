# Cambios en Lógica de Estado "Confirmado" para Fechas de Bandas en Vivo

## 📋 Resumen Ejecutivo

Cuando una **fecha de banda en vivo** cambia de estado a "Confirmado" (desde cualquier punto de la aplicación), ahora **automáticamente se publica en la agenda pública** (`es_publico = 1`).

**Referencia**: Opción A - "Confirmado = Automáticamente Público"

---

## 🔍 Por qué existían dos endpoints que hacen lo mismo

### Endpoint 1: `/api/solicitudes-fechas-bandas/{id}` (PUT)
```
Ubicación: backend/controllers/solicitudFechaBandaController.js
Propósito: Específico para fechas de bandas
Usado por: editar_solicitud_fecha_bandas.html (formulario de edición completa)
```

### Endpoint 2: `/api/admin/solicitudes/{id}/estado` (PUT)
```
Ubicación: backend/controllers/adminController.js
Propósito: Genérico para TODAS las solicitudes (bandas, alquiler, servicios, talleres)
Usado por: admin_solicitudes.html (tabla administrativa universal)
```

**Razón de la redundancia**: El proyecto fue creciendo sin refactorizar. Ambos endpoints hacen:
- Crear evento_confirmado
- Sincronizar datos
- Validar permisos

**Solución futura**: Refactorizar para que adminController delegue a solicitudFechaBandaController cuando el tipo sea BANDA.

---

## ✅ Cambios Implementados

### 1. En `solicitudFechaBandaController.js` (línea 904)

**Antes:**
```javascript
// Si se pidió actualizar es_publico en el PUT, persistirlo en la tabla padre `solicitudes`
if (parentEsPublico !== null) {
    // Solo actualizar si se envió explícitamente
}
```

**Ahora:**
```javascript
// ✅ NUEVA LÓGICA: Si el estado cambia a 'Confirmado', automáticamente hacer es_publico = 1 (SOLO para bandas en vivo)
if (typeof estado !== 'undefined' && estado === 'Confirmado') {
    logVerbose(`[FECHA_BANDA] ✅ Estado 'Confirmado' detectado - Automáticamente seteando es_publico = 1 (Opción A)`);
    parentEsPublico = 1;  // Forzar a público automáticamente
}

// Si se pidió actualizar es_publico en el PUT, persistirlo en la tabla padre `solicitudes`
if (parentEsPublico !== null) {
    // Ahora se actualiza incluso si es_publico no fue enviado explícitamente
}
```

**Efecto:**
- Cuando `estado === 'Confirmado'`, automáticamente `parentEsPublico` se setea a `1`
- Se sincroniza en `solicitudes` y `eventos_confirmados`

### 2. En `solicitudFechaBandaController.js` (línea 944)

**Antes:**
```javascript
if (eventoExiste) {
    logVerbose(`Ya existe evento_confirmado... no se crea otro.`);
} else {
    // Crear nuevo evento
}
```

**Ahora:**
```javascript
if (eventoExiste) {
    logVerbose(`Ya existe evento_confirmado... sincronizando es_publico.`);
    // ✅ NUEVA LÓGICA: Sincronizar es_publico con eventos_confirmados
    const esPublicoFinal = (typeof es_publico !== 'undefined') ? (es_publico ? 1 : 0) : parentEsPublico;
    await conn.query(`UPDATE eventos_confirmados SET es_publico = ? WHERE id = ?`, [esPublicoFinal, existingEventoRow.id]);
    logVerbose(`evento_confirmado sincronizado: es_publico=${esPublicoFinal}`);
} else {
    // Crear nuevo evento
}
```

**Efecto:**
- Si el evento ya existe, se sincroniza el `es_publico` ahora a `1`

### 3. En `adminController.js` (línea 267)

**Antes:**
```javascript
if (estado === 'Confirmado') {
    // Determinar si debe ser público (leer valor actual)
    const [parent] = await conn.query('SELECT es_publico, url_flyer FROM solicitudes WHERE id = ?', [realId]);
    const esPublico = parent && parent.es_publico ? 1 : 0;  // ← Lee el valor actual
}
```

**Ahora:**
```javascript
if (estado === 'Confirmado') {
    // ✅ NUEVA LÓGICA (Opción A): Si es BANDA en vivo, automáticamente hacer es_publico = 1
    if (tipoEvento === 'BANDA') {
        await conn.query('UPDATE solicitudes SET es_publico = 1 WHERE id = ?', [realId]);
        logVerbose(`Estado 'Confirmado' para BANDA - Automáticamente seteado es_publico = 1 (Opción A)`);
    }

    // Determinar si debe ser público (ahora será 1 si es BANDA recién confirmada)
    const [parent] = await conn.query('SELECT es_publico, url_flyer FROM solicitudes WHERE id = ?', [realId]);
    const esPublico = parent && parent.es_publico ? 1 : 0;
}
```

**Efecto:**
- Si `tipoEvento === 'BANDA'` y `estado === 'Confirmado'`, automáticamente `UPDATE solicitudes SET es_publico = 1`

### 4. En `adminController.js` (línea 356)

**Nuevo bloque:** Si el evento ya existe y está activo:
```javascript
} else {
    // ✅ NUEVA LÓGICA: Si el evento ya está activo, actualizar es_publico (importante para Opción A: bandas)
    if (tipoEvento === 'BANDA') {
        await conn.query(`UPDATE eventos_confirmados SET es_publico = ? WHERE id = ?`, [esPublico, eventoExistente.id]);
        logVerbose(`evento_confirmado sincronizado: es_publico=${esPublico} para evento BANDA`);
    }
}
```

**Efecto:**
- Sincroniza `es_publico` en `eventos_confirmados` si el evento ya está activo

---

## 🧪 Cómo Probar

### Escenario 1: Desde editar_solicitud_fecha_bandas.html

1. Abrir un evento de banda existente
2. Cambiar estado a "Confirmado"
3. Hacer clic en "Guardar Cambios"
4. **Resultado esperado**:
   - Estado cambia a "Confirmado"
   - `es_publico` se setea automáticamente a `1`
   - El evento aparece en la agenda pública

### Escenario 2: Desde admin_solicitudes.html

1. Abrir la tabla administrativa
2. Buscar una solicitud de banda con estado "Solicitado" o "Contactado"
3. Cambiar el dropdown de estado a "Confirmado"
4. **Resultado esperado**:
   - Estado cambia a "Confirmado"
   - `es_publico` se setea automáticamente a `1`
   - El evento se crea en `eventos_confirmados` con `es_publico=1`

### Verificación en BD

```sql
-- Consultar una solicitud de banda confirmada
SELECT 
    s.id_solicitud,
    s.estado,
    s.es_publico,
    ec.id,
    ec.es_publico as evento_es_publico
FROM solicitudes s
LEFT JOIN eventos_confirmados ec ON ec.id_solicitud = s.id_solicitud
WHERE s.id_solicitud = <NUM>
  AND s.categoria = 'BANDA';

-- Resultado esperado:
-- estado = "Confirmado", es_publico = 1, evento_es_publico = 1
```

---

## 📊 Flujo de Datos

```
Usuario cambia estado a "Confirmado" en formulario
        ↓
Frontend envía PUT a uno de los endpoints
        ↓
┌─────────────────────────────────────────┐
├─ /api/solicitudes-fechas-bandas/{id}    │  (solicitudFechaBandaController)
│  o                                       │
├─ /api/admin/solicitudes/{id}/estado     │  (adminController)
└─────────────────────────────────────────┘
        ↓
✅ NUEVA LÓGICA: if (estado === 'Confirmado') → parentEsPublico = 1
        ↓
UPDATE solicitudes SET es_publico = 1 WHERE id = ?
        ↓
INSERT/UPDATE eventos_confirmados SET es_publico = 1
        ↓
Respuesta al cliente: "Solicitud actualizada"
        ↓
El evento aparece en la agenda pública (http://localhost/agenda_de_bandas.html)
```

---

## 🔐 Consideraciones de Seguridad

- **No afecta a otros tipos de eventos** (alquiler, servicios, talleres)
- **Solo para bandas en vivo** (`tipoEvento === 'BANDA'`)
- **Requiere autenticación** para cambiar estado a "Confirmado"
- **Log completo** de cambios en verbosidad

---

## 📝 Documentación de Logs

Cuando ocurren estos cambios, verás en los logs:

```
[FECHA_BANDA] ✅ Estado 'Confirmado' detectado - Automáticamente seteando es_publico = 1 (Opción A)
[FECHA_BANDA] ✓ es_publico guardado en tabla 'solicitudes' (id=<NUM> -> es_publico=1)
[FECHA_BANDA] ✓ es_publico sincronizado en 'eventos_confirmados' para solicitud <NUM>
[ADMIN] ✅ Estado 'Confirmado' para BANDA - Automáticamente seteado es_publico = 1 (Opción A)
[ADMIN] ✅ evento_confirmado sincronizado: es_publico=1 para evento BANDA (id=<NUM>)
```

---

## 🚀 Próximos Pasos Recomendados

1. **Refactorizar endpoints**: Consolidar `solicitudFechaBandaController` y `adminController` para eliminar duplicación
2. **Extender a otros tipos**: Si es necesario, implementar lógica similar para alquileres o servicios
3. **Auditoría**: Registrar quién cambió el estado y cuándo
4. **Tests**: Agregar tests unitarios para estas transiciones de estado

---

## 📍 Archivos Modificados

| Archivo | Líneas | Cambio |
|---------|--------|--------|
| solicitudFechaBandaController.js | 904-922 | Agregar lógica Opción A |
| solicitudFechaBandaController.js | 944-956 | Sincronizar es_publico en evento existente |
| adminController.js | 267-272 | Agregar lógica Opción A (específico para BANDA) |
| adminController.js | 356-361 | Sincronizar es_publico en evento existente |

---

**Última actualización**: 2 de marzo de 2026  
**Versión**: 1.0  
**Estado**: ✅ Implementado y Desplegado
