-- =============================================================================
-- TDC App - Schema Principal
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
-- TABLAS DE CATÁLOGOS / CONFIGURACIÓN
-- =============================================================================

-- Tipos de eventos con su categoría padre
-- Ejemplo: INFANTILES → ALQUILER_SALON, FECHA_BANDAS → FECHA_BANDAS
CREATE TABLE IF NOT EXISTS opciones_tipos (
    id_tipo_evento VARCHAR(255) PRIMARY KEY COMMENT 'ID del tipo/subtipo: INFANTILES, FECHA_BANDAS',
    nombre_para_mostrar VARCHAR(255) NOT NULL COMMENT 'Nombre amigable para UI',
    descripcion TEXT COMMENT 'Descripción detallada del tipo de evento',
    categoria VARCHAR(50) NOT NULL COMMENT 'ALQUILER_SALON, FECHA_BANDAS, TALLERES_ACTIVIDADES, SERVICIOS',
    es_publico TINYINT(1) DEFAULT 1 COMMENT '1=Visible para clientes, 0=Solo admin',
    permite_adicionales TINYINT(1) DEFAULT 1 COMMENT '1=Permite agregar servicios/adicionales, 0=No permite',
    monto_sena DECIMAL(10,2) DEFAULT NULL COMMENT 'Monto de seña requerido',
    deposito DECIMAL(10,2) DEFAULT NULL COMMENT 'Depósito de garantía',
    INDEX idx_categoria (categoria),
    INDEX idx_es_publico (es_publico),
    INDEX idx_permite_adicionales (permite_adicionales)
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
    id_tipo_evento VARCHAR(255) NOT NULL COMMENT 'Referencia a opciones_tipos.id_tipo_evento',
    cantidad_min INT NOT NULL DEFAULT 1 COMMENT 'Cantidad mínima de personas',
    cantidad_max INT NOT NULL COMMENT 'Cantidad máxima de personas',
    precio_por_hora DECIMAL(10,2) NOT NULL COMMENT 'Precio base por hora',
    vigente_desde DATE NOT NULL,
    vigente_hasta DATE DEFAULT NULL COMMENT 'NULL = vigente actualmente',
    UNIQUE KEY uk_precio (id_tipo_evento, cantidad_min, cantidad_max, vigente_desde),
    INDEX idx_tipo_evento (id_tipo_evento),
    INDEX idx_vigencia (vigente_desde, vigente_hasta)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Duraciones disponibles por tipo de evento
CREATE TABLE IF NOT EXISTS opciones_duracion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_tipo_evento VARCHAR(255) NOT NULL,
    duracion_horas INT NOT NULL,
    descripcion VARCHAR(100) DEFAULT NULL,
    UNIQUE KEY uk_evento_duracion (id_tipo_evento, duracion_horas),
    INDEX idx_tipo_evento (id_tipo_evento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Horarios disponibles por tipo de evento y día
-- dia_semana puede ser 'todos' (aplica a cualquier día) o día específico como 'sabado'
CREATE TABLE IF NOT EXISTS configuracion_horarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_tipo_evento VARCHAR(255) NOT NULL,
    dia_semana VARCHAR(20) NOT NULL COMMENT 'todos, lunes, martes, ..., sabado, domingo',
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    UNIQUE KEY uk_evento_dia_hora (id_tipo_evento, dia_semana, hora_inicio),
    INDEX idx_tipo_evento (id_tipo_evento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Servicios adicionales (inflables, manteles, etc.)
CREATE TABLE IF NOT EXISTS opciones_adicionales (
    id_opciones_adicionales INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL UNIQUE COMMENT 'Nombre único del adicional',
    precio DECIMAL(10,2) NOT NULL,
    descripcion TEXT,
    url_imagen TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- CAMBIO: Relación N:N entre adicionales y tipos de eventos
-- Permite que cada tipo de evento tenga su propio conjunto de adicionales
CREATE TABLE IF NOT EXISTS opciones_adicionales_x_tipo_evento (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_opciones_adicionales INT NOT NULL COMMENT 'FK a opciones_adicionales.id_opciones_adicionales',
    id_tipo_evento VARCHAR(255) NOT NULL COMMENT 'FK a opciones_tipos.id_tipo_evento',
    precio_especifico DECIMAL(10,2) DEFAULT NULL COMMENT 'NULL = usar precio de opciones_adicionales',
    activo TINYINT(1) DEFAULT 1,
    UNIQUE KEY uk_adicional_tipo (id_opciones_adicionales, id_tipo_evento),
    FOREIGN KEY (id_opciones_adicionales) REFERENCES opciones_adicionales(id_opciones_adicionales) ON DELETE CASCADE,
    FOREIGN KEY (id_tipo_evento) REFERENCES opciones_tipos(id_tipo_evento) ON DELETE CASCADE,
    INDEX idx_tipo_evento (id_tipo_evento),
    INDEX idx_adicional (id_opciones_adicionales)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Relación N:N entre adicionales y tipos de eventos';

-- =============================================================================
-- TABLAS DE USUARIOS Y AUTENTICACIÓN
-- =============================================================================

CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) DEFAULT NULL COMMENT 'NULL si se registró vía OAuth',
    nombre VARCHAR(255),
    rol ENUM('admin', 'staff', 'staff_readonly', 'cliente') DEFAULT 'cliente',
    activo TINYINT(1) NOT NULL DEFAULT 1,
    
    -- Datos de OAuth
    proveedor_oauth VARCHAR(50) DEFAULT NULL COMMENT 'google, facebook, instagram',
    id_oauth VARCHAR(500) DEFAULT NULL COMMENT 'ID único del proveedor',
    token_oauth VARCHAR(1000) DEFAULT NULL COMMENT 'Token para futuras acciones',
    foto_url VARCHAR(500) DEFAULT NULL COMMENT 'Foto de perfil del OAuth',
    
    -- Email Verification
    email_verified TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = email verificado, 0 = pendiente',
    verification_token VARCHAR(255) UNIQUE DEFAULT NULL COMMENT 'Token único para verificación de email',
    verification_token_expires_at TIMESTAMP NULL DEFAULT NULL COMMENT 'Expiración del token de verificación',
    
    -- Auditoría
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_oauth (proveedor_oauth, id_oauth),
    UNIQUE KEY uk_oauth (proveedor_oauth, id_oauth)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Usuarios del sistema con soporte OAuth';

-- =============================================================================
-- TABLAS DE PERSONAL
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
    id_tipo_evento VARCHAR(255) NOT NULL,
    rol_requerido VARCHAR(100) NOT NULL,
    cantidad INT DEFAULT 1,
    min_personas INT NOT NULL DEFAULT 0,
    max_personas INT NOT NULL DEFAULT 120,
    INDEX idx_tipo_evento (id_tipo_evento)
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

-- Tabla: personal_tarifas
CREATE TABLE IF NOT EXISTS personal_tarifas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_rol VARCHAR(100) NOT NULL COMMENT 'Nombre del rol (DJ, Mesera, etc.)',
    monto_por_hora DECIMAL(10,2) NULL COMMENT 'Tarifa por hora trabajada',
    monto_fijo_evento DECIMAL(10,2) NULL COMMENT 'Tarifa fija por evento completo',
    monto_minimo DECIMAL(10,2) NULL COMMENT 'Monto mínimo garantizado',
    vigente_desde DATE NOT NULL COMMENT 'Fecha desde cuando es válida esta tarifa',
    vigente_hasta DATE NULL COMMENT 'Fecha hasta cuando es válida (NULL = indefinida)',
    moneda VARCHAR(3) DEFAULT 'ARS' COMMENT 'Moneda (ARS, USD, EUR)',
    descripcion TEXT NULL COMMENT 'Descripción de la tarifa',
    activo BOOLEAN DEFAULT TRUE COMMENT 'Si la tarifa está activa',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_rol (nombre_rol),
    INDEX idx_vigencia (vigente_desde, vigente_hasta),
    INDEX idx_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tarifas por rol';

-- Tabla: personal_pagos
CREATE TABLE IF NOT EXISTS personal_pagos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_personal VARCHAR(50) NOT NULL COMMENT 'ID del empleado',
    id_solicitud INT NULL COMMENT 'ID del evento/solicitud (opcional)',
    monto_acordado DECIMAL(10,2) NOT NULL COMMENT 'Monto acordado para este trabajo',
    monto_pagado DECIMAL(10,2) DEFAULT 0 COMMENT 'Monto realmente pagado',
    fecha_trabajo DATE NULL COMMENT 'Fecha en que se realizó el trabajo',
    fecha_pago DATE NULL COMMENT 'Fecha en que se realizó el pago',
    metodo_pago VARCHAR(50) DEFAULT 'efectivo' COMMENT 'efectivo, transferencia, cheque, etc.',
    comprobante VARCHAR(255) NULL COMMENT 'Número de comprobante o referencia',
    estado ENUM('pendiente', 'parcial', 'pagado') DEFAULT 'pendiente' COMMENT 'Estado del pago',
    descripcion TEXT NULL COMMENT 'Descripción del trabajo realizado',
    notas TEXT NULL COMMENT 'Notas adicionales',
    creado_por INT NULL COMMENT 'ID del usuario que creó el registro',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_personal (id_personal),
    INDEX idx_solicitud (id_solicitud),
    INDEX idx_estado (estado),
    INDEX idx_fecha_trabajo (fecha_trabajo),
    INDEX idx_fecha_pago (fecha_pago),
    INDEX idx_metodo_pago (metodo_pago),
    INDEX idx_creado_por (creado_por)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Pagos realizados al personal';

-- =============================================================================
-- TABLAS DE SOLICITUDES
-- =============================================================================

-- Tabla de clientes centralizada
CREATE TABLE IF NOT EXISTS clientes (
    id_cliente INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT DEFAULT NULL COMMENT 'FK a usuarios.id_usuario - NULL si creado por staff sin usuario asignado',
    nombre VARCHAR(255) DEFAULT NULL,
    apellido VARCHAR(255) DEFAULT NULL COMMENT 'Separado del nombre para facilitar búsquedas',
    telefono VARCHAR(50) DEFAULT NULL,
    email VARCHAR(255) DEFAULT NULL COMMENT 'Copia de usuarios.email para queries rápidas',
    notas TEXT DEFAULT NULL,
    
    tipo ENUM(
        'ALQUILER_SALON',
        'SERVICIOS',
        'TALLERES_ACTIVIDADES',
        'FECHA_BANDAS'
    ) DEFAULT NULL,

    -- Control
    creado_por_id_usuario INT DEFAULT NULL COMMENT 'ID del usuario admin/staff que lo creó. NULL = el cliente se registró solo',
    activo TINYINT(1) DEFAULT 1,
    
    -- Auditoría
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_id_usuario (id_usuario),
    INDEX idx_email (email),
    INDEX idx_activo (activo),
    CONSTRAINT fk_clientes_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    CONSTRAINT fk_clientes_creado_por FOREIGN KEY (creado_por_id_usuario) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Clientes con relación 1:1 a usuarios';


-- ===============================================================================
-- CATÁLOGO DE BANDAS/ARTISTAS
-- ================================================================================

-- Catálogo de instrumentos disponibles (para autocompletado)
CREATE TABLE IF NOT EXISTS catalogo_instrumentos (
    id_instrumento INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    categoria VARCHAR(50) DEFAULT NULL COMMENT 'Cuerdas, Percusión, Vientos, Electrónico, Voz',
    icono VARCHAR(50) DEFAULT NULL COMMENT 'Nombre del icono (fa-guitar, etc.)'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
-- Catálogo maestro de bandas/artistas (pueden registrarse solos o ser agregados por admin)
CREATE TABLE IF NOT EXISTS bandas_artistas (
    id_banda INT AUTO_INCREMENT PRIMARY KEY,
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
    descripcion TEXT COMMENT 'Descripción detallada o características de la banda',

    -- Imagen/Logo
    logo_url VARCHAR(500) DEFAULT NULL COMMENT 'URL del logo subido',
    foto_prensa_url VARCHAR(500) DEFAULT NULL COMMENT 'Foto de prensa',
    
    -- Rol del representante/manager (band-specific, no pertenece a clientes)
    contacto_rol VARCHAR(100) DEFAULT NULL COMMENT 'Manager, Líder, Prensa, etc.',
    
    id_cliente INT DEFAULT NULL COMMENT 'FK opcional a clientes.id_cliente si la banda se registró como cliente',
    registrado_por_id_usuario INT DEFAULT NULL COMMENT 'FK al usuario que registró la banda en el sistema',

    -- Control
    verificada TINYINT(1) DEFAULT 0 COMMENT '1=Verificada por admin',
    activa TINYINT(1) DEFAULT 1,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_nombre (nombre),
    INDEX idx_genero (genero_musical),
    INDEX idx_activa (activa),
    INDEX idx_id_cliente (id_cliente),
    INDEX idx_registrado_por (registrado_por_id_usuario),
    CONSTRAINT fk_bandas_artistas_cliente FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente) ON DELETE SET NULL,
    CONSTRAINT fk_bandas_registrado_por FOREIGN KEY (registrado_por_id_usuario) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
-- Formación/Integrantes de una banda (instrumentos y roles)
CREATE TABLE IF NOT EXISTS bandas_formacion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_banda INT NOT NULL,
    nombre_integrante VARCHAR(255) DEFAULT NULL COMMENT 'Nombre del músico (opcional)',
    id_instrumento INT NOT NULL COMMENT 'FK a catalogo_instrumentos',
    es_lider TINYINT(1) DEFAULT 0 COMMENT '1=Es el líder/frontman',
    notas VARCHAR(255) DEFAULT NULL COMMENT 'Ej: Guitarra rítmica, Segunda voz',
    INDEX idx_banda (id_banda),
    INDEX idx_instrumento (id_instrumento),
    FOREIGN KEY (id_banda) REFERENCES bandas_artistas(id_banda) ON DELETE CASCADE,
    FOREIGN KEY (id_instrumento) REFERENCES catalogo_instrumentos(id_instrumento) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
-- =============================================================================
-- SOLICITUDES Y VARIANTES
-- =============================================================================

CREATE TABLE IF NOT EXISTS solicitudes (
    id_solicitud INT AUTO_INCREMENT PRIMARY KEY,
    categoria ENUM('ALQUILER', 'BANDA', 'BANDAS', 'SERVICIOS', 'TALLERES') NOT NULL,
    id_cliente INT NOT NULL COMMENT 'FK a clientes.id_cliente',
    id_usuario_creador INT DEFAULT NULL COMMENT 'FK a usuarios.id_usuario - quién creó (admin/staff o el cliente)',
    
    -- Información
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(50) DEFAULT 'Solicitado' COMMENT 'Estado global de la solicitud: fuente única de verdad',
    es_publico TINYINT(1) DEFAULT 0 COMMENT 'Visibilidad pública de la solicitud',
    descripcion_corta VARCHAR(255) DEFAULT NULL,
    descripcion_larga TEXT DEFAULT NULL,
    url_flyer MEDIUMTEXT DEFAULT NULL COMMENT 'URL del flyer/cartel/promocional',
    fecha_evento      DATE     DEFAULT NULL COMMENT 'Fecha principal del evento',
    hora_inicio       TIME     DEFAULT NULL COMMENT 'Hora de inicio del evento',
    duracion_minutos  INT      DEFAULT NULL COMMENT 'Duración en minutos',
    hora_fin          TIME     DEFAULT NULL COMMENT 'Hora estimada de fin',
    fecha_alternativa DATE     DEFAULT NULL COMMENT 'Fecha alternativa propuesta',
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_categoria (categoria),
    INDEX idx_estado (estado),
    INDEX idx_es_publico (es_publico),
    INDEX idx_cliente_id (id_cliente),
    INDEX idx_usuario_creador (id_usuario_creador),
    CONSTRAINT fk_solicitudes_cliente FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente) ON DELETE RESTRICT,
    CONSTRAINT fk_solicitudes_usuario_creador FOREIGN KEY (id_usuario_creador) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS solicitudes_alquiler (
    id_solicitud_alquiler INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Identificador único del registro de alquiler',
    id_solicitud INT NOT NULL COMMENT 'FK a solicitudes.id_solicitud - Referencia a solicitud padre (1:1)',
    fecha_evento DATE NOT NULL COMMENT 'Fecha del evento (ej: 2026-03-15)',
    hora_evento TIME NOT NULL COMMENT 'Hora de inicio del evento',
    id_tipo_evento VARCHAR(255) NOT NULL COMMENT 'FK a opciones_tipos.id_tipo_evento',
    id_precio_vigencia INT COMMENT 'FK: precios_vigencia.id',
    cantidad_personas INT COMMENT 'Cantidad de personas para el evento',
    precio_basico DECIMAL(10,2) COMMENT 'Precio base',
    total_adicionales DECIMAL(10,2) DEFAULT 0 COMMENT 'Suma total de adicionales',
    monto_sena DECIMAL(10,2) DEFAULT 0 COMMENT 'Monto de seña',
    monto_deposito DECIMAL(10,2) DEFAULT 0 COMMENT 'Monto de depósito',
    precio_final DECIMAL(10,2) GENERATED ALWAYS AS (precio_basico + COALESCE(total_adicionales, 0) + COALESCE(monto_sena, 0) + COALESCE(monto_deposito, 0)) STORED,
    comentarios TEXT COMMENT 'Comentarios del cliente',
    
    INDEX idx_id_tipo_evento (id_tipo_evento),
    INDEX idx_id_precio_vigencia (id_precio_vigencia),
    INDEX idx_id_solicitud (id_solicitud),
    CONSTRAINT fk_solicitudes_alquiler_solicitud FOREIGN KEY (id_solicitud) REFERENCES solicitudes(id_solicitud) ON DELETE CASCADE,
    CONSTRAINT fk_solicitudes_alquiler_tipo_evento FOREIGN KEY (id_tipo_evento) REFERENCES opciones_tipos(id_tipo_evento) ON DELETE RESTRICT,
    CONSTRAINT fk_solicitudes_alquiler_precio_vigencia FOREIGN KEY (id_precio_vigencia) REFERENCES precios_vigencia(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS solicitudes_servicios (
    id_solicitud_servicio INT AUTO_INCREMENT PRIMARY KEY,
    id_solicitud INT NOT NULL COMMENT 'FK a solicitudes.id_solicitud',
    tipo_servicio VARCHAR(255),
    fecha_evento DATE,
    hora_evento TIME DEFAULT NULL COMMENT 'Hora de inicio del evento',
    precio DECIMAL(10,2),
    CONSTRAINT fk_solicitudes_servicios_solicitud FOREIGN KEY (id_solicitud) REFERENCES solicitudes(id_solicitud) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS solicitudes_talleres (
    id_solicitud_taller INT AUTO_INCREMENT PRIMARY KEY,
    id_solicitud INT NOT NULL COMMENT 'FK a solicitudes.id_solicitud',
    nombre_taller VARCHAR(255),
    id_tipo_evento VARCHAR(255) NULL COMMENT 'FK a opciones_tipos.id_tipo_evento (género/semilla del taller)',
    comentarios_observaciones TEXT NULL COMMENT 'Comentarios u observaciones del taller',
    fecha_evento DATE,
    hora_evento TIME DEFAULT NULL COMMENT 'Hora de inicio del evento',
    precio DECIMAL(10,2),
    INDEX idx_solicitudes_talleres_tipo (id_tipo_evento),
    CONSTRAINT fk_solicitudes_talleres_solicitud FOREIGN KEY (id_solicitud) REFERENCES solicitudes(id_solicitud) ON DELETE CASCADE,
    CONSTRAINT fk_solicitudes_talleres_tipo_evento FOREIGN KEY (id_tipo_evento) REFERENCES opciones_tipos(id_tipo_evento) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS solicitudes_fechas_bandas (
    id_solicitud INT PRIMARY KEY COMMENT 'FK a solicitudes.id_solicitud',
    id_banda INT DEFAULT NULL COMMENT 'FK opcional a bandas_artistas',
    precio_basico DECIMAL(10,2) DEFAULT NULL,
    precio_final DECIMAL(10,2) DEFAULT NULL,
    precio_anticipada DECIMAL(10,2) NULL DEFAULT NULL COMMENT 'Precio de venta anticipada',
    precio_puerta DECIMAL(10,2) NULL DEFAULT NULL COMMENT 'Precio de puerta',
    cantidad_bandas INT DEFAULT 1,
    expectativa_publico VARCHAR(100) DEFAULT NULL COMMENT 'Máximo aforo esperado',
    bandas_json LONGTEXT COMMENT 'JSON array de bandas',
    fecha_alternativa DATE DEFAULT NULL,
    notas_admin TEXT,
    id_evento_generado INT DEFAULT NULL,
    INDEX idx_banda (id_banda),
    FOREIGN KEY (id_solicitud) REFERENCES solicitudes(id_solicitud) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS solicitudes_personal (
    id_solicitud_personal INT AUTO_INCREMENT PRIMARY KEY,
    id_solicitud INT NOT NULL,
    id_personal VARCHAR(50) DEFAULT NULL,
    rol_requerido VARCHAR(100) NOT NULL,
    estado VARCHAR(50) DEFAULT 'asignado' COMMENT 'asignado, confirmado, cancelado',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_solicitud (id_solicitud),
    INDEX idx_personal (id_personal),
    FOREIGN KEY (id_solicitud) REFERENCES solicitudes(id_solicitud) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS solicitudes_adicionales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_solicitud_alquiler INT NOT NULL COMMENT 'FK a solicitudes_alquiler.id_solicitud_alquiler',
    adicional_nombre VARCHAR(255) NOT NULL,
    adicional_precio DECIMAL(10,2) NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_solicitudes_adicionales_alquiler_id (id_solicitud_alquiler),
    CONSTRAINT fk_solicitudes_adicionales_alquiler FOREIGN KEY (id_solicitud_alquiler) REFERENCES solicitudes_alquiler(id_solicitud_alquiler) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ===============================================================================
-- =============================================================================


-- =============================================================================
-- EVENTOS CONFIRMADOS (Tabla maestra de eventos)
-- =============================================================================

CREATE TABLE IF NOT EXISTS eventos_confirmados (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_solicitud INT NOT NULL COMMENT 'FK a solicitudes.id_solicitud',
    tipo_evento ENUM('ALQUILER_SALON', 'BANDA', 'SERVICIO', 'TALLER') NOT NULL,
    tabla_origen VARCHAR(50) NOT NULL COMMENT 'solicitudes_alquiler, solicitudes_fechas_bandas, etc.',
    nombre_evento VARCHAR(255) DEFAULT NULL,
    descripcion_corta VARCHAR(255) DEFAULT NULL,
    descripcion TEXT DEFAULT NULL,
    fecha_evento DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    duracion_minutos INT DEFAULT NULL COMMENT 'Duración en minutos',
    url_flyer VARCHAR(500) DEFAULT NULL,
    es_publico TINYINT(1) DEFAULT 0,
    activo TINYINT(1) DEFAULT 1,
    id_cliente INT DEFAULT NULL,
    confirmado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    cancelado_en TIMESTAMP NULL,
    
    INDEX idx_tipo_evento (tipo_evento),
    INDEX idx_fecha (fecha_evento),
    INDEX idx_es_publico (es_publico),
    INDEX idx_activo (activo),
    INDEX idx_id_solicitud (id_solicitud),
    INDEX idx_id_cliente (id_cliente),
    UNIQUE KEY uk_solicitud_tipo (id_solicitud, tipo_evento),
    CONSTRAINT fk_eventos_solicitud FOREIGN KEY (id_solicitud) REFERENCES solicitudes(id_solicitud) ON DELETE CASCADE,
    CONSTRAINT fk_eventos_cliente FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =============================================================================
-- LINEUP DE EVENTOS (Relación entre eventos y bandas)
-- =============================================================================

-- Lineup: qué bandas tocan en qué evento y en qué orden
CREATE TABLE IF NOT EXISTS eventos_lineup (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_evento_confirmado INT NOT NULL,
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
    
    INDEX idx_evento_confirmado (id_evento_confirmado),
    INDEX idx_banda (id_banda),
    INDEX idx_orden (id_evento_confirmado, orden_show),
    FOREIGN KEY (id_evento_confirmado) REFERENCES eventos_confirmados(id) ON DELETE CASCADE,
    FOREIGN KEY (id_banda) REFERENCES bandas_artistas(id_banda) ON DELETE SET NULL
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
    FOREIGN KEY (id_banda) REFERENCES bandas_artistas(id_banda) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS bandas_invitadas;


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
-- TABLAS DE TALLERES
-- =============================================================================

-- Talleristas (instructores)
CREATE TABLE IF NOT EXISTS talleristas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT DEFAULT NULL COMMENT 'FK a usuarios.id_usuario. La identidad real de la persona es usuarios',
    id_cliente INT DEFAULT NULL COMMENT 'FK opcional a clientes.id_cliente si la persona además es cliente',
    nombre VARCHAR(255) NOT NULL COMMENT 'Se conserva por compatibilidad con datos existentes; la fuente real es usuarios',
    especialidad VARCHAR(255),
    bio TEXT,
    telefono VARCHAR(50),
    email VARCHAR(255),
    instagram VARCHAR(255),
    activo TINYINT(1) DEFAULT 1,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_activo (activo),
    INDEX idx_nombre (nombre),
    UNIQUE KEY uk_tallerista_usuario (id_usuario),
    KEY idx_tallerista_usuario (id_usuario),
    KEY idx_tallerista_cliente (id_cliente),
    CONSTRAINT fk_talleristas_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    CONSTRAINT fk_talleristas_cliente FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Talleres disponibles
CREATE TABLE IF NOT EXISTS talleres (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tipo_taller_id VARCHAR(255) NOT NULL COMMENT 'FK a opciones_tipos.id_tipo_evento',
    tallerista_id INT COMMENT 'FK a talleristas.id',
    id_cliente INT COMMENT 'FK a clientes.id_cliente',
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
    id_solicitud INT NULL COMMENT 'FK a solicitudes.id_solicitud. Precio asociado a una solicitud concreta',
    id_solicitud_taller INT NULL COMMENT 'FK a solicitudes_talleres.id_solicitud_taller. Precio asociado al taller de la solicitud',
    id_tipo_evento VARCHAR(255) NULL COMMENT 'FK a opciones_tipos.id_tipo_evento. Género/semilla del taller',
    tipo_taller_id VARCHAR(255) NULL COMMENT 'Compatibilidad legacy: FK a opciones_tipos.id_tipo_evento',
    taller_id INT NULL COMMENT 'Compatibilidad legacy: FK a talleres.id',
    nombre_precio VARCHAR(255) NULL COMMENT 'Nombre del precio: Clase, semana o mes',
    descripcion TEXT NULL COMMENT 'Detalle del precio o condiciones de venta',
    precio_clase DECIMAL(10,2) NULL COMMENT 'Precio por clase',
    precio_semana DECIMAL(10,2) NULL COMMENT 'Precio por semana',
    precio_mes DECIMAL(10,2) NULL COMMENT 'Precio por mes',
    vigente_desde DATE NOT NULL COMMENT 'Fecha de vigencia del precio',
    vigente_hasta DATE DEFAULT NULL COMMENT 'Fecha de finalización de vigencia (opcional)',
    vigente TINYINT(1) DEFAULT 1,
    activo TINYINT(1) DEFAULT 1 COMMENT 'Indica si el precio sigue vigente para operar',
    INDEX idx_solicitud (id_solicitud),
    INDEX idx_solicitud_taller (id_solicitud_taller),
    INDEX idx_tipo (id_tipo_evento),
    INDEX idx_tipo_legacy (tipo_taller_id),
    INDEX idx_taller (taller_id),
    INDEX idx_vigente (vigente),
    INDEX idx_activo (activo),
    INDEX idx_vigencia (vigente_desde, vigente_hasta),
    CONSTRAINT fk_precios_talleres_solicitud FOREIGN KEY (id_solicitud) REFERENCES solicitudes(id_solicitud) ON DELETE CASCADE,
    CONSTRAINT fk_precios_talleres_solicitud_taller FOREIGN KEY (id_solicitud_taller) REFERENCES solicitudes_talleres(id_solicitud_taller) ON DELETE CASCADE,
    CONSTRAINT fk_precios_talleres_tipo_evento FOREIGN KEY (id_tipo_evento) REFERENCES opciones_tipos(id_tipo_evento) ON DELETE RESTRICT,
    CONSTRAINT fk_precios_talleres_tipo_evento_legacy FOREIGN KEY (tipo_taller_id) REFERENCES opciones_tipos(id_tipo_evento) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE solicitudes_talleres
    ADD COLUMN id_precio_taller INT NULL COMMENT 'FK a precios_talleres.id. Fuente oficial del precio del taller' AFTER id_tipo_evento,
    ADD INDEX idx_solicitudes_talleres_precio (id_precio_taller),
    ADD CONSTRAINT fk_solicitudes_talleres_precio FOREIGN KEY (id_precio_taller) REFERENCES precios_talleres(id) ON DELETE SET NULL;

-- Inscripciones a talleres
CREATE TABLE IF NOT EXISTS inscripciones_talleres (
    id INT AUTO_INCREMENT PRIMARY KEY,
    taller_id INT NOT NULL,
    precio_id INT COMMENT 'FK a precios_talleres.id',
    alumno_nombre VARCHAR(255) NOT NULL,
    alumno_telefono VARCHAR(50),
    alumno_email VARCHAR(255),
    modalidad ENUM('por_clase', 'por_semana', 'por_mes') DEFAULT 'por_clase' COMMENT 'Modalidad activa de inscripción del taller',
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
-- TABLAS DE TICKETS Y CUPONES (Para eventos de bandas)
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
    mp_payment_id BIGINT DEFAULT NULL COMMENT 'ID del pago en Mercado Pago',
    comprado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_evento (id_evento),
    INDEX idx_mp_payment_id (mp_payment_id),
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
    id_cliente INT NULL DEFAULT NULL,
    dias_trabaja VARCHAR(255),
    hora_inicio TIME,
    hora_fin TIME,
    activo TINYINT(1) DEFAULT 1,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_profesionales_cliente_id (id_cliente),
    CONSTRAINT fk_profesionales_cliente FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente) ON DELETE SET NULL
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

-- =============================================================================
-- SISTEMA DE GESTIÓN DE CAJA
-- =============================================================================

-- Catálogo de tipos de movimientos (ingresos y egresos)
-- Define todas las categorías y subcategorías posibles
CREATE TABLE IF NOT EXISTS tipos_movimientos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(50) NOT NULL UNIQUE COMMENT 'Código corto: BAND_ENTRADA, ALQ_BASE, etc.',
    nombre VARCHAR(100) NOT NULL COMMENT 'Nombre visible: Entrada Anticipada Bandas',
    tipo ENUM('ingreso', 'egreso') NOT NULL COMMENT 'Clasificación principal',
    categoria VARCHAR(50) NOT NULL COMMENT 'BANDAS, ALQUILER, TALLERES, SERVICIOS, OTROS',
    subcategoria VARCHAR(100) COMMENT 'Subcategoría: entrada_anticipada, alquiler_base, buffet, etc.',
    descripcion TEXT COMMENT 'Descripción detallada del movimiento',
    requiere_comprobante TINYINT(1) DEFAULT 0 COMMENT '1=Requiere referencia de comprobante',
    activo TINYINT(1) DEFAULT 1 COMMENT '1=Activo en sistema',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_tipo (tipo),
    INDEX idx_categoria (categoria),
    INDEX idx_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Períodos de caja (apertura y cierre)
-- Registra cuándo se abre y cierra la caja, por quién, y qué saldos hay
CREATE TABLE IF NOT EXISTS cajas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numero_caja INT NOT NULL UNIQUE COMMENT 'Número secuencial de caja',
    nombre VARCHAR(100) COMMENT 'Nombre descriptivo de la caja',
    id_evento_confirmado INT COMMENT 'FK a eventos_confirmados.id - Evento asociado (si aplica)',
    fecha_apertura TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha/hora de apertura',
    fecha_cierre TIMESTAMP NULL COMMENT 'Fecha/hora de cierre (NULL si abierta)',
    estado ENUM('abierta', 'cerrada') DEFAULT 'abierta' COMMENT 'Estado actual',
    usuario_apertura_id INT NOT NULL COMMENT 'Usuario que abrió la caja',
    usuario_cierre_id INT COMMENT 'Usuario que cerró la caja (NULL si abierta)',
    saldo_inicial_en_cuenta DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT 'Saldo inicial en cuenta (MP, banco, etc.)',
    saldo_inicial_en_efectivo DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT 'Saldo inicial en efectivo',
    saldo_final_en_cuenta DECIMAL(12,2) COMMENT 'Saldo final en cuenta (NULL si abierta)',
    saldo_final_en_efectivo DECIMAL(12,2) COMMENT 'Saldo final en efectivo (NULL si abierta)',
    notas_apertura TEXT COMMENT 'Notas al abrir',
    notas_cierre TEXT COMMENT 'Notas al cerrar',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_apertura_id) REFERENCES usuarios(id_usuario),
    FOREIGN KEY (id_evento_confirmado) REFERENCES eventos_confirmados(id) ON DELETE SET NULL,
    INDEX idx_estado (estado),
    INDEX idx_fecha_apertura (fecha_apertura),
    INDEX idx_usuario_apertura (usuario_apertura_id),
    INDEX idx_evento (id_evento_confirmado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Movimientos individuales dentro de cada caja
-- Registra cada ingreso/egreso asociado a una caja abierta
CREATE TABLE IF NOT EXISTS movimientos_caja (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_caja INT NOT NULL COMMENT 'FK a cajas.id - Caja a la que pertenece',
    id_tipo_movimiento INT COMMENT 'FK a tipos_movimientos.id (opcional)',
    tipo ENUM('ingreso', 'egreso') NOT NULL COMMENT 'Clasificación',
    categoria VARCHAR(50) NOT NULL COMMENT 'BANDAS, ALQUILER, TALLERES, SERVICIOS, OTROS',
    subcategoria VARCHAR(100) COMMENT 'Subcategoría específica',
    descripcion VARCHAR(255) NOT NULL COMMENT 'Descripción del movimiento',
    monto DECIMAL(12,2) NOT NULL COMMENT 'Monto de dinero',
    metodo_pago ENUM('efectivo', 'transferencia', 'tarjeta', 'cheque', 'otro') NOT NULL DEFAULT 'efectivo',
    comprobante_ref VARCHAR(100) COMMENT 'Referencia a comprobante (factura, DNI, etc.)',
    id_evento_confirmado INT COMMENT 'FK a eventos_confirmados.id (si aplica)',
    id_solicitud INT COMMENT 'FK a solicitudes.id (si aplica)',
    usuario_id INT NOT NULL COMMENT 'Usuario que registró el movimiento',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_caja) REFERENCES cajas(id) ON DELETE RESTRICT,
    FOREIGN KEY (id_tipo_movimiento) REFERENCES tipos_movimientos(id) ON DELETE SET NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id_usuario),
    INDEX idx_id_caja (id_caja),
    INDEX idx_tipo (tipo),
    INDEX idx_categoria (categoria),
    INDEX idx_fecha (creado_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- FIN DEL SCHEMA
-- =============================================================================
