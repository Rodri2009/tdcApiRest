-- =========================================================
-- TABLAS PARA EL SISTEMA DE TICKETS (BANDAS EN VIVO)
-- =========================================================

-- 1. Tabla de Eventos
-- Almacena la información de cada fecha de banda que se pone a la venta.
CREATE TABLE IF NOT EXISTS eventos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_banda VARCHAR(255) NOT NULL COMMENT 'Nombre principal del show o banda',
    fecha_hora DATETIME NOT NULL COMMENT 'Fecha y hora del evento',
    precio_base DECIMAL(10, 2) NOT NULL DEFAULT 0.00 COMMENT 'Precio de la entrada general antes de impuestos o descuentos',
    aforo_maximo INT NOT NULL COMMENT 'Capacidad máxima de tickets a vender',
    descripcion TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Cupones de Descuento
-- Permite crear códigos promocionales de monto fijo o porcentaje.
CREATE TABLE IF NOT EXISTS cupones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE NOT NULL COMMENT 'Código que ingresa el usuario (ej: ROCK20)',
    tipo_descuento ENUM('PORCENTAJE', 'MONTO_FIJO') NOT NULL COMMENT 'Tipo de descuento a aplicar',
    valor_fijo DECIMAL(10, 2) NULL COMMENT 'Monto fijo de descuento (si aplica)',
    porcentaje_descuento DECIMAL(5, 2) NULL COMMENT 'Porcentaje de descuento (0 a 100) (si aplica)',
    usos_maximos INT NULL COMMENT 'Límite global de veces que se puede usar el cupón',
    usos_actuales INT NOT NULL DEFAULT 0,
    fecha_expiracion DATE NULL COMMENT 'Fecha límite para usar el cupón',
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Asegura que el porcentaje esté entre 0 y 100
    CHECK (porcentaje_descuento IS NULL OR (porcentaje_descuento >= 0 AND porcentaje_descuento <= 100))
);


-- 3. Tabla de Tickets
-- Registra cada ticket comprado por un usuario.
CREATE TABLE IF NOT EXISTS tickets (
    id_unico CHAR(36) PRIMARY KEY COMMENT 'UUID usado como identificador único y Código QR',
    evento_id INT NOT NULL,
    email_comprador VARCHAR(255) NOT NULL COMMENT 'Email del destinatario del ticket',
    nombre_comprador VARCHAR(255) NOT NULL COMMENT 'Nombre completo del comprador',
    cupon_id INT NULL COMMENT 'Referencia al cupón usado (si aplica)',
    precio_pagado DECIMAL(10, 2) NOT NULL COMMENT 'Precio final pagado por el ticket',
    fecha_compra TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Estado: 
    -- PENDIENTE_PAGO (inició checkout pero no terminó), 
    -- PAGADO (válido, puede entrar), 
    -- ESCANEADO (ya utilizado en la puerta), 
    -- ANULADO (cancelación/reembolso)
    estado ENUM('PENDIENTE_PAGO', 'PAGADO', 'ESCANEADO', 'ANULADO') NOT NULL DEFAULT 'PENDIENTE_PAGO',
    
    fecha_escaneo DATETIME NULL COMMENT 'Momento en que fue validado en la puerta',
    
    FOREIGN KEY (evento_id) REFERENCES eventos(id) ON DELETE RESTRICT,
    FOREIGN KEY (cupon_id) REFERENCES cupones(id) ON DELETE SET NULL
);

-- Opcional: Índice para búsquedas rápidas de tickets por email o estado
CREATE INDEX idx_ticket_email_estado ON tickets (email_comprador, estado);

-- Opcional: Índice para búsquedas rápidas de eventos por fecha
CREATE INDEX idx_evento_fecha ON eventos (fecha_hora);