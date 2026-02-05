-- =============================================================================
-- TDC App - Schema Principal Refactorizado
-- =============================================================================
-- LÓGICA DE NEGOCIO:
-- 4 categorías principales de eventos/servicios:
--   1. ALQUILER_SALON      → Subtipos: INFANTILES, ADOLESCENTES, CON_SERVICIO_DE_MESA, etc.
--   2. FECHA_BANDAS        → Alquiler para bandas/eventos musicales
--   3. TALLERES_ACTIVIDADES → Talleres y actividades (futuro)
--   4. SERVICIOS           → Depilación, etc.
--
-- Versión: Diciembre 2025
-- =============================================================================

-- Configurar charset para soportar emojis (caracteres de 4 bytes)
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- Crear y usar la base de datos
CREATE DATABASE IF NOT EXISTS tdc_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
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
    categoria VARCHAR(50) NOT NULL COMMENT 'ALQUILER_SALON, FECHA_BANDAS, TALLERES_ACTIVIDADES, SERVICIOS',
    es_publico TINYINT(1) DEFAULT 1 COMMENT '1=Visible para clientes, 0=Solo admin',
    monto_sena DECIMAL(10,2) DEFAULT NULL COMMENT 'Monto de seña requerido',
    deposito DECIMAL(10,2) DEFAULT NULL COMMENT 'Depósito de garantía',
    INDEX idx_categoria (categoria),
    INDEX idx_es_publico (es_publico)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Configuración general del sistema
CREATE TABLE IF NOT EXISTS configuracion (
    Clave VARCHAR(100) PRIMARY KEY,
    Valor TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Precios por tipo de evento y rango de cantidad de personas
-- El precio final se calcula: precio_por_hora × duracion_horas
CREATE TABLE IF NOT EXISTS precios_vigencia (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_evento VARCHAR(255) NOT NULL COMMENT 'Referencia a opciones_tipos.id_evento',
    cantidad_min INT NOT NULL DEFAULT 1 COMMENT 'Cantidad mínima de personas',
    cantidad_max INT NOT NULL COMMENT 'Cantidad máxima de personas',
    precio_por_hora DECIMAL(10,2) NOT NULL COMMENT 'Precio base por hora',
    vigente_desde DATE NOT NULL,
    vigente_hasta DATE DEFAULT NULL COMMENT 'NULL = vigente actualmente',
    UNIQUE KEY uk_precio (id_evento, cantidad_min, cantidad_max, vigente_desde),
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
-- dia_semana puede ser 'todos' (aplica a cualquier día) o día específico como 'sabado'
CREATE TABLE IF NOT EXISTS configuracion_horarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_evento VARCHAR(255) NOT NULL,
    dia_semana VARCHAR(20) NOT NULL COMMENT 'todos, lunes, martes, ..., sabado, domingo',
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    UNIQUE KEY uk_evento_dia_hora (id_evento, dia_semana, hora_inicio),
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
    activo TINYINT(1) NOT NULL DEFAULT 1,
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

-- Catálogo de roles de personal (para CRUD independiente)
CREATE TABLE IF NOT EXISTS catalogo_roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion VARCHAR(255) DEFAULT NULL,
    activo TINYINT(1) DEFAULT 1,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Costos de personal por rol y fecha de vigencia
CREATE TABLE IF NOT EXISTS costos_personal_vigencia (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rol VARCHAR(100) NOT NULL,
    fecha_de_vigencia DATE NOT NULL,
    costo_por_hora DECIMAL(10,2) NOT NULL,
    viaticos DECIMAL(10,2) DEFAULT 0,
    UNIQUE KEY uk_rol_vigencia (rol, fecha_de_vigencia),
    INDEX idx_rol (rol),
    INDEX idx_vigencia (fecha_de_vigencia)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =============================================================================
-- 4. TABLAS DE SOLICITUDES
-- =============================================================================

-- Tabla general para solicitudes
CREATE TABLE IF NOT EXISTS solicitudes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    categoria ENUM('ALQUILER', 'BANDA', 'BANDAS', 'SERVICIOS', 'TALLERES') NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(50) DEFAULT 'Solicitado',
    es_publico TINYINT(1) DEFAULT 0 COMMENT 'Visibilidad pública por defecto para la solicitud (padre)',
    descripcion TEXT,
    nombre_solicitante VARCHAR(255),
    telefono_solicitante VARCHAR(50),
    email_solicitante VARCHAR(255),
    INDEX idx_categoria (categoria),
    INDEX idx_estado (estado),
    INDEX idx_es_publico (es_publico)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Tabla específica para solicitudes de alquiler
CREATE TABLE IF NOT EXISTS solicitudes_alquiler (
    id_solicitud INT PRIMARY KEY,
    tipo_servicio VARCHAR(255),
    fecha_evento DATE,
    hora_evento VARCHAR(20),
    duracion VARCHAR(100),
    cantidad_de_personas VARCHAR(100),
    precio_basico DECIMAL(10,2),
    precio_final DECIMAL(10,2),
    es_publico_cuando_confirmada TINYINT(1) DEFAULT 0 COMMENT '1=Mostrar en agenda pública si se confirma',
    tipo_de_evento VARCHAR(50) NOT NULL,
    nombre_completo VARCHAR(255),
    telefono VARCHAR(50),
    email VARCHAR(255),
    descripcion TEXT,
    estado VARCHAR(50) DEFAULT 'Solicitado',
    FOREIGN KEY (id_solicitud) REFERENCES solicitudes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Tabla específica para solicitudes de bandas

-- Tabla específica para solicitudes de servicios
CREATE TABLE IF NOT EXISTS solicitudes_servicios (
    id_solicitud INT PRIMARY KEY,
    tipo_servicio VARCHAR(255),
    fecha_evento DATE,
    hora_evento VARCHAR(20),
    duracion VARCHAR(100),
    precio DECIMAL(10,2),
    es_publico_cuando_confirmada TINYINT(1) DEFAULT 0 COMMENT '1=Mostrar en agenda pública si se confirma',
    FOREIGN KEY (id_solicitud) REFERENCES solicitudes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Tabla específica para solicitudes de talleres
CREATE TABLE IF NOT EXISTS solicitudes_talleres (
    id_solicitud INT PRIMARY KEY,
    nombre_taller VARCHAR(255),
    fecha_evento DATE,
    hora_evento VARCHAR(20),
    duracion VARCHAR(100),
    precio DECIMAL(10,2),
    es_publico_cuando_confirmada TINYINT(1) DEFAULT 0 COMMENT '1=Mostrar en agenda pública si se confirma',
    FOREIGN KEY (id_solicitud) REFERENCES solicitudes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =============================================================================
-- TABLA UNIFICADA DE EVENTOS CONFIRMADOS
-- =============================================================================

CREATE TABLE IF NOT EXISTS eventos_confirmados (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_solicitud INT NOT NULL COMMENT 'ID de la solicitud original',
    tipo_evento ENUM('ALQUILER_SALON', 'BANDA', 'SERVICIO', 'TALLER') NOT NULL,
    tabla_origen VARCHAR(50) NOT NULL COMMENT 'solicitudes_alquiler, solicitudes_bandas, solicitudes_servicios, solicitudes_talleres',
    
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
    genero_musical VARCHAR(255) COMMENT 'Solo para BANDA',
    cantidad_personas INT COMMENT 'Solo para ALQUILER_SALON/BANDA',
    tipo_servicio VARCHAR(255) COMMENT 'Solo para SERVICIO',
    nombre_taller VARCHAR(255) COMMENT 'Solo para TALLER',
    
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
    UNIQUE KEY uk_solicitud_tipo (id_solicitud, tipo_evento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Eventos confirmados unificados de todas las solicitudes';

-- Fechas de bandas confirmadas (DEPRECATED)
-- La tabla original `fechas_bandas_confirmadas` fue migrada a `eventos_confirmados`.
-- No crear la tabla legacy por defecto; si necesitas recuperar datos migrados,
-- revisa `database/migrations/20260204_migrate_fechas_to_eventos.sql` y las tablas
-- `backup_fechas_bandas_confirmadas` / `fechas_bandas_confirmadas_deprecated`.
--
-- Nota: Antes de volver a habilitar la creación de `fechas_bandas_confirmadas`,
-- actualiza las FK y dependencias para que no colisionen con `eventos_confirmados`.
-- (La presencia de la definición legacy puede causar inconsistencias en instalaciones nuevas.)


-- =============================================================================
-- 5.1 CATÁLOGO DE BANDAS/ARTISTAS
-- =============================================================================

-- Catálogo maestro de bandas/artistas (pueden registrarse solos o ser agregados por admin)
CREATE TABLE IF NOT EXISTS bandas_artistas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL COMMENT 'Nombre de la banda o artista',
    genero_musical VARCHAR(100) DEFAULT NULL COMMENT 'Rock, Jazz, Cumbia, etc.',
    bio TEXT COMMENT 'Biografía o descripción',
    
    -- Redes sociales y links
    instagram VARCHAR(255) DEFAULT NULL,
    facebook VARCHAR(255) DEFAULT NULL,
    twitter VARCHAR(255) DEFAULT NULL,
    tiktok VARCHAR(255) DEFAULT NULL,
    web_oficial VARCHAR(500) DEFAULT NULL,
    youtube VARCHAR(500) DEFAULT NULL COMMENT 'Canal o video destacado',
    spotify VARCHAR(500) DEFAULT NULL COMMENT 'Perfil o playlist',
    otras_redes TEXT COMMENT 'JSON con otras redes/links',
    
    -- Imagen/Logo
    logo_url VARCHAR(500) DEFAULT NULL COMMENT 'URL del logo subido',
    foto_prensa_url VARCHAR(500) DEFAULT NULL COMMENT 'Foto de prensa',
    
    -- Datos de contacto (del manager/representante)
    contacto_nombre VARCHAR(255) DEFAULT NULL,
    contacto_email VARCHAR(255) DEFAULT NULL,
    contacto_telefono VARCHAR(50) DEFAULT NULL,
    contacto_rol VARCHAR(100) DEFAULT NULL COMMENT 'Manager, Líder, Prensa, etc.',
    
    -- Control
    verificada TINYINT(1) DEFAULT 0 COMMENT '1=Verificada por admin',
    activa TINYINT(1) DEFAULT 1,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_nombre (nombre),
    INDEX idx_genero (genero_musical),
    INDEX idx_activa (activa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Formación/Integrantes de una banda (instrumentos y roles)
CREATE TABLE IF NOT EXISTS bandas_formacion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_banda INT NOT NULL,
    nombre_integrante VARCHAR(255) DEFAULT NULL COMMENT 'Nombre del músico (opcional)',
    instrumento VARCHAR(100) NOT NULL COMMENT 'Guitarra, Bajo, Batería, Voz, Teclado, etc.',
    es_lider TINYINT(1) DEFAULT 0 COMMENT '1=Es el líder/frontman',
    notas VARCHAR(255) DEFAULT NULL COMMENT 'Ej: Guitarra rítmica, Segunda voz',
    INDEX idx_banda (id_banda),
    FOREIGN KEY (id_banda) REFERENCES bandas_artistas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Catálogo de instrumentos disponibles (para autocompletado)
CREATE TABLE IF NOT EXISTS catalogo_instrumentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    categoria VARCHAR(50) DEFAULT NULL COMMENT 'Cuerdas, Percusión, Vientos, Electrónico, Voz',
    icono VARCHAR(50) DEFAULT NULL COMMENT 'Nombre del icono (fa-guitar, etc.)'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =============================================================================
-- 5.2 LINEUP DE EVENTOS (Relación entre eventos y bandas)
-- =============================================================================

-- Lineup: qué bandas tocan en qué evento y en qué orden
CREATE TABLE IF NOT EXISTS eventos_lineup (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_evento INT NOT NULL,
    id_banda INT DEFAULT NULL COMMENT 'FK a bandas_artistas (NULL si es solo nombre)',
    nombre_banda VARCHAR(255) NOT NULL COMMENT 'Nombre (redundante si id_banda existe, necesario si no)',
    
    -- Orden y rol en el evento
    orden_show INT NOT NULL DEFAULT 0 COMMENT '0=telonero, 1, 2..., último=principal',
    es_principal TINYINT(1) DEFAULT 0 COMMENT '1=Banda principal (cierra)',
    es_solicitante TINYINT(1) DEFAULT 0 COMMENT '1=Es quien solicitó la fecha',
    
    -- Horario específico de esta banda
    hora_inicio TIME DEFAULT NULL,
    hora_fin TIME DEFAULT NULL,
    duracion_minutos INT DEFAULT NULL,
    
    -- Estado
    estado ENUM('invitada','confirmada','cancelada') DEFAULT 'invitada',
    notas TEXT,
    
    INDEX idx_evento (id_evento),
    INDEX idx_banda (id_banda),
    INDEX idx_orden (id_evento, orden_show),
    FOREIGN KEY (id_evento) REFERENCES eventos_confirmados(id) ON DELETE CASCADE,
    FOREIGN KEY (id_banda) REFERENCES bandas_artistas(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Bandas invitadas por evento (hasta 3 adicionales a la principal)
CREATE TABLE IF NOT EXISTS eventos_bandas_invitadas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_evento INT NOT NULL,
    id_banda INT DEFAULT NULL COMMENT 'FK si la banda existe en catálogo',
    nombre_banda VARCHAR(255) NOT NULL,
    orden TINYINT DEFAULT 1 COMMENT 'Orden de invitada: 1, 2 o 3',
    
    INDEX idx_evento (id_evento),
    INDEX idx_banda (id_banda),
    FOREIGN KEY (id_evento) REFERENCES eventos_confirmados(id) ON DELETE CASCADE,
    FOREIGN KEY (id_banda) REFERENCES bandas_artistas(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Eliminar tabla vieja si existe (migración)
DROP TABLE IF EXISTS bandas_invitadas;

-- =============================================================================
-- 5.3 SOLICITUDES DE FECHAS PARA BANDAS
-- =============================================================================

-- Solicitudes de bandas (consolidado con campos comunes)
CREATE TABLE IF NOT EXISTS solicitudes_bandas (
    id_solicitud INT AUTO_INCREMENT PRIMARY KEY,

    -- Campos comunes con solicitudes_alquiler
    tipo_de_evento VARCHAR(50) NOT NULL DEFAULT 'FECHA_BANDAS',
    tipo_servicio VARCHAR(255) DEFAULT NULL,
    es_publico TINYINT(1) DEFAULT 0,
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

    -- Campos específicos de bandas
    id_banda INT DEFAULT NULL COMMENT 'FK si la banda ya existe en catálogo',
    genero_musical VARCHAR(100) DEFAULT NULL,
    formacion_json TEXT COMMENT 'JSON con instrumentos: [{instrumento, cantidad, notas}]',

    -- Links y redes
    instagram VARCHAR(255) DEFAULT NULL,
    facebook VARCHAR(255) DEFAULT NULL,
    youtube VARCHAR(500) DEFAULT NULL,
    spotify VARCHAR(500) DEFAULT NULL,
    otras_redes TEXT,
    logo_url VARCHAR(500) DEFAULT NULL,

    -- Contacto adicional
    contacto_rol VARCHAR(100) DEFAULT NULL,

    -- Propuesta de fecha (alternativas)
    fecha_alternativa DATE DEFAULT NULL,

    -- Bandas invitadas
    invitadas_json TEXT COMMENT 'JSON: [{nombre, id_banda?, confirmada}]',
    cantidad_bandas INT DEFAULT 1,

    -- Propuesta económica adicional
    precio_puerta_propuesto DECIMAL(10,2) DEFAULT NULL,
    expectativa_publico VARCHAR(100) DEFAULT NULL,

    -- Estado y control
    notas_admin TEXT,
    id_evento_generado INT DEFAULT NULL,
    es_publico_cuando_confirmada TINYINT(1) DEFAULT 0 COMMENT '1=Mostrar en agenda pública si se confirma',

    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_tipo (tipo_de_evento),
    INDEX idx_fecha (fecha_evento),
    INDEX idx_estado (estado),
    INDEX idx_banda (id_banda),
    FOREIGN KEY (id_banda) REFERENCES bandas_artistas(id) ON DELETE SET NULL
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
    FOREIGN KEY (id_evento) REFERENCES eventos_confirmados(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =============================================================================
-- 6. TABLAS DE TALLERES
-- =============================================================================

-- Talleristas (instructores)
CREATE TABLE IF NOT EXISTS talleristas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    especialidad VARCHAR(255),
    bio TEXT,
    telefono VARCHAR(50),
    email VARCHAR(255),
    instagram VARCHAR(255),
    activo TINYINT(1) DEFAULT 1,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_activo (activo),
    INDEX idx_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Talleres disponibles
CREATE TABLE IF NOT EXISTS talleres (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tipo_taller_id VARCHAR(255) NOT NULL COMMENT 'FK a opciones_tipos.id_evento',
    tallerista_id INT COMMENT 'FK a talleristas.id',
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    dia_semana VARCHAR(20) COMMENT 'lunes, martes, etc.',
    hora_inicio TIME,
    hora_fin TIME,
    duracion_minutos INT DEFAULT 60,
    cupo_maximo INT DEFAULT 15,
    cupo_minimo INT DEFAULT 3,
    ubicacion VARCHAR(255) DEFAULT 'Salón TDC',
    activo TINYINT(1) DEFAULT 1,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tipo (tipo_taller_id),
    INDEX idx_tallerista (tallerista_id),
    INDEX idx_activo (activo),
    INDEX idx_dia (dia_semana)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Precios de talleres
CREATE TABLE IF NOT EXISTS precios_talleres (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tipo_taller_id VARCHAR(255) COMMENT 'FK a opciones_tipos.id_evento (opcional si es por taller específico)',
    taller_id INT COMMENT 'FK a talleres.id (opcional si es por tipo)',
    modalidad ENUM('clase_suelta', 'paquete') DEFAULT 'clase_suelta',
    cantidad_clases INT COMMENT 'Para paquetes',
    precio DECIMAL(10,2) NOT NULL,
    vigente_desde DATE NOT NULL,
    vigente_hasta DATE DEFAULT NULL,
    vigente TINYINT(1) DEFAULT 1,
    INDEX idx_tipo (tipo_taller_id),
    INDEX idx_taller (taller_id),
    INDEX idx_vigente (vigente),
    INDEX idx_vigencia (vigente_desde, vigente_hasta)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Inscripciones a talleres
CREATE TABLE IF NOT EXISTS inscripciones_talleres (
    id INT AUTO_INCREMENT PRIMARY KEY,
    taller_id INT NOT NULL,
    precio_id INT COMMENT 'FK a precios_talleres.id',
    alumno_nombre VARCHAR(255) NOT NULL,
    alumno_telefono VARCHAR(50),
    alumno_email VARCHAR(255),
    modalidad ENUM('clase_suelta', 'paquete') DEFAULT 'clase_suelta',
    clases_restantes INT,
    monto_pagado DECIMAL(10,2) DEFAULT 0,
    fecha_inscripcion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_vencimiento DATE,
    estado ENUM('activa', 'inactiva', 'suspendida', 'finalizada') DEFAULT 'activa',
    INDEX idx_taller (taller_id),
    INDEX idx_precio (precio_id),
    INDEX idx_estado (estado),
    INDEX idx_alumno_email (alumno_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Asistencias a clases
CREATE TABLE IF NOT EXISTS asistencias_talleres (
    id INT AUTO_INCREMENT PRIMARY KEY,
    inscripcion_id INT NOT NULL,
    fecha_clase DATE NOT NULL,
    asistio TINYINT(1) DEFAULT 1,
    notas TEXT,
    INDEX idx_inscripcion (inscripcion_id),
    INDEX idx_fecha (fecha_clase)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =============================================================================
-- 7. TABLAS DE TICKETS Y CUPONES (Para eventos de bandas)
-- =============================================================================

CREATE TABLE IF NOT EXISTS tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_evento INT NOT NULL,
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
    INDEX idx_evento (id_evento),
    FOREIGN KEY (id_evento) REFERENCES eventos_confirmados(id) ON DELETE CASCADE
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

-- Bloque de migración antiguo comentado para evitar conflictos
-- INSERT IGNORE INTO solicitudes (id, categoria, fecha_creacion, estado, descripcion, nombre_solicitante, telefono_solicitante, email_solicitante)
-- SELECT id_solicitud, 'ALQUILER', fecha_hora, estado, descripcion, nombre_completo, telefono, email
-- FROM solicitudes_alquiler;

-- INSERT IGNORE INTO solicitudes_alquiler (id, tipo_servicio, fecha_evento, hora_evento, duracion, cantidad_de_personas, precio_basico, precio_final, es_publico)
-- SELECT id_solicitud, tipo_servicio, fecha_evento, hora_evento, duracion, cantidad_de_personas, precio_basico, precio_final, es_publico
-- FROM solicitudes_alquiler;

-- NOTA: La tabla opciones_tipos y precios_vigencia están relacionadas con "alquileres" y no con servicios.
-- Esto debe tenerse en cuenta al realizar consultas o modificaciones.

-- Tabla para almacenar el catálogo de servicios
CREATE TABLE IF NOT EXISTS servicios_catalogo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tipo_servicio_id VARCHAR(255) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    duracion_minutos INT,
    activo TINYINT(1) DEFAULT 1,
    orden INT DEFAULT 0,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Tabla para almacenar los precios de los servicios
CREATE TABLE IF NOT EXISTS precios_servicios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    servicio_id INT NOT NULL,
    precio DECIMAL(10,2) NOT NULL,
    vigente TINYINT(1) DEFAULT 1,
    vigente_desde DATE NOT NULL,
    vigente_hasta DATE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (servicio_id) REFERENCES servicios_catalogo(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Tabla para almacenar los profesionales de servicios
CREATE TABLE IF NOT EXISTS profesionales_servicios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    especialidad VARCHAR(255),
    telefono VARCHAR(20),
    email VARCHAR(255),
    dias_trabaja VARCHAR(255),
    hora_inicio TIME,
    hora_fin TIME,
    activo TINYINT(1) DEFAULT 1,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Tabla para almacenar los turnos de servicios
CREATE TABLE IF NOT EXISTS turnos_servicios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    profesional_id INT NOT NULL,
    servicio_id INT NOT NULL,
    precio_id INT,
    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    cliente_nombre VARCHAR(255),
    cliente_telefono VARCHAR(20),
    cliente_email VARCHAR(255),
    monto DECIMAL(10,2),
    pagado TINYINT(1) DEFAULT 0,
    metodo_pago VARCHAR(50),
    estado VARCHAR(50),
    notas TEXT,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (profesional_id) REFERENCES profesionales_servicios(id),
    FOREIGN KEY (servicio_id) REFERENCES servicios_catalogo(id),
    FOREIGN KEY (precio_id) REFERENCES precios_servicios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
