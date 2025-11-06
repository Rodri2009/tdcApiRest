const pool = require('../db');

const getSolicitudes = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const sql = `
            SELECT s.id_solicitud as id, s.fecha_hora as fechaSolicitud, s.nombre_completo as nombreCliente, 
                   ot.nombre_para_mostrar as tipoEvento, DATE_FORMAT(s.fecha_evento, '%Y-%m-%d') as fechaEvento, 
                   s.estado, s.tipo_de_evento as tipoEventoId
            FROM solicitudes s
            LEFT JOIN opciones_tipos ot ON s.tipo_de_evento = ot.id_evento
            ORDER BY s.fecha_hora DESC;
        `;
        const solicitudes = await conn.query(sql);
        res.status(200).json(solicitudes);
    } catch (err) {
        res.status(500).json({ message: 'Error del servidor.' });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * Actualiza el estado de una solicitud.
 */
const actualizarEstadoSolicitud = async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;
    
    // Lista de estados válidos para seguridad
    const estadosValidos = ['Solicitado', 'Contactado', 'Confirmado', 'Cancelado'];
    if (!estado || !estadosValidos.includes(estado)) {
        return res.status(400).json({ message: 'Estado no válido.' });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        const result = await conn.query("UPDATE solicitudes SET estado = ? WHERE id_solicitud = ?", [estado, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Solicitud no encontrada.' });
        }
        
        res.status(200).json({ success: true, message: `Estado de la solicitud ${id} actualizado a ${estado}.` });
    } catch (err) {
        res.status(500).json({ message: 'Error del servidor.' });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * Elimina una solicitud de forma permanente.
 */
const eliminarSolicitud = async (req, res) => {
    const { id } = req.params;
    
    let conn;
    try {
        conn = await pool.getConnection();
        // Por seguridad, borramos en cascada (primero los hijos, luego el padre)
        await conn.query("DELETE FROM solicitudes_adicionales WHERE id_solicitud = ?", [id]);
        await conn.query("DELETE FROM solicitudes_personal WHERE id_solicitud = ?", [id]);
        const result = await conn.query("DELETE FROM solicitudes WHERE id_solicitud = ?", [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Solicitud no encontrada.' });
        }

        res.status(200).json({ success: true, message: `Solicitud ${id} eliminada permanentemente.` });
    } catch (err) {
        res.status(500).json({ message: 'Error del servidor.' });
    } finally {
        if (conn) conn.release();
    }
};


module.exports = {
    getSolicitudes,
    actualizarEstadoSolicitud,
    eliminarSolicitud,
};
