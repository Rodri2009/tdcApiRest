-- Migración: Añadir columnas para precios anticipada/puerta y ámbito de cupones

ALTER TABLE eventos
  ADD COLUMN precio_anticipada DECIMAL(10,2) NULL AFTER precio_base,
  ADD COLUMN precio_puerta DECIMAL(10,2) NULL AFTER precio_anticipada;

ALTER TABLE cupones
  ADD COLUMN aplica_a ENUM('TODAS','ANTICIPADA','PUERTA') NOT NULL DEFAULT 'TODAS' AFTER activo;

ALTER TABLE tickets
  ADD COLUMN tipo_precio ENUM('ANTICIPADA','PUERTA','OTRO') NOT NULL DEFAULT 'ANTICIPADA' AFTER precio_pagado;

-- Rellenar valores por defecto para eventos existentes (si se desea mantener comportamiento previo)
UPDATE eventos SET precio_anticipada = precio_base WHERE precio_anticipada IS NULL;
UPDATE eventos SET precio_puerta = precio_base WHERE precio_puerta IS NULL;

-- Nota: Ejecutar este archivo contra la base de datos activa (ej: docker exec mariadb ... mysql < this.sql)
