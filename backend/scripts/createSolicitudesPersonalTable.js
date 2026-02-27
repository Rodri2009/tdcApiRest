/**
 * scripts/createSolicitudesPersonalTable.js
 * Script para crear la tabla solicitudes_personal si no existe
 * Se ejecuta automáticamente al iniciar el servidor
 */

const pool = require('../db');

const createTable = async () => {
    let conn;
    try {
        conn = await pool.getConnection();
        
        const sql = `
            CREATE TABLE IF NOT EXISTS solicitudes_personal (
                id_solicitud_personal INT AUTO_INCREMENT PRIMARY KEY,
                id_solicitud INT NOT NULL,
                id_personal VARCHAR(50) DEFAULT NULL,
                rol_requerido VARCHAR(100) NOT NULL,
                estado VARCHAR(50) DEFAULT 'asignado' COMMENT 'asignado, confirmado, cancelado',
                creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_solicitud (id_solicitud),
                INDEX idx_personal (id_personal),
                FOREIGN KEY (id_solicitud) REFERENCES solicitudes(id_solicitud) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Asignaciones de personal a solicitudes antes de confirmarse como eventos'
        `;
        
        await conn.query(sql);
        console.log('✓ Tabla solicitudes_personal verificada/creada exitosamente');
        
    } catch (err) {
        console.error('Error al crear tabla solicitudes_personal:', err.message);
        // No fallar el servidor si la tabla ya existe o hay un error menor
        console.error('WARN: continuando sin interruption del servidor...');
    } finally {
        if (conn) conn.release();
    }
};

module.exports = { createTable };
