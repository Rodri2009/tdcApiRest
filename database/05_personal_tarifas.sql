-- =============================================================================
-- TDC App - Gestión de Tarifas y Datos Adicionales del Personal
-- =============================================================================
-- Solo administradores pueden gestionar esta información
-- 
-- Versión: Diciembre 2025
-- =============================================================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

USE tdc_db;

-- =============================================================================
-- 1. AMPLIAR TABLA PERSONAL_DISPONIBLE CON CAMPOS ADICIONALES
-- =============================================================================
-- Estructura actual: id_personal(PK), nombre_completo, rol, celular, activo, cvu_alias

-- Agregar campo 'documento' si no existe
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_SCHEMA = 'tdc_db' 
               AND TABLE_NAME = 'personal_disponible' 
               AND COLUMN_NAME = 'documento');
SET @query := IF(@exist = 0, 
    'ALTER TABLE personal_disponible ADD COLUMN documento VARCHAR(20) NULL COMMENT ''DNI/CUIT del personal'' AFTER celular',
    'SELECT 1');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agregar campo 'email' si no existe
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_SCHEMA = 'tdc_db' 
               AND TABLE_NAME = 'personal_disponible' 
               AND COLUMN_NAME = 'email');
SET @query := IF(@exist = 0, 
    'ALTER TABLE personal_disponible ADD COLUMN email VARCHAR(100) NULL COMMENT ''Email del personal'' AFTER documento',
    'SELECT 1');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agregar campo 'direccion' si no existe
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_SCHEMA = 'tdc_db' 
               AND TABLE_NAME = 'personal_disponible' 
               AND COLUMN_NAME = 'direccion');
SET @query := IF(@exist = 0, 
    'ALTER TABLE personal_disponible ADD COLUMN direccion TEXT NULL COMMENT ''Dirección del personal'' AFTER email',
    'SELECT 1');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agregar campo 'fecha_nacimiento' si no existe
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_SCHEMA = 'tdc_db' 
               AND TABLE_NAME = 'personal_disponible' 
               AND COLUMN_NAME = 'fecha_nacimiento');
SET @query := IF(@exist = 0, 
    'ALTER TABLE personal_disponible ADD COLUMN fecha_nacimiento DATE NULL COMMENT ''Fecha de nacimiento'' AFTER direccion',
    'SELECT 1');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agregar campo 'fecha_ingreso' si no existe
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_SCHEMA = 'tdc_db' 
               AND TABLE_NAME = 'personal_disponible' 
               AND COLUMN_NAME = 'fecha_ingreso');
SET @query := IF(@exist = 0, 
    'ALTER TABLE personal_disponible ADD COLUMN fecha_ingreso DATE NULL COMMENT ''Fecha de ingreso al equipo'' AFTER fecha_nacimiento',
    'SELECT 1');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agregar campo 'tipo_contrato' si no existe
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_SCHEMA = 'tdc_db' 
               AND TABLE_NAME = 'personal_disponible' 
               AND COLUMN_NAME = 'tipo_contrato');
SET @query := IF(@exist = 0, 
    'ALTER TABLE personal_disponible ADD COLUMN tipo_contrato ENUM(''eventual'', ''fijo'', ''freelance'') DEFAULT ''eventual'' COMMENT ''Tipo de relación laboral'' AFTER fecha_ingreso',
    'SELECT 1');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agregar campo 'notas_admin' si no existe (notas privadas solo para admins)
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_SCHEMA = 'tdc_db' 
               AND TABLE_NAME = 'personal_disponible' 
               AND COLUMN_NAME = 'notas_admin');
SET @query := IF(@exist = 0, 
    'ALTER TABLE personal_disponible ADD COLUMN notas_admin TEXT NULL COMMENT ''Notas privadas (solo admins)'' AFTER cvu_alias',
    'SELECT 1');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =============================================================================
-- 2. TABLA DE TARIFAS DEL PERSONAL
-- =============================================================================

CREATE TABLE IF NOT EXISTS personal_tarifas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_personal VARCHAR(50) NOT NULL COMMENT 'Referencia a personal_disponible.id_personal',
    id_rol INT NULL COMMENT 'Referencia a catalogo_roles.id (opcional)',
    
    -- Montos
    monto_por_hora DECIMAL(10,2) NULL COMMENT 'Tarifa por hora de trabajo',
    monto_fijo_evento DECIMAL(10,2) NULL COMMENT 'Tarifa fija por evento completo',
    monto_minimo DECIMAL(10,2) NULL COMMENT 'Monto mínimo garantizado',
    
    -- Vigencia
    vigente_desde DATE NOT NULL COMMENT 'Fecha desde la cual aplica esta tarifa',
    vigente_hasta DATE NULL COMMENT 'Fecha hasta (NULL = vigente indefinidamente)',
    
    -- Metadata
    moneda VARCHAR(3) DEFAULT 'ARS' COMMENT 'Código de moneda (ARS, USD)',
    descripcion TEXT NULL COMMENT 'Notas sobre esta tarifa',
    activo TINYINT(1) DEFAULT 1,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Índices (sin FK por diferencias de collation)
    INDEX idx_personal (id_personal),
    INDEX idx_rol (id_rol),
    INDEX idx_vigencia (vigente_desde, vigente_hasta),
    INDEX idx_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Tarifas y montos del personal por período';

-- =============================================================================
-- 3. TABLA DE PAGOS AL PERSONAL (histórico)
-- =============================================================================

CREATE TABLE IF NOT EXISTS personal_pagos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_personal VARCHAR(50) NOT NULL COMMENT 'Referencia a personal_disponible.id_personal',
    id_solicitud INT NULL COMMENT 'Referencia a solicitudes.id (evento trabajado)',
    
    -- Montos
    monto_acordado DECIMAL(10,2) NOT NULL COMMENT 'Monto acordado por el trabajo',
    monto_pagado DECIMAL(10,2) DEFAULT 0 COMMENT 'Monto efectivamente pagado',
    
    -- Detalles del pago
    fecha_trabajo DATE NULL COMMENT 'Fecha del evento/trabajo',
    fecha_pago DATE NULL COMMENT 'Fecha en que se realizó el pago',
    metodo_pago ENUM('efectivo', 'transferencia', 'mercadopago', 'otro') DEFAULT 'efectivo',
    comprobante VARCHAR(255) NULL COMMENT 'Número de comprobante o referencia',
    
    -- Estado
    estado ENUM('pendiente', 'parcial', 'pagado', 'cancelado') DEFAULT 'pendiente',
    
    -- Notas
    descripcion TEXT NULL COMMENT 'Descripción del trabajo realizado',
    notas TEXT NULL COMMENT 'Notas adicionales sobre el pago',
    
    -- Metadata
    creado_por INT NULL COMMENT 'Usuario que registró el pago',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Índices (sin FK por diferencias de collation)
    INDEX idx_personal (id_personal),
    INDEX idx_solicitud (id_solicitud),
    INDEX idx_estado (estado),
    INDEX idx_fecha_trabajo (fecha_trabajo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Historial de pagos al personal';

-- =============================================================================
-- 4. PERMISOS PARA COSTOS DE PERSONAL (solo ADMIN)
-- =============================================================================

-- Verificar que existe el permiso personal.costos
INSERT IGNORE INTO permisos (codigo, modulo, accion, descripcion) VALUES
('personal.costos', 'personal', 'costos', 'Ver y modificar tarifas y pagos del personal');

-- Asignar permiso a SUPER_ADMIN (si no lo tiene)
INSERT IGNORE INTO roles_permisos (id_rol, id_permiso)
SELECT r.id, p.id
FROM roles r, permisos p
WHERE r.codigo = 'SUPER_ADMIN' AND p.codigo = 'personal.costos';

-- Asignar permiso a ADMIN
INSERT IGNORE INTO roles_permisos (id_rol, id_permiso)
SELECT r.id, p.id
FROM roles r, permisos p
WHERE r.codigo = 'ADMIN' AND p.codigo = 'personal.costos';

-- =============================================================================
-- 5. VISTA ÚTIL: Tarifas vigentes del personal
-- =============================================================================

CREATE OR REPLACE VIEW v_personal_tarifas_vigentes AS
SELECT 
    p.id_personal COLLATE utf8mb4_unicode_ci AS id_personal,
    p.nombre_completo AS nombre_personal,
    cr.nombre AS rol_tarifa,
    pt.monto_por_hora,
    pt.monto_fijo_evento,
    pt.monto_minimo,
    pt.moneda,
    pt.vigente_desde,
    pt.vigente_hasta,
    pt.descripcion
FROM personal_disponible p
LEFT JOIN personal_tarifas pt ON p.id_personal COLLATE utf8mb4_unicode_ci = pt.id_personal
    AND pt.activo = 1
    AND pt.vigente_desde <= CURDATE()
    AND (pt.vigente_hasta IS NULL OR pt.vigente_hasta >= CURDATE())
LEFT JOIN catalogo_roles cr ON pt.id_rol = cr.id
WHERE p.activo = 1;

-- =============================================================================
-- 6. VISTA ÚTIL: Resumen de pagos pendientes
-- =============================================================================

CREATE OR REPLACE VIEW v_personal_pagos_pendientes AS
SELECT 
    p.id_personal COLLATE utf8mb4_unicode_ci AS id_personal,
    p.nombre_completo AS nombre_personal,
    COUNT(pp.id) AS cantidad_pagos_pendientes,
    SUM(pp.monto_acordado - pp.monto_pagado) AS total_pendiente,
    MIN(pp.fecha_trabajo) AS trabajo_mas_antiguo
FROM personal_disponible p
JOIN personal_pagos pp ON p.id_personal COLLATE utf8mb4_unicode_ci = pp.id_personal
WHERE pp.estado IN ('pendiente', 'parcial')
GROUP BY p.id_personal, p.nombre_completo;

SELECT '✅ Tablas de tarifas y pagos del personal creadas correctamente' AS resultado;
