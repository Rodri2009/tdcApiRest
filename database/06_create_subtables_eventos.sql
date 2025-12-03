-- Migración: Agregar tipo_evento y es_publico a `eventos`, y crear subtablas específicas

-- 1) Añadir columnas a la tabla principal `eventos` (si no existen)
ALTER TABLE eventos
  ADD COLUMN IF NOT EXISTS tipo_evento ENUM('ALQUILER','BANDA','TALLER','SERVICIO','OTRO') NOT NULL DEFAULT 'OTRO' AFTER descripcion,
  ADD COLUMN IF NOT EXISTS es_publico BOOLEAN NOT NULL DEFAULT TRUE AFTER tipo_evento;

-- 2) Crear subtabla para alquiler del salón (privada)
CREATE TABLE IF NOT EXISTS alquiler_salon (
  event_id INT PRIMARY KEY,
  contacto_nombre VARCHAR(255) NULL,
  contacto_telefono VARCHAR(50) NULL,
  empresa VARCHAR(255) NULL,
  duracion_horas INT NULL,
  deposito DECIMAL(10,2) NULL,
  contrato_url VARCHAR(512) NULL,
  privado_notes TEXT NULL,
  FOREIGN KEY (event_id) REFERENCES eventos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3) Crear subtabla para talleres y actividades (públicas normalmente)
CREATE TABLE IF NOT EXISTS talleres_actividades (
  event_id INT PRIMARY KEY,
  instructor VARCHAR(255) NULL,
  cupo INT NULL,
  duracion_hs INT NULL,
  materiales_incluidos TEXT NULL,
  precio_por_participante DECIMAL(10,2) NULL,
  FOREIGN KEY (event_id) REFERENCES eventos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4) Crear subtabla para servicios (por ejemplo depilación u otros) -- puede mapearse a sesiones
CREATE TABLE IF NOT EXISTS servicios (
  event_id INT PRIMARY KEY,
  servicio_tipo VARCHAR(255) NULL,
  sesiones_requeridas INT NULL,
  intervalo_meses INT NULL,
  profesional_id INT NULL,
  notas TEXT NULL,
  FOREIGN KEY (event_id) REFERENCES eventos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5) Crear subtabla para bandas en vivo (detalles específicos)
CREATE TABLE IF NOT EXISTS bandas_en_vivo (
  event_id INT PRIMARY KEY,
  nombre_banda VARCHAR(255) NULL,
  genero VARCHAR(255) NULL,
  promotor VARCHAR(255) NULL,
  backline_req TEXT NULL,
  contacto_promotor VARCHAR(255) NULL,
  FOREIGN KEY (event_id) REFERENCES eventos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Nota: Después de crear estas tablas, podés insertar/actualizar registros en las subtables enlazando por event_id.
-- Recomiendo ejecutar un backup completo antes de aplicar esta migración.
