-- Añadir cliente_id a profesionales_servicios
ALTER TABLE profesionales_servicios
  ADD COLUMN cliente_id INT NULL DEFAULT NULL,
  ADD INDEX idx_profesionales_cliente_id (cliente_id),
  ADD CONSTRAINT fk_profesionales_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL;
