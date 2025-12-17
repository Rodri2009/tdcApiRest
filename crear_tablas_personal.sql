-- =======================================
-- TABLA: personal_tarifas
-- Propósito: Tarifas por hora y por evento de cada empleado
-- =======================================
CREATE TABLE personal_tarifas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_personal VARCHAR(50) NOT NULL,
    id_rol INT NULL,
    monto_por_hora DECIMAL(10,2) NULL COMMENT 'Tarifa por hora trabajada',
    monto_fijo_evento DECIMAL(10,2) NULL COMMENT 'Tarifa fija por evento completo',
    monto_minimo DECIMAL(10,2) NULL COMMENT 'Monto mínimo garantizado',
    vigente_desde DATE NOT NULL COMMENT 'Fecha desde cuando es válida esta tarifa',
    vigente_hasta DATE NULL COMMENT 'Fecha hasta cuando es válida (NULL = indefinida)',
    moneda VARCHAR(3) DEFAULT 'ARS' COMMENT 'Moneda (ARS, USD, EUR)',
    descripcion TEXT NULL COMMENT 'Descripción de la tarifa',
    activo BOOLEAN DEFAULT TRUE COMMENT 'Si la tarifa está activa',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_personal (id_personal),
    INDEX idx_vigencia (vigente_desde, vigente_hasta),
    INDEX idx_activo (activo),
    INDEX idx_rol (id_rol)
);

-- =======================================
-- TABLA: personal_pagos
-- Propósito: Registro de pagos realizados a empleados
-- =======================================
CREATE TABLE personal_pagos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_personal VARCHAR(50) NOT NULL COMMENT 'ID del empleado',
    id_solicitud INT NULL COMMENT 'ID del evento/solicitud (opcional)',
    monto_acordado DECIMAL(10,2) NOT NULL COMMENT 'Monto acordado para este trabajo',
    monto_pagado DECIMAL(10,2) DEFAULT 0 COMMENT 'Monto realmente pagado',
    fecha_trabajo DATE NULL COMMENT 'Fecha en que se realizó el trabajo',
    fecha_pago DATE NULL COMMENT 'Fecha en que se realizó el pago',
    metodo_pago VARCHAR(50) DEFAULT 'efectivo' COMMENT 'efectivo, transferencia, cheque, etc.',
    comprobante VARCHAR(255) NULL COMMENT 'Número de comprobante o referencia',
    estado ENUM('pendiente', 'parcial', 'pagado') DEFAULT 'pendiente' COMMENT 'Estado del pago',
    descripcion TEXT NULL COMMENT 'Descripción del trabajo realizado',
    notas TEXT NULL COMMENT 'Notas adicionales',
    creado_por INT NULL COMMENT 'ID del usuario que creó el registro',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_personal (id_personal),
    INDEX idx_solicitud (id_solicitud),
    INDEX idx_estado (estado),
    INDEX idx_fecha_trabajo (fecha_trabajo),
    INDEX idx_fecha_pago (fecha_pago),
    INDEX idx_metodo_pago (metodo_pago),
    
    FOREIGN KEY (id_personal) REFERENCES personal_disponible(id_personal) ON DELETE RESTRICT,
    FOREIGN KEY (id_solicitud) REFERENCES solicitudes(id_solicitud) ON DELETE SET NULL,
    FOREIGN KEY (creado_por) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
);

-- =======================================
-- DATOS DE EJEMPLO PARA TESTING
-- =======================================

-- Insertar algunas tarifas de ejemplo
INSERT INTO personal_tarifas (id_personal, id_rol, monto_por_hora, monto_fijo_evento, monto_minimo, vigente_desde, descripcion) VALUES
('EMP001', 1, 2500.00, 15000.00, 10000.00, '2025-01-01', 'DJ - Tarifa estándar'),
('EMP002', 2, 1800.00, 8000.00, 6000.00, '2025-01-01', 'Mesera - Tarifa estándar'),
('EMP003', 3, 2200.00, 12000.00, 8000.00, '2025-01-01', 'Encargado - Tarifa estándar');

-- Insertar algunos pagos de ejemplo
INSERT INTO personal_pagos (id_personal, id_solicitud, monto_acordado, monto_pagado, fecha_trabajo, fecha_pago, metodo_pago, estado, descripcion) VALUES
('EMP001', 13, 15000.00, 15000.00, '2025-12-20', '2025-12-21', 'transferencia', 'pagado', 'DJ para evento del 20/12'),
('EMP002', 13, 8000.00, 4000.00, '2025-12-20', '2025-12-21', 'efectivo', 'parcial', 'Mesera para evento del 20/12 - Pago parcial');
