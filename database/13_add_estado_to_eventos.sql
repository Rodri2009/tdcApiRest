-- Migration: Añadir columna 'estado' a la tabla eventos para seguimiento de flujo

ALTER TABLE eventos
  ADD COLUMN IF NOT EXISTS estado VARCHAR(50) NOT NULL DEFAULT 'Solicitado' AFTER descripcion;
