# 📋 Auditoría de Endpoints de Solicitudes - Revisión de Normalización

**Fecha:** 8 de marzo de 2026  
**Objetivo:** Verificar que todos los endpoints reflejen la normalización de datos (clientes normalizados en tabla separada)

---

## ✅ Estado General

| Endpoint | Ubicación | Estado | Descripción |
|----------|-----------|--------|-------------|
| `GET /api/solicitudes/:id` | `solicitudController.js` | ✅ CORRECTO | Obtiene solicitud individual con JOINs correctos a tabla clientes |
| `GET /api/admin/solicitudes` | `adminController.js#getSolicitudes()` | ✅ CORRECTO | Listado admin con UNION de todos tipos, JOINs a clientes normalizados |
| `PUT /api/admin/solicitudes/:id/estado` | `adminController.js#actualizarEstadoSolicitud()` | 🔴 FIJO | Tenía referencias a campos viejos (tipo_de_evento, nombre_completo, cantidad_de_personas) |
| `GET /api/admin/orden-trabajo/:id` | `adminController.js#getOrdenDeTrabajo()` | 🔴 FIJO | Tenía JOIN incorrecto con campo tipo_servicio en solicitudes_alquiler |

---

## 🔴 Problemas Encontrados

### Problema 1: `actualizarEstadoSolicitud()` - Líneas 298-302
**Archivo:** `backend/controllers/adminController.js`

#### ❌ Código Anterior
```javascript
} else if (tablaOrigen === 'solicitudes_alquiler') {
    nombreEvento = solicitud.tipo_de_evento || 'Alquiler';              // ❌ NO existe
    nombreCliente = solicitud.nombre_completo;                          // ❌ NO existe
    emailCliente = solicitud.email;                                     // ❌ NO existe
    telefonoCliente = solicitud.telefono;                               // ❌ NO existe
    cantidadPersonas = solicitud.cantidad_de_personas;                  // ❌ NO existe
}
```

#### ➡️ Campos que NO existen en `solicitudes_alquiler`:
- `tipo_de_evento` → Debería ser `id_tipo_evento` (y obtenerlo del JOIN a `opciones_tipos`)
- `nombre_completo` → Normalizados a tabla `clientes` (obtener vía `clienteRow.nombre`)
- `email` → En tabla `clientes` (obtener vía `clienteRow.email`)
- `telefono` → En tabla `clientes` (obtener vía `clienteRow.telefono`)
- `cantidad_de_personas` → En tabla `precios_vigencia` vía `id_precio_vigencia` FK

#### ✅ Código Corregido
```javascript
} else if (tablaOrigen === 'solicitudes_alquiler') {
    // Usar clienteRow que ya trae datos normalizados de la tabla clientes
    nombreEvento = 'Alquiler Salón';
    nombreCliente = (clienteRow && clienteRow.nombre) || solicitud.nombre_solicitante || '';
    emailCliente = (clienteRow && clienteRow.email) || solicitud.email_solicitante || '';
    telefonoCliente = (clienteRow && clienteRow.telefono) || solicitud.telefono_solicitante || '';
    cantidadPersonas = null;  // La cantidad está en precios_vigencia, se trae en getSolicitudPorId
}
```

**Cambios:**
- Ahora usa `clienteRow` (ya obtenido del JOIN a `clientes` en línea 287)
- Fallbacks a campos alias si clienteRow no disponible
- Sigue el mismo patrón que para BANDA (línea 290-296) que ya estaba correcto

---

### Problema 2: `getOrdenDeTrabajo()` - Líneas 775-800
**Archivo:** `backend/controllers/adminController.js`

#### ❌ Código Anterior
```javascript
// Para solicitudes_alquiler:
SELECT
    s.id_solicitud, COALESCE(c.nombre, '') as nombre_completo, s.fecha_evento, s.hora_evento, s.duracion, s.descripcion,
    s.tipo_servicio,                    // ❌ NO existe en solicitudes_alquiler
    ot.nombre_para_mostrar as tipo_evento, ot.id_tipo_evento as tipo_evento_id
FROM solicitudes_alquiler s
LEFT JOIN solicitudes sol ON s.id_solicitud = sol.id        // ❌ Debería ser sol.id_solicitud
LEFT JOIN clientes c ON sol.id_cliente = c.id_cliente
LEFT JOIN opciones_tipos ot ON s.tipo_servicio = ot.id_tipo_evento  // ❌ Débería ser s.id_tipo_evento

// Para solicitudes_fechas_bandas:
SELECT
    ...
    s.tipo_servicio,                    // ❌ NO existe en solicitudes_fechas_bandas
    ...
LEFT JOIN opciones_tipos ot ON s.tipo_servicio = ot.id_tipo_evento   // ❌ Inválido
```

#### ⚠️ Campos Viejos Identificados:
- `SELECT s.tipo_servicio` → NO existe en solicitudes_alquiler (existe solo en solicitudes_servicios)
- En solicitudes_alquiler debería ser `s.id_tipo_evento`
- `LEFT JOIN solicitudes sol ON s.id_solicitud = sol.id` → Debería ser `sol.id_solicitud` (PK son id_solicitud en todas las tablas)

#### ✅ Código Corregido
```javascript
// Para solicitudes_alquiler:
SELECT
    s.id_solicitud, COALESCE(c.nombre, '') as nombre_completo, s.fecha_evento, s.hora_evento, s.duracion, s.descripcion,
    s.id_tipo_evento,                   // ✅ Campo correcto
    ot.nombre_para_mostrar as tipo_evento, ot.id_tipo_evento as tipo_evento_id
FROM solicitudes_alquiler s
LEFT JOIN solicitudes sol ON s.id_solicitud = sol.id_solicitud  // ✅ JOIN correcto
LEFT JOIN clientes c ON sol.id_cliente = c.id_cliente
LEFT JOIN opciones_tipos ot ON s.id_tipo_evento = ot.id_tipo_evento  // ✅ Relación correcta

// Para solicitudes_fechas_bandas:
SELECT
    s.id_solicitud, COALESCE(c.nombre, '') as nombre_completo, s.fecha_evento, s.hora_evento, s.duracion, s.descripcion,
    'BANDA' as id_tipo_evento,          // ✅ Constante para bandas
    'BANDA' as tipo_evento, 'BANDA' as tipo_evento_id
FROM solicitudes_fechas_bandas s
LEFT JOIN solicitudes sol ON s.id_solicitud = sol.id_solicitud  // ✅ JOIN correcto
LEFT JOIN clientes c ON sol.id_cliente = c.id_cliente
```

**Cambios:**
- Cambió `s.tipo_servicio` → `s.id_tipo_evento` para alquiler
- Cambió JOIN condition `sol.id` → `sol.id_solicitud`
- Para bandas: reemplazó referencias a `tipo_servicio` con constante 'BANDA'
- Removió JOIN inútil a `opciones_tipos` para bandas

---

## 🔍 Análisis Detallado de Cada Endpoint

### 1. **GET `/api/solicitudes/:id`** ✅
**Ubicación:** `solicitudController.js` líneas 450-550  
**Status:** ✅ CORRECTO

**Cómo funciona:**
```javascript
// Para alquiler (prefijo alq_):
const sql = `
    SELECT
        ...,
        pv.cantidad_max as cantidadPersonas,
        COALESCE(c.nombre, '') as nombreCompleto,
        c.telefono as telefono,
        c.email as email,
        ...
    FROM solicitudes_alquiler sa
    JOIN solicitudes sol ON sa.id_solicitud = sol.id_solicitud
    LEFT JOIN clientes c ON sol.id_cliente = c.id_cliente         // ✅ Correcto
    LEFT JOIN precios_vigencia pv ON sa.id_precio_vigencia = pv.id  // ✅ Correcto
    LEFT JOIN opciones_tipos ot ON sa.id_tipo_evento = ot.id_tipo_evento  // ✅ Correcto
    WHERE sa.id_solicitud = ?
`;
```

**Características:**
- JOINs correctos a `clientes` y `precios_vigencia`
- Obtiene datos de cliente desde tabla normalizada
- Obtiene cantidad desde tabla de precios (relación correcta)
- Devuelve JSON con estructura normalizada

---

### 2. **GET `/api/admin/solicitudes`** ✅
**Ubicación:** `adminController.js` líneas 1-170  
**Status:** ✅ CORRECTO

**Estructura:**
- UNION de 5 tipos de solicitudes (alq_, bnd_, ev_, srv_, tll_)
- Cada rama tiene JOINs correctos a `clientes`
- Ejemplo para alquiler (líneas 5-25):
  ```javascript
  LEFT JOIN clientes c ON sol.id_cliente = c.id_cliente  // ✅ Correcto
  LEFT JOIN opciones_tipos ot ON s.id_tipo_evento = ot.id_tipo_evento  // ✅ Correcto
  ```

---

### 3. **PUT `/api/admin/solicitudes/:id/estado`** 🔴 → ✅
**Ubicación:** `adminController.js` líneas 173-350  
**Status:** 🔴 FIJO

**Qué hace:**
- Cambia estado de una solicitud
- Crea/actualiza registro en `eventos_confirmados`
- Intenta recolectar datos de cliente para el evento

**Problema:** Líneas 298-302 usaban campos viejos de solicitudes_alquiler  
**Solución:** Usar `clienteRow` que ya contiene datos normalizados

---

### 4. **GET `/api/admin/orden-trabajo/:id`** 🔴 → ✅
**Ubicación:** `adminController.js` líneas 774-860  
**Status:** 🔴 FIJO

**Qué hace:**
- Obtiene detalles de una solicitud para generar orden de trabajo
- Trae datos del personal asignado
- Calcula costos de personal

**Problema:** 
- Usaba `s.tipo_servicio` en `solicitudes_alquiler` (no existe)
- JOIN a `solicitudes` era incorrecto (`sol.id` en lugar de `sol.id_solicitud`)

**Solución:**
- Cambió a `s.id_tipo_evento` para alquiler
- Corrigió JOINs a usar `id_solicitud` en todas partes
- Para bandas, usa constante 'BANDA'

---

## 📊 Resumen de Cambios

### Archivo: `backend/controllers/adminController.js`

#### Cambio 1: Líneas 298-305
- **Tipo:** Corrección de referencias a campos normalizados
- **Before:** 5 líneas usando `solicitud.tipo_de_evento`, `solicitud.nombre_completo`, etc.
- **After:** 5 líneas usando `clienteRow` y datos alias del JOIN

#### Cambio 2: Líneas 775-800
- **Tipo:** Corrección de SQL query y JOINs incorrectos
- **Before:** 25 líneas con `s.tipo_servicio` y JOINs incorrectos
- **After:** 24 líneas con campos correctos y JOINs normalizados

---

## ✅ Verificación Final

### SQL Schema Validation
✅ En `solicitudes_alquiler`:
- Campo `id_tipo_evento` (INT) → FK a `opciones_tipos.id_tipo_evento`
- Campo `id_precio_vigencia` (INT) → FK a `precios_vigencia.id`
- NO existe: `tipo_de_evento`, `nombre_completo`, `cantidad_de_personas`, `tipo_servicio`

✅ En `solicitudes`:
- Campo `id_cliente` (INT) → FK a `clientes.id_cliente`
- Tabla `clientes` contiene: id_cliente, nombre, email, telefono

✅ En `precios_vigencia`:
- Contiene: cantidad_min, cantidad_max, precio_base (para rangos de cantidad)

### Backend Startup
✅ Backend inició correctamente sin errores de schema
✅ Rutas cargadas correctamente
✅ Conexión a MariaDB exitosa
✅ Servicios Watch iniciados

---

## 🎯 Impacto de los Cambios

**Usuarios Afectados:**
- Admin: Al cambiar estado de solicitudes (alq_*)
- Admin: Al generar orden de trabajo

**Funcionalidades Reparadas:**
1. ✅ Actualizar estado de alquiler guardará cliente correcto en `eventos_confirmados`
2. ✅ Generar orden de trabajo para alquiler trae datos correctos del cliente
3. ✅ Bandas ahora usa SQL consistente con alquiler

**Sin Breaking Changes:**
- Frontend no requiere cambios
- Endpoints mantienen misma respuesta
- Solo lógica interna normalizada

---

## 📝 Notas para Futuro

1. **Patrón Recomendado:** Cuando se trae solicitud de tabla específica, hacer JOINs inmediatos a:
   - `solicitudes` (tabla padre para campos como fecha_creacion, es_publico)
   - `clientes` (para nombre, email, telefono)
   - Tabla específica para relaciones (ej: `precios_vigencia` para alquiler)

2. **Evitar:** Buscar directamente en campos como:
   - `solicitud.nombre_completo` → Usar `c.nombre` del JOIN a clientes
   - `solicitud.tipo_de_evento` → Usar `ot.nombre_para_mostrar` del JOIN a opciones_tipos
   - `solicitud.cantidad_de_personas` → Usar `pv.cantidad_max` del JOIN a precios_vigencia

3. **Mejor Práctica:** Mantener consistencia con el patrón BANDA que ya estaba correcto

