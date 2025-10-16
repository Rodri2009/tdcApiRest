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
    `ID_Solicitud` INT AUTO_INCREMENT PRIMARY KEY,
    `Fecha Hora` DATETIME,
    `Tipo de Evento` VARCHAR(255),
    `Cantidad de Personas` VARCHAR(100),
    `Duracion` VARCHAR(100),
    `Fecha Evento` DATE,
    `Hora Evento` VARCHAR(20),
    `Precio Basico` DECIMAL(10, 2),
    `Precio Final` DECIMAL(10, 2),
    `Nombre Completo` VARCHAR(255),
    `Telefono` VARCHAR(50),
    `Email` VARCHAR(255),
    `Descripcion` TEXT,
    `Estado` VARCHAR(50),
    `FingerprintID` VARCHAR(255)
);

CREATE TABLE `solicitudes_adicionales` (
    `Timestamp` DATETIME,
    `ID_Solicitud` INT,
    `Adicional_Nombre` VARCHAR(255),
    `Adicional_Precio` DECIMAL(10, 2)
);

CREATE TABLE `opciones_adicionales` (
    `Nombre` VARCHAR(255) PRIMARY KEY,
    `Precio` DECIMAL(10, 2),
    `Descripcion` TEXT,
    `URL de la Imagen` TEXT
);

CREATE TABLE `precios_vigencia` (
    `Tipo de Evento` VARCHAR(255),
    `Cantidad Minima` INT,
    `Cantidad Maxima` INT,
    `Fecha de Vigencia` DATE,
    `Precio por Hora` DECIMAL(10, 2)
);

CREATE TABLE `opciones_duracion` (
    id_evento VARCHAR(255),
    header VARCHAR(255),
    duracion VARCHAR(100)
);

CREATE TABLE `configuracion_horarios` (
    `ID de Evento` VARCHAR(255),
    `Hora de Inicio` VARCHAR(20),
    `Tipo de Dia` VARCHAR(100)
);

CREATE TABLE `opciones_tipos` (
    `ID_Evento` VARCHAR(255) PRIMARY KEY,
    `NombreParaMostrar` VARCHAR(255),
    `Descripcion` TEXT,
    `MontoSena` DECIMAL(10, 2),
    `Deposito` DECIMAL(10, 2),
    `EsPublico` BOOLEAN
);

CREATE TABLE `configuracion` (
    `Clave` VARCHAR(255) PRIMARY KEY,
    `Valor` TEXT
);

CREATE TABLE `personal_disponible` (
    `ID_Personal` VARCHAR(50) PRIMARY KEY,
    `NombreCompleto` VARCHAR(255),
    `Rol` VARCHAR(255),
    `Celular` VARCHAR(50),
    `Activo` BOOLEAN,
    `CVU/ALIAS` VARCHAR(255)
);

CREATE TABLE `roles_por_evento` (
    `ID_Evento` VARCHAR(255),
    `RolRequerido` VARCHAR(100),
    `Cantidad` INT,
    `Min_Personas` INT,
    `Max_Personas` INT
);

CREATE TABLE `costos_personal_vigencia` (
    `ID_Costo` VARCHAR(50) PRIMARY KEY,
    `Rol` VARCHAR(100),
    `FechaDeVigencia` DATE,
    `CostoPorHora` DECIMAL(10, 2),
    `Viaticos` DECIMAL(10, 2)
);

CREATE TABLE `solicitudes_personal` (
    `ID_Asignacion` VARCHAR(50) PRIMARY KEY,
    `ID_Solicitud` INT,
    `RolRequerido` VARCHAR(100),
    `ID_Personal_Asignado` VARCHAR(50),
    `EstadoAsignacion` VARCHAR(50)
);

-- Mensaje de éxito al final
SELECT 'Esquema de base de datos creado exitosamente.' AS status;