-- ARCHIVED: consolidated into database/01_schema.sql on 2026-02-12
-- Migration: add cliente_id to talleristas
ALTER TABLE talleristas
  ADD COLUMN cliente_id INT NULL AFTER email,
  ADD INDEX idx_cliente_id (cliente_id),
  ADD CONSTRAINT fk_talleristas_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL;
