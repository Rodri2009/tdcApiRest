-- =============================================================================
-- SCRIPT DE MIGRACIÓN: solicitudes_alquiler (Refactorización Fase 1)
-- Fecha: 28/02/2026
-- Propósito: Normalizar tabla solicitudes_alquiler con FKs y nuevos campos
-- =============================================================================

-- ADVERTENCIA: Ejecutar en base de datos de DESARROLLO primero
-- Este script REALIZA CAMBIOS DESTRUCTIVOS en solicitudes_alquiler

-- =============================================================================
-- PASO 1: Crear tabla temporal con nueva estructura
-- =============================================================================

CREATE TABLE IF NOT EXISTS solicitudes_alquiler_nueva (
    id_solicitud_alquiler INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Identificador único del registro de alquiler',
    id_solicitud INT NOT NULL COMMENT 'FK a solicitudes.id_solicitud - Referencia a solicitud padre (1:1)',
    fecha_evento DATE NOT NULL COMMENT 'Fecha del evento (ej: 2026-03-15)',
    hora_evento TIME NOT NULL COMMENT 'Hora de inicio del evento (ej: 14:30:00)',
    duracion INT NOT NULL COMMENT 'Duración del evento en minutos (ej: 360 = 6 horas)',
    id_tipo_evento VARCHAR(255) NOT NULL COMMENT 'FK a opciones_tipos.id_tipo_evento (ej: INFANTILES, ADOLESCENTES)',
    id_precio_vigencia INT COMMENT 'FK a precios_vigencia.id - Permite obtener cantidad_min, cantidad_max y precio_por_hora',
    precio_basico DECIMAL(10,2) COMMENT 'Precio base = precio_por_hora × duracion_horas. Capturado en momento de solicitud',
    total_adicionales DECIMAL(10,2) DEFAULT 0 COMMENT 'Suma total de precios de adicionales seleccionados',
    monto_sena DECIMAL(10,2) DEFAULT 0 COMMENT 'Monto de seña (adelanto) requerido',
    monto_deposito DECIMAL(10,2) DEFAULT 0 COMMENT 'Monto de depósito de garantía',
    precio_final DECIMAL(10,2) GENERATED ALWAYS AS (precio_basico + COALESCE(total_adicionales, 0) + COALESCE(monto_sena, 0) + COALESCE(monto_deposito, 0)) STORED COMMENT 'CALCULADO: precio_basico + total_adicionales + monto_sena + monto_deposito',
    comentarios TEXT COMMENT 'Comentarios/detalles del cliente capturados en campo "¿Algo más?" durante solicitud o finalización',
    estado VARCHAR(50) DEFAULT 'Solicitado' COMMENT 'Estado: Solicitado, Confirmado, Cancelado, Rechazado',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Auditoría: fecha de creación',
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Auditoría: fecha de última actualización',
    
    INDEX idx_id_tipo_evento (id_tipo_evento),
    INDEX idx_id_precio_vigencia (id_precio_vigencia),
    INDEX idx_estado (estado),
    INDEX idx_id_solicitud (id_solicitud),
    CONSTRAINT fk_nueva_solicitud FOREIGN KEY (id_solicitud) REFERENCES solicitudes(id_solicitud) ON DELETE CASCADE,
    CONSTRAINT fk_nueva_tipo_evento FOREIGN KEY (id_tipo_evento) REFERENCES opciones_tipos(id_tipo_evento) ON DELETE RESTRICT,
    CONSTRAINT fk_nueva_precio_vigencia FOREIGN KEY (id_precio_vigencia) REFERENCES precios_vigencia(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Tabla temporal con nueva estructura normalizada';

-- =============================================================================
-- PASO 2: Migrar datos de tabla antigua a nueva
-- Mapeo de datos:
--   duracion: "X horas" → INT minutos (ej: "4 horas" → 240)
--   cantidad_de_personas: INT o VARCHAR → FK a precios_vigencia.id
--   tipo_de_evento: VARCHAR → id_tipo_evento (sin cambios)
--   descripcion → comentarios
--   Campos nuevos: total_adicionales=0, monto_sena=0, monto_deposito=0
-- =============================================================================

INSERT INTO solicitudes_alquiler_nueva (
    id_solicitud_alquiler,
    id_solicitud,
    fecha_evento,
    hora_evento,
    duracion,
    id_tipo_evento,
    id_precio_vigencia,
    precio_basico,
    total_adicionales,
    monto_sena,
    monto_deposito,
    comentarios,
    estado
)
SELECT
    sa.id_solicitud_alquiler,
    sa.id_solicitud,
    sa.fecha_evento,
    CAST(
        COALESCE(
            CONCAT(SUBSTR(sa.hora_evento, 1, 2), ':', SUBSTR(sa.hora_evento, 4, 2), ':00'),
            '10:00:00'
        ) AS TIME
    ) as hora_evento,
    CASE
        WHEN sa.duracion LIKE '%4 horas%' THEN 240
        WHEN sa.duracion LIKE '%6 horas%' THEN 360
        WHEN sa.duracion LIKE '%3 horas%' THEN 180
        WHEN sa.duracion LIKE '%5%' THEN 300
        WHEN sa.duracion LIKE '%7%' THEN 420
        ELSE CAST(REGEXP_SUBSTR(sa.duracion, '[0-9]+') AS UNSIGNED) * 60
    END as duracion,
    sa.tipo_de_evento,
    pv.id as id_precio_vigencia,
    sa.precio_basico,
    0 as total_adicionales,
    COALESCE((SELECT monto_sena FROM opciones_tipos WHERE id_tipo_evento = sa.tipo_de_evento), 0) as monto_sena,
    COALESCE((SELECT deposito FROM opciones_tipos WHERE id_tipo_evento = sa.tipo_de_evento), 0) as monto_deposito,
    sa.descripcion as comentarios,
    sa.estado
FROM solicitudes_alquiler sa
LEFT JOIN precios_vigencia pv ON 
    pv.id_tipo_evento = sa.tipo_de_evento
    AND CAST(sa.cantidad_de_personas AS UNSIGNED) BETWEEN pv.cantidad_min AND pv.cantidad_max
    AND pv.vigente_hasta IS NULL;

-- =============================================================================
-- PASO 3: Respaldar tabla antigua (antes de eliminar)
-- =============================================================================

RENAME TABLE solicitudes_alquiler TO solicitudes_alquiler_backup_28feb2026;

-- =============================================================================
-- PASO 4: Renombrar tabla nueva a original
-- =============================================================================

RENAME TABLE solicitudes_alquiler_nueva TO solicitudes_alquiler;

-- =============================================================================
-- PASO 5: Verificación post-migración
-- =============================================================================

-- Contar registros migrados
SELECT 
    COUNT(*) as total_registros,
    SUM(CASE WHEN id_precio_vigencia IS NULL THEN 1 ELSE 0 END) as registros_sin_rango,
    SUM(CASE WHEN hora_evento = '10:00:00' THEN 1 ELSE 0 END) as registros_con_hora_default
FROM solicitudes_alquiler;

-- Ver muestra de datos migrados
SELECT
    id_solicitud,
    fecha_evento,
    hora_evento,
    duracion,
    id_tipo_evento,
    id_precio_vigencia,
    precio_basico,
    total_adicionales,
    monto_sena,
    monto_deposito,
    precio_final,
    estado
FROM solicitudes_alquiler
ORDER BY id_solicitud;

-- =============================================================================
-- NOTAS IMPORTANTES
-- =============================================================================
/*
1. BACKUP CREADO: solicitudes_alquiler_backup_28feb2026
   - Contiene todos los datos antiguos sin cambios
   - Mantener por 7 días antes de eliminar

2. CAMPOS MODIFICADOS:
   - hora_evento: VARCHAR(20) → TIME
     * Si no podía parsear, se asigna '10:00:00' (por defecto)
   - duracion: VARCHAR(100) → INT (minutos)
     * Se extrae núm первого número y se multiplica por 60
     * "4 horas" → 240 minutos
   - tipo_servicio: ELIMINADO (no existía información)
   - cantidad_de_personas: REMOVIDO (ahora usa precios_vigencia)
   - tipo_de_evento: RENOMBRADO a id_tipo_evento (FK a opciones_tipos)
   - descripcion: RENOMBRADO a comentarios

3. CAMPOS NUEVOS:
   - total_adicionales: DECIMAL(10,2) DEFAULT 0
   - monto_sena: DECIMAL(10,2) - Obtenido de opciones_tipos.monto_sena
   - monto_deposito: DECIMAL(10,2) - Obtenido de opciones_tipos.deposito
   - precio_final: GENERATED ALWAYS AS (suma de montos)
   - creado_en: TIMESTAMP (para auditoría)
   - actualizado_en: TIMESTAMP (para auditoría)

4. CAMPOS MEJORADOS:
   - id_precio_vigencia: FK a precios_vigencia para obtener rangos de cantidad
     * NULL si no se puede determinar el rango

5. ROLLBACK:
   Si hay problemas, ejecutar:
   ALTER TABLE solicitudes_alquiler RENAME TO solicitudes_alquiler_nueva_fallida;
   ALTER TABLE solicitudes_alquiler_backup_28feb2026 RENAME TO solicitudes_alquiler;

6. ACTUALIZACIONES REQUERIDAS EN CÓDIGO:
   - backend/controllers/solicitudController.js:
     * Actualizar crearSolicitud() para incluir hora_evento como TIME
     * Actualizar finalizarSolicitud() para usar nuevos campos
     * Actualizar getSolicitudWithAutoDetect() para usar JOINs con precios_vigencia
   - frontend: Actualizar formularios siguiendo los nuevos tipos
*/
