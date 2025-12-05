-- =============================================================================
-- TDC App - Sistema de Roles y Permisos
-- =============================================================================
-- Sistema escalable de control de acceso basado en roles (RBAC)
-- 
-- Roles iniciales:
--   - SUPER_ADMIN: Control total del sistema
--   - ADMIN: Gestión operativa diaria
--   - OPERADOR: Gestión de reservas y atención
--   - VIEWER: Solo lectura
--
-- Versión: Diciembre 2025
-- =============================================================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

USE tdc_db;

-- =============================================================================
-- 1. TABLA DE ROLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(50) NOT NULL UNIQUE COMMENT 'Código único: SUPER_ADMIN, ADMIN, OPERADOR, VIEWER',
    nombre VARCHAR(100) NOT NULL COMMENT 'Nombre para mostrar',
    descripcion TEXT COMMENT 'Descripción del rol',
    nivel INT NOT NULL DEFAULT 0 COMMENT 'Nivel jerárquico (mayor = más permisos)',
    activo TINYINT(1) DEFAULT 1,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_codigo (codigo),
    INDEX idx_nivel (nivel)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 2. TABLA DE PERMISOS
-- =============================================================================

CREATE TABLE IF NOT EXISTS permisos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(100) NOT NULL UNIQUE COMMENT 'Código único: modulo.accion (ej: usuarios.crear)',
    modulo VARCHAR(50) NOT NULL COMMENT 'Módulo: usuarios, solicitudes, configuracion, etc.',
    accion VARCHAR(50) NOT NULL COMMENT 'Acción: ver, crear, editar, eliminar',
    descripcion TEXT COMMENT 'Descripción del permiso',
    activo TINYINT(1) DEFAULT 1,
    INDEX idx_modulo (modulo),
    INDEX idx_codigo (codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 3. TABLA PIVOTE: ROLES - PERMISOS
-- =============================================================================

CREATE TABLE IF NOT EXISTS roles_permisos (
    id_rol INT NOT NULL,
    id_permiso INT NOT NULL,
    PRIMARY KEY (id_rol, id_permiso),
    FOREIGN KEY (id_rol) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (id_permiso) REFERENCES permisos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 4. TABLA PIVOTE: USUARIOS - ROLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS usuarios_roles (
    id_usuario INT NOT NULL,
    id_rol INT NOT NULL,
    asignado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_usuario, id_rol),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (id_rol) REFERENCES roles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 5. DATOS INICIALES: ROLES
-- =============================================================================

INSERT INTO roles (codigo, nombre, descripcion, nivel) VALUES
('SUPER_ADMIN', 'Super Administrador', '🔑 Control total del sistema. Puede gestionar usuarios, roles y toda la configuración.', 100),
('ADMIN', 'Administrador', '⚙️ Gestión operativa diaria. Administra solicitudes, personal y configuraciones básicas.', 75),
('OPERADOR', 'Operador', '📋 Gestión de reservas y atención al cliente. Puede crear y editar solicitudes.', 50),
('VIEWER', 'Visualizador', '👁️ Acceso de solo lectura. Puede ver solicitudes y reportes sin modificar.', 25);

-- =============================================================================
-- 6. DATOS INICIALES: PERMISOS
-- =============================================================================

-- Módulo: Solicitudes
INSERT INTO permisos (codigo, modulo, accion, descripcion) VALUES
('solicitudes.ver', 'solicitudes', 'ver', 'Ver listado y detalle de solicitudes'),
('solicitudes.crear', 'solicitudes', 'crear', 'Crear nuevas solicitudes'),
('solicitudes.editar', 'solicitudes', 'editar', 'Editar solicitudes existentes'),
('solicitudes.eliminar', 'solicitudes', 'eliminar', 'Eliminar solicitudes'),
('solicitudes.cambiar_estado', 'solicitudes', 'cambiar_estado', 'Cambiar estado de solicitudes (confirmar, cancelar, etc.)');

-- Módulo: Usuarios
INSERT INTO permisos (codigo, modulo, accion, descripcion) VALUES
('usuarios.ver', 'usuarios', 'ver', 'Ver listado de usuarios'),
('usuarios.crear', 'usuarios', 'crear', 'Crear nuevos usuarios'),
('usuarios.editar', 'usuarios', 'editar', 'Editar usuarios existentes'),
('usuarios.eliminar', 'usuarios', 'eliminar', 'Eliminar usuarios'),
('usuarios.asignar_roles', 'usuarios', 'asignar_roles', 'Asignar o quitar roles a usuarios');

-- Módulo: Configuración Alquiler
INSERT INTO permisos (codigo, modulo, accion, descripcion) VALUES
('config.alquiler', 'configuracion', 'alquiler', 'Configurar tipos de evento, precios, horarios de alquiler'),
('config.talleres', 'configuracion', 'talleres', 'Configurar talleres y actividades'),
('config.servicios', 'configuracion', 'servicios', 'Configurar servicios (depilación, etc.)'),
('config.bandas', 'configuracion', 'bandas', 'Configurar agenda de bandas');

-- Módulo: Personal
INSERT INTO permisos (codigo, modulo, accion, descripcion) VALUES
('personal.ver', 'personal', 'ver', 'Ver listado de personal'),
('personal.gestionar', 'personal', 'gestionar', 'Gestionar personal y asignaciones'),
('personal.costos', 'personal', 'costos', 'Ver y modificar costos de personal');

-- Módulo: Reportes
INSERT INTO permisos (codigo, modulo, accion, descripcion) VALUES
('reportes.ver', 'reportes', 'ver', 'Ver reportes y estadísticas'),
('reportes.exportar', 'reportes', 'exportar', 'Exportar reportes a Excel/PDF');

-- Módulo: Sistema
INSERT INTO permisos (codigo, modulo, accion, descripcion) VALUES
('sistema.configuracion', 'sistema', 'configuracion', 'Configuración general del sistema'),
('sistema.logs', 'sistema', 'logs', 'Ver logs de auditoría');

-- =============================================================================
-- 7. ASIGNACIÓN DE PERMISOS A ROLES
-- =============================================================================

-- SUPER_ADMIN: Todos los permisos
INSERT INTO roles_permisos (id_rol, id_permiso)
SELECT 
    (SELECT id FROM roles WHERE codigo = 'SUPER_ADMIN'),
    id
FROM permisos;

-- ADMIN: Todo excepto gestión de usuarios y sistema
INSERT INTO roles_permisos (id_rol, id_permiso)
SELECT 
    (SELECT id FROM roles WHERE codigo = 'ADMIN'),
    id
FROM permisos
WHERE modulo NOT IN ('sistema') 
  AND codigo NOT IN ('usuarios.crear', 'usuarios.eliminar', 'usuarios.asignar_roles');

-- OPERADOR: Solicitudes (crear/editar), personal (gestionar), bandas, talleres, servicios
INSERT INTO roles_permisos (id_rol, id_permiso)
SELECT 
    (SELECT id FROM roles WHERE codigo = 'OPERADOR'),
    id
FROM permisos
WHERE codigo IN (
    'solicitudes.ver', 'solicitudes.crear', 'solicitudes.editar', 'solicitudes.cambiar_estado',
    'personal.ver', 'personal.gestionar',
    'config.bandas', 'config.talleres', 'config.servicios',
    'reportes.ver'
);

-- VIEWER: Solo ver
INSERT INTO roles_permisos (id_rol, id_permiso)
SELECT 
    (SELECT id FROM roles WHERE codigo = 'VIEWER'),
    id
FROM permisos
WHERE accion = 'ver';

-- =============================================================================
-- 8. MIGRACIÓN: Asignar rol a usuarios existentes según su campo 'rol'
-- =============================================================================

-- Los usuarios con rol='admin' obtienen SUPER_ADMIN
INSERT INTO usuarios_roles (id_usuario, id_rol)
SELECT u.id, r.id
FROM usuarios u
CROSS JOIN roles r
WHERE u.rol = 'admin' AND r.codigo = 'SUPER_ADMIN'
ON DUPLICATE KEY UPDATE asignado_en = CURRENT_TIMESTAMP;

-- Los usuarios con rol='staff' obtienen OPERADOR
INSERT INTO usuarios_roles (id_usuario, id_rol)
SELECT u.id, r.id
FROM usuarios u
CROSS JOIN roles r
WHERE u.rol = 'staff' AND r.codigo = 'OPERADOR'
ON DUPLICATE KEY UPDATE asignado_en = CURRENT_TIMESTAMP;

-- Los usuarios con rol='cliente' obtienen VIEWER (opcional, comentar si no se desea)
-- INSERT INTO usuarios_roles (id_usuario, id_rol)
-- SELECT u.id, r.id
-- FROM usuarios u
-- CROSS JOIN roles r
-- WHERE u.rol = 'cliente' AND r.codigo = 'VIEWER'
-- ON DUPLICATE KEY UPDATE asignado_en = CURRENT_TIMESTAMP;

-- =============================================================================
-- 9. AGREGAR CAMPOS A TABLA USUARIOS (si no existen)
-- =============================================================================

-- Agregar campo 'activo' si no existe
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_SCHEMA = 'tdc_db' 
               AND TABLE_NAME = 'usuarios' 
               AND COLUMN_NAME = 'activo');
SET @query := IF(@exist = 0, 
    'ALTER TABLE usuarios ADD COLUMN activo TINYINT(1) DEFAULT 1 AFTER rol',
    'SELECT 1');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agregar campo 'ultimo_acceso' si no existe
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_SCHEMA = 'tdc_db' 
               AND TABLE_NAME = 'usuarios' 
               AND COLUMN_NAME = 'ultimo_acceso');
SET @query := IF(@exist = 0, 
    'ALTER TABLE usuarios ADD COLUMN ultimo_acceso TIMESTAMP NULL AFTER activo',
    'SELECT 1');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT '✅ Sistema de roles y permisos instalado correctamente' AS resultado;
