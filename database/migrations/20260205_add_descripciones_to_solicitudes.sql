-- ARCHIVED: consolidated into database/01_schema.sql on 2026-02-12
-- Migration: add descripcion_corta and descripcion_larga to solicitudes (idempotent)
-- Fecha: 2026-02-05

ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS descripcion_corta VARCHAR(255) DEFAULT NULL;
ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS descripcion_larga TEXT DEFAULT NULL;

-- Ensure indexes if needed (none required for these textual columns)
