-- 07_precios_cantidades.sql
-- Migración para sistema de precios por cantidad de personas
-- Ejecutar después de 06_fix_precios_horarios.sql

-- =============================================
-- PASO 1: Reestructurar precios_vigencia para usar rangos de cantidad
-- =============================================

-- Eliminar tabla existente y recrearla con nueva estructura
DROP TABLE IF EXISTS precios_vigencia;

CREATE TABLE precios_vigencia (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL,
    cantidad_min INT NOT NULL DEFAULT 1,
    cantidad_max INT NOT NULL DEFAULT 999,
    precio_por_hora DECIMAL(10,2) NOT NULL,
    vigencia_desde DATE NOT NULL,
    vigencia_hasta DATE DEFAULT NULL,
    UNIQUE KEY uk_tipo_cantidad (tipo, cantidad_min, cantidad_max, vigencia_desde)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =============================================
-- PASO 2: Insertar precios vigentes por tipo y rango de cantidad
-- (Datos extraídos de Precios_Vigencia.csv)
-- =============================================

INSERT INTO precios_vigencia (tipo, cantidad_min, cantidad_max, precio_por_hora, vigencia_desde, vigencia_hasta) VALUES
-- INFANTILES: vigencia desde 01/08/2025
('INFANTILES', 1, 40, 30000.00, '2025-08-01', NULL),
('INFANTILES', 41, 50, 35000.00, '2025-08-01', NULL),
('INFANTILES', 51, 60, 40000.00, '2025-08-01', NULL),
('INFANTILES', 61, 70, 45000.00, '2025-08-01', NULL),
('INFANTILES', 71, 80, 50000.00, '2025-08-01', NULL),
('INFANTILES', 81, 90, 55000.00, '2025-08-01', NULL),

-- INFORMALES: vigencia desde 01/11/2025
('INFORMALES', 1, 50, 35000.00, '2025-11-01', NULL),
('INFORMALES', 51, 60, 40000.00, '2025-11-01', NULL),
('INFORMALES', 61, 70, 45000.00, '2025-11-01', NULL),
('INFORMALES', 71, 80, 50000.00, '2025-11-01', NULL),

-- CON_SERVICIO_DE_MESA: vigencia desde 01/11/2025
('CON_SERVICIO_DE_MESA', 1, 40, 60000.00, '2025-11-01', NULL),
('CON_SERVICIO_DE_MESA', 41, 60, 70000.00, '2025-11-01', NULL),
('CON_SERVICIO_DE_MESA', 61, 80, 80000.00, '2025-11-01', NULL),

-- BABY_SHOWERS: vigencia desde 01/08/2025
('BABY_SHOWERS', 1, 40, 50000.00, '2025-08-01', NULL),
('BABY_SHOWERS', 41, 50, 55000.00, '2025-08-01', NULL),
('BABY_SHOWERS', 51, 60, 60000.00, '2025-08-01', NULL),
('BABY_SHOWERS', 61, 70, 65000.00, '2025-08-01', NULL),
('BABY_SHOWERS', 71, 80, 70000.00, '2025-08-01', NULL),
('BABY_SHOWERS', 81, 90, 75000.00, '2025-08-01', NULL),

-- ADOLESCENTES: vigencia desde 01/11/2025
('ADOLESCENTES', 1, 40, 50000.00, '2025-11-01', NULL),
('ADOLESCENTES', 41, 50, 55000.00, '2025-11-01', NULL),
('ADOLESCENTES', 51, 60, 60000.00, '2025-11-01', NULL),

-- FECHA_BANDAS: vigencia desde 01/08/2025
('FECHA_BANDAS', 1, 120, 100000.00, '2025-08-01', NULL);

-- =============================================
-- PASO 3: Reestructurar configuracion_horarios para múltiples horas por día
-- =============================================

-- Modificar restricción unique para permitir múltiples horas por día
ALTER TABLE configuracion_horarios DROP INDEX IF EXISTS uk_evento_dia;
ALTER TABLE configuracion_horarios ADD UNIQUE KEY uk_evento_dia_hora (id_evento, dia_semana, hora_inicio);

-- Limpiar datos existentes
DELETE FROM configuracion_horarios;

-- Insertar horarios correctos (múltiples opciones por día)
-- Formato: tipo_dia = 'todos' aplica a todos los días, 'sabado' solo sábados
INSERT INTO configuracion_horarios (id_evento, dia_semana, hora_inicio, hora_fin) VALUES
-- INFANTILES (Todos los días)
('INFANTILES', 'todos', '12:00:00', '23:00:00'),
('INFANTILES', 'todos', '13:00:00', '23:00:00'),
('INFANTILES', 'todos', '14:00:00', '23:00:00'),
('INFANTILES', 'todos', '16:00:00', '23:00:00'),
('INFANTILES', 'todos', '17:00:00', '23:00:00'),
('INFANTILES', 'todos', '18:00:00', '23:00:00'),

-- INFORMALES (Todos los días + sábados con horario nocturno)
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

-- CON_SERVICIO_DE_MESA (Todos los días + sábados con horario nocturno)
('CON_SERVICIO_DE_MESA', 'todos', '09:00:00', '23:00:00'),
('CON_SERVICIO_DE_MESA', 'todos', '10:00:00', '23:00:00'),
('CON_SERVICIO_DE_MESA', 'todos', '11:00:00', '23:00:00'),
('CON_SERVICIO_DE_MESA', 'todos', '12:00:00', '23:00:00'),
('CON_SERVICIO_DE_MESA', 'sabado', '18:00:00', '02:00:00'),
('CON_SERVICIO_DE_MESA', 'sabado', '19:00:00', '02:00:00'),
('CON_SERVICIO_DE_MESA', 'sabado', '20:00:00', '02:00:00'),
('CON_SERVICIO_DE_MESA', 'sabado', '21:00:00', '02:00:00'),

-- BABY_SHOWERS (Todos los días + sábados con horario nocturno)
('BABY_SHOWERS', 'todos', '12:00:00', '23:00:00'),
('BABY_SHOWERS', 'todos', '13:00:00', '23:00:00'),
('BABY_SHOWERS', 'todos', '14:00:00', '23:00:00'),
('BABY_SHOWERS', 'todos', '16:00:00', '23:00:00'),
('BABY_SHOWERS', 'sabado', '17:00:00', '02:00:00'),
('BABY_SHOWERS', 'sabado', '18:00:00', '02:00:00'),

-- ADOLESCENTES (Todos los días + sábados con horario nocturno)
('ADOLESCENTES', 'todos', '12:00:00', '23:00:00'),
('ADOLESCENTES', 'todos', '13:00:00', '23:00:00'),
('ADOLESCENTES', 'todos', '14:00:00', '23:00:00'),
('ADOLESCENTES', 'todos', '16:00:00', '23:00:00'),
('ADOLESCENTES', 'sabado', '17:00:00', '02:00:00'),
('ADOLESCENTES', 'sabado', '18:00:00', '02:00:00'),

-- FECHA_BANDAS (Todos los días + sábados)
('FECHA_BANDAS', 'todos', '12:00:00', '23:00:00'),
('FECHA_BANDAS', 'sabado', '21:00:00', '02:00:00');

-- =============================================
-- PASO 4: Actualizar opciones_tipos con montos de seña y depósito
-- =============================================

-- Agregar columnas si no existen (ignorar errores si ya existen)
-- ALTER TABLE opciones_tipos ADD COLUMN IF NOT EXISTS monto_sena DECIMAL(10,2) DEFAULT NULL;
-- ALTER TABLE opciones_tipos ADD COLUMN IF NOT EXISTS deposito DECIMAL(10,2) DEFAULT NULL;

UPDATE opciones_tipos SET monto_sena = 40000, deposito = NULL WHERE id_evento = 'INFANTILES';
UPDATE opciones_tipos SET monto_sena = 50000, deposito = 80000 WHERE id_evento = 'INFORMALES';
UPDATE opciones_tipos SET monto_sena = 80000, deposito = 100000 WHERE id_evento = 'CON_SERVICIO_DE_MESA';
UPDATE opciones_tipos SET monto_sena = 40000, deposito = NULL WHERE id_evento = 'BABY_SHOWERS';
UPDATE opciones_tipos SET monto_sena = 50000, deposito = 80000 WHERE id_evento = 'ADOLESCENTES';
UPDATE opciones_tipos SET monto_sena = NULL, deposito = NULL WHERE id_evento = 'FECHA_BANDAS';

-- =============================================
-- VERIFICACIÓN
-- =============================================
-- SELECT COUNT(*) as total_precios FROM precios_vigencia; -- Esperado: 22
-- SELECT COUNT(*) as total_horarios FROM configuracion_horarios; -- Esperado: 42
-- SELECT id_evento, monto_sena, deposito FROM opciones_tipos WHERE categoria = 'ALQUILER_SALON';
