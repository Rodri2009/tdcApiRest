const pool = require('../db');
const { logVerbose, logError, logSuccess, logWarning } = require('../lib/debugFlags');

/**
 * GET /api/admin/clientes/search?q=term
 * Busca clientes por nombre, email o teléfono (admin)
 */
const searchClientes = async (req, res) => {
    const q = (req.query.q || '').trim();
    if (!q || q.length < 2) return res.status(400).json({ error: 'Parámetro q de búsqueda es requerido (mín 2 caracteres).' });

    let conn;
    try {
        conn = await pool.getConnection();
        const like = `%${q}%`;
        const rows = await conn.query(
            `SELECT id, nombre, telefono, email FROM clientes WHERE nombre LIKE ? OR email LIKE ? OR telefono LIKE ? LIMIT 50`,
            [like, like, like]
        );
        res.status(200).json(rows);
    } catch (err) {
        logError('Error en searchClientes:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * POST /api/admin/clientes
 * Crea un cliente (admin)
 */
const createCliente = async (req, res) => {
    const { nombre, telefono, email } = req.body;
    if (!nombre && !telefono && !email) return res.status(400).json({ error: 'Se requiere al menos nombre, teléfono o email.' });

    let conn;
    try {
        conn = await pool.getConnection();
        const result = await conn.query(
            `INSERT INTO clientes (nombre, telefono, email, creado_en) VALUES (?, ?, ?, NOW())`,
            [nombre || null, telefono || null, email || null]
        );
        res.status(201).json({ id: Number(result.insertId), message: 'Cliente creado' });
    } catch (err) {
        logError('Error en createCliente:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

module.exports = { searchClientes, createCliente };
