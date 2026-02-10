-- Migration: add url_flyer column to eventos_confirmados
-- Date: 2026-02-10

ALTER TABLE eventos_confirmados
  ADD COLUMN IF NOT EXISTS url_flyer VARCHAR(500) DEFAULT NULL COMMENT 'URL del flyer/promocional';

-- Note: This migration is safe to run on databases where the column may already exist.
