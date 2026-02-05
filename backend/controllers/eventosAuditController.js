const pool = require('../db');

/**
 * List audit entries with optional filters: id_solicitud, tipo_evento, limit
 */
const listAudits = async (req, res) => {
    const { id_solicitud, tipo_evento, limit } = req.query;
    let conn;
    try {
        conn = await pool.getConnection();
        const where = [];
        const params = [];
        if (id_solicitud) {
            where.push('id_solicitud = ?');
            params.push(id_solicitud);
        }
        if (tipo_evento) {
            where.push('tipo_evento = ?');
            params.push(tipo_evento);
        }
        const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
        const lim = parseInt(limit, 10) || 100;

        const sql = `SELECT id, evento_id, id_solicitud, tipo_evento, tabla_origen, original_row, deleted_by, reason, deleted_at FROM eventos_confirmados_audit ${whereClause} ORDER BY deleted_at DESC LIMIT ?`;
        params.push(lim);
        const resultados = await conn.query(sql, params);
        res.status(200).json(resultados);
    } catch (err) {
        console.error('Error listing audit entries:', err);
        res.status(500).json({ message: 'Error interno al listar auditoría.' });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * Get single audit entry by id
 */
const getAuditById = async (req, res) => {
    const { id } = req.params;
    let conn;
    try {
        conn = await pool.getConnection();
        const [row] = await conn.query('SELECT id, evento_id, id_solicitud, tipo_evento, tabla_origen, original_row, deleted_by, reason, deleted_at FROM eventos_confirmados_audit WHERE id = ?', [id]);
        if (!row) return res.status(404).json({ message: 'Entrada de auditoría no encontrada' });
        res.status(200).json(row);
    } catch (err) {
        console.error('Error getting audit by id:', err);
        res.status(500).json({ message: 'Error interno al obtener auditoría.' });
    } finally {
        if (conn) conn.release();
    }
};

module.exports = { listAudits, getAuditById };