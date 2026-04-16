const pool = require('../db');
const { logVerbose, logError, logSuccess, logWarning } = require('../lib/debugFlags');

/**
 * GET /api/admin/clientes
 * Lista todos los clientes (admin) con info de usuario vinculado
 */
const listClientes = async (req, res) => {
    logVerbose('[CLIENTES] GET - Obtener todos los clientes');

    let conn;
    try {
        conn = await pool.getConnection();
        const clientes = await conn.query(
            `SELECT 
                c.id_cliente, 
                c.id_usuario, 
                c.nombre,
                c.apellido,
                c.telefono, 
                c.email,
                u.rol as usuario_rol,
                u.nombre as usuario_nombre
             FROM clientes c
             LEFT JOIN usuarios u ON c.id_usuario = u.id_usuario
             ORDER BY c.nombre ASC`
        );
        res.status(200).json(clientes);
    } catch (err) {
        logError('Error en listClientes:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

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
 * 
 * Validaciones:
 * - Email único en tabla clientes
 * - Si email existe en usuarios → vincula automáticamente
 * - Retorna advertencia si cliente ya existe
 */
const createCliente = async (req, res) => {
    const { nombre, apellido, telefono, email } = req.body;
    if (!nombre && !telefono && !email) {
        return res.status(400).json({ error: 'Se requiere al menos nombre, teléfono o email.' });
    }

    let conn;
    try {
        conn = await pool.getConnection();

        // ✅ Validar email único en clientes si es proporcionado
        if (email && email.trim()) {
            const emailTrimmed = email.trim();
            const existingCliente = await conn.query(
                `SELECT id_cliente FROM clientes WHERE email = ?`,
                [emailTrimmed]
            );
            if (existingCliente && existingCliente.length > 0) {
                return res.status(409).json({
                    error: 'Ya existe un cliente con este email',
                    id_cliente: existingCliente[0].id_cliente
                });
            }

            // ✅ Buscar si el email ya existe en usuarios para vinculación automática
            let idUsuario = null;
            const existingUsuario = await conn.query(
                `SELECT id_usuario FROM usuarios WHERE email = ?`,
                [emailTrimmed]
            );
            if (existingUsuario && existingUsuario.length > 0) {
                idUsuario = existingUsuario[0].id_usuario;
                logVerbose(`[CLIENTES] Email ${emailTrimmed} hallado en usuarios (id=${idUsuario}). Vinculando automáticamente.`);
            }

            // Crear cliente con vinculación automática si corresponde
            const result = await conn.query(
                `INSERT INTO clientes (id_usuario, nombre, apellido, telefono, email, creado_en) VALUES (?, ?, ?, ?, ?, NOW())`,
                [idUsuario || null, nombre || null, apellido || null, telefono || null, emailTrimmed]
            );
            res.status(201).json({
                id_cliente: Number(result.insertId),
                id_usuario: idUsuario,
                message: idUsuario
                    ? `Cliente creado y vinculado automáticamente a usuario #${idUsuario}`
                    : 'Cliente creado sin vinculación a usuario'
            });
        } else {
            // Sin email: crear cliente simple
            const result = await conn.query(
                `INSERT INTO clientes (nombre, apellido, telefono, email, creado_en) VALUES (?, ?, ?, ?, NOW())`,
                [nombre || null, apellido || null, telefono || null, null]
            );
            res.status(201).json({ id_cliente: Number(result.insertId), message: 'Cliente creado' });
        }
    } catch (err) {
        logError('Error en createCliente:', err);
        res.status(500).json({ error: 'Error interno del servidor: ' + err.message });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * GET /api/admin/clientes/:id
 * Obtiene un cliente por ID (admin) con info del usuario vinculado si existe
 */
const getCliente = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    logVerbose(`[CLIENTES] GET /api/admin/clientes/${id}`);
    if (isNaN(id)) return res.status(400).json({ error: 'ID de cliente inválido.' });

    let conn;
    try {
        conn = await pool.getConnection();
        const cliente = await conn.query(
            `SELECT id_cliente, id_usuario, nombre, apellido, telefono, email FROM clientes WHERE id_cliente = ?`,
            [id]
        );
        if (!cliente || cliente.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado.' });
        }
        
        const clienteData = cliente[0];
        
        // Si tiene usuario vinculado, obtener información adicional
        if (clienteData.id_usuario) {
            const usuario = await conn.query(
                `SELECT id_usuario, email as email_usuario, nombre as nombre_usuario, rol FROM usuarios WHERE id_usuario = ?`,
                [clienteData.id_usuario]
            );
            if (usuario && usuario.length > 0) {
                clienteData.usuario = usuario[0];
            }
        }
        
        res.status(200).json(clienteData);
    } catch (err) {
        logError('Error en getCliente:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

// PUT /api/admin/clientes/:id
/**
 * Actualiza un cliente (admin)
 * 
 * Validaciones:
 * - Email único en tabla clientes (excepto el cliente actual)
 * - Si email cambia y existe en usuarios → actualiza vinculación
 * - Si email se vacía → desvincula usuario
 */
const updateCliente = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    logVerbose(`[CLIENTES] PUT /api/admin/clientes/${id}`);
    if (isNaN(id)) return res.status(400).json({ error: 'ID de cliente inválido.' });
    const { nombre, apellido, telefono, email } = req.body;
    logVerbose('[CLIENTES] Body recibido:', req.body);
    if (!nombre && !telefono && !email) return res.status(400).json({ error: 'Se requiere al menos un campo para actualizar.' });

    let conn;
    try {
        conn = await pool.getConnection();

        // ✅ Validar email único si se proporciona
        let newIdUsuario = null;
        if (email && email.trim()) {
            const emailTrimmed = email.trim();
            
            // Verificar que el email no esté en otro cliente
            const existing = await conn.query(
                'SELECT id_cliente FROM clientes WHERE email = ? AND id_cliente != ?',
                [emailTrimmed, id]
            );
            if (existing && existing.length > 0) {
                return res.status(409).json({ error: 'Este email ya está registrado en otro cliente.' });
            }

            // ✅ Buscar si el nuevo email existe en usuarios para re-vincular
            const existingUsuario = await conn.query(
                `SELECT id_usuario FROM usuarios WHERE email = ?`,
                [emailTrimmed]
            );
            if (existingUsuario && existingUsuario.length > 0) {
                newIdUsuario = existingUsuario[0].id_usuario;
                logVerbose(`[CLIENTES] Email ${emailTrimmed} hallado en usuarios (id=${newIdUsuario}). Actualizando vinculación.`);
            }
        }

        const updates = [];
        const params = [];
        if (typeof nombre !== 'undefined') { updates.push('nombre = ?'); params.push(nombre || null); }
        if (typeof apellido !== 'undefined') { updates.push('apellido = ?'); params.push(apellido || null); }
        if (typeof telefono !== 'undefined') { updates.push('telefono = ?'); params.push(telefono || null); }
        if (typeof email !== 'undefined') { updates.push('email = ?'); params.push(email ? email.trim() : null); }
        // ✅ Actualizar id_usuario si se detectó vinculación
        if (email !== undefined && newIdUsuario !== null) {
            updates.push('id_usuario = ?');
            params.push(newIdUsuario);
        } else if (email !== undefined && !email) {
            // Si se vacía el email, desvincula usuario
            updates.push('id_usuario = ?');
            params.push(null);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No hay cambios para aplicar.' });
        }

        params.push(id);
        const result = await conn.query(
            `UPDATE clientes SET ${updates.join(', ')} WHERE id_cliente = ?`,
            params
        );
        
        logVerbose('[CLIENTES] UPDATE ejecutado');
        res.json({
            id_cliente: id,
            id_usuario: newIdUsuario,
            message: newIdUsuario
                ? `Cliente actualizado y vinculado a usuario #${newIdUsuario}`
                : 'Cliente actualizado'
        });
    } catch (err) {
        // Capturar errores de duplicados de BD por si acaso
        if (err && err.code === 'ER_DUP_ENTRY') {
            logWarning('[CLIENTES] Email duplicado al actualizar', err.message);
            return res.status(409).json({ error: 'Este email ya existe.' });
        }
        logError('Error en updateCliente:', err);
        res.status(500).json({ error: 'Error interno del servidor: ' + err.message });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * DELETE /api/admin/clientes/:id
 * Elimina un cliente (admin)
 */
const deleteCliente = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    logVerbose(`[CLIENTES] DELETE /api/admin/clientes/${id}`);
    if (isNaN(id)) return res.status(400).json({ error: 'ID de cliente inválido.' });

    let conn;
    try {
        conn = await pool.getConnection();
        const result = await conn.query(`DELETE FROM clientes WHERE id_cliente = ?`, [id]);
        logVerbose('[CLIENTES] DELETE ejecutado');
        res.json({ id_cliente: id, message: 'Cliente eliminado.' });
    } catch (err) {
        logError('Error en deleteCliente:', err);
        // Errores comunes con FK
        if (err && err.code === 'ER_ROW_IS_REFERENCED_2_FOREIGN_KEY') {
            return res.status(409).json({ 
                error: 'Este cliente está vinculado a bandas o eventos. Por favor, desvincula primero los registros asociados.' 
            });
        }
        res.status(500).json({ error: 'Error interno del servidor: ' + err.message });
    } finally {
        if (conn) conn.release();
    }
};

module.exports = { listClientes, searchClientes, createCliente, getCliente, updateCliente, deleteCliente };
