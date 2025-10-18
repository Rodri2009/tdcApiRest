-- Archivo de esquema para la base de datos tdc_db
-- Este script crea todas las tablas necesarias para que la aplicación funcione.

-- Borra las tablas si ya existen, en el orden inverso de dependencia para evitar errores.
DROP TABLE IF EXISTS `solicitudes_personal`;
DROP TABLE IF EXISTS `solicitudes_adicionales`;
DROP TABLE IF EXISTS `solicitudes`;
DROP TABLE IF EXISTS `costos_personal_vigencia`;
DROP TABLE IF EXISTS `roles_por_evento`;
DROP TABLE IF EXISTS `personal_disponible`;
DROP TABLE IF EXISTS `configuracion`;
DROP TABLE IF EXISTS `opciones_tipos`;
DROP TABLE IF EXISTS `configuracion_horarios`;
DROP TABLE IF EXISTS `opciones_duracion`;
DROP TABLE IF EXISTS `precios_vigencia`;
DROP TABLE IF EXISTS `opciones_adicionales`;


USE tdc_db;

CREATE TABLE `solicitudes` (
    `id_solicitud` INT AUTO_INCREMENT PRIMARY KEY,
    `fecha_hora` DATETIME,
    `tipo_de_evento` VARCHAR(255),
    `cantidad_de_personas` VARCHAR(100),
    `duracion` VARCHAR(100),
    `fecha_evento` DATE,
    `hora_evento` VARCHAR(20),
    `precio_basico` DECIMAL(10, 2),
    `precio_final` DECIMAL(10, 2),
    `nombre_completo` VARCHAR(255),
    `telefono` VARCHAR(50),
    `email` VARCHAR(255),
    `descripcion` TEXT,
    `estado` VARCHAR(50),
    `fingerprintid` VARCHAR(255)
);

CREATE TABLE `solicitudes_adicionales` (
    `timestamp` DATETIME,
    `id_solicitud` INT,
    `adicional_nombre` VARCHAR(255),
    `adicional_precio` DECIMAL(10, 2)
);

CREATE TABLE `opciones_adicionales` (
    `nombre` VARCHAR(255) PRIMARY KEY,
    `precio` DECIMAL(10, 2),
    `descripcion` TEXT,
    `url_de_la_imagen` TEXT
);

CREATE TABLE `precios_vigencia` (
    `tipo_de_evento` VARCHAR(255),
    `cantidad_minima` INT,
    `cantidad_maxima` INT,
    `fecha_de_vigencia` DATE,
    `precio_por_hora` DECIMAL(10, 2)
);

CREATE TABLE `opciones_duracion` (
    `id_evento` VARCHAR(255),
    `header` VARCHAR(255),
    `duracion` VARCHAR(100)
);

CREATE TABLE `configuracion_horarios` (
    `id_de_evento` VARCHAR(255),
    `hora_de_inicio` VARCHAR(20),
    `tipo_de_dia` VARCHAR(100)
);

CREATE TABLE `opciones_tipos` (
    `id_evento` VARCHAR(255) PRIMARY KEY,
    `nombre_para_mostrar` VARCHAR(255),
    `descripcion` TEXT,
    `monto_sena` DECIMAL(10, 2),
    `deposito` DECIMAL(10, 2),
    `es_publico` BOOLEAN
);

CREATE TABLE `configuracion` (
    `clave` VARCHAR(255) PRIMARY KEY,
    `valor` TEXT
);

CREATE TABLE `personal_disponible` (
    `id_personal` VARCHAR(50) PRIMARY KEY,
    `nombre_completo` VARCHAR(255),
    `rol` VARCHAR(255),
    `celular` VARCHAR(50),
    `activo` BOOLEAN,
    `cvu_alias` VARCHAR(255)
);

CREATE TABLE `roles_por_evento` (
    `id_evento` VARCHAR(255),
    `rol_requerido` VARCHAR(100),
    `cantidad` INT,
    `min_personas` INT,
    `max_personas` INT
);

CREATE TABLE `costos_personal_vigencia` (
    `id_costo` VARCHAR(50) PRIMARY KEY,
    `rol` VARCHAR(100),
    `fecha_de_vigencia` DATE,
    `costo_por_hora` DECIMAL(10, 2),
    `viaticos` DECIMAL(10, 2)
);

CREATE TABLE `solicitudes_personal` (
    `id_asignacion` VARCHAR(50) PRIMARY KEY,
    `id_solicitud` INT,
    `rol_requerido` VARCHAR(100),
    `id_personal_asignado` VARCHAR(50),
    `estado_asignacion` VARCHAR(50)
);

-- Mensaje de éxito al final
SELECT 'Esquema de base de datos creado exitosamente.' AS status;