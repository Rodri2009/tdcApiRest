# Refactorización de Solicitudes y Eventos Confirmados

## Objetivo
Normalizar la estructura de datos para unificar el manejo de eventos confirmados (bandas, alquileres, servicios, talleres) en una sola tabla genérica, mejorando consistencia, escalabilidad y mantenibilidad.

---

## 1. Cambios en la Base de Datos

### 1.1 Tablas de Solicitudes (Sin Cambios Estructurales)
Mantienen su estructura actual, con un campo adicional `es_publico_cuando_confirmada` para indicar si debe aparecer en la agenda pública:
- `solicitudes_alquiler` (base + nuevo campo)
- `solicitudes_bandas` (base + nuevo campo)
- `solicitudes_servicios` (base + nuevo campo)
- `solicitudes_talleres` (base + nuevo campo)

### 1.2 Nueva Tabla: `eventos_confirmados`
Tabla genérica unificada para todos los eventos confirmados (bandas, alquileres, servicios, talleres):

```sql
CREATE TABLE IF NOT EXISTS eventos_confirmados (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_solicitud INT NOT NULL COMMENT 'FK a la solicitud original',
    tipo_evento ENUM('ALQUILER_SALON', 'BANDA', 'SERVICIO', 'TALLER') NOT NULL,
    tabla_origen VARCHAR(50) NOT NULL COMMENT 'Tabla de la que proviene: solicitudes_alquiler, solicitudes_bandas, etc.',
    
    -- Información del evento
    nombre_evento VARCHAR(255) NOT NULL,
    descripcion TEXT,
    fecha_evento DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    duracion_estimada VARCHAR(100),
    
    -- Información de contacto
    nombre_cliente VARCHAR(255),
    email_cliente VARCHAR(255),
    telefono_cliente VARCHAR(50),
    
    -- Datos económicos
    precio_base DECIMAL(10,2),
    precio_final DECIMAL(10,2),
    
    -- Información pública
    es_publico TINYINT(1) DEFAULT 0 COMMENT '1=Visible en agenda pública',
    activo TINYINT(1) DEFAULT 1 COMMENT '1=Vigente, 0=Cancelado o archivado',
    
    -- Información específica por tipo
    genero_musical VARCHAR(255) COMMENT 'Solo bandas',
    cantidad_personas INT COMMENT 'Solo alquileres/bandas',
    tipo_servicio VARCHAR(255) COMMENT 'Solo servicios',
    nombre_taller VARCHAR(255) COMMENT 'Solo talleres',
    
    -- Auditoría
    confirmado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    cancelado_en TIMESTAMP NULL,
    
    -- Índices
    INDEX idx_tipo_evento (tipo_evento),
    INDEX idx_fecha (fecha_evento),
    INDEX idx_es_publico (es_publico),
    INDEX idx_activo (activo),
    INDEX idx_id_solicitud (id_solicitud),
    UNIQUE KEY uk_solicitud (id_solicitud, tipo_evento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Eventos confirmados unificados de todas las solicitudes';
```

### 1.3 Cambios en Tablas de Solicitudes
Agregar campo `es_publico_cuando_confirmada` a cada tabla (ya existe en algunas, se asegura consistencia):

- `solicitudes_alquiler`: Agregado `es_publico_cuando_confirmada` (antes `es_publico`, se renombra para claridad)
- `solicitudes_bandas`: Agregado `es_publico_cuando_confirmada`
- `solicitudes_servicios`: Agregado `es_publico_cuando_confirmada`
- `solicitudes_talleres`: Agregado `es_publico_cuando_confirmada`

---

## 2. Cambios en el Backend

### 2.1 Archivo: `backend/controllers/adminController.js`

**Función: `getSolicitudes()`**
- Mantener consulta UNION actual (sin cambios en lógica, usa datos de solicitudes)
- Agregar información de si tiene evento confirmado

**Función: `actualizarEstadoSolicitud()`**
- Al cambiar estado a 'Confirmado': insertar en `eventos_confirmados` (para todos los tipos)
- Al cambiar estado a 'Cancelado': actualizar `eventos_confirmados.activo = 0` y `cancelado_en = NOW()`
- Usar tabla origen (`solicitudes_alquiler`, `solicitudes_bandas`, etc.) para determinar tipo

**Nueva Función: `obtenerEventosConfirmados()`**
- Consultar `eventos_confirmados` donde `es_publico = 1` y `activo = 1`
- Usada por agenda pública y admin

### 2.2 Archivo: `backend/controllers/solicitudController.js`

**Función: `getSolicitudPorId()`**
- Mantener lógica de prefijos (`alq_`, `bnd_`, `srv_`, `tll_`)
- Agregar información de si tiene evento confirmado asociado

---

## 3. Flujo de Datos

### Crear Solicitud
1. Usuario crea solicitud (ej. banda)
2. Se inserta en `solicitudes` + `solicitudes_bandas`
3. Estado: 'Solicitado'
4. **No aparece en `eventos_confirmados`**

### Confirmar Solicitud
1. Admin cambia estado a 'Confirmado' en `solicitudes_bandas`
2. Endpoint `PUT /api/admin/solicitudes/:id/estado` con `{ estado: 'Confirmado' }`
3. **Automáticamente inserta en `eventos_confirmados`**:
   - Lee datos de la solicitud
   - Inserta fila en `eventos_confirmados` con `tipo_evento`, `tabla_origen`
   - Si `es_publico_cuando_confirmada = 1` en solicitud, también `es_publico = 1` en evento

### Cancelar Solicitud
1. Admin cambia estado a 'Cancelado'
2. **Automáticamente marca evento como inactivo**:
   - `UPDATE eventos_confirmados SET activo = 0, cancelado_en = NOW() WHERE id_solicitud = ?`
   - Solicitud sigue en su tabla (historial)

### Ver Agenda Pública
1. Frontend consulta `/api/eventos/publicos`
2. Devuelve filas de `eventos_confirmados` donde `es_publico = 1 AND activo = 1`
3. Datos normalizados, sin acceso a solicitudes internas

---

## 4. Cambios Esperados en DB

| Tabla | Cambio |
|-------|--------|
| `solicitudes_alquiler` | Agregar `es_publico_cuando_confirmada` |
| `solicitudes_bandas` | Agregar `es_publico_cuando_confirmada` |
| `solicitudes_servicios` | Agregar `es_publico_cuando_confirmada` |
| `solicitudes_talleres` | Agregar `es_publico_cuando_confirmada` |
| `fechas_bandas_confirmadas` | **Deprecar** (reemplazar con `eventos_confirmados`) |
| `eventos_confirmados` | **Nueva** |

---

## 5. Historial de Ejecución

### Fase 1: Modificación SQL
- [ ] Actualizar `01_schema.sql` con nueva tabla y cambios
- [ ] Resetear DB y verificar
- [ ] Analizar logs

### Fase 2: Refactorización Backend
- [ ] Actualizar `adminController.js`
- [ ] Actualizar `solicitudController.js`
- [ ] Actualizar rutas si es necesario

### Fase 3: Testing
- [ ] Pruebas curl para confirmación de solicitudes
- [ ] Verificar datos en `eventos_confirmados`
- [ ] Pruebas de cancelación

### Fase 4: Finalización
- [ ] Actualizar este MD con resultados

---

## 6. Notas Técnicas

- **Migración**: Datos existentes en `fechas_bandas_confirmadas` pueden migrarse a `eventos_confirmados`
- **Backwards Compatibility**: Se depreca `fechas_bandas_confirmadas`, pero se puede mantener temporalmente
- **Índices**: `eventos_confirmados` incluye índices para consultas frecuentes (fecha, público, activo)
- **Integridad**: FK `id_solicitud` apunta a la tabla de solicitudes, pero se valida por `tabla_origen`
