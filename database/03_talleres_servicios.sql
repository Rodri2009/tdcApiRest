-- =============================================================================
-- 03_talleres_servicios.sql - Tablas específicas para Talleres y Servicios
-- TDC App - Diciembre 2025
-- =============================================================================
-- Este archivo contiene las tablas especializadas para:
--   - TALLERES_ACTIVIDADES: Yoga, Danza, Arte, etc.
--   - SERVICIOS: Depilación, Masajes, etc.
-- =============================================================================

-- Configurar charset para soportar emojis
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

USE tdc_db;

-- =============================================================================
-- SECCIÓN 1: TALLERES Y ACTIVIDADES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1.1 TALLERISTAS / PROFESORES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS talleristas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    especialidad VARCHAR(255) DEFAULT NULL COMMENT 'Ej: Yoga, Danza contemporánea',
    bio TEXT COMMENT 'Biografía o descripción',
    
    -- Contacto
    telefono VARCHAR(50) DEFAULT NULL,
    email VARCHAR(255) DEFAULT NULL,
    
    -- Redes sociales
    instagram VARCHAR(255) DEFAULT NULL,
    
    -- Control
    activo TINYINT(1) DEFAULT 1,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_activo (activo),
    INDEX idx_especialidad (especialidad)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- 1.2 TALLERES (Instancias específicas de talleres)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS talleres (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Relaciones
    tipo_taller_id VARCHAR(255) NOT NULL COMMENT 'FK a opciones_tipos.id_evento',
    tallerista_id INT DEFAULT NULL COMMENT 'FK a talleristas.id',
    
    -- Información del taller
    nombre VARCHAR(255) NOT NULL COMMENT 'Ej: Yoga Restaurativo - Lunes',
    descripcion TEXT,
    
    -- Horario
    dia_semana ENUM('lunes','martes','miercoles','jueves','viernes','sabado','domingo') DEFAULT NULL,
    hora_inicio TIME DEFAULT NULL,
    hora_fin TIME DEFAULT NULL,
    duracion_minutos INT DEFAULT 60,
    
    -- Capacidad
    cupo_maximo INT DEFAULT 15,
    cupo_minimo INT DEFAULT 3 COMMENT 'Mínimo para que se dicte',
    
    -- Ubicación (si aplica)
    ubicacion VARCHAR(255) DEFAULT 'Salón TDC',
    
    -- Control
    activo TINYINT(1) DEFAULT 1,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_tipo (tipo_taller_id),
    INDEX idx_tallerista (tallerista_id),
    INDEX idx_dia (dia_semana),
    INDEX idx_activo (activo),
    
    FOREIGN KEY (tallerista_id) REFERENCES talleristas(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- 1.3 PRECIOS DE TALLERES (con vigencia)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS precios_talleres (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Puede ser precio por tipo de taller o por taller específico
    tipo_taller_id VARCHAR(255) DEFAULT NULL COMMENT 'FK a opciones_tipos.id_evento (para precios genéricos)',
    taller_id INT DEFAULT NULL COMMENT 'FK a talleres.id (para precios específicos)',
    
    -- Modalidad de cobro
    modalidad ENUM('clase_suelta','pack_4','pack_8','mensual','trimestral','anual') NOT NULL DEFAULT 'clase_suelta',
    cantidad_clases INT DEFAULT NULL COMMENT 'Cantidad de clases incluidas en el pack',
    
    -- Precio
    precio DECIMAL(10,2) NOT NULL,
    
    -- Vigencia
    vigente_desde DATE NOT NULL,
    vigente_hasta DATE DEFAULT NULL COMMENT 'NULL = vigente actualmente',
    vigente TINYINT(1) DEFAULT 1,
    
    INDEX idx_tipo (tipo_taller_id),
    INDEX idx_taller (taller_id),
    INDEX idx_modalidad (modalidad),
    INDEX idx_vigencia (vigente_desde, vigente_hasta),
    INDEX idx_vigente (vigente),
    
    FOREIGN KEY (taller_id) REFERENCES talleres(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- 1.4 INSCRIPCIONES A TALLERES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inscripciones_talleres (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    taller_id INT NOT NULL,
    precio_id INT DEFAULT NULL COMMENT 'FK al precio aplicado',
    
    -- Datos del alumno
    alumno_nombre VARCHAR(255) NOT NULL,
    alumno_telefono VARCHAR(50) DEFAULT NULL,
    alumno_email VARCHAR(255) DEFAULT NULL,
    
    -- Modalidad y pago
    modalidad VARCHAR(50) DEFAULT 'clase_suelta',
    clases_restantes INT DEFAULT NULL COMMENT 'Para packs',
    monto_pagado DECIMAL(10,2) DEFAULT 0,
    
    -- Fechas
    fecha_inscripcion DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_vencimiento DATE DEFAULT NULL COMMENT 'Cuándo vence el pack/mensual',
    
    -- Estado
    estado ENUM('activa','pausada','vencida','cancelada') DEFAULT 'activa',
    
    INDEX idx_taller (taller_id),
    INDEX idx_estado (estado),
    INDEX idx_alumno_email (alumno_email),
    
    FOREIGN KEY (taller_id) REFERENCES talleres(id) ON DELETE CASCADE,
    FOREIGN KEY (precio_id) REFERENCES precios_talleres(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- 1.5 ASISTENCIAS A TALLERES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS asistencias_talleres (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    inscripcion_id INT NOT NULL,
    taller_id INT NOT NULL,
    
    fecha DATE NOT NULL,
    asistio TINYINT(1) DEFAULT 1,
    notas VARCHAR(255) DEFAULT NULL,
    
    INDEX idx_inscripcion (inscripcion_id),
    INDEX idx_taller_fecha (taller_id, fecha),
    
    FOREIGN KEY (inscripcion_id) REFERENCES inscripciones_talleres(id) ON DELETE CASCADE,
    FOREIGN KEY (taller_id) REFERENCES talleres(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- =============================================================================
-- SECCIÓN 2: SERVICIOS (Depilación, Masajes, etc.)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 2.1 PROFESIONALES DE SERVICIOS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profesionales_servicios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    especialidad VARCHAR(255) DEFAULT NULL COMMENT 'Ej: Depilación, Masajes, Estética',
    
    -- Contacto
    telefono VARCHAR(50) DEFAULT NULL,
    email VARCHAR(255) DEFAULT NULL,
    
    -- Horarios de trabajo
    dias_trabaja VARCHAR(100) DEFAULT NULL COMMENT 'Ej: lunes,miercoles,viernes',
    hora_inicio TIME DEFAULT '09:00:00',
    hora_fin TIME DEFAULT '18:00:00',
    
    -- Control
    activo TINYINT(1) DEFAULT 1,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_activo (activo),
    INDEX idx_especialidad (especialidad)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- 2.2 SERVICIOS ESPECÍFICOS (con duración y precio)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS servicios_catalogo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Relación con tipo general
    tipo_servicio_id VARCHAR(255) NOT NULL COMMENT 'FK a opciones_tipos.id_evento',
    
    -- Información del servicio
    nombre VARCHAR(255) NOT NULL COMMENT 'Ej: Depilación Piernas Completas',
    descripcion TEXT,
    
    -- Duración
    duracion_minutos INT NOT NULL DEFAULT 60,
    
    -- Control
    activo TINYINT(1) DEFAULT 1,
    orden INT DEFAULT 0 COMMENT 'Para ordenar en listados',
    
    INDEX idx_tipo (tipo_servicio_id),
    INDEX idx_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- 2.3 PRECIOS DE SERVICIOS (con vigencia)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS precios_servicios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    servicio_id INT NOT NULL COMMENT 'FK a servicios_catalogo.id',
    
    -- Precio
    precio DECIMAL(10,2) NOT NULL,
    
    -- Vigencia
    vigente_desde DATE NOT NULL,
    vigente_hasta DATE DEFAULT NULL COMMENT 'NULL = vigente actualmente',
    vigente TINYINT(1) DEFAULT 1,
    
    INDEX idx_servicio (servicio_id),
    INDEX idx_vigencia (vigente_desde, vigente_hasta),
    INDEX idx_vigente (vigente),
    
    FOREIGN KEY (servicio_id) REFERENCES servicios_catalogo(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- 2.4 AGENDA / TURNOS DE SERVICIOS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS turnos_servicios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Relaciones
    profesional_id INT NOT NULL COMMENT 'FK a profesionales_servicios.id',
    servicio_id INT NOT NULL COMMENT 'FK a servicios_catalogo.id',
    precio_id INT DEFAULT NULL COMMENT 'FK al precio aplicado',
    
    -- Fecha y hora
    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    
    -- Cliente
    cliente_nombre VARCHAR(255) DEFAULT NULL,
    cliente_telefono VARCHAR(50) DEFAULT NULL,
    cliente_email VARCHAR(255) DEFAULT NULL,
    
    -- Pago
    monto DECIMAL(10,2) DEFAULT NULL,
    pagado TINYINT(1) DEFAULT 0,
    metodo_pago VARCHAR(50) DEFAULT NULL COMMENT 'efectivo, transferencia, tarjeta',
    
    -- Estado
    estado ENUM('disponible','reservado','confirmado','en_curso','completado','cancelado','no_asistio') DEFAULT 'disponible',
    notas TEXT,
    
    -- Control
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_profesional (profesional_id),
    INDEX idx_servicio (servicio_id),
    INDEX idx_fecha (fecha),
    INDEX idx_estado (estado),
    INDEX idx_profesional_fecha (profesional_id, fecha),
    
    FOREIGN KEY (profesional_id) REFERENCES profesionales_servicios(id) ON DELETE CASCADE,
    FOREIGN KEY (servicio_id) REFERENCES servicios_catalogo(id) ON DELETE CASCADE,
    FOREIGN KEY (precio_id) REFERENCES precios_servicios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =============================================================================
-- DATOS INICIALES DE EJEMPLO
-- =============================================================================

-- Tipos de Taller (en opciones_tipos)
INSERT IGNORE INTO opciones_tipos (id_evento, nombre_para_mostrar, descripcion, categoria, es_publico) VALUES
('YOGA', 'Yoga', 'Clases de yoga para todos los niveles', 'TALLERES_ACTIVIDADES', 1),
('DANZA', 'Danza', 'Clases de danza y expresión corporal', 'TALLERES_ACTIVIDADES', 1),
('ARTE', 'Arte y Manualidades', 'Talleres de arte, pintura y manualidades', 'TALLERES_ACTIVIDADES', 1),
('MUSICA', 'Música', 'Clases de instrumentos y canto', 'TALLERES_ACTIVIDADES', 1);

-- Tipos de Servicio (en opciones_tipos)
INSERT IGNORE INTO opciones_tipos (id_evento, nombre_para_mostrar, descripcion, categoria, es_publico) VALUES
('DEPILACION', 'Depilación', 'Servicios de depilación', 'SERVICIOS', 1),
('MASAJES', 'Masajes', 'Masajes relajantes y terapéuticos', 'SERVICIOS', 1),
('ESTETICA', 'Estética', 'Tratamientos de estética y belleza', 'SERVICIOS', 1);

-- Ejemplo de tallerista
INSERT INTO talleristas (nombre, especialidad, telefono, email, activo) VALUES
('María García', 'Yoga, Meditación', '1155551234', 'maria@ejemplo.com', 1);

-- Ejemplo de taller
INSERT INTO talleres (tipo_taller_id, tallerista_id, nombre, dia_semana, hora_inicio, hora_fin, duracion_minutos, cupo_maximo) VALUES
('YOGA', 1, 'Yoga Restaurativo - Lunes', 'lunes', '10:00:00', '11:00:00', 60, 12);

-- Precios de ejemplo para talleres
INSERT INTO precios_talleres (tipo_taller_id, modalidad, cantidad_clases, precio, vigente_desde) VALUES
('YOGA', 'clase_suelta', 1, 5000.00, '2025-01-01'),
('YOGA', 'pack_4', 4, 16000.00, '2025-01-01'),
('YOGA', 'pack_8', 8, 28000.00, '2025-01-01'),
('YOGA', 'mensual', NULL, 35000.00, '2025-01-01');

-- Ejemplo de profesional de servicios
INSERT INTO profesionales_servicios (nombre, especialidad, telefono, dias_trabaja, hora_inicio, hora_fin) VALUES
('Laura Martínez', 'Depilación, Estética', '1155559876', 'lunes,miercoles,viernes', '10:00:00', '18:00:00');

-- Servicios de ejemplo
INSERT INTO servicios_catalogo (tipo_servicio_id, nombre, duracion_minutos, orden) VALUES
('DEPILACION', 'Depilación Piernas Completas', 45, 1),
('DEPILACION', 'Depilación Cavado', 20, 2),
('DEPILACION', 'Depilación Axilas', 15, 3),
('DEPILACION', 'Depilación Bozo', 10, 4),
('MASAJES', 'Masaje Relajante 60min', 60, 1),
('MASAJES', 'Masaje Descontracturante 60min', 60, 2);

-- Precios de servicios de ejemplo
INSERT INTO precios_servicios (servicio_id, precio, vigente_desde) VALUES
(1, 15000.00, '2025-01-01'),  -- Piernas Completas
(2, 8000.00, '2025-01-01'),   -- Cavado
(3, 5000.00, '2025-01-01'),   -- Axilas
(4, 3000.00, '2025-01-01'),   -- Bozo
(5, 20000.00, '2025-01-01'),  -- Masaje Relajante
(6, 22000.00, '2025-01-01');  -- Masaje Descontracturante

-- =============================================================================
-- FIN DEL ARCHIVO
-- =============================================================================
