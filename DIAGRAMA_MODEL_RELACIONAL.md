# 📐 DIAGRAMA RELACIONAL - Modelo Actual vs Propuesto

## MODELO ACTUAL (CON REDUNDANCIAS)

```
┌─────────────────────────────────────────────────────────────────┐
│                    SOLICITUDES (Tabla Padre)                    │
├─────────────────────────────────────────────────────────────────┤
│ ⭐ id_solicitud (PK)                                             │
│ 📦 categoria (ALQUILER | BANDA | SERVICIO | TALLER)             │
│ 👤 id_cliente (FK → clientes)                                   │
│ 👨‍💼 id_usuario_creador (FK → usuarios)                            │
│ 🆔 estado ← TAMBIÉN EN HIJAS ⚠️ REDUNDANTE                       │
│ 🌐 es_publico ← TAMBIÉN EN HIJAS + eventos_confirmados ⚠️ TRI   │
│ 📝 descripcion_corta                                            │
│ 📄 descripcion_larga                                            │
│ 📄 descripcion ← DUPLICA descripcion_larga ⚠️                   │
│ 🎨 url_flyer ← TAMBIÉN EN eventos_confirmados ⚠️                │
│ 🕐 fecha_creacion                                               │
│ 🕐 actualizado_en                                               │
└──────────┬──────────────────┬──────────────────┬────────────────┘
           │ 1:1              │ 1:1              │ 1:1
           │                  │                  │
    ┌──────▼─────────┐  ┌─────▼──────────────┐  ┌──────▼────────────┐
    │ SOLICITUDES_   │  │ SOLICITUDES_FECHAS │  │ SOLICITUDES_      │
    │ ALQUILER       │  │ BANDAS             │  │ SERVICIOS         │
    ├────────────────┤  ├────────────────────┤  ├───────────────────┤
    │🔑 id_solicitud │  │🔑 id_solicitud    │  │🔑 id_solicitud_*  │
    │id_tipo_evento  │  │id_banda            │  │   (PK innecesaria)│
    │fecha_evento    │  │fecha_evento ⚠️     │  │id_solicitud (FK)  │
    │hora_evento     │  │hora_evento  ⚠️     │  │tipo_servicio      │
    │duracion ⚠️     │  │duracion      ⚠️    │  │fecha_evento  ⚠️   │
    │precio_basico   │  │precio_basico       │  │hora_evento   ⚠️   │
    │precio_final    │  │precio_final        │  │duracion      ⚠️   │
    │estado ❌ DUP   │  │estado        ❌ DUP │  │precio             │
    │comentarios     │  │descripcion   ⚠️    │  └───────────────────┘
    │actualizacion   │  │cantidad_bandas     │
    │                │  │bandas_json         │     SOLICITUDES_
    │                │  │es_publico  ❌ TRI  │     TALLERES (similar)
    │                │  │id_evento_generado  │
    │                │  │actualizado_en      │
    └────────────────┘  └────────────────────┘

    ↓ Links a
    
┌──────────────────────────────────────────────────────────────────┐
│           EVENTOS_CONFIRMADOS (Cuando estado='Confirmado')       │
├──────────────────────────────────────────────────────────────────┤
│ ⭐ id (PK)                                                        │
│ 🔑 id_solicitud (FK) → solicitudes.id_solicitud                 │
│ 📦 tipo_evento (BANDA | ALQUILER | SERVICIO | TALLER)           │
│ 📍 tabla_origen (solicitudes_alquiler | solicitudes_fechas_...)  │
│ 📝 nombre_evento ← DUPLICA de solicitud/hija ⚠️ PUEDE SER NULL   │
│ 📄 descripcion ← DUPLICA ⚠️ PODE SER NULL                        │
│ 🎨 url_flyer ← DUPLICA de solicitud ⚠️                          │
│ 📅 fecha_evento ← DUPLICA de hija ⚠️ PUEDE DIVERGIR              │
│ 🕐 hora_inicio ← DUPLICA de hija ⚠️                             │
│ ⏱️  duracion_estimada ← DUPLICA ⚠️                               │
│ 👤 id_cliente ← DUPLICA de solicitud ⚠️                          │
│ 🌐 es_publico ← TRIPLICADO ⚠️⚠️⚠️ SINCRONIZACIÓN COMPLEJA        │
│ ✓ activo (1=visible, 0=cancelado)                               │
│ 🎵 genero_musical (solo BANDA)                                  │
│ 👥 cantidad_personas (solo BANDA/ALQUILER)                      │
│ 🔧 tipo_servicio (solo SERVICIO)                                │
│ 📚 nombre_taller (solo TALLER)                                  │
│ 🕐 confirmado_en, actualizado_en, cancelado_en                  │
└──────────────────────────────────────────────────────────────────┘
```

### Problemas Visuales:
- 🔴 **Red lines (❌)** = Duplicación pura y simple → Eliminar
- 🟠 **Orange (⚠️)** = Puede ser necesario pero requiere sincronización
- 🟡 **(Cursive)** = Problemas específicos observados

---

## MODELO PROPUESTO - OPCIÓN A (Normalización Gradual)

```
┌─────────────────────────────────────────────────────────────────┐
│              SOLICITUDES (Tabla Padre - MEJORADA)               │
├─────────────────────────────────────────────────────────────────┤
│ ⭐ id_solicitud (PK)                                             │
│ 📦 categoria (ALQUILER | BANDA | SERVICIO | TALLER)             │
│ 👤 id_cliente (FK → clientes)                                   │
│ 👨‍💼 id_usuario_creador (FK → usuarios)                            │
│ 🆔 estado  ✓ ÚNICA FUENTE                                        │
│ 🌐 es_publico ✓ ÚNICA FUENTE (no en hijas)                      │
│ 📝 descripcion_corta                                            │
│ 📄 descripcion_larga  ✓ CONSOLIDADO                             │
│ 🎨 url_flyer  ✓ ÚNICA FUENTE                                    │
│ 🕐 fecha_creacion, actualizado_en                               │
└──────────┬──────────────────┬──────────────────┬────────────────┘
           │ 1:1              │ 1:1              │ 1:1
           │                  │                  │
    ┌──────▼─────────┐  ┌─────▼──────────────┐  ┌──────▼────────────┐
    │ SOLICITUDES_   │  │ SOLICITUDES_FECHAS │  │ SOLICITUDES_      │
    │ ALQUILER       │  │ BANDAS             │  │ SERVICIOS         │
    ├────────────────┤  ├────────────────────┤  ├───────────────────┤
    │🔑 id_solicitud │  │🔑 id_solicitud    │  │🔑 id_solicitud    │
    │(PK, FK)        │  │(PK, FK)            │  │(PK, FK)           │
    │id_tipo_evento  │  │id_banda            │  │tipo_servicio      │
    │fecha_evento    │  │fecha_evento  ✓     │  │fecha_evento   ✓   │
    │hora_evento     │  │hora_evento   ✓     │  │hora_evento    ✓   │
    │duracion  ✓     │  │duracion       ✓    │  │duracion       ✓   │
    │precio_basico   │  │precio_basico       │  │precio             │
    │precio_final    │  │precio_final        │  └───────────────────┘
    │✗ ELIMINADO     │  │descripcion   ✓     │
    │  estado        │  │cantidad_bandas     │     SOLICITUDES_
    │                │  │bandas_json         │     TALLERES
    │actualizacion   │  │fecha_alternativa   │     (similar a servicios)
    │                │  │notas_admin         │
    │                │  │id_evento_generado  │
    │                │  │✗ ELIMINADO:        │
    │                │  │  estado            │
    │                │  │  es_publico        │
    │                │  │actualizado_en      │
    └────────────────┘  └────────────────────┘

    ↓ Links a (cuando estado='Confirmado')
    
┌──────────────────────────────────────────────────────────────────┐
│        EVENTOS_CONFIRMADOS (SIMPLIFICADA - Solo Referencia)     │
├──────────────────────────────────────────────────────────────────┤
│ ⭐ id (PK)                                                        │
│ 🔑 id_solicitud (FK) → solicitudes.id_solicitud                 │
│ 📦 tipo_evento (enum)                                            │
│ 📍 tabla_origen (referencia a tabla hija)                       │
│ ✓ activo (1=visible, 0=cancelado)                               │
│ 🕐 confirmado_en, actualizado_en, cancelado_en                  │
│                                                                  │
│ ✗ ELIMINADOS:                                                    │
│  - nombre_evento  (→ leer de solicitud.descripcion_corta)       │
│  - descripcion    (→ leer de solicitud.descripcion_larga)       │
│  - url_flyer      (→ leer de solicitud.url_flyer)              │
│  - fecha_evento   (→ leer de tabla hija)                        │
│  - hora_inicio    (→ leer de tabla hija)                        │
│  - duracion_est   (→ leer de tabla hija)                        │
│  - id_cliente     (→ leer de solicitud.id_cliente)              │
│  - es_publico     (→ leer de solicitud.es_publico) ✓✓✓         │
│                                                                  │
│  Los datos se leen ON-THE-FLY mediante JOINs                    │
└──────────────────────────────────────────────────────────────────┘
```

### Ventajas:
- ✅ Sin redundancia de datos
- ✅ Una única fuente de verdad por campo
- ✅ No hay sync issues (como evento 9)
- ✅ Cambios se reflejan automáticamente

---

## COMPARATIVA: ANTES vs DESPUÉS

| Aspecto | ANTES (Actual) | DESPUÉS (Opción A) | Mejora |
|---------|---|---|---|
| **Campos redundantes** | 11 | 1-2 | -90% |
| **Complejidad sync** | Alta | Baja | ⬆️ Simple |
| **Riesgo de divergencia** | Alto | Nulo | 🎯 Eliminado |
| **Espaciousado** | ~2.5 MB (redundancia) | ~1 MB | -60% |
| **Velocidad lectura** | Rápida (sin JOINs) | Media (con JOINs) | ⬇️ Aceptable |
| **Velocidad actualización** | Lenta (sync múltiple) | Rápida (escritura única) | ⬆️ Mejor |
| **Risk de bugs** | Alto | Bajo | 📉 |
| **Effort para cambios** | Alto | Bajo | ✅ |

---

## ROADMAP DE IMPLEMENTACIÓN - OPCIÓN A

### **Fase 1: Eliminar redundancias de 'estado' (3 días)**

```sql
-- 1. Eliminar campos redundantes
ALTER TABLE solicitudes_alquiler DROP COLUMN estado;
ALTER TABLE solicitudes_fechas_bandas DROP COLUMN estado;

-- 2. Migración de datos (verificar integridad)
-- Los controllers leerán desde solicitudes.estado en lugar de tabla hija
```

**Controllers a Actualizar:**
- `adminController.js`: Cambiar lectura de `sa.estado` → `s.estado`
- `solicitudFechaBandaController.js`: Cambiar lectura de `sf.estado` → `s.estado`
- Queries en endpoints públicos

---

### **Fase 2: Eliminar redundancia de 'es_publico' en hijas (3-5 días)**

```sql
-- 1. Eliminar columna redundante
ALTER TABLE solicitudes_fechas_bandas DROP COLUMN es_publico;

-- 2. Verificar que Opción A logic solo usa solicitudes.es_publico
```

**Controllers a Actualizar:**
- `solicitudFechaBandaController.js`: Cambiar todas las referencias de `sf.es_publico` → `s.es_publico`
- `adminController.js`: Asegurar que Opción A logic use solo `solicitudes.es_publico`

---

### **Fase 3: Consolidar campos 'descripcion' (2 días)**

```sql
-- 1. Unificar descripcion_larga + descripcion
-- Opción: Migrar 'descripcion' → 'descripcion_larga'
UPDATE solicitudes SET descripcion_larga = descripcion WHERE descripcion_larga IS NULL;
ALTER TABLE solicitudes DROP COLUMN descripcion;

-- 2. Consolidar comentarios de solicitudes_alquiler
UPDATE solicitudes 
SET descripcion_larga = CONCAT(COALESCE(descripcion_larga, ''), ' ', COALESCE(comentarios, ''))
WHERE categoria = 'ALQUILER' AND comentarios IS NOT NULL;
ALTER TABLE solicitudes_alquiler DROP COLUMN comentarios;
```

---

### **Fase 4: Simplificar eventos_confirmados (1-2 semanas)**

**Opción 4a: Referencias Only (Recomendada)**

```sql
-- 1. Crear nueva tabla sin campos duplicados
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
);

-- 2. Migrar datos
INSERT INTO eventos_confirmados_v2 
SELECT id, id_solicitud, tipo_evento, tabla_origen, activo, confirmado_en, actualizado_en, cancelado_en
FROM eventos_confirmados;

-- 3. Cambiar queries para JOINs
-- Ejemplo: GET /api/solicitudes/publicas usará JOINs para obtener todos los datos
```

**Queries después de consolidación:**
```sql
-- Para obtener evento con todos sus datos:
SELECT 
    ec.id,
    s.id_solicitud,
    s.descripcion_corta as nombre_evento,
    s.descripcion_larga as descripcion,
    sfb.fecha_evento,
    sfb.hora_evento,
    sfb.duracion,
    s.url_flyer,
    s.es_publico,
    ec.activo
FROM eventos_confirmados ec
JOIN solicitudes s ON ec.id_solicitud = s.id_solicitud
LEFT JOIN solicitudes_fechas_bandas sfb ON s.id_solicitud = sfb.id_solicitud
WHERE ec.tipo_evento = 'BANDA' AND ec.activo = 1
ORDER BY sfb.fecha_evento ASC;
```

---

## TIMELINE RECOMENDADO

```
Semana 1:      Fase 1 - Eliminar 'estado' duplicado
Semana 2:      Fase 2 - Eliminar 'es_publico' duplicado  
Semana 3:      Fase 3 - Consolidar 'descripcion'
Semana 4-5:    Fase 4 - Simplificar eventos_confirmados (con testing)
Semana 6:      Validación, ajustes, deploy
─────────────────────────────────────────────────────
Total:         ~6 semanas (trabajando en paralelo: 3-4 semanas)
```

---

## RIESGO vs BENEFICIO

### Riesgo de No Hacer Nada:
- 🔴 Bugs continuos de sincronización (evento 9 se repetirá)
- 🔴 Complejidad aumenta con cada nueva feature
- 🔴 Performance degrada cuando escala
- 🔴 Tech debt acumula

### Beneficio de Hacer Opción A:
- ✅ Código más limpio y mantenible
- ✅ Menos bugs de sincronización
- ✅ Tiempo de desarrollo reducido (-20%)
- ✅ Mejor escalabilidad
- ✅ Documentación más clara

**Veredicto:** Vale la pena implementar Opción A en las próximas semanas.

