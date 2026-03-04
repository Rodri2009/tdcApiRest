# ⚡ PLAN DE ACCIÓN EJECUTIVO - Normalización de Tablas

**Fecha:** 2 de Marzo 2026  
**Prioridad:** ALTA (Impacta bugs, performance, mantenibilidad)  
**Duración:** 1-2 semanas por Fase

---

## 📊 HALLAZGOS CRÍTICOS

### Redundancias Identificadas:
- ❌ **Campo `estado`**: Duplicado en 2 tablas (solicitudes_alquiler, solicitudes_fechas_bandas)
- ❌ **Campo `es_publico`**: Triplicado en 3 tablas (solicitudes, solicitudes_fechas_bandas, eventos_confirmados)
- ❌ **Campo `descripcion`**: Duplicado en solicitudes (descripcion_larga vs descripcion)
- ⚠️ **Tabla `eventos_confirmados`**: Duplica 8+ campos de tablas origen

### Impacto:
- 🔴 Bug evento 9 fue consecuencia de esta redundancia
- 🔴 Riesgo de inconsistencias cuando datos cambian
- 🔴 Sincronización compleja y propensa a errores
- 🔴 Performance degradada en queries

### Auditoría Ejecutada:
```
✓ Conexión OK
✓ Campo 'estado': Sincronizado (por ahora)
✓ Campo 'es_publico': Parcialmente desincronizado
✓ Eventos confirmados: Algunos nombres NULL
✓ Descripción: 3 campos (debería ser 2)
```

---

## 🎯 PLAN DE ACCIONES INMEDIATAS

### FASE 1: Eliminar `estado` Redundante (3-5 días)

**Problema:** Campo existe en solicitudes + 2 tablas hijas innecesariamente

**Acciones:**

```bash
# Paso 1: Respaldar BD
mysqldump -u root -psys8102root tdc_db > backup_pre-normalizacion_$(date +%Y%m%d).sql

# Paso 2: Crear script de migración
```

```sql
-- 1. Crear tabla de auditoría (antes de eliminar)
CREATE TABLE IF NOT EXISTS columnas_eliminadas_audit (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tabla_nombre VARCHAR(255),
    columna_nombre VARCHAR(255),
    fecha_eliminacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    motivo VARCHAR(255),
    filas_afectadas INT
);

-- 2. Eliminar de solicitudes_alquiler
SELECT COUNT(*) as filas_alquiler FROM solicitudes_alquiler;
INSERT INTO columnas_eliminadas_audit VALUES (NULL, 'solicitudes_alquiler', 'estado', NOW(), 'Redundante - usar solicitudes.estado', (SELECT COUNT(*) FROM solicitudes_alquiler));
ALTER TABLE solicitudes_alquiler DROP COLUMN estado;

-- 3. Eliminar de solicitudes_fechas_bandas
SELECT COUNT(*) as filas_bandas FROM solicitudes_fechas_bandas;
INSERT INTO columnas_eliminadas_audit VALUES (NULL, 'solicitudes_fechas_bandas', 'estado', NOW(), 'Redundante - usar solicitudes.estado', (SELECT COUNT(*) FROM solicitudes_fechas_bandas));
ALTER TABLE solicitudes_fechas_bandas DROP COLUMN estado;

-- 4. Auditar cambios
SELECT * FROM columnas_eliminadas_audit;

-- 5. Verificar integridad
SELECT COUNT(*) FROM solicitudes s
WHERE NOT EXISTS (
    SELECT 1 FROM solicitudes_alquiler sa WHERE s.id_solicitud = sa.id_solicitud
) AND s.categoria = 'ALQUILER'
-- Debería retornar 0
```

**Controllers a Actualizar:**

1. **`adminController.js`** (línea ~200)
   - Cambiar: `UPDATE solicitudes_alquiler SET estado = ?`
   - A: `UPDATE solicitudes SET estado = ?` (ya lo hace)
   - Cambiar: Lectura de `sa.estado` → `s.estado`

2. **`solicitudFechaBandaController.js`** (línea ~1169)
   - Cambiar: `UPDATE solicitudes_fechas_bandas SET estado = ?`
   - A: Usar solo `UPDATE solicitudes SET estado = ?`

3. **Endpoints GET** que filtren por estado:
   - Verificar que leen de `solicitudes.estado`, no de tabla hija
   - Actualizadamente todos OK en auditoría

**Testing:**
```bash
# Verificar que cambios de estado funcionan
curl -X PUT http://localhost:3000/api/admin/solicitudes/bnd_9/estado \
  -H "Authorization: Bearer $JWT" \
  -d '{"estado": "Confirmado"}'

# Verificar que el estado se actualiza correctamente
curl http://localhost:3000/api/solicitudes/9
# Debe mostrar estado='Confirmado'
```

**Rollback Plan:**
```sql
ALTER TABLE solicitudes_alquiler ADD COLUMN estado VARCHAR(50) DEFAULT 'Solicitado' AFTER precio_final;
ALTER TABLE solicitudes_fechas_bandas ADD COLUMN estado VARCHAR(50) DEFAULT 'Solicitado' AFTER actualizado_en;
UPDATE solicitudes_alquiler sa
JOIN solicitudes s ON sa.id_solicitud = s.id_solicitud
SET sa.estado = s.estado;
-- etc...
```

---

### FASE 2: Eliminar `es_publico` de Tablas Hijas (3-5 días)

**Problema:** `es_publico` existe en 3 tablas → Triplicado

**Paso 1: Eliminar columna**

```sql
-- 1. Verificar sincronización antes de eliminar
SELECT s.id_solicitud, s.es_publico, sfb.es_publico
FROM solicitudes s
LEFT JOIN solicitudes_fechas_bandas sfb ON s.id_solicitud = sfb.id_solicitud
WHERE COALESCE(s.es_publico, 0) != COALESCE(sfb.es_publico, 0);
-- Debería retornar 0 filas

-- 2. Eliminar columna
INSERT INTO columnas_eliminadas_audit VALUES (NULL, 'solicitudes_fechas_bandas', 'es_publico', NOW(), 'TRIPLICADO - usar solicitudes.es_publico', (SELECT COUNT(*) FROM solicitudes_fechas_bandas));
ALTER TABLE solicitudes_fechas_bandas DROP COLUMN es_publico;

-- 3. Verificar
DESCRIBE solicitudes_fechas_bandas;
-- No debería mostrar es_publico
```

**Paso 2: Actualizar Opción A Logic**

En `solicitudFechaBandaController.js` (línea ~912):
```javascript
// ANTES:
// Leer de solicitudes_fechas_bandas.es_publico

// DESPUÉS:
const [parentSolicitud] = await conn.query(
    'SELECT es_publico FROM solicitudes WHERE id_solicitud = ?', 
    [idNum]
);
const isPublico = parentSolicitud.es_publico;
```

En `adminController.js` (línea ~268):
```javascript
// ANTES:
// await conn.query('UPDATE solicitudes_fechas_bandas SET es_publico = ?')

// DESPUÉS:
// Solo actualizar solicitudes.es_publico (ya lo hace)
await conn.query('UPDATE solicitudes SET es_publico = 1 WHERE id_solicitud = ?', [realId]);
```

**Testing:**
```bash
# Crear nueva solicitud banda
curl -X POST http://localhost:3000/api/solicitudes \
  -H "Content-Type: application/json" \
  -d '{
    "categoria": "BANDA",
    "id_cliente": 1,
    ...
  }'
# Response: id_solicitud = X

# Confirmar solicitud
curl -X PUT http://localhost:3000/api/admin/solicitudes/bnd_X/estado \
  -H "Authorization: Bearer $JWT" \
  -d '{"estado": "Confirmado"}'

# Verificar que es_publico = 1
curl http://localhost:3000/api/solicitudes/X | jq '.es_publico'
# Debe retornar 1
```

---

### FASE 3: Consolidar Campos `descripcion` (2 días)

**Problema:** `descripcion`, `descripcion_larga` y comentarios duplican información

**Paso 1: Decisión sobre qué campo mantener**

Opción A (Recomendada):
- Mantener: `descripcion_corta` (resumen <255 chars)
- Mantener: `descripcion_larga` (descripción completa)
- Eliminar: `descripcion` en solicitudes
- Eliminar: `comentarios` en solicitudes_alquiler
- Migrar: datos de `descripcion` → `descripcion_larga`

```sql
-- 1. Migrar datos antes de eliminar
UPDATE solicitudes 
SET descripcion_larga = COALESCE(descripcion, descripcion_larga)
WHERE descripcion IS NOT NULL AND descripcion_larga IS NULL;

-- 2. Verificar que no hay datos huérfanos
SELECT COUNT(*) FROM solicitudes WHERE descripcion IS NOT NULL AND descripcion_larga IS NULL;
-- Debería ser 0

-- 3. Eliminar columna redundante
INSERT INTO columnas_eliminadas_audit VALUES (NULL, 'solicitudes', 'descripcion', NOW(), 'DUPLICA descripcion_larga', (SELECT COUNT(*) FROM solicitudes WHERE descripcion IS NOT NULL));
ALTER TABLE solicitudes DROP COLUMN descripcion;

-- 4. Para alquiler: migrar comentarios
UPDATE solicitudes s
JOIN solicitudes_alquiler sa ON s.id_solicitud = sa.id_solicitud
SET s.descripcion_larga = CONCAT(COALESCE(s.descripcion_larga, ''), '\n', COALESCE(sa.comentarios, ''))
WHERE sa.comentarios IS NOT NULL;

ALTER TABLE solicitudes_alquiler DROP COLUMN comentarios;
```

**Controllers:**
- Cambiar todas las referencias de `descripcion` → `descripcion_larga` o `descripcion_corta`
- En API responses: mantener solo uno como `descripcion` (alias)

---

### FASE 4: Simplificar `eventos_confirmados` (Futuro - 2 semanas)

**Problema:** Duplica 8+ campos de solicit udes y tablas hijas

**Opción Recomendada:** Referencias Only (sin campos duplicados)

**No está en el plan inmediato pero propongo para futuro:**

```sql
-- 1. Crear tabla v2 sin duplicados
CREATE TABLE eventos_confirmados_v2 (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_solicitud INT NOT NULL UNIQUE,
    tipo_evento ENUM('ALQUILER_SALON', 'BANDA', 'SERVICIO', 'TALLER') NOT NULL,
    tabla_origen VARCHAR(50) NOT NULL,
    activo TINYINT(1) DEFAULT 1,
    confirmado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    cancelado_en TIMESTAMP NULL,
    FOREIGN KEY (id_solicitud) REFERENCES solicitudes(id_solicitud),
    KEY idx_activo (activo),
    KEY idx_tipo (tipo_evento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Migrar datos
INSERT INTO eventos_confirmados_v2
SELECT id, id_solicitud, tipo_evento, tabla_origen, activo, confirmado_en, actualizado_en, cancelado_en
FROM eventos_confirmados;

-- 3. Swap tables
RENAME TABLE eventos_confirmados TO eventos_confirmados_old;
RENAME TABLE eventos_confirmados_v2 TO eventos_confirmados;

-- 4. Reescribir queries para JOINs
-- Ejemplo query completa:
SELECT 
    ec.id,
    ec.id_solicitud,
    s.descripcion_corta as nombre_evento,
    sfb.fecha_evento,
    sfb.hora_evento,
    s.descripcion_larga as descripcion,
    s.es_publico,
    ec.activo
FROM eventos_confirmados ec
JOIN solicitudes s ON ec.id_solicitud = s.id_solicitud
LEFT JOIN solicitudes_fechas_bandas sfb ON s.id_solicitud = sfb.id_solicitud
WHERE ec.tipo_evento = 'BANDA' AND ec.activo = 1;
```

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

### Antes de Empezar:
- [ ] Backup completo de la BD
- [ ] Documentar estado actual (auditoría de redundancia completada)
- [ ] Crear rama de desarrollo: `feature/normalizacion-tablas`
- [ ] Notificar al equipo del cambio

### Fase 1: Eliminar `estado`
- [ ] Crear migration script SQL
- [ ] Ejecutar en desarrollo + testing
- [ ] Verificar 10+ endpoints que usan estado
- [ ] Deploy a producción
- [ ] Monitorear 24 horas

### Fase 2: Eliminar `es_publico` de hijas
- [ ] Verificar sincronización de datos
- [ ] Actualizar Opción A logic
- [ ] Testing exhaustivo
- [ ] Deploy a producción

### Fase 3: Consolidar `descripcion`
- [ ] Migrar datos
- [ ] Actualizar controllers
- [ ] Testing
- [ ] Deploy

### Fase 4: Simplificar `eventos_confirmados`
- [ ] *Planificar para después de stabilizar fases 1-3*

---

## 🔍 TESTING DESPUÉS DE CADA FASE

```bash
# Script de testing automatizado
#!/bin/bash

echo "Testing Fase 1: Estado"
# Test 1: Crear solicitud
curl -X POST /api/solicitudes ...
# Test 2: Cambiar estado
curl -X PUT /api/admin/solicitudes/bnd_1/estado ...
# Test 3: Verificar sincronización
curl /api/solicitudes/1 | grep estado
# Test 4: Public endpoints
curl /api/solicitudes/publicas | grep confirmado

echo "Testing Fase 2: es_publico"
# Test 1: Crear banda confirmada
curl -X POST /api/solicitudes ...
# Test 2: Confirmar
curl -X PUT /api/admin/solicitudes/bnd_X/estado ...
# Test 3: Verificar en eventos
curl /api/eventos/publicos | grep BANDA
# Test 4: Verificar en solicitudes
curl /api/solicitudes/publicas | grep BANDA

echo "Tests completados"
```

---

## ⚠️ RIESGOS Y MITIGACIÓN

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|---|---|---|
| Query rompe al eliminar columna | 🟡 Media | 🔴 Alto | Backup + testing exhaustivo |
| Aplicación no encuentra columna | 🟡 Media | 🔴 Alto | Actualizar controllers antes de deploy |
| Datos inconsistentes durante migración | 🟠 Bajo | 🟠 Medio | Transaction + rollback plan |
| Performance baja con JOINs | 🟡 Media | 🟡 Medio | Índices en FKs + caching |

---

## 💰 ESTIMACIÓN DE RECURSOS

| Fase | Desarrollo | Testing | Documentación | Total |
|------|---|---|---|---|
| **Fase 1** | 1 día | 1 día | 0.5 día | **2.5 días** |
| **Fase 2** | 1 día | 1 día | 0.5 día | **2.5 días** |
| **Fase 3** | 0.5 día | 1 día | 0.5 día | **2 días** |
| **Fase 4** | 3 días | 3 días | 1 día | **7 días** |
| | | | **TOTAL** | **~14 días** |

---

## 📞 SIGUIENTE PASO

1. **Revisar este plan** con el equipo
2. **Acordar timeline**: ¿Empezamos esta semana?
3. **Crear branch**: `git checkout -b feature/normalizacion-tablas`
4. **Ejecutar Fase 1** step-by-step
5. **Validar** en desarrollo antes de PRoducción

---

**Documentos de referencia:**
- `ANALISIS_RELACIONAL_DETALLADO.md` - Análisis completo
- `DIAGRAMA_MODEL_RELACIONAL.md` - Visualización
- `ANALISIS_REDUNDANCIA_TABLAS.md` - Detalles previos

¿Empezamos con Fase 1?

