-- Migración 6: Tabla para persisitir datos de solicitudes de bandas

-- Esta tabla almacena metadatos estructurados de solicitudes de tipo
-- FECHA_EN_VIVO (bandas). Está ligada a `solicitudes.id_solicitud`.

CREATE TABLE IF NOT EXISTS bandas_solicitudes (
  id_solicitud INT PRIMARY KEY,
  nombre_banda VARCHAR(255),
  contacto_email VARCHAR(255),
  link_musica VARCHAR(1024),
  propuesta TEXT,
  event_id INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_bandas_solicitudes_solicitud FOREIGN KEY (id_solicitud) REFERENCES solicitudes(id_solicitud) ON DELETE CASCADE
);

-- Fin de migración
SELECT 'migracion_6_ok' AS status;
