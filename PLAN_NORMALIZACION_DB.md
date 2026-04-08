# Plan de Normalización de Base de Datos — TDC API REST

> Fecha: 27/03/2026  
> Estado actual: **Fase 1 en progreso**

---

## Diagnóstico: Duplicaciones identificadas

### Mapa de redundancias

```
solicitudes (padre)
├── estado               ← 🔴 DUPLICADO en solicitudes_alquiler y solicitudes_fechas_bandas
├── descripcion TEXT     ← 🔴 LEGACY (ya existen descripcion_corta + descripcion_larga)
├── descripcion_corta ✓
├── descripcion_larga ✓
├── url_flyer ✓
├── es_publico ✓
├── id_cliente ✓
└── fecha_creacion / actualizado_en ✓

solicitudes_alquiler (hija)
├── id_solicitud → FK padre ✓
├── fecha_evento, hora_evento TIME, duracion INT ✓ específicos
├── id_tipo_evento, id_precio_vigencia, cantidad_personas ✓ específicos
├── precio_basico, total_adicionales, precio_final ✓ específicos
├── estado VARCHAR(50)    ← 🔴 DUPLICADO de solicitudes.estado
├── creado_en TIMESTAMP   ← 🟡 DUPLICADO de solicitudes.fecha_creacion
└── actualizado_en TIMESTAMP ← 🟡 DUPLICADO de solicitudes.actualizado_en

solicitudes_fechas_bandas (hija)
├── id_solicitud → FK padre ✓
├── fecha_evento, hora_evento VARCHAR(20) ← 🟠 TIPO incorrecto (debería TIME)
├── duracion VARCHAR(100) ← 🟠 TIPO incorrecto (debería INT minutos)
├── descripcion TEXT      ← 🔴 DUPLICADO de solicitudes.descripcion_larga
├── estado VARCHAR(50)    ← 🔴 DUPLICADO de solicitudes.estado
├── creado_en TIMESTAMP   ← 🟡 DUPLICADO de solicitudes.fecha_creacion
└── actualizado_en TIMESTAMP ← 🟡 DUPLICADO de solicitudes.actualizado_en

solicitudes_servicios (hija — subdesarrollada)
├── hora_evento VARCHAR(20) ← 🟠 TIPO incorrecto
└── duracion VARCHAR(100)   ← 🟠 TIPO incorrecto

solicitudes_talleres (hija — subdesarrollada)
├── hora_evento VARCHAR(20) ← 🟠 TIPO incorrecto
└── duracion VARCHAR(100)   ← 🟠 TIPO incorrecto

eventos_confirmados
├── id_solicitud → FK ✓ (el único link necesario)
├── nombre_evento ✓ (único campo propio)
├── activo ✓
├── confirmado_en ✓
├── cancelado_en ✓
│
├── tipo_evento      ← 🔴 derivable de solicitudes.categoria
├── tabla_origen     ← 🔴 derivable de solicitudes.categoria
├── descripcion      ← 🔴 DUPLICADO de solicitudes.descripcion_larga
├── url_flyer        ← 🔴 DUPLICADO de solicitudes.url_flyer
├── fecha_evento     ← 🔴 DUPLICADO de solicitudes_*.fecha_evento
├── hora_inicio      ← 🔴 DUPLICADO de solicitudes_*.hora_evento
├── duracion_estimada ← 🔴 DUPLICADO de solicitudes_*.duracion
├── id_cliente       ← 🔴 DUPLICADO de solicitudes.id_cliente
├── es_publico       ← 🔴 DUPLICADO de solicitudes.es_publico
├── genero_musical   ← 🔴 derivable de bandas_artistas.genero_musical
├── cantidad_personas ← 🔴 derivable de solicitudes_alquiler.cantidad_personas
├── tipo_servicio    ← 🔴 derivable de solicitudes_servicios
└── nombre_taller    ← 🔴 derivable de solicitudes_talleres
```

---

## Tabla de decisión

| Columna | Tabla | Diagnóstico | Acción |
|---|---|---|---|
| `estado` | `solicitudes_alquiler` | DUPLICADO | **ELIMINAR** |
| `estado` | `solicitudes_fechas_bandas` | DUPLICADO | **ELIMINAR** |
| `descripcion` | `solicitudes` | LEGACY | **ELIMINAR** |
| `descripcion` | `solicitudes_fechas_bandas` | DUPLICADO | **MIGRAR → `solicitudes.descripcion_larga`** |
| `creado_en` | `solicitudes_alquiler` | DUPLICADO | **ELIMINAR** |
| `actualizado_en` | `solicitudes_alquiler` | DUPLICADO | **ELIMINAR** |
| `creado_en` | `solicitudes_fechas_bandas` | DUPLICADO | **ELIMINAR** |
| `actualizado_en` | `solicitudes_fechas_bandas` | DUPLICADO | **ELIMINAR** |
| `hora_evento VARCHAR(20)` | `solicitudes_fechas_bandas` | TIPO incorrecto | **Fase 2: cambiar a TIME** |
| `duracion VARCHAR(100)` | `solicitudes_fechas_bandas` | TIPO incorrecto | **Fase 2: cambiar a INT** |
| `fecha_evento`, `hora_*`, `duracion_*` | `solicitudes` padre | AUSENTES | **Fase 2: AGREGAR al padre** |
| ≥12 campos | `eventos_confirmados` | DUPLICADOS | **Fase 3: ELIMINAR + crear vista** |

---

## Fase 1 — Limpieza de duplicados directos ✅

> **Riesgo**: Bajo-Medio  
> **Requiere**: Backup previo + actualización de controllers

### 1.1 Eliminar `estado` de tablas hijo

**Motivo**: `solicitudes.estado` es la fuente de verdad única.  
Hoy ambas tablas pueden divergir si una actualización falla parcialmente.

**Acción en DB**:
```sql
ALTER TABLE solicitudes_alquiler DROP COLUMN estado;
ALTER TABLE solicitudes_fechas_bandas DROP COLUMN estado;
```

**Acción en código**: Todas las referencias a `sa.estado` o `sfb.estado` pasan a leer `s.estado` / `sol.estado` (desde el JOIN con `solicitudes`).

**Archivos afectados**:
- `backend/controllers/opcionesController.js` (L206, L241)
- `backend/controllers/solicitudController.js` (L241, L291, L501, L572, L805, L1643, L1777)
- `backend/controllers/solicitudFechaBandaController.js` (L338, L432, L451)
- `backend/controllers/eventosController.js` (L77)

### 1.2 Eliminar `descripcion TEXT` legacy de `solicitudes`

**Motivo**: Campo obsoleto. Ya existen `descripcion_corta` y `descripcion_larga`.  
El contenido del campo se migra a `descripcion_larga` si el registro no tiene valor allí.

**Acción en DB**:
```sql
UPDATE solicitudes
SET descripcion_larga = descripcion
WHERE descripcion IS NOT NULL AND descripcion != '' AND (descripcion_larga IS NULL OR descripcion_larga = '');

ALTER TABLE solicitudes DROP COLUMN descripcion;
```

**Archivos afectados**:
- `backend/controllers/adminController.js` (L50 — aquí `s` es `solicitudes_fechas_bandas`, ver 1.3)
- `backend/controllers/solicitudController.js` (L804)

### 1.3 Consolidar `solicitudes_fechas_bandas.descripcion` → `solicitudes.descripcion_larga`

**Motivo**: `sfb.descripcion` contiene la descripción del show, mismo dato que `solicitudes.descripcion_larga`.  
El comentario en adminController confirma que es el sustituto de `descripcion_corta` del padre.

**Acción en DB**:
```sql
UPDATE solicitudes s
JOIN solicitudes_fechas_bandas sfb ON sfb.id_solicitud = s.id_solicitud
SET s.descripcion_larga = sfb.descripcion
WHERE sfb.descripcion IS NOT NULL AND sfb.descripcion != ''
  AND (s.descripcion_larga IS NULL OR s.descripcion_larga = '');

ALTER TABLE solicitudes_fechas_bandas DROP COLUMN descripcion;
```

**Archivos afectados** (cambiar `sfb.descripcion` → `sol.descripcion_larga`):
- `backend/controllers/solicitudFechaBandaController.js` (L232, L336, L428, L966, L1104)
- `backend/controllers/solicitudController.js` (L290, L571, L1642)
- `backend/controllers/adminController.js` (L50)
- `backend/controllers/eventosController.js` (L77 área)

### 1.4 Eliminar timestamps duplicados de tablas hijo

**Motivo**: `solicitudes.fecha_creacion` y `solicitudes.actualizado_en` ya registran estos datos.

**Acción en DB**:
```sql
ALTER TABLE solicitudes_alquiler
  DROP COLUMN creado_en,
  DROP COLUMN actualizado_en;

ALTER TABLE solicitudes_fechas_bandas
  DROP COLUMN creado_en,
  DROP COLUMN actualizado_en;
```

**Archivos afectados**:
- `backend/controllers/eventosController.js` (L78): cambiar `sfb.creado_en/actualizado_en` → `sol.fecha_creacion/actualizado_en`
- `backend/controllers/solicitudFechaBandaController.js` (L341, L342, L440): ídem

---

## Fase 2 — Mover campos comunes al padre + estandarizar tipos 🔜

> **Riesgo**: Medio  
> **Requiere**: Migración de datos + refactor de controllers + frontend

### 2.1 Agregar campos de evento al padre `solicitudes`

```sql
ALTER TABLE solicitudes
  ADD COLUMN fecha_evento      DATE     DEFAULT NULL AFTER descripcion_larga,
  ADD COLUMN hora_inicio       TIME     DEFAULT NULL AFTER fecha_evento,
  ADD COLUMN duracion_minutos  INT      DEFAULT NULL COMMENT 'en minutos' AFTER hora_inicio,
  ADD COLUMN hora_fin          TIME     DEFAULT NULL AFTER duracion_minutos,
  ADD COLUMN fecha_alternativa DATE     DEFAULT NULL AFTER hora_fin;
```

### 2.2 Migrar datos de tablas hijo al padre

```sql
-- Desde solicitudes_alquiler
UPDATE solicitudes s
JOIN solicitudes_alquiler sa ON sa.id_solicitud = s.id_solicitud
SET s.fecha_evento     = sa.fecha_evento,
    s.hora_inicio      = sa.hora_evento,
    s.duracion_minutos = sa.duracion;

-- Desde solicitudes_fechas_bandas (con conversión de tipos)
UPDATE solicitudes s
JOIN solicitudes_fechas_bandas sfb ON sfb.id_solicitud = s.id_solicitud
SET s.fecha_evento      = sfb.fecha_evento,
    s.hora_inicio       = TIME(sfb.hora_evento),
    s.duracion_minutos  = CAST(sfb.duracion AS UNSIGNED),
    s.fecha_alternativa = sfb.fecha_alternativa;
```

### 2.3 Estandarizar tipos en tablas hijo que quedan

```sql
ALTER TABLE solicitudes_fechas_bandas
  MODIFY COLUMN hora_evento TIME DEFAULT NULL,
  MODIFY COLUMN duracion INT DEFAULT NULL COMMENT 'en minutos';

ALTER TABLE solicitudes_servicios
  MODIFY COLUMN hora_evento TIME DEFAULT NULL,
  MODIFY COLUMN duracion INT DEFAULT NULL;

ALTER TABLE solicitudes_talleres
  MODIFY COLUMN hora_evento TIME DEFAULT NULL,
  MODIFY COLUMN duracion INT DEFAULT NULL;
```

---

## Fase 3 — Adelgazar `eventos_confirmados` 🔜

> **Riesgo**: Alto  
> **Requiere**: Refactor completo de routes/controllers de eventos + crear vista

### Estructura objetivo

```sql
CREATE TABLE eventos_confirmados (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    id_solicitud    INT NOT NULL,           -- todo lo demás llega por JOIN
    nombre_evento   VARCHAR(255) NOT NULL,  -- único campo propio display
    activo          TINYINT(1) DEFAULT 1,
    confirmado_en   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cancelado_en    TIMESTAMP NULL,
    actualizado_en  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_solicitud (id_solicitud),
    FOREIGN KEY (id_solicitud) REFERENCES solicitudes(id_solicitud) ON DELETE CASCADE
);
```

### Vista de compatibilidad (no rompe código existente)

```sql
CREATE OR REPLACE VIEW v_eventos_confirmados_full AS
SELECT
    ec.id,
    ec.id_solicitud,
    ec.nombre_evento,
    ec.activo,
    ec.confirmado_en,
    ec.cancelado_en,
    s.categoria         AS tipo_evento,
    s.fecha_evento,
    s.hora_inicio,
    s.duracion_minutos,
    s.url_flyer,
    s.descripcion_corta,
    s.descripcion_larga,
    s.es_publico,
    s.id_cliente,
    CONCAT(c.nombre, ' ', COALESCE(c.apellido,'')) AS cliente_nombre,
    ba.genero_musical
FROM eventos_confirmados ec
JOIN solicitudes s          ON s.id_solicitud  = ec.id_solicitud
JOIN clientes c             ON c.id_cliente    = s.id_cliente
LEFT JOIN solicitudes_fechas_bandas sfb ON sfb.id_solicitud = s.id_solicitud
LEFT JOIN bandas_artistas ba             ON ba.id_banda      = sfb.id_banda;
```

### Columnas a eliminar de `eventos_confirmados`

```sql
ALTER TABLE eventos_confirmados
  DROP COLUMN tipo_evento,
  DROP COLUMN tabla_origen,
  DROP COLUMN descripcion,
  DROP COLUMN url_flyer,
  DROP COLUMN fecha_evento,
  DROP COLUMN hora_inicio,
  DROP COLUMN duracion_estimada,
  DROP COLUMN id_cliente,
  DROP COLUMN es_publico,
  DROP COLUMN genero_musical,
  DROP COLUMN cantidad_personas,
  DROP COLUMN tipo_servicio,
  DROP COLUMN nombre_taller;
```

---

## Log de cambios

| Fecha | Fase | Acción | Estado |
|-------|------|--------|--------|
| 27/03/2026 | 1 | Análisis y documentación | ✅ |
| 27/03/2026 | 1 | Backup BD (`mysqldump_fase1_pre_*.sql`) | ✅ |
| 27/03/2026 | 1 | Migración SQL ejecutada (`migrate_fase1_normalizacion.sql`) | ✅ |
| 27/03/2026 | 1 | Código actualizado (5 controllers) | ✅ |
| 27/03/2026 | 1 | Schema `01_schema.sql` sincronizado | ✅ |
