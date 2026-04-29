# Análisis de Redundancia de Tablas - Eventos Confirmados

## 📋 Resumen Ejecutivo

**Problema Identificado:** El evento 9 (banda ALTA FECHAA) está confirmado en `solicitudes` y `solicitudes_fechas_bandas`, pero **tiene estado 'Solicitado' en lugar de 'Confirmado'**, lo que causa:
- ❌ No aparece en `/api/solicitudes/publicas` (index.html)
- ❌ El evento 5 en `eventos_confirmados` no está sincronizado con los datos correctos

**Causa Raíz:** El cliente nunca llamó al endpoint correcto para confirmar la banda:
- ❌ **NO USADO:** `PUT /api/solicitudes-fechas-bandas/9/confirmar` (endpoint específico para bandas)
- ✅ **DEBERÍA USAR:** `PUT /api/admin/solicitudes/bnd_9/estado` (endpoint administrativo genérico)

---

## 🔍 Redundancia Encontrada entre Tablas

### Consulta de Ejemplo (evento 9):

```sql
SELECT 
    sf.id_solicitud, sf.estado, sf.fecha_evento, sf.descripcion,
    s.descripcion_corta, s.es_publico,
    ec.id, ec.nombre_evento, ec.fecha_evento evento_fecha, ec.es_publico evento_es_publico
FROM solicitudes_fechas_bandas sf
JOIN solicitudes s ON sf.id_solicitud = s.id_solicitud
LEFT JOIN eventos_confirmados ec ON ec.id_solicitud = sf.id_solicitud
WHERE sf.id_solicitud = 9;
```

### Resultado:

| Campo | solicitudes_fechas_bandas | solicitudes | eventos_confirmados |
|-------|----------------------------|------------|------------------|
| **id_solicitud** | 9 | 9 | 5 |
| **estado** | 'Solicitado' ❌ | 'Solicitado' ❌ | N/A (evento en tabla diferente) |
| **fecha_evento** | 2026-03-03 | - | 2026-03-15 ⚠️ (DIFERENTE) |
| **nombre/descripción** | "(vacío)" | "ALTA FECHAA" | "Sin nombre" 🚫 (NULL) |
| **es_publico** | 1 ✓ | 1 ✓ | 1 ✓ |
| **hora_evento** | 21:00 | - | (hora_inicio) |

### 🚨 Problemas Identificados:

1. **Inconsistencia de Fechas:**
   - `solicitudes_fechas_bandas.fecha_evento = 2026-03-03` ✓
   - `eventos_confirmados.fecha_evento = 2026-03-15` ❌ INCORRECTA

2. **Estado Incorrecto:**
   - El evento está en `estado = 'Solicitado'`, no `'Confirmado'`
   - Esto causa que sean excluidos de vistas públicas (que filtran por `estado = 'Confirmado'`)

3. **Columnas Duplicadas/Redundantes:**
   - `es_publico` existe en 3 tablas: `solicitudes`, `solicitudes_fechas_bandas`, `eventos_confirmados`
   - `fecha_evento` existe en 2 tablas con valores **inconsistentes**
   - `nombre_evento` no está siendo sincronizado correctamente

4. **Datos Perdidos:**
   - `nombre_evento` en eventos_confirmados está NULL cuando debería ser "ALTA FECHAA"
   - `descripcion` en solicitudes_fechas_bandas está vacía

---

## 🔄 Flujo de Estados Actual

```
Usuario en Admin
    ↓
PUT /api/admin/solicitudes/bnd_9/estado
    ↓
Cambios en tablas:
    - solicitudes.estado = 'Confirmado'
    - solicitudes_fechas_bandas.estado = 'Confirmado'
    - solicitudes.es_publico = 1  (Opción A aplicada)
    ↓
Crea/Actualiza eventos_confirmados:
    - id_solicitud = 9
    - tipo_evento = 'BANDA'
    - nombre_evento = (extrae de solicitud)
    - fecha_evento = (copia de solicitudes_fechas_bandas.fecha_evento)
    - es_publico = 1
    ↓
Ahora aparece en:
    - /api/solicitudes/publicas (filtra por estado='Confirmado', es_publico=1)
    - /api/eventos/publicos (directamente de eventos_confirmados)
```

---

## ✅ Solución: Cambiar Estado Correctamente

### Opción 1: API Call (Recomendada)

```bash
curl -X PUT http://localhost:3000/api/admin/solicitudes/bnd_9/estado \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"estado": "Confirmado"}'
```

**Headers requeridos:**
- `Authorization: Bearer <JWT_TOKEN>` (usuario admin)
- Permiso: `solicitudes.cambiar_estado`

**Respuesta esperada:**
```json
{
  "message": "Estado actualizado correctamente",
  "id": "bnd_9",
  "estado": "Confirmado",
  "eventoGenerado": true,
  "eventoId": 5
}
```

### Opción 2: SQL Directo (Para Restauración de Emergencia)

```sql
-- ⚠️ SOLO en caso de emergencia, usar API en producción

-- 1. Actualizar estado en tabla padre
UPDATE solicitudes 
SET estado = 'Confirmado', es_publico = 1 
WHERE id_solicitud = 9;

-- 2. Actualizar estado en tabla hija
UPDATE solicitudes_fechas_bandas 
SET estado = 'Confirmado', actualizado_en = NOW() 
WHERE id_solicitud = 9;

-- 3. Verificar/Crear evento_confirmado (si no existe)
INSERT IGNORE INTO eventos_confirmados (
    id_solicitud, tipo_evento, tabla_origen,
    nombre_evento, descripcion, fecha_evento, hora_inicio,
    es_publico, activo, confirmado_en
) SELECT 
    9, 'BANDA', 'solicitudes_fechas_bandas',
    descripcion_corta, descripcion, fecha_evento, hora_evento,
    1, 1, NOW()
FROM solicitudes s
LEFT JOIN solicitudes_fechas_bandas sf ON s.id_solicitud = sf.id_solicitud
WHERE s.id_solicitud = 9;

-- 4. Actualizar nombre_evento si está NULL
UPDATE eventos_confirmados 
SET nombre_evento = (
    SELECT COALESCE(sf.descripcion, sf.id_banda, s.descripcion_corta, 'Banda')
    FROM solicitudes_fechas_bandas sf
    JOIN solicitudes s ON sf.id_solicitud = s.id_solicitud
    WHERE sf.id_solicitud = 9
)
WHERE id_solicitud = 9 AND tipo_evento = 'BANDA' AND nombre_evento IS NULL;
```

---

## 🎯 Impacto en Vistas Públicas

### `/api/solicitudes/publicas` (index.html - Eventos Futuros)

**Filtro actual:**
```sql
WHERE sol.es_publico = 1
  AND sol.estado = 'Confirmado'  ← ❌ Evento 9 no cumple esto
  AND sb.fecha_evento >= CURDATE()
```

**Estado del evento 9:**
- `sol.es_publico = 1` ✓
- `sol.estado = 'Solicitado'` ❌ (debería ser 'Confirmado')
- `sb.fecha_evento = 2026-03-03` >= CURDATE() ✓

**Resultado:** ❌ NO APARECE (por estado incorrecto)

---

### `/api/eventos/publicos` (seccion_agenda.html - Todos los Confirmados)

**Consulta:**
```sql
SELECT * FROM eventos_confirmados 
WHERE es_publico = 1 AND activo = 1
ORDER BY fecha_evento ASC
```

**Problema:** El evento 5 (`eventos_confirmados`) tiene:
- `id_solicitud = 9` ✓
- `es_publico = 1` ✓
- `activo = 1` ✓
- **PERO `nombre_evento = NULL`** ❌ (debería ser "ALTA FECHAA")
- **PERO `fecha_evento = 2026-03-15`** ❌ (debería ser 2026-03-03)

**Resultado:** ✓ APARECE pero con datos incorrectos ("Sin nombre", fecha equivocada)

---

## 📊 Tabla de Campos Redundantes

| Campo | solicitudes | solicitudes_fechas_bandas | eventos_confirmados | Problemas |
|-------|-------------|---------------------------|-------------------|-----------|
| `id_solicitud` / `id` | PK | FK (PK) | FK | - |
| `estado` | ✓ | ✓ | ✗ | Duplicado en 2 tablas, inconsistencias |
| `es_publico` | ✓ | ✓ | ✓ | **Triplicado**, sincronización compleja |
| `fecha_evento` | ✗ | ✓ | ✓ | **Duplicado**, valores pueden divergir |
| `hora_evento` | ✗ | ✓ | ✓ (hora_inicio) | **Duplicado**, nombre diferente |
| `nombre_evento` | ✗ | ✗ | ✓ | Información extraída, NO sincronizada |
| `descripcion` | ✓ | ✓ | ✓ | **Triplicado** |
| `duracion` | ✗ | ✓ | ✓ (duracion_estimada) | **Duplicado**, nombre diferente |

---

## 🏗️ Propuesta de Consolidación (Futuro)

### Opción A: Eliminar Redundancia de es_publico
- **Mantener:** `solicitudes_fechas_bandas.es_publico` (información específica del evento)
- **Eliminar:** `solicitudes.es_publico` (redundante, usa valor de tabla hija)
- **Riesgo:** Bajo (solo es_publico es simétrico)

### Opción B: Sincronización Garantizada
- Crear triggers para sincronizar `eventos_confirmados` cuando cambia `solicitudes_fechas_bandas`
- Garantizar que `fecha_evento`, `nombre_evento`, `es_publico` siempre coincidan
- Ejemplo:
```sql
CREATE TRIGGER sync_evento_confirm_after_update AFTER UPDATE ON solicitudes_fechas_bandas
FOR EACH ROW
BEGIN
    IF NEW.estado = 'Confirmado' THEN
        UPDATE eventos_confirmados 
        SET fecha_evento = NEW.fecha_evento,
            nombre_evento = COALESCE(NEW.descripcion, 'Banda'),
            es_publico = (SELECT es_publico FROM solicitudes WHERE id_solicitud = NEW.id_solicitud)
        WHERE id_solicitud = NEW.id_solicitud AND tipo_evento = 'BANDA';
    END IF;
END
```

### Opción C: Consolidación Completa (Largo Plazo)
- Crear tabla única `eventos` que unifique todas las categorías
- Migrar datos desde `solicitudes_fechas_bandas`, `solicitudes_alquiler`, `solicitudes_servicios`, `solicitudes_talleres`
- Mantener `eventos_confirmados` solo para eventos realmente confirmados
- **Riesgo:** Alto (refactorización mayor)

---

## 🛠️ Checklist de Corrección

- [ ] **Cambiar estado del evento 9** usando `PUT /api/admin/solicitudes/bnd_9/estado` con `{"estado": "Confirmado"}`
- [ ] **Verificar que aparece en `/api/solicitudes/publicas`**
- [ ] **Verificar que `eventos_confirmados` tiene datos correctos:**
  - [ ] `nombre_evento = "ALTA FECHAA"` (no NULL)
  - [ ] `fecha_evento = 2026-03-03` (no 2026-03-15)
- [ ] **Test en frontend:**
  - [ ] index.html muestra evento 9 en lista futura
  - [ ] seccion_agenda.html muestra evento 5 con nombre correcto
- [ ] **Documentar flujo correcto** para futuros cambios de estado

---

## 🔗 Endpoints Relacionados

| Endpoint | Método | Uso | Aplicación Opción A |
|----------|--------|-----|-------------------|
| `/api/admin/solicitudes/:id/estado` | PUT | Cambiar estado (ADMIN) | ✅ SÍ |
| `/api/solicitudes-fechas-bandas/:id/confirmar` | PUT | Confirmar banda (específico) | ✅ SÍ |
| `/api/solicitudes-fechas-bandas/:id` | PUT | Actualizar datos | ❌ NO (solo actualiza datos) |
| `/api/admin/solicitudes/:id/visibilidad` | PUT | Cambiar es_publico | ⚠️ Parcial (no crea evento) |

**Recomendación:** Usar `PUT /api/admin/solicitudes/bnd_9/estado` para cambios de estado.

---

## 📝 Notas de Desarrollo

- **Opción A implementada correctamente:** Cuando `estado = 'Confirmado'` para tipo BANDA, automáticamente `es_publico = 1`
- **Sincronización faltante:** `eventos_confirmados` no se actualiza cuando cambian datos en `solicitudes_fechas_bandas`
- **Datos incompletos:** `nombre_evento` no está siendo sincronizado correctamente a `eventos_confirmados`
- **Sugerencia:** Implementar trigger en MariaDB para garantizar sincronización automática

