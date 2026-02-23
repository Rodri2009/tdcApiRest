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
            `SELECT id_cliente, nombre, telefono, email FROM clientes WHERE nombre LIKE ? OR email LIKE ? OR telefono LIKE ? LIMIT 50`,
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
        res.status(201).json({ id_cliente: Number(result.insertId), message: 'Cliente creado' });
    } catch (err) {
        logError('Error en createCliente:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * GET /api/admin/clientes/:id
 * Obtiene un cliente por ID (admin)
 */
const getCliente = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    logVerbose(`[CLIENTES] GET /api/admin/clientes/${id}`);
    if (isNaN(id)) return res.status(400).json({ error: 'ID de cliente inválido.' });

    let conn;
    try {
        conn = await pool.getConnection();
        const cliente = await conn.query(
            `SELECT id_cliente, nombre, telefono, email FROM clientes WHERE id_cliente = ?`,
            [id]
        );
        if (!cliente || cliente.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado.' });
        }
        res.status(200).json(cliente[0]);
    } catch (err) {
        logError('Error en getCliente:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

// PUT /api/admin/clientes/:id
const updateCliente = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    logVerbose(`[CLIENTES] PUT /api/admin/clientes/${id}`);
    if (isNaN(id)) return res.status(400).json({ error: 'ID de cliente inválido.' });
    const { nombre, telefono, email } = req.body;
    logVerbose('[CLIENTES] Body recibido:', req.body);
    if (!nombre && !telefono && !email) return res.status(400).json({ error: 'Se requiere al menos un campo para actualizar.' });

    let conn;
    try {
        conn = await pool.getConnection();

        // ✅ Validar email único si se está actualizando
        if (email && email.trim()) {
            const existing = await conn.query('SELECT id_cliente FROM clientes WHERE email = ? AND id_cliente != ?', [email.trim(), id]);
            if (existing && existing.length > 0) {
                return res.status(400).json({ error: 'Este email ya está registrado en otro cliente.' });
            }
        }

        const updates = [];
        const params = [];
        if (typeof nombre !== 'undefined') { updates.push('nombre = ?'); params.push(nombre || null); }
        if (typeof telefono !== 'undefined') { updates.push('telefono = ?'); params.push(telefono || null); }
        if (typeof email !== 'undefined') { updates.push('email = ?'); params.push(email || null); }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No hay cambios para aplicar.' });
        }

        params.push(id);
        const result = await conn.query(`UPDATE clientes SET ${updates.join(', ')} WHERE id_cliente = ?`, params);
        // No necesitamos ver el resultado crudo, puede contener BigInt
        logVerbose('[CLIENTES] UPDATE ejecutado');
        res.json({ id_cliente: id, message: 'Cliente actualizado.' });
    } catch (err) {
        // Capturar errores de duplicados de BD por si acaso
        if (err && err.code === 'ER_DUP_ENTRY') {
            logWarning('[CLIENTES] Email duplicado al actualizar', err.message);
            return res.status(400).json({ error: 'Este email ya existe.' });
        }
        logError('Error en updateCliente:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

module.exports = { searchClientes, createCliente, getCliente, updateCliente };
