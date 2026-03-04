# 📊 ANÁLISIS RELACIONAL COMPLETO - Tablas TDC API

**Fecha:** 2 de Marzo 2026  
**Objetivo:** Identificar redundancias, campos duplicados y proponer modelo normalizado

---

## 📋 PARTE 1: Estructura Actual de Todas las Tablas

### 🔴 Tabla PADRE: `solicitudes` (Tabla Central)

**Propósito:** Tabla madre que registra TODAS las solicitudes de cualquier categoría

| Campo | Tipo | Posición | PK | FK | Comentario |
|-------|------|----------|----|----|-----------|
| `id_solicitud` | INT | 1 | ✓ | - | ID único de solicitud |
| `categoria` | ENUM(ALQUILER, BANDA, SERVICIO, TALLER) | 2 | - | - | Categoría del evento |
| `id_cliente` | INT | 3 | - | ✓ clientes | Quién solicitó |
| `id_usuario_creador` | INT | 4 | - | ✓ usuarios | Admin/Staff que registró |
| `fecha_creacion` | TIMESTAMP | 5 | - | - | Cuándo se creó |
| `estado` | VARCHAR | 6 | - | - | **CRÍTICO:** Solicitado/Contactado/Confirmado/Cancelado |
| `es_publico` | TINYINT(1) | 7 | - | - | **REDUNDANTE:** Visibilidad pública |
| `descripcion_corta` | VARCHAR | 8 | - | - | Resumen corto |
| `descripcion_larga` | TEXT | 9 | - | - | Descripción extendida |
| `url_flyer` | MEDIUMTEXT | 10 | - | - | URL del flyer/cartel |
| `descripcion` | TEXT | 11 | - | - | **REDUNDANTE:** Duplica descripcion_larga |
| `actualizado_en` | TIMESTAMP | 12 | - | - | Auditoría |

**Problemas Identificados:**
- ⚠️ `descripcion_larga` y `descripcion` son prácticamente lo mismo (una debería eliminarse)
- ⚠️ `es_publico` está también en `solicitudes_fechas_bandas` y `eventos_confirmados` (triplicado)
- ⚠️ `estado` está también en tablas hijas (duplicación innecesaria)

---

### 🟠 Tabla HIJA: `solicitudes_alquiler` (Alquiler de Salón)

**Propósito:** Específicos para eventos tipo alquiler

**FK a solicitudes:** `id_solicitud` → `solicitudes.id_solicitud` (1:1)

| Campo | Tipo | Redundancia | Estado | Necesario |
|-------|------|-------------|--------|-----------|
| `id_solicitud_alquiler` | INT (PK) | - | ✓ Específico | ✓ |
| `id_solicitud` | INT (FK) | - | ✓ Link padre | ✓ |
| `fecha_evento` | DATE | ✓ DUPLICADO | Existe en tabla padre | ⚠️ |
| `hora_evento` | TIME | ✓ DUPLICADO | No existe en padre | ✓ Necesario |
| `duracion` | INT | ✓ DUPLICADO | No existe en padre | ✓ Necesario |
| `id_tipo_evento` | VARCHAR | - | FK a opciones_tipos | ✓ |
| `id_precio_vigencia` | INT | - | FK a precios_vigencia | ✓ |
| `precio_basico` | DECIMAL | ✓ DUPLICADO | No existe en padre | ⚠️ Podría estar en padre |
| `total_adicionales` | DECIMAL | - | Suma de adicionales | ✓ |
| `monto_sena` | DECIMAL | - | Seña requerida | ✓ |
| `monto_deposito` | DECIMAL | - | Depósito garantía | ✓ |
| `precio_final` | DECIMAL | - | Total calculado | ✓ |
| `comentarios` | TEXT | ✓ DUPLICADO | Ver `descripcion_*` en padre | ⚠️ |
| `estado` | VARCHAR | ✓ REDUNDANTE | Existe en solicitudes | ❌ ELIMINAR |
| `creado_en` | TIMESTAMP | - | Auditoría | ✓ |
| `actualizado_en` | TIMESTAMP | - | Auditoría | ✓ |

**Diagnóstico:** 
- ❌ `estado` es **redundante** (existe en tabla padre)
- ⚠️ `fecha_evento`, `duracion` podrían estar en padre pero no es crítico en tablas hijas

---

### 🟠 Tabla HIJA: `solicitudes_fechas_bandas` (Alquiler para Bandas)

**Propósito:** Específicos para eventos tipo banda/música

**FK a solicitudes:** `id_solicitud` → `solicitudes.id_solicitud` (1:1)

| Campo | Tipo | Redundancia | Estado | Necesario |
|-------|------|-------------|--------|-----------|
| `id_solicitud` | INT (PK) | - | Link padre | ✓ |
| `id_banda` | INT | - | FK a bandas_artistas | ✓ |
| `fecha_evento` | DATE | ✓ DUPLICADO | Podría estar en padre | ⚠️ |
| `hora_evento` | VARCHAR | ✓ DUPLICADO | Podría estar en padre | ⚠️ |
| `duracion` | VARCHAR | ✓ DUPLICADO | Podría estar en padre | ⚠️ |
| `descripcion` | TEXT | ✓ REDUNDANTE | Existe en solicitudes | ❌ O MIGRAR |
| `precio_basico` | DECIMAL | ✓ DUPLICADO | No en padre | ⚠️ |
| `precio_final` | DECIMAL | ✓ DUPLICADO | No en padre | ⚠️ |
| `precio_anticipada` | DECIMAL | - | Precio anticipado | ✓ |
| `precio_puerta` | DECIMAL | - | Precio en puerta | ✓ |
| `cantidad_bandas` | INT | - | Cantidad de bandas | ✓ |
| `expectativa_publico` | VARCHAR | - | Estimación público | ✓ |
| `bandas_json` | LONGTEXT | - | Array de bandas | ✓ |
| `estado` | VARCHAR | ✓ REDUNDANTE | Existe en solicitudes | ❌ ELIMINAR |
| `fecha_alternativa` | DATE | - | Opción alternativa | ✓ |
| `notas_admin` | TEXT | - | Notas internas | ✓ |
| `id_evento_generado` | INT | - | FK a eventos_confirmados | ✓ |
| `creado_en` | TIMESTAMP | - | Auditoría | ✓ |
| `actualizado_en` | TIMESTAMP | - | Auditoría | ✓ |
| `es_publico` | TINYINT(1) | ✓ TRIPLICADO | En solicitudes + eventos_confirmados | ❌ ELIMINAR |

**Diagnóstico:**
- ❌ `estado` es **redundante** (existe en tabla padre)
- ❌ `es_publico` es **triplicado** (solicitudes + this + eventos_confirmados)
- ⚠️ `descripcion` debería estar en padre o unificarse

---

### 🟠 Tabla HIJA: `solicitudes_servicios` (Servicios Varios)

**Propósito:** Servicios (depilación, etc.)

**FK a solicitudes:** `id_solicitud` → `solicitudes.id_solicitud` (1:1)

| Campo | Tipo | Redundancia |
|-------|------|-------------|
| `id_solicitud_servicio` | INT (PK) | ✓ Innecesario (usar id_solicitud como PK) |
| `id_solicitud` | INT (FK) | ✓ |
| `tipo_servicio` | VARCHAR | ⚠️ |
| `fecha_evento` | DATE | ⚠️ Duplicado potencial |
| `hora_evento` | VARCHAR | ⚠️ Duplicado potencial |
| `duracion` | VARCHAR | ⚠️ Duplicado potencial |
| `precio` | DECIMAL | ⚠️ Duplicado potencial |

**Diagnóstico:**
- ❌ Tiene PK propia (`id_solicitud_servicio`) cuando debería usar `id_solicitud`
- ⚠️ Todos los campos de evento podrían centralizarse en padre

---

### 🟠 Tabla HIJA: `solicitudes_talleres` (Talleres y Actividades)

**Estructura similar a servicios**

| Campo | Tipo | Redundancia |
|-------|------|-------------|
| `id_solicitud_taller` | INT (PK) | ❌ Innecesario |
| `id_solicitud` | INT (FK) | ✓ |
| `nombre_taller` | VARCHAR | ⚠️ |
| `fecha_evento` | DATE | ⚠️ Duplicado |
| `hora_evento` | VARCHAR | ⚠️ Duplicado |
| `duracion` | VARCHAR | ⚠️ Duplicado |
| `precio` | DECIMAL | ⚠️ Duplicado |

---

### 🟢 Tabla: `eventos_confirmados` (Eventos Ya Confirmados)

**Propósito:** Registro de eventos que ya fueron confirmados y harán visible

**FK a solicitudes:** `id_solicitud` → `solicitudes.id_solicitud` (N:1, pero prácticamente 1:1)

| Campo | Tipo | Redundancia | CRÍTICO |
|-------|------|-------------|---------|
| `id` | INT (PK) | - | ✓ |
| `id_solicitud` | INT (FK) | - | ✓ |
| `tipo_evento` | ENUM | - | ✓ |
| `tabla_origen` | VARCHAR | - | ✓ Referencia a tabla hija |
| `nombre_evento` | VARCHAR | ✓ DUPLICADO | Existe en solicitudes/hijas |
| `descripcion` | TEXT | ✓ TRIPLICADO | Existe en solicitudes + hijas |
| `url_flyer` | VARCHAR | ✓ TRIPLICADO | Existe en solicitudes |
| `fecha_evento` | DATE | ✓ TRIPLICADO | Existe en solicitudes + hijas |
| `hora_inicio` | TIME | ✓ TRIPLICADO | Existe en solicitudes + hijas |
| `duracion_estimada` | VARCHAR | ✓ TRIPLICADO | Existe en solicitudes + hijas |
| `id_cliente` | INT | ✓ REDUNDANTE | Existe en solicitudes |
| `es_publico` | TINYINT | ✓ TRIPLICADO | Exists in 2+ tables |
| `activo` | TINYINT | - | ✓ |
| `genero_musical` | VARCHAR | - | Solo BANDA |
| `cantidad_personas` | INT | - | Solo BANDA/ALQUILER |
| `tipo_servicio` | VARCHAR | - | Solo SERVICIO |
| `nombre_taller` | VARCHAR | - | Solo TALLER |
| `confirmado_en` | TIMESTAMP | - | ✓ |
| `actualizado_en` | TIMESTAMP | - | ✓ |
| `cancelado_en` | TIMESTAMP | - | ✓ |

**Problema Crítico:**
- ❌ `eventos_confirmados` duplica **8+ campos** de `solicitudes` y tablas hijas
- ❌ `es_publico` existe en 3 tablas diferentes (solicitudes, solicitudes_fechas_bandas, eventos_confirmados)
- ⚠️ `fecha_evento` con valores inconsistentes (vimos 2026-03-03 vs 2026-03-15)
- ⚠️ Causa sincronización problemática (como el evento 9 que vimos)

---

## 📈 PARTE 2: Matriz de Redundancia Cruzada

### Campos Duplicados Identificados:

| **Campo** | `solicitudes` | `solicitudes_alquiler` | `solicitudes_fechas_bandas` | `solicitudes_servicios` | `solicitudes_talleres` | `eventos_confirmados` | Redundancia |
|-----------|--|--|--|--|--|--|:-------:|
| **estado** | ✓ | ✓ | ✓ | - | - | - | ⚠️⚠️⚠️ |
| **es_publico** | ✓ | - | ✓ | - | - | ✓ | ⚠️⚠️⚠️ |
| **fecha_evento** | - | ✓ | ✓ | ✓ | ✓ | ✓ | ⚠️⚠️⚠️⚠️ |
| **hora_evento** | - | ✓ | ✓ | ✓ | ✓ | ✓ (hora_inicio) | ⚠️⚠️⚠️⚠️ |
| **duracion** | - | ✓ | ✓ | ✓ | ✓ | ✓ (duracion_est) | ⚠️⚠️⚠️⚠️ |
| **descripcion** | ✓⚠️ | ✓ (comentarios) | ✓ | - | - | ✓ | ⚠️⚠️⚠️ |
| **precio_basico** | - | ✓ | ✓ | - | - | - | ⚠️⚠️ |
| **precio** | - | ✓ (precio_basico) | ✓ | ✓ | ✓ | - | ⚠️⚠️ |
| **nombre_evento** | ✓ (descripcion_corta) | - | - | - | ✓ (nombre_taller) | ✓ | ⚠️⚠️⚠️ |
| **id_cliente** | ✓ | - | - | - | - | ✓ | ⚠️⚠️ |
| **url_flyer** | ✓ | - | - | - | - | ✓ | ⚠️⚠️ |

**Resumen:** 
- 🔴 **11 campos duplicados** identificados
- 🟠 **8 campos con duplicación CRÍTICA** (3+ tablas)
- 🟡 **3 campos con redundancia MODERADA** (2 tablas)

---

## 🏗️ PARTE 3: Propuestas de Consolidación

### ✅ **SOLUCIÓN A: Normalización Gradual (Recomendada)**

**Objetivo:** Eliminar redundancias sin refactorizar toda la aplicación

#### Fase 1: Eliminar campos claramente redundantes

```sql
-- 1. Eliminar 'estado' de tablas hijas
ALTER TABLE solicitudes_alquiler DROP COLUMN estado;
ALTER TABLE solicitudes_fechas_bandas DROP COLUMN estado;

-- 2. Eliminar 'es_publico' de solicitudes_fechas_bandas
ALTER TABLE solicitudes_fechas_bandas DROP COLUMN es_publico;

-- 3. Unificar 'descripcion' en padre
-- Migrar solicitudes_alquiler.comentarios → solicitudes.descripcion_larga
-- Migrar solicitudes_fechas_bandas.descripcion → solicitudes.descripcion_larga
-- Eliminar una de descripcion_larga/descripcion en solicitudes
```

**Impacto:**
- ✓ Reducción de duplicación
- ✓ Menor costo de sincronización
- ✓ Cambios mínimos en controllers (solo lecturas, no escrituras)
- ❌ Requiere migración de datos

#### Fase 2: Simplificar `eventos_confirmados`

```sql
-- En lugar de duplicar datos, solo guardar referencias
CREATE TABLE eventos_confirmados_v2 AS
SELECT 
    id,
    id_solicitud,
    tipo_evento,
    tabla_origen,
    activo,
    confirmado_en,
    actualizado_en,
    cancelado_en
FROM eventos_confirmados;

-- Los datos se leen ON-THE-FLY desde solicitudes + hija correspondiente
-- Ejemplo query:
SELECT 
    ec.id,
    s.descripcion_corta as nombre_evento,
    sfb.fecha_evento,
    sfb.hora_evento,
    s.es_publico,
    s.url_flyer
FROM eventos_confirmados ec
JOIN solicitudes s ON ec.id_solicitud = s.id_solicitud
LEFT JOIN solicitudes_fechas_bandas sfb ON s.id_solicitud = sfb.id_solicitud
WHERE ec.tipo_evento = 'BANDA' AND ec.activo = 1
```

**Impacto:**
- ✓ Elimina 8 columnas redundantes de eventos_confirmados
- ✓ Fuente única de verdad para cada dato
- ✓ Sincronización garantizada (no hay copia)
- ❌ Operaciones de lectura más lentas (requiere JOINs)
- ⚠️ Requiere reescritura de queries de lectura

#### Fase 3: Consolidar tablas de tipo-evento

```sql
-- Opción A: Mantener tablas separadas pero con PK uniforme
-- Cambiar solicitudes_servicios, solicitudes_talleres:
-- De: id_solicitud_servicio (PK) → id_solicitud (PK)
ALTER TABLE solicitudes_servicios DROP PRIMARY KEY;
ALTER TABLE solicitudes_servicios ADD PRIMARY KEY (id_solicitud);
ALTER TABLE solicitudes_servicios DROP COLUMN id_solicitud_servicio;

-- Opción B: Crear tabla única 'eventos_solicitados'
CREATE TABLE eventos_solicitados (
    id_solicitud INT PRIMARY KEY,
    fecha_evento DATE,
    hora_evento TIME,
    duracion INT,
    precio_base DECIMAL(10,2),
    precio_final DECIMAL(10,2),
    FOREIGN KEY (id_solicitud) REFERENCES solicitudes(id_solicitud)
);
-- Luego migrar todos los solicitudes_* a esta tabla
```

---

### ✅ **SOLUCIÓN B: Modelo Consolidado (Refactorización Mayor)**

**Objetivo:** Crear esquema completamente normalizado

```
┌─────────────────────────────────────────────────────────────┐
│ MODELO CONSOLIDADO PROPUESTO                                │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│ SOLICITUDES          │ (Nueva)
├──────────────────────┤
│ id_solicitud (PK)    │
│ id_cliente (FK)      │
│ id_usuario_creador   │
│ categoria            │
│ estado               │
│ es_publico           │
│ descripcion_corta    │
│ descripcion_larga    │
│ url_flyer            │
│ fecha_creacion       │
│ actualizado_en       │
└──────────────────────┘
         │
         │ 1:1
         ├─────────────────────────────────────┐
         │                                     │
         ▼                                     ▼
┌──────────────────┐              ┌──────────────────────┐
│ EVENTOS_DATOS    │              │ BANDAS_DATOS         │
├──────────────────┤              ├──────────────────────┤
│ id_solicitud(PK) │              │ id_solicitud (PK)    │
│ fecha_evento     │              │ id_banda             │
│ hora_evento      │              │ cantidad_bandas      │
│ duracion_minutos │              │ precio_anticipada    │
│ precio_base      │              │ precio_puerta        │
│ precio_final     │              │ expectativa_publico  │
└──────────────────┘              │ bandas_json          │
                                  │ fecha_alternativa    │
                                  └──────────────────────┘

┌──────────────────────────────────┐
│ EVENTOS_CONFIRMADOS (Simplificado)│
├──────────────────────────────────┤
│ id (PK)                          │
│ id_solicitud (FK)                │
│ tipo_evento                      │
│ activo                           │
│ confirmado_en                    │
│ actualizado_en                   │
│ cancelado_en                     │
└──────────────────────────────────┘
     │ JOIN
     └─→ Lee datos de solicitudes + tabla específica
```

**Ventajas:**
- ✓ Sin redundancia
- ✓ Sincronización automática (una sola fuente)
- ✓ Schema más limpio

**Desventajas:**
- ❌ Refactorización COMPLETA de todoslos controllers
- ❌ Alto riesgo de introducir bugs
- ❌ Requiere cambios en queries de lectura

---

## 🎯 PARTE 4: Análisis de Impacto por Opción

### **Opción A: Normalización Gradual**

| Aspecto | Impacto |
|---------|---------|
| **Esfuerzo** | Bajo-Medio (3-5 días) |
| **Riesgo** | Bajo (cambios incrementales) |
| **Complejidad** | Media (algunas queries nuevas) |
| **Beneficio** | Alto (elimina 50% redundancia) |
| **Timing** | Puede hacerse en paralelo |
| **Recomendación** | ✅ **HACER PRIMERO** |

**Pasos:**
1. Eliminar columnas `estado` de hijas
2. Eliminar `es_publico` de `solicitudes_fechas_bandas`
3. Crear migration script SQL
4. Testar endpoints
5. Deploy

---

### **Opción B: Consolidación Total**

| Aspecto | Impacto |
|---------|---------|
| **Esfuerzo** | Alto (2-3 semanas) |
| **Riesgo** | Alto (cambios estructurales) |
| **Complejidad** | Alta (queryes complejas) |
| **Beneficio** | Muy Alto (schema perfecto) |
| **Timing** | Requiere pausa en desarrollo |
| **Recomendación** | ⏱️ **PLANIFICAR FUTURO** |

**Pasos:**
1. Crear tablas nuevas (dual-write)
2. Migrar datos históricos
3. Reescribar todos los controllers
4. Testing completo
5. Eliminar tablas antiguas

---

## 🔴 PARTE 5: Campos Críticos a NO Eliminar

**Estos campos DEBEN mantenerse donde están:**

| Campo | Tabla(s) | Motivo |
|-------|----------|--------|
| `fecha_evento` | hijas (alquiler, banda, servicio, taller) | Info específica del evento exacto |
| `hora_evento` | hijas | Hora específica del evento |
| `duracion` | hijas | Duración específica |
| `precio_basico` | hijas | Cálculo basado en categoría |
| `precio_final` | hijas | Calculado con adicionales |
| `cantidad_bandas` | solicitudes_fechas_bandas | Específico de bandas |
| `bandas_json` | solicitudes_fechas_bandas | Array de bandas solicitantes |
| `id_evento_generado` | solicitudes_fechas_bandas | Link a evento_confirmado |

---

## ⚡ RECOMENDACIÓN FINAL

### **Plan Inmediato (Esta Semana):**

1. **Crear documento de migración** para ir a Opción A gradualmente
2. **Fase 1 - Semana 1:** 
   - Eliminar `estado` de `solicitudes_alquiler` y `solicitudes_fechas_bandas`
   - Actualizar controllers para leer de `solicitudes.estado` en lugar de tabla hija
3. **Fase 2 - Semana 2:**
   - Eliminar `es_publico` de `solicitudes_fechas_bandas`
   - Actualizar Opción A logic para usar solo `solicitudes.es_publico`
4. **Fase 3 - Semana 3:**
   - Unificar campo `descripcion` (elegir entre `descripcion_larga` vs `descripcion`)
   - Eliminar columnas redundantes

### **Plan Largo Plazo (Próximos 3-6 meses):**

Evaluar Opción B después de estabilizar el sistema actual. El costo será alto pero el beneficio también (schema limpio, queries más simples, menos bugs de sincronización).

---

## 📝 Scripts de Validación

Para verificar integridad durante migración:

```sql
-- Verificar que 'estado' en solicitudes siempre coincida con sus hijas:
SELECT s.id_solicitud, s.estado as padre_estado, sab.estado as alquiler_estado
FROM solicitudes s
LEFT JOIN solicitudes_alquiler sab ON s.id_solicitud = sab.id_solicitud
WHERE s.estado != sab.estado AND sab.id_solicitud IS NOT NULL;

-- Verificar que 'es_publico' siempre coincida:
SELECT s.id_solicitud, s.es_publico as padre, sfb.es_publico as banda, ec.es_publico as evento
FROM solicitudes s
LEFT JOIN solicitudes_fechas_bandas sfb ON s.id_solicitud = sfb.id_solicitud
LEFT JOIN eventos_confirmados ec ON s.id_solicitud = ec.id_solicitud
WHERE s.es_publico != sfb.es_publico OR s.es_publico != ec.es_publico;
```

---

## 🎓 Conclusión

**La redundancia actual es SIGNIFICATIVA pero CONTROLABLE:**

- ✅ Opción A es alcanzable en 1-2 semanas
- ✅ Reduce 50% de la redundancia 
- ✅ Bajo riesgo, alto beneficio
- ✅ Establece base para Opción B futura

**La prioridad es:**
1. Eliminar `estado` de hijas (es puramente redundante)
2. Eliminar `es_publico` de hijas (problemas de sincronización)
3. Después evaluar consolidación de fechas/duraciones

