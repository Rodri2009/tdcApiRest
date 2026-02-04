# Plan de Refactorización Adicional - Controllers

## Controladores que Necesitan Refactorización

Después de refactorizar `solicitudController.js`, los siguientes controladores también necesitan actualizaciones para alinearse con la nueva estructura de tablas:

### 1. **bandasController.js** - CRÍTICO ⚠️

**Problema**: Usa tablas que no existen en el esquema actual:
- Referencia a tabla `eventos` que debería ser `fechas_bandas_confirmadas`
- Usa `evento_id` pero la tabla correcta es `solicitudes_bandas` con `id_solicitud`

**Funciones a actualizar**:
- `getBandaById()` - Usa tabla `eventos` (no existe)
- `crearSolicitudBanda()` - Debe insertar en `solicitudes` + `solicitudes_bandas`
- `obtenerSolicitudesBandas()` - Referencia incorrecta a columnas
- Todas las funciones que hagan JOINs con bandas

**Cambios específicos necesarios**:
```javascript
// ANTES (incorrecto)
FROM eventos e
WHERE e.id = ?

// DESPUÉS (correcto)
FROM fechas_bandas_confirmadas fbc
WHERE fbc.id = ?

// Para solicitudes:
// ANTES
FROM solicitudes_bandas sb
WHERE sb.id_banda = ?

// DESPUÉS
FROM solicitudes_bandas sb
WHERE sb.id_solicitud = ?
```

### 2. **serviciosController.js** - IMPORTANTE

**Problema**: Usa tabla `solicitudes_servicios` pero no crea registro padre en `solicitudes`

**Funciones a actualizar**:
- `crearSolicitudServicio()` - No inserta en `solicitudes` padre
- `actualizarSolicitudServicio()` - No sincroniza con tabla padre
- Consultas que buscan servicios sin considerar la relación con `solicitudes`

**Estructura esperada**:
```javascript
// 1. Crear en solicitudes
INSERT INTO solicitudes (categoria, ...)
// 2. Obtener newId
// 3. Crear en solicitudes_servicios
INSERT INTO solicitudes_servicios (id, ...)  // id = newId
```

### 3. **talleresController.js** - IMPORTANTE

**Problema**: Usa tabla `solicitudes_talleres` pero estructura similar a servicios

**Funciones a actualizar**:
- `crearSolicitudTaller()` - No inserta en `solicitudes` padre
- `actualizarSolicitudTaller()` - No sincroniza
- `obtenerSolicitudesTalleres()` - Consultas incompletas

### 4. **alquilerAdminController.js** - IMPORTANTE

**Problema**: Potencialmente usa estructura antigua de solicitudes

**Funciones a revisar**:
- Todas las funciones de CRUD de alquileres
- Debe usar la estructura padre-hijo correcta

### 5. **adminController.js** - MODERADO

**Problema**: Puede tener referencias a tablas antiguas

**Funciones a revisar**:
- `getSolicitudes()` - Si existe, debe considerar nueva estructura
- Dashboard/reportes que agreguen datos de solicitudes

### 6. **ticketsController.js** - BAJO PRIORIDAD

**Problema**: Potencialmente usa tabla `eventos` que debería ser `fechas_bandas_confirmadas`

**Funciones a revisar**:
- Relación con eventos de bandas
- Cambiar `eventos` por `fechas_bandas_confirmadas`

## Patrón Estándar para Refactorización

Todos los controladores deben seguir este patrón:

```javascript
// 1. CREAR (INSERT)
const crearSolicitud = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();
        
        // A. Insertar en solicitudes padre
        const sqlGeneral = `
            INSERT INTO solicitudes (categoria, fecha_creacion, estado, descripcion, 
                                     nombre_solicitante, telefono_solicitante, email_solicitante)
            VALUES (?, NOW(), 'Solicitado', ?, ?, ?, ?)
        `;
        const resultGeneral = await conn.query(sqlGeneral, params);
        const newId = resultGeneral.insertId;
        
        // B. Insertar en tabla específica (hijo)
        const sqlSpecific = `
            INSERT INTO solicitudes_[tipo] (id, ...)
            VALUES (?, ...)
        `;
        await conn.query(sqlSpecific, [newId, ...otherParams]);
        
        await conn.commit();
        res.status(201).json({ id: newId });
    } catch (err) {
        if (conn) await conn.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        if (conn) conn.release();
    }
};

// 2. ACTUALIZAR (UPDATE)
const actualizarSolicitud = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();
        
        // A. Actualizar tabla padre (solicitudes)
        await conn.query(`UPDATE solicitudes SET ... WHERE id = ?`, params);
        
        // B. Actualizar tabla hijo
        await conn.query(`UPDATE solicitudes_[tipo] SET ... WHERE id = ?`, params);
        
        await conn.commit();
        res.status(200).json({ success: true });
    } catch (err) {
        if (conn) await conn.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        if (conn) conn.release();
    }
};

// 3. OBTENER (SELECT)
const obtenerSolicitud = async (req, res) => {
    try {
        const conn = await pool.getConnection();
        
        // Usar JOINs para obtener datos completos si es necesario
        const sql = `
            SELECT 
                s.id, s.categoria, s.estado, ...,
                st.campo1, st.campo2, ...
            FROM solicitudes s
            LEFT JOIN solicitudes_[tipo] st ON s.id = st.id
            WHERE s.id = ?
        `;
        const [row] = await conn.query(sql, [id]);
        
        if (!row) return res.status(404).json({ error: 'No encontrado' });
        res.json(row);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
```

## Orden Recomendado de Refactorización

1. **PRIMERO**: `bandasController.js` - CRÍTICO por errores de tablas inexistentes
2. **SEGUNDO**: `serviciosController.js` - IMPORTANTE por estructura de solicitudes
3. **TERCERO**: `talleresController.js` - IMPORTANTE por estructura similar
4. **CUARTO**: `alquilerAdminController.js` - IMPORTANTE para funcionalidad admin
5. **QUINTO**: `adminController.js` - Reportes y dashboard
6. **ÚLTIMO**: `ticketsController.js` - Bajo impacto inmediato

## Validación de Cambios

Para cada controlador refactorizado:

```bash
# 1. Verificar sintaxis
node -c backend/controllers/[controller].js

# 2. Ejecutar pruebas unitarias (si existen)
npm test -- --testPathPattern=[controller]

# 3. Probar endpoints manualmente
curl -X [METHOD] http://localhost:3000/api/[endpoint]

# 4. Verificar logs para errores
docker-compose -f docker/docker-compose.yml logs -f backend
```

## Columnas de Referencia

### solicitudes (Padre)
- id (PK, auto_increment)
- categoria (ENUM)
- fecha_creacion
- estado
- descripcion
- nombre_solicitante
- telefono_solicitante
- email_solicitante

### solicitudes_alquiler (Hijo)
- id (FK to solicitudes.id, PK)
- tipo_servicio
- fecha_evento
- hora_evento
- duracion
- cantidad_de_personas
- precio_basico
- precio_final
- es_publico
- tipo_de_evento
- nombre_completo
- telefono
- email
- descripcion
- estado

### solicitudes_bandas (Hijo)
- id_solicitud (FK to solicitudes.id, PK)
- tipo_de_evento
- tipo_servicio
- es_publico
- fecha_hora
- fecha_evento
- hora_evento
- duracion
- cantidad_de_personas
- precio_basico
- precio_final
- nombre_completo
- telefono
- email
- descripcion
- estado
- fingerprintid
- [más campos específicos de bandas]

### solicitudes_servicios (Hijo)
- id (FK to solicitudes.id, PK)
- tipo_servicio
- fecha_evento
- hora_evento
- duracion
- precio

### solicitudes_talleres (Hijo)
- id (FK to solicitudes.id, PK)
- nombre_taller
- fecha_evento
- hora_evento
- duracion
- precio

## Notas Importantes

- ⚠️ **NUNCA** confundir `solicitudes_bandas.id_solicitud` con `solicitudes_alquiler.id`
- ⚠️ **SIEMPRE** mantener transacciones para operaciones que afecten múltiples tablas
- ✅ **USAR** LEFT JOIN cuando se necesite obtener datos de tabla específica sin filtrar el padre
- ✅ **VALIDAR** que la categoría en `solicitudes` coincida con el tipo de solicitud
