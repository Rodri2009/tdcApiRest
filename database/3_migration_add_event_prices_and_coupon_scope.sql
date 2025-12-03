-- Migración: Añadir columnas para precios anticipada/puerta y ámbito de cupones
-- Usa IF NOT EXISTS para evitar errores si las columnas ya existen

ALTER TABLE eventos
  ADD COLUMN IF NOT EXISTS precio_anticipada DECIMAL(10,2) NULL AFTER precio_base,
  ADD COLUMN IF NOT EXISTS precio_puerta DECIMAL(10,2) NULL AFTER precio_anticipada;

ALTER TABLE cupones
  ADD COLUMN IF NOT EXISTS aplica_a ENUM('TODAS','ANTICIPADA','PUERTA') NOT NULL DEFAULT 'TODAS' AFTER activo;

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS tipo_precio ENUM('ANTICIPADA','PUERTA','OTRO') NOT NULL DEFAULT 'ANTICIPADA' AFTER precio_pagado;

-- Rellenar valores por defecto para eventos existentes (si se desea mantener comportamiento previo)
UPDATE eventos SET precio_anticipada = precio_base WHERE precio_anticipada IS NULL;
UPDATE eventos SET precio_puerta = precio_base WHERE precio_puerta IS NULL;
