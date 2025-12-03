-- Migration: Crear tabla eventos_personal para asignaciones de personal a eventos

CREATE TABLE IF NOT EXISTS eventos_personal (
  id_asignacion VARCHAR(50) PRIMARY KEY,
  id_evento INT NOT NULL,
  rol_requerido VARCHAR(100),
  id_personal_asignado VARCHAR(50),
  estado_asignacion VARCHAR(50),
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (id_evento),
  FOREIGN KEY (id_evento) REFERENCES eventos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
