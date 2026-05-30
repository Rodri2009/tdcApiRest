-- ============================================================================
-- FASE 1: BASE - ALTERACIONES A TABLA TICKETS
-- ============================================================================
-- Fecha: 28/05/2026
-- Propósito: Agregar campos para fases posteriores sin romper existente
-- ============================================================================

-- Notar: Se agregan campos con DEFAULT o NULL para compatibilidad

ALTER TABLE tickets ADD COLUMN (
    -- Para MercadoPago y auditoría
    mp_payment_id VARCHAR(255) DEFAULT NULL COMMENT 'ID de pago de MP (para reembolsos)',
    
    -- Para control en puerta (Fase 2)
    escaneo_codigo VARCHAR(100) UNIQUE DEFAULT NULL COMMENT 'Código QR único para escanear en puerta',
    cantidad_utilizada INT DEFAULT 0 COMMENT 'Cuántas entradas se usaron en puerta',
    fecha_utilizacion TIMESTAMP NULL DEFAULT NULL COMMENT 'Cuándo se usó la entrada en puerta',
    fecha_escaneo TIMESTAMP NULL DEFAULT NULL COMMENT 'Cuándo se escaneó (auditoría)',
    
    -- Para devoluciones (Fase 3)
    razon_cancelacion VARCHAR(255) DEFAULT NULL COMMENT 'Motivo de la cancelación',
    monto_reembolsado DECIMAL(10,2) DEFAULT 0 COMMENT 'Monto que se reembolsó',
    fecha_cancelacion TIMESTAMP NULL DEFAULT NULL COMMENT 'Cuándo se canceló',
    autorizado_por INT DEFAULT NULL COMMENT 'ID de usuario que autorizó (FK a usuarios.id_usuario)',
    notas_puerta TEXT DEFAULT NULL COMMENT 'Observaciones en puerta',
    
    -- Foreign key para auditoría
    FOREIGN KEY (autorizado_por) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
);

-- Agregar índices para búsquedas rápidas
ALTER TABLE tickets ADD INDEX idx_mp_payment_id (mp_payment_id);
ALTER TABLE tickets ADD INDEX idx_escaneo_codigo (escaneo_codigo);
ALTER TABLE tickets ADD INDEX idx_estado_ext (estado, fecha_utilizacion);
ALTER TABLE tickets ADD INDEX idx_fecha_cancelacion (fecha_cancelacion);

-- ============================================================================
-- CREAR TABLA: TICKETS_HISTORIAL (Auditoría completa)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tickets_historial (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Identificador único del registro de historial',
    id_ticket INT NOT NULL COMMENT 'FK a tickets.id',
    estado_anterior VARCHAR(50) DEFAULT NULL COMMENT 'Estado anterior (pendiente, pagado, etc.)',
    estado_nuevo VARCHAR(50) NOT NULL COMMENT 'Nuevo estado',
    usuario_id INT DEFAULT NULL COMMENT 'Usuario que hizo el cambio',
    motivo TEXT DEFAULT NULL COMMENT 'Razón del cambio (cancelación, validación, etc.)',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Cuándo ocurrió el cambio',
    
    FOREIGN KEY (id_ticket) REFERENCES tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    INDEX idx_ticket (id_ticket),
    INDEX idx_fecha (creado_en),
    INDEX idx_estado_nuevo (estado_nuevo),
    INDEX idx_usuario (usuario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
COMMENT='Auditoría completa de cambios de estado de tickets';

-- ============================================================================
-- FIN FASE 1 - ALTERACIONES
-- ============================================================================
