-- -----------------------------------------------------------------------------
-- Archivo de Semillado de Datos (Seed) para la Base de Datos tdc_db
-- -----------------------------------------------------------------------------
-- Versión con transformaciones para manejar valores booleanos desde CSV.
-- -----------------------------------------------------------------------------

USE tdc_db;
SET GLOBAL local_infile = 1;

-- 1. Cargar datos de Configuracion.csv (sin cambios)
LOAD DATA LOCAL INFILE '/var/lib/mysql-files/Configuracion.csv'
INTO TABLE `configuracion` CHARACTER SET utf8mb4 FIELDS TERMINATED BY ',' ENCLOSED BY '"' LINES TERMINATED BY '\n' IGNORE 1 ROWS;

-- 2. Cargar datos de Opciones_Adicionales.csv (sin cambios)
LOAD DATA LOCAL INFILE '/var/lib/mysql-files/Opciones_Adicionales.csv'
INTO TABLE `opciones_adicionales` CHARACTER SET utf8mb4 FIELDS TERMINATED BY ',' ENCLOSED BY '"' LINES TERMINATED BY '\n' IGNORE 1 ROWS;

-- 3. Cargar datos de opciones_duracion.csv (sin cambios)
LOAD DATA LOCAL INFILE '/var/lib/mysql-files/opciones_duracion.csv'
INTO TABLE `opciones_duracion` CHARACTER SET utf8mb4 FIELDS TERMINATED BY ',' ENCLOSED BY '"' LINES TERMINATED BY '\n' IGNORE 1 ROWS;

-- 4. Cargar datos de Configuracion_Horarios.csv (sin cambios)
LOAD DATA LOCAL INFILE '/var/lib/mysql-files/Configuracion_Horarios.csv'
INTO TABLE `configuracion_horarios` CHARACTER SET utf8mb4 FIELDS TERMINATED BY ',' ENCLOSED BY '"' LINES TERMINATED BY '\n' IGNORE 1 ROWS;


-- 5. Cargar datos de Opciones_Tipos.csv (CON TRANSFORMACIÓN)
LOAD DATA LOCAL INFILE '/var/lib/mysql-files/Opciones_Tipos.csv'
INTO TABLE `opciones_tipos`
CHARACTER SET utf8mb4 FIELDS TERMINATED BY ',' ENCLOSED BY '"' LINES TERMINATED BY '\n' IGNORE 1 ROWS
-- Lista explícita de columnas en el CSV
(@col1, @col2, @col3, @col4, @col5, @espublico_var)
-- Mapeo a las columnas normalizadas de la tabla
SET 
    `id_evento` = @col1,
    `nombre_para_mostrar` = @col2,
    `descripcion` = @col3,
    `monto_sena` = @col4,
    `deposito` = @col5,
    `es_publico` = IF(UPPER(TRIM(@espublico_var)) = 'TRUE', 1, 0);

-- Carga las columnas del CSV en variables temporales
(`id_evento`, `nombre_para_mostrar`, `descripcion`, `monto_sena`, `deposito`, @espublico_var)
-- Usa SET para asignar los valores, transformando la variable del booleano
SET `EsPublico` = IF(UPPER(TRIM(@espublico_var)) = 'TRUE', 1, 0);


-- 6. Cargar datos de Personal_Disponible.csv (CON TRANSFORMACIÓN)
LOAD DATA LOCAL INFILE '/var/lib/mysql-files/Personal_Disponible.csv'
INTO TABLE `personal_disponible`
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ',' ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
-- Carga las columnas del CSV en variables temporales
(`id_personal`, `nombre_completo`, `rol`, `celular`, @activo_var, `cvu_alias`)
-- Usa SET para transformar la variable del booleano
SET `Activo` = IF(UPPER(TRIM(@activo_var)) = 'TRUE', 1, 0);


-- 7. Cargar datos de Roles_Por_Evento.csv (sin cambios)
LOAD DATA LOCAL INFILE '/var/lib/mysql-files/Roles_Por_Evento.csv'
INTO TABLE `roles_por_evento` CHARACTER SET utf8mb4 FIELDS TERMINATED BY ',' ENCLOSED BY '"' LINES TERMINATED BY '\n' IGNORE 1 ROWS;

-- 8. Cargar datos de Costos_Personal_Vigencia.csv (sin cambios)
LOAD DATA LOCAL INFILE '/var/lib/mysql-files/Costos_Personal_Vigencia.csv'
INTO TABLE `costos_personal_vigencia` CHARACTER SET utf8mb4 FIELDS TERMINATED BY ',' ENCLOSED BY '"' LINES TERMINATED BY '\n' IGNORE 1 ROWS;

-- 9. Cargar datos de Precios_Vigencia.csv (sin cambios)
LOAD DATA LOCAL INFILE '/var/lib/mysql-files/Precios_Vigencia.csv'
INTO TABLE `precios_vigencia` CHARACTER SET utf8mb4 FIELDS TERMINATED BY ',' ENCLOSED BY '"' LINES TERMINATED BY '\n' IGNORE 1 ROWS;


SELECT 'Datos semilla cargados exitosamente (con transformaciones booleanas).' AS status;