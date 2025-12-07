-- =============================================================================
-- 06_fix_precios_horarios.sql
-- Correcciones al modelo de datos para precios con rangos de cantidad
-- y horarios con múltiples opciones por día
-- Fecha: 2025-12-06
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. MODIFICAR TABLA configuracion_horarios
-- Permitir múltiples horas de inicio por día (antes solo permitía una por día)
-- -----------------------------------------------------------------------------

-- Eliminar la restricción unique incorrecta que solo permitía una hora por día
ALTER TABLE configuracion_horarios DROP INDEX IF EXISTS uk_evento_dia;

-- Crear nueva restricción que incluya la hora
ALTER TABLE configuracion_horarios ADD UNIQUE KEY IF NOT EXISTS uk_evento_dia_hora (id_evento, dia_semana, hora_inicio);

-- Limpiar datos existentes
DELETE FROM configuracion_horarios;

-- Insertar horarios correctos según CSV Configuracion_Horarios.csv
INSERT INTO configuracion_horarios (id_evento, dia_semana, hora_inicio, hora_fin) VALUES
-- INFANTILES (Todos los días: 12:00-18:00)
('INFANTILES', 'todos', '12:00:00', '23:00:00'),
('INFANTILES', 'todos', '13:00:00', '23:00:00'),
('INFANTILES', 'todos', '14:00:00', '23:00:00'),
('INFANTILES', 'todos', '16:00:00', '23:00:00'),
('INFANTILES', 'todos', '17:00:00', '23:00:00'),
('INFANTILES', 'todos', '18:00:00', '23:00:00'),
-- INFORMALES (Todos + Sábado con horarios extendidos)
('INFORMALES', 'todos', '09:00:00', '23:00:00'),
('INFORMALES', 'todos', '10:00:00', '23:00:00'),
('INFORMALES', 'todos', '11:00:00', '23:00:00'),
('INFORMALES', 'todos', '12:00:00', '23:00:00'),
('INFORMALES', 'todos', '13:00:00', '23:00:00'),
('INFORMALES', 'todos', '14:00:00', '23:00:00'),
('INFORMALES', 'sabado', '15:00:00', '02:00:00'),
('INFORMALES', 'sabado', '16:00:00', '02:00:00'),
('INFORMALES', 'sabado', '17:00:00', '02:00:00'),
('INFORMALES', 'sabado', '18:00:00', '02:00:00'),
('INFORMALES', 'sabado', '19:00:00', '02:00:00'),
('INFORMALES', 'sabado', '20:00:00', '02:00:00'),
('INFORMALES', 'sabado', '21:00:00', '02:00:00'),
('INFORMALES', 'sabado', '22:00:00', '02:00:00'),
-- CON_SERVICIO_DE_MESA (Todos + Sábado)
('CON_SERVICIO_DE_MESA', 'todos', '09:00:00', '23:00:00'),
('CON_SERVICIO_DE_MESA', 'todos', '10:00:00', '23:00:00'),
('CON_SERVICIO_DE_MESA', 'todos', '11:00:00', '23:00:00'),
('CON_SERVICIO_DE_MESA', 'todos', '12:00:00', '23:00:00'),
('CON_SERVICIO_DE_MESA', 'sabado', '18:00:00', '02:00:00'),
('CON_SERVICIO_DE_MESA', 'sabado', '19:00:00', '02:00:00'),
('CON_SERVICIO_DE_MESA', 'sabado', '20:00:00', '02:00:00'),
('CON_SERVICIO_DE_MESA', 'sabado', '21:00:00', '02:00:00'),
-- BABY_SHOWERS (Todos + Sábado)
('BABY_SHOWERS', 'todos', '12:00:00', '23:00:00'),
('BABY_SHOWERS', 'todos', '13:00:00', '23:00:00'),
('BABY_SHOWERS', 'todos', '14:00:00', '23:00:00'),
('BABY_SHOWERS', 'todos', '16:00:00', '23:00:00'),
('BABY_SHOWERS', 'sabado', '17:00:00', '02:00:00'),
('BABY_SHOWERS', 'sabado', '18:00:00', '02:00:00'),
-- ADOLESCENTES (Todos + Sábado)
('ADOLESCENTES', 'todos', '12:00:00', '23:00:00'),
('ADOLESCENTES', 'todos', '13:00:00', '23:00:00'),
('ADOLESCENTES', 'todos', '14:00:00', '23:00:00'),
('ADOLESCENTES', 'todos', '16:00:00', '23:00:00'),
('ADOLESCENTES', 'sabado', '17:00:00', '02:00:00'),
('ADOLESCENTES', 'sabado', '18:00:00', '02:00:00'),
-- FECHA_BANDAS (Todos + Sábado)
('FECHA_BANDAS', 'todos', '12:00:00', '23:00:00'),
('FECHA_BANDAS', 'sabado', '21:00:00', '02:00:00');

-- -----------------------------------------------------------------------------
-- 2. MODIFICAR TABLA opciones_duracion
-- Actualizar duraciones según CSV Opciones_Duracion.csv
-- -----------------------------------------------------------------------------

DELETE FROM opciones_duracion;

INSERT INTO opciones_duracion (id_evento, duracion_horas, descripcion) VALUES
-- INFANTILES: 3, 4, 5 horas
('INFANTILES', 3, '3 horas'),
('INFANTILES', 4, '4 horas'),
('INFANTILES', 5, '5 horas'),
-- INFORMALES: 4, 6, 8, 10 horas
('INFORMALES', 4, '4 horas'),
('INFORMALES', 6, '6 horas'),
('INFORMALES', 8, '8 horas'),
('INFORMALES', 10, '10 horas'),
-- CON_SERVICIO_DE_MESA: 4, 6, 8, 10 horas
('CON_SERVICIO_DE_MESA', 4, '4 horas'),
('CON_SERVICIO_DE_MESA', 6, '6 horas'),
('CON_SERVICIO_DE_MESA', 8, '8 horas'),
('CON_SERVICIO_DE_MESA', 10, '10 horas'),
-- BABY_SHOWERS: 3, 4, 5, 6 horas
('BABY_SHOWERS', 3, '3 horas'),
('BABY_SHOWERS', 4, '4 horas'),
('BABY_SHOWERS', 5, '5 horas'),
('BABY_SHOWERS', 6, '6 horas'),
-- ADOLESCENTES: 3, 4, 5 horas
('ADOLESCENTES', 3, '3 horas'),
('ADOLESCENTES', 4, '4 horas'),
('ADOLESCENTES', 5, '5 horas'),
-- FECHA_BANDAS: 5, 6, 7, 8 horas
('FECHA_BANDAS', 5, '5 horas'),
('FECHA_BANDAS', 6, '6 horas'),
('FECHA_BANDAS', 7, '7 horas'),
('FECHA_BANDAS', 8, '8 horas');

-- -----------------------------------------------------------------------------
-- 3. RECREAR TABLA precios_vigencia
-- Nuevo modelo: precio por tipo + rango de cantidad (no por duración)
-- Precio final = precio_por_hora × duración_horas
-- -----------------------------------------------------------------------------

-- Backup de datos existentes
CREATE TABLE IF NOT EXISTS precios_vigencia_backup_20251206 AS SELECT * FROM precios_vigencia;

-- Recrear tabla con estructura correcta
DROP TABLE IF EXISTS precios_vigencia;

CREATE TABLE precios_vigencia (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_evento VARCHAR(255) NOT NULL,
    cantidad_min INT NOT NULL DEFAULT 1,
    cantidad_max INT NOT NULL,
    precio_por_hora DECIMAL(10,2) NOT NULL,
    vigente_desde DATE NOT NULL,
    vigente_hasta DATE DEFAULT NULL,
    UNIQUE KEY uk_precio (id_evento, cantidad_min, cantidad_max, vigente_desde),
    INDEX idx_evento (id_evento),
    INDEX idx_vigencia (vigente_desde, vigente_hasta)
);

-- Insertar precios según CSV Precios_Vigencia.csv
INSERT INTO precios_vigencia (id_evento, cantidad_min, cantidad_max, precio_por_hora, vigente_desde) VALUES
-- INFANTILES (vigente desde 2025-09-01)
('INFANTILES', 1, 40, 50000, '2025-09-01'),
('INFANTILES', 41, 50, 55000, '2025-09-01'),
('INFANTILES', 51, 60, 60000, '2025-09-01'),
('INFANTILES', 61, 70, 65000, '2025-09-01'),
('INFANTILES', 71, 80, 70000, '2025-09-01'),
('INFANTILES', 81, 90, 75000, '2025-09-01'),
-- INFORMALES (vigente desde 2025-08-01)
('INFORMALES', 1, 50, 30000, '2025-08-01'),
('INFORMALES', 51, 60, 35000, '2025-08-01'),
('INFORMALES', 61, 70, 40000, '2025-08-01'),
-- CON_SERVICIO_DE_MESA (vigente desde 2025-08-01)
('CON_SERVICIO_DE_MESA', 1, 40, 60000, '2025-08-01'),
('CON_SERVICIO_DE_MESA', 41, 60, 80000, '2025-08-01'),
('CON_SERVICIO_DE_MESA', 61, 80, 100000, '2025-08-01'),
-- BABY_SHOWERS (vigente desde 2025-08-01)
('BABY_SHOWERS', 1, 40, 50000, '2025-08-01'),
('BABY_SHOWERS', 41, 50, 55000, '2025-08-01'),
('BABY_SHOWERS', 51, 60, 60000, '2025-08-01'),
('BABY_SHOWERS', 61, 70, 65000, '2025-08-01'),
('BABY_SHOWERS', 71, 80, 70000, '2025-08-01'),
('BABY_SHOWERS', 81, 90, 75000, '2025-08-01'),
-- ADOLESCENTES (vigente desde 2025-11-01)
('ADOLESCENTES', 1, 40, 50000, '2025-11-01'),
('ADOLESCENTES', 41, 50, 55000, '2025-11-01'),
('ADOLESCENTES', 51, 60, 60000, '2025-11-01'),
-- FECHA_BANDAS (vigente desde 2025-10-01)
('FECHA_BANDAS', 1, 120, 120000, '2025-10-01');

-- -----------------------------------------------------------------------------
-- 4. ACTUALIZAR opciones_tipos con montos de seña y depósito
-- Según CSV Opciones_Tipos.csv
-- -----------------------------------------------------------------------------

UPDATE opciones_tipos SET monto_sena = 40000, deposito = NULL WHERE id_evento = 'INFANTILES';
UPDATE opciones_tipos SET monto_sena = 50000, deposito = 80000 WHERE id_evento = 'INFORMALES';
UPDATE opciones_tipos SET monto_sena = 50000, deposito = NULL WHERE id_evento = 'CON_SERVICIO_DE_MESA';
UPDATE opciones_tipos SET monto_sena = NULL, deposito = NULL WHERE id_evento = 'BABY_SHOWERS';
UPDATE opciones_tipos SET monto_sena = NULL, deposito = NULL WHERE id_evento = 'ADOLESCENTES';

-- Verificación final
SELECT 'Horarios insertados:' as info, COUNT(*) as total FROM configuracion_horarios;
SELECT 'Duraciones insertadas:' as info, COUNT(*) as total FROM opciones_duracion;
SELECT 'Precios insertados:' as info, COUNT(*) as total FROM precios_vigencia;
SELECT 'Tipos con seña/depósito:' as info, id_evento, monto_sena, deposito FROM opciones_tipos WHERE categoria = 'ALQUILER_SALON';
