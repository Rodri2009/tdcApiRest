-- ============================================================================
-- fix_inconsistencies.sql
-- Script para corregir inconsistencias encontradas
-- Ejecución: SIN REINICIAR CONTENEDORES
-- Problemas a corregir:
--   1. solicitudes_bandas.id_solicitud tiene AUTO_INCREMENT (debería ser FK)
--   2. eventos_confirmados tiene registro con solicitud_id=0 (orfano)
-- ============================================================================

USE tdc_db;

-- ============================================================================
-- PROBLEMA 1: solicitudes_bandas.id_solicitud con AUTO_INCREMENT incorrecto
-- ============================================================================
-- Estrategia:
--   1. Crear tabla temporal con estructura correcta (sin AUTO_INCREMENT)
--   2. Copiar datos de tabla original
--   3. Eliminar tabla original
--   4. Renombrar tabla temporal como la original
--   5. Recrear índices y foreign keys

-- Crear tabla backup si no existe (compatible con MariaDB sin bloques PL/SQL)
CREATE TABLE IF NOT EXISTS solicitudes_bandas_backup (
    id_solicitud INT PRIMARY KEY,
    tipo_de_evento VARCHAR(50) NOT NULL DEFAULT 'FECHA_BANDAS',
    tipo_servicio VARCHAR(255) DEFAULT NULL,
    fecha_hora DATETIME DEFAULT NULL,
    fecha_evento DATE DEFAULT NULL,
    hora_evento VARCHAR(20) DEFAULT NULL,
    duracion VARCHAR(100) DEFAULT NULL,
    cantidad_de_personas VARCHAR(100) DEFAULT NULL,
    precio_basico DECIMAL(10,2) DEFAULT NULL,
    precio_final DECIMAL(10,2) DEFAULT NULL,
    nombre_completo VARCHAR(255) DEFAULT NULL,
    telefono VARCHAR(50) DEFAULT NULL,
    email VARCHAR(255) DEFAULT NULL,
    descripcion TEXT,
    estado VARCHAR(50) DEFAULT 'Solicitado',
    fingerprintid VARCHAR(255) DEFAULT NULL,
    id_banda INT DEFAULT NULL,
    genero_musical VARCHAR(100) DEFAULT NULL,
    formacion_json TEXT DEFAULT NULL,
    instagram VARCHAR(255) DEFAULT NULL,
    facebook VARCHAR(255) DEFAULT NULL,
    youtube VARCHAR(500) DEFAULT NULL,
    spotify VARCHAR(500) DEFAULT NULL,
    otras_redes TEXT,
    logo_url VARCHAR(500) DEFAULT NULL,
    contacto_rol VARCHAR(100) DEFAULT NULL,
    fecha_alternativa DATE DEFAULT NULL,
    invitadas_json TEXT DEFAULT NULL,
    cantidad_bandas INT DEFAULT 1,
    precio_puerta_propuesto DECIMAL(10,2) DEFAULT NULL,
    expectativa_publico VARCHAR(100) DEFAULT NULL,
    notas_admin TEXT,
    id_evento_generado INT DEFAULT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_tipo (tipo_de_evento),
    INDEX idx_fecha (fecha_evento),
    INDEX idx_estado (estado),
    INDEX idx_banda (id_banda),
    FOREIGN KEY (id_solicitud) REFERENCES solicitudes(id) ON DELETE CASCADE,
    FOREIGN KEY (id_banda) REFERENCES bandas_artistas(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Copiar solo filas faltantes para evitar duplicados
INSERT INTO solicitudes_bandas_backup
SELECT sb.* FROM solicitudes_bandas sb
WHERE NOT EXISTS (
    SELECT 1 FROM solicitudes_bandas_backup b WHERE b.id_solicitud = sb.id_solicitud
);

-- Informar estado
SELECT CONCAT('Registros en backup: ', (SELECT COUNT(*) FROM solicitudes_bandas_backup)) AS info;

-- ============================================================================
-- PROBLEMA 2: eventos_confirmados con solicitud_id=0 (orfano)
-- ============================================================================
-- Identificar el evento problemático
SELECT 
    'Evento problemático encontrado' AS problema,
    id,
    id_solicitud,
    tipo_evento,
    nombre_evento
FROM eventos_confirmados
WHERE id_solicitud = 0 OR id_solicitud IS NULL OR id_solicitud NOT IN (SELECT id FROM solicitudes);

-- Opciones de corrección:
-- A) Si es un evento de prueba, eliminarlo
-- B) Si es un evento válido, asignarle una solicitud correcta

-- Para ahora, marcar para revisión manual (comentado)
-- DELETE FROM eventos_confirmados WHERE id_solicitud = 0 OR id_solicitud IS NULL;

-- ============================================================================
-- RESUMEN DE CORRECCIONES APLICADAS
-- ============================================================================
SELECT 
    '✅ Script de corrección ejecutado' AS resultado,
    '📋 Tabla backup creada: solicitudes_bandas_backup' AS paso_1,
    '⚠️  Evento orfano manual (id_solicitud=0) - requiere revisión manual' AS paso_2,
    '💡 PRÓXIMOS PASOS: Eliminar tabla original e intercambiar nombres' AS nota;
