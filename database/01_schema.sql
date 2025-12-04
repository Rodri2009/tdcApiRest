-- =============================================================================
-- TDC App - Schema Principal Refactorizado
-- =============================================================================
-- LÓGICA DE NEGOCIO:
-- 4 tipos de clientes → 4 categorías de eventos:
--   1. ALQUILER_SALON → 6 subtipos (INFANTILES, ADOLESCENTES, etc.) → page.html
--   2. FECHA_BANDAS   → Para bandas que alquilan el salón → agenda_de_bandas.html
--   3. TALLERES       → Futuro
--   4. SERVICIO       → Depilación, etc. (futuro)
--
-- Versión: Diciembre 2025
-- =============================================================================

-- Crear y usar la base de datos
CREATE DATABASE IF NOT EXISTS tdc_db CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE tdc_db;

-- =============================================================================
-- 1. TABLAS DE CATÁLOGOS / CONFIGURACIÓN
-- =============================================================================

-- Tipos de eventos con su categoría padre
-- Ejemplo: INFANTILES → ALQUILER_SALON, FECHA_BANDAS → FECHA_BANDAS
CREATE TABLE IF NOT EXISTS opciones_tipos (
    id_evento VARCHAR(255) PRIMARY KEY COMMENT 'ID del tipo/subtipo: INFANTILES, FECHA_BANDAS, etc.',
    nombre_para_mostrar VARCHAR(255) NOT NULL COMMENT 'Nombre amigable para UI',
    descripcion TEXT COMMENT 'Descripción detallada del tipo de evento',
    categoria VARCHAR(50) NOT NULL COMMENT 'Categoría: ALQUILER_SALON, FECHA_BANDAS, TALLERES, SERVICIO',
    es_publico TINYINT(1) DEFAULT 1 COMMENT '1=Visible para clientes, 0=Solo admin',
    INDEX idx_categoria (categoria),
    INDEX idx_es_publico (es_publico)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Precios por tipo de evento y duración
CREATE TABLE IF NOT EXISTS precios_vigencia (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_evento VARCHAR(255) NOT NULL COMMENT 'Referencia a opciones_tipos.id_evento',
    id_duracion INT NOT NULL COMMENT 'Duración en horas (4, 5, 6, etc.)',
    precio_anticipado DECIMAL(10,2) NOT NULL,
    precio_puerta DECIMAL(10,2) NOT NULL,
    vigente_desde DATE NOT NULL,
    vigente_hasta DATE DEFAULT NULL COMMENT 'NULL = vigente actualmente',
    UNIQUE KEY uk_evento_duracion_vigencia (id_evento, id_duracion, vigente_desde),
    INDEX idx_evento (id_evento),
    INDEX idx_vigencia (vigente_desde, vigente_hasta)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Duraciones disponibles por tipo de evento
CREATE TABLE IF NOT EXISTS opciones_duracion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_evento VARCHAR(255) NOT NULL,
    duracion_horas INT NOT NULL,
    descripcion VARCHAR(100) DEFAULT NULL,
    UNIQUE KEY uk_evento_duracion (id_evento, duracion_horas),
    INDEX idx_evento (id_evento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Horarios disponibles por tipo de evento y día
CREATE TABLE IF NOT EXISTS configuracion_horarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_evento VARCHAR(255) NOT NULL,
    dia_semana VARCHAR(20) NOT NULL COMMENT 'lunes, martes, etc.',
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    UNIQUE KEY uk_evento_dia (id_evento, dia_semana),
    INDEX idx_evento (id_evento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Servicios adicionales (inflables, manteles, etc.)
CREATE TABLE IF NOT EXISTS opciones_adicionales (
    nombre VARCHAR(255) PRIMARY KEY,
    precio DECIMAL(10,2) NOT NULL,
    descripcion TEXT,
    url_imagen TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =============================================================================
-- 2. TABLAS DE USUARIOS Y AUTENTICACIÓN
-- =============================================================================

CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(255),
    rol ENUM('admin', 'staff', 'cliente') DEFAULT 'cliente',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =============================================================================
-- 3. TABLAS DE PERSONAL
-- =============================================================================

-- Personal disponible para eventos
CREATE TABLE IF NOT EXISTS personal_disponible (
    id_personal VARCHAR(50) PRIMARY KEY,
    nombre_completo VARCHAR(255) NOT NULL,
    rol VARCHAR(255) NOT NULL COMMENT 'Roles separados por coma: Encargada,Puerta,Cocinera',
    celular VARCHAR(50),
    activo TINYINT(1) DEFAULT 1,
    cvu_alias VARCHAR(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Roles requeridos por tipo de evento (según cantidad de personas)
CREATE TABLE IF NOT EXISTS roles_por_evento (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_evento VARCHAR(255) NOT NULL,
    rol_requerido VARCHAR(100) NOT NULL,
    cantidad INT DEFAULT 1,
    min_personas INT NOT NULL DEFAULT 0,
    max_personas INT NOT NULL DEFAULT 120,
    INDEX idx_evento (id_evento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =============================================================================
-- 4. TABLAS DE SOLICITUDES
-- =============================================================================

-- Solicitudes de eventos (principal)
CREATE TABLE IF NOT EXISTS solicitudes (
    id_solicitud INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Tipo de evento (CLAVE: debe ser el subtipo como INFANTILES, no la categoría)
    tipo_de_evento VARCHAR(50) NOT NULL DEFAULT 'ALQUILER_SALON' COMMENT 'Categoría: ALQUILER_SALON, FECHA_BANDAS, etc.',
    tipo_servicio VARCHAR(255) DEFAULT NULL COMMENT 'Subtipo: INFANTILES, CON_SERVICIO_DE_MESA, etc.',
    
    -- Visibilidad
    es_publico TINYINT(1) DEFAULT 0 COMMENT '1=Visible en agenda pública',
    
    -- Datos del evento
    fecha_hora DATETIME DEFAULT NULL COMMENT 'Timestamp de creación',
    fecha_evento DATE DEFAULT NULL,
    hora_evento VARCHAR(20) DEFAULT NULL,
    duracion VARCHAR(100) DEFAULT NULL,
    cantidad_de_personas VARCHAR(100) DEFAULT NULL,
    
    -- Precios
    precio_basico DECIMAL(10,2) DEFAULT NULL,
    precio_final DECIMAL(10,2) DEFAULT NULL,
    
    -- Datos del cliente
    nombre_completo VARCHAR(255) DEFAULT NULL,
    telefono VARCHAR(50) DEFAULT NULL,
    email VARCHAR(255) DEFAULT NULL,
    descripcion TEXT COMMENT 'Notas o requerimientos especiales',
    
    -- Estado
    estado VARCHAR(50) DEFAULT 'Solicitado' COMMENT 'Solicitado, Contactado, Confirmado, Cancelado',
    
    -- Control
    fingerprintid VARCHAR(255) DEFAULT NULL,
    
    INDEX idx_tipo (tipo_de_evento),
    INDEX idx_tipo_servicio (tipo_servicio),
    INDEX idx_fecha (fecha_evento),
    INDEX idx_estado (estado),
    INDEX idx_es_publico (es_publico)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Adicionales seleccionados en una solicitud
CREATE TABLE IF NOT EXISTS solicitudes_adicionales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_solicitud INT NOT NULL,
    nombre_adicional VARCHAR(255) NOT NULL,
    precio_adicional DECIMAL(10,2) NOT NULL,
    INDEX idx_solicitud (id_solicitud),
    FOREIGN KEY (id_solicitud) REFERENCES solicitudes(id_solicitud) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Personal asignado a una solicitud
CREATE TABLE IF NOT EXISTS solicitudes_personal (
    id VARCHAR(50) PRIMARY KEY,
    id_solicitud INT NOT NULL,
    id_personal VARCHAR(50) DEFAULT NULL COMMENT 'FK a personal_disponible',
    rol_requerido VARCHAR(100) NOT NULL,
    estado VARCHAR(50) DEFAULT 'pendiente' COMMENT 'pendiente, asignado, confirmado',
    INDEX idx_solicitud (id_solicitud),
    FOREIGN KEY (id_solicitud) REFERENCES solicitudes(id_solicitud) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =============================================================================
-- 5. TABLAS DE EVENTOS (Para FECHA_BANDAS)
-- =============================================================================

-- Eventos de bandas confirmados
CREATE TABLE IF NOT EXISTS eventos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tipo_evento ENUM('ALQUILER','BANDA','TALLER','SERVICIO','OTRO') NOT NULL DEFAULT 'BANDA',
    
    -- Información del show (visible para el público)
    nombre_banda VARCHAR(255) NOT NULL COMMENT 'Nombre del artista/banda - título del evento',
    genero_musical VARCHAR(100) DEFAULT NULL COMMENT 'Género: Rock, Jazz, Cumbia, Electrónica, etc.',
    descripcion TEXT,
    url_imagen VARCHAR(500) DEFAULT NULL COMMENT 'URL del flyer del evento',
    
    -- Datos del contacto/organizador (quien solicita la fecha)
    nombre_contacto VARCHAR(255) DEFAULT NULL COMMENT 'Nombre del organizador/contacto',
    email_contacto VARCHAR(255) DEFAULT NULL,
    telefono_contacto VARCHAR(50) DEFAULT NULL,
    
    -- Fecha y horarios
    fecha DATE NOT NULL,
    hora_inicio TIME DEFAULT NULL,
    hora_fin TIME DEFAULT NULL,
    
    -- Precios
    precio_base DECIMAL(10,2) DEFAULT 0.00,
    precio_anticipada DECIMAL(10,2) DEFAULT NULL,
    precio_puerta DECIMAL(10,2) DEFAULT NULL,
    aforo_maximo INT DEFAULT 120,
    
    -- Estado y control
    estado VARCHAR(50) DEFAULT 'Solicitado' COMMENT 'Solicitado, Confirmado, Cancelado, Finalizado',
    es_publico TINYINT(1) DEFAULT 1,
    activo TINYINT(1) DEFAULT 1,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_tipo_fecha (tipo_evento, fecha),
    INDEX idx_fecha (fecha),
    INDEX idx_activo (activo),
    INDEX idx_es_publico (es_publico)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Bandas invitadas a un evento
CREATE TABLE IF NOT EXISTS bandas_invitadas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_evento INT NOT NULL,
    nombre_banda VARCHAR(255) NOT NULL,
    hora_show TIME DEFAULT NULL,
    estado ENUM('invitada','confirmada','cancelada') DEFAULT 'invitada',
    orden_show INT DEFAULT 0,
    INDEX idx_evento (id_evento),
    FOREIGN KEY (id_evento) REFERENCES eventos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Personal asignado a eventos de bandas
CREATE TABLE IF NOT EXISTS eventos_personal (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_evento INT NOT NULL,
    id_personal VARCHAR(50) DEFAULT NULL,
    rol VARCHAR(100) NOT NULL,
    fecha DATE NOT NULL,
    hora_inicio TIME DEFAULT NULL,
    hora_fin TIME DEFAULT NULL,
    INDEX idx_evento (id_evento),
    FOREIGN KEY (id_evento) REFERENCES eventos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =============================================================================
-- 6. TABLAS DE TICKETS Y CUPONES (Para eventos de bandas)
-- =============================================================================

CREATE TABLE IF NOT EXISTS tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    evento_id INT NOT NULL,
    nombre_comprador VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    cantidad INT DEFAULT 1,
    tipo_precio ENUM('ANTICIPADA', 'PUERTA') DEFAULT 'ANTICIPADA',
    total DECIMAL(10,2) NOT NULL,
    codigo_cupon VARCHAR(50) DEFAULT NULL,
    descuento_aplicado DECIMAL(10,2) DEFAULT 0,
    codigo_confirmacion VARCHAR(20) NOT NULL UNIQUE,
    estado ENUM('pendiente', 'pagado', 'utilizado', 'cancelado') DEFAULT 'pendiente',
    comprado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_evento (evento_id),
    FOREIGN KEY (evento_id) REFERENCES eventos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS cupones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    tipo_descuento ENUM('PORCENTAJE', 'MONTO_FIJO') NOT NULL,
    valor_fijo DECIMAL(10,2) DEFAULT NULL,
    porcentaje_descuento DECIMAL(5,2) DEFAULT NULL,
    usos_maximos INT DEFAULT NULL COMMENT 'NULL = ilimitado',
    usos_actuales INT DEFAULT 0,
    fecha_expiracion DATE DEFAULT NULL COMMENT 'NULL = no expira',
    activo TINYINT(1) DEFAULT 1,
    aplica_a ENUM('TODAS', 'ANTICIPADA', 'PUERTA') DEFAULT 'TODAS',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =============================================================================
-- FIN DEL SCHEMA
-- =============================================================================
