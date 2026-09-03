// backend/controllers/talleresController.js
// Controlador para gestión de Talleres/Actividades
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { logVerbose, logError, logSuccess, logWarning } = require('../lib/debugFlags');

const generarPasswordTemporal = () => {
    const random = crypto.randomBytes(6).toString('hex');
    return `Tdc-${random}!`;
};

const ensureTalleristaProfileColumns = async (conn) => {
    const rows = await conn.query(
        `SELECT COLUMN_NAME AS column_name
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'talleristas'`
    );
    const columns = new Set(rows.map(row => row.column_name));

    const additions = [];
    if (!columns.has('id_usuario')) {
        additions.push('ADD COLUMN id_usuario INT NULL');
    }
    if (!columns.has('id_cliente')) {
        additions.push('ADD COLUMN id_cliente INT NULL');
    }

    if (additions.length > 0) {
        const sql = `ALTER TABLE talleristas ${additions.join(', ')}`;
        await conn.query(sql);
    }
};

const resolverUsuarioYClienteTallerista = async (conn, { nombre, apellido, telefono, email, id_usuario = null, id_cliente = null }) => {
    let finalIdUsuario = id_usuario ? Number(id_usuario) : null;
    let finalIdCliente = id_cliente ? Number(id_cliente) : null;
    let passwordTemporal = null;

    const nombreCompleto = [nombre, apellido].filter(Boolean).join(' ').trim();

    if (email && String(email).trim().length > 0) {
        const emailNormalizado = String(email).trim();

        if (!finalIdUsuario) {
            const [usuarioExistente] = await conn.query(
                'SELECT id_usuario FROM usuarios WHERE email = ? LIMIT 1',
                [emailNormalizado]
            );

            if (usuarioExistente && usuarioExistente.id_usuario) {
                finalIdUsuario = Number(usuarioExistente.id_usuario);
            } else {
                passwordTemporal = generarPasswordTemporal();
                const salt = await bcrypt.genSalt(10);
                const passwordHash = await bcrypt.hash(passwordTemporal, salt);
                const result = await conn.query(
                    `INSERT INTO usuarios (email, password_hash, nombre, rol, activo)
                     VALUES (?, ?, ?, 'cliente', 1)`,
                    [emailNormalizado, passwordHash, nombreCompleto || nombre || '',]
                );
                finalIdUsuario = Number(result.insertId);
            }
        }

        if (!finalIdCliente && finalIdUsuario) {
            const [clienteExistente] = await conn.query(
                `SELECT id_cliente FROM clientes WHERE id_usuario = ? OR email = ? LIMIT 1`,
                [finalIdUsuario, emailNormalizado]
            );

            if (clienteExistente && clienteExistente.id_cliente) {
                finalIdCliente = Number(clienteExistente.id_cliente);
            } else {
                const result = await conn.query(
                    `INSERT INTO clientes (id_usuario, nombre, apellido, telefono, email, creado_por_id_usuario, activo)
                     VALUES (?, ?, ?, ?, ?, ?, 1)`,
                    [finalIdUsuario, nombre || null, apellido || null, telefono || null, emailNormalizado, finalIdUsuario]
                );
                finalIdCliente = Number(result.insertId);
            }
        }
    }

    return { id_usuario: finalIdUsuario, id_cliente: finalIdCliente, passwordTemporal };
};

// =============================================================================
// TALLERISTAS
// =============================================================================

const getTalleristas = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const soloActivos = req.query.activos === '1';

        let sql = `
            SELECT
                t.id,
                t.id_usuario,
                t.id_cliente,
                COALESCE(u.nombre, t.nombre) AS nombre,
                COALESCE(c.apellido, '') AS apellido,
                t.especialidad,
                t.bio,
                COALESCE(t.telefono, c.telefono) AS telefono,
                COALESCE(t.email, c.email, u.email) AS email,
                COALESCE(t.instagram, '') AS instagram,
                t.activo,
                t.creado_en AS creadoEn
            FROM talleristas t
            LEFT JOIN usuarios u ON u.id_usuario = t.id_usuario
            LEFT JOIN clientes c ON c.id_cliente = t.id_cliente
        `;

        if (soloActivos) sql += ` WHERE t.activo = 1`;
        sql += ` ORDER BY COALESCE(u.nombre, t.nombre)`;

        const rows = await conn.query(sql);
        res.status(200).json(rows);
    } catch (err) {
        logError("Error en getTalleristas:", err);
        try {
            const fallbackSql = `SELECT id, nombre, especialidad, bio, telefono, email, instagram, activo, creado_en as creadoEn FROM talleristas`;
            const rows = await conn.query(fallbackSql);
            res.status(200).json(rows);
        } catch (fallbackErr) {
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    } finally {
        if (conn) conn.release();
    }
};

const getTalleristaById = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const { id } = req.params;
        const rows = await conn.query(`
            SELECT
                t.*,
                COALESCE(c.apellido, '') AS apellido,
                COALESCE(c.id_cliente, t.id_cliente) AS cliente_id
            FROM talleristas t
            LEFT JOIN clientes c ON c.id_cliente = t.id_cliente
            WHERE t.id = ?
        `, [id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Tallerista no encontrado' });
        }
        res.status(200).json(rows[0]);
    } catch (err) {
        logError("Error en getTalleristaById:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

const createTallerista = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const { nombre, apellido, especialidad, bio, telefono, email, instagram, cliente_id = null, id_cliente = null, id_usuario = null, activo = 1 } = req.body;
        const selectedClienteId = id_cliente ?? cliente_id ?? null;

        await ensureTalleristaProfileColumns(conn);

        if (!nombre) {
            return res.status(400).json({ error: 'El nombre es obligatorio' });
        }

        const emailNormalizado = String(email || '').trim();
        if (!emailNormalizado) {
            return res.status(400).json({ error: 'El email es obligatorio para crear el tallerista y su usuario de acceso' });
        }

        const [existingUser] = await conn.query('SELECT id_usuario FROM usuarios WHERE email = ? LIMIT 1', [emailNormalizado]);
        if (existingUser && !id_usuario) {
            return res.status(409).json({ error: 'El email ya existe en usuarios. Debe usar uno distinto.' });
        }

        const { id_usuario: usuarioCreadoId, id_cliente: clienteCreadoId, passwordTemporal } = await resolverUsuarioYClienteTallerista(conn, {
            nombre,
            apellido,
            telefono,
            email,
            id_usuario,
            id_cliente: selectedClienteId
        });

        const finalIdCliente = clienteCreadoId || selectedClienteId || null;
        const finalIdUsuario = usuarioCreadoId || id_usuario || null;

        const params = [
            finalIdUsuario,
            finalIdCliente,
            nombre,
            especialidad || null,
            bio || null,
            telefono || null,
            emailNormalizado,
            instagram || null,
            activo
        ];

        try {
            const result = await conn.query(
                `INSERT INTO talleristas (id_usuario, id_cliente, nombre, especialidad, bio, telefono, email, instagram, activo)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                params
            );

            const response = {
                message: 'Tallerista creado exitosamente',
                id: Number(result.insertId),
                id_usuario: finalIdUsuario,
                id_cliente: finalIdCliente,
            };

            if (passwordTemporal) {
                response.passwordTemporal = passwordTemporal;
                response.message = 'Tallerista creado exitosamente y usuario generado con contraseña temporal';
            }

            return res.status(201).json(response);
        } catch (insertErr) {
            if (insertErr && (insertErr.code === 'ER_BAD_FIELD_ERROR' || insertErr.code === 'ER_NO_SUCH_COLUMN')) {
                const fallbackResult = await conn.query(
                    `INSERT INTO talleristas (nombre, especialidad, bio, telefono, email, instagram, id_cliente, activo)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [nombre, especialidad || null, bio || null, telefono || null, emailNormalizado, instagram || null, finalIdCliente || null, activo]
                );

                return res.status(201).json({
                    message: 'Tallerista creado exitosamente (esquema legacy)',
                    id: Number(fallbackResult.insertId),
                    id_usuario: finalIdUsuario,
                    id_cliente: finalIdCliente
                });
            }
            throw insertErr;
        }
    } catch (err) {
        logError("Error en createTallerista:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

const updateTallerista = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const { id } = req.params;
        const { nombre, apellido, especialidad, bio, telefono, email, instagram, id_cliente, activo } = req.body;

        const [talleristaActual] = await conn.query(`SELECT id_usuario, id_cliente FROM talleristas WHERE id = ? LIMIT 1`, [id]);
        if (!talleristaActual) {
            return res.status(404).json({ error: 'Tallerista no encontrado' });
        }

        const emailNormalizado = typeof email === 'string' ? email.trim() : (email || null);
        if (emailNormalizado) {
            const [userWithSameEmail] = await conn.query(
                'SELECT id_usuario FROM usuarios WHERE email = ? AND id_usuario != ? LIMIT 1',
                [emailNormalizado, talleristaActual.id_usuario || 0]
            );
            if (userWithSameEmail) {
                return res.status(409).json({ error: 'El email ya existe en usuarios. Debe usar uno distinto.' });
            }
        }

        if (talleristaActual.id_usuario && emailNormalizado) {
            await conn.query('UPDATE usuarios SET email = ?, nombre = ? WHERE id_usuario = ?', [emailNormalizado, nombre || null, talleristaActual.id_usuario]);
        }

        const finalClienteId = id_cliente ?? talleristaActual.id_cliente ?? null;
        if (finalClienteId && apellido) {
            await conn.query('UPDATE clientes SET apellido = ? WHERE id_cliente = ?', [apellido, finalClienteId]);
        }

        const result = await conn.query(
            `UPDATE talleristas SET 
                nombre = COALESCE(?, nombre),
                especialidad = COALESCE(?, especialidad),
                bio = COALESCE(?, bio),
                telefono = COALESCE(?, telefono),
                email = COALESCE(?, email),
                instagram = COALESCE(?, instagram),
                id_cliente = COALESCE(?, id_cliente),
                activo = COALESCE(?, activo)
             WHERE id = ?`,
            [nombre, especialidad, bio, telefono, emailNormalizado, instagram, finalClienteId, activo, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Tallerista no encontrado' });
        }

        res.status(200).json({ message: 'Tallerista actualizado exitosamente' });
    } catch (err) {
        logError("Error en updateTallerista:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

const deleteTallerista = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const { id } = req.params;

        // Verificar si tiene talleres asignados
        const talleres = await conn.query(`SELECT COUNT(*) as count FROM talleres WHERE tallerista_id = ?`, [id]);
        const talleresAsignados = Number(talleres[0].count || 0);
        if (talleresAsignados > 0) {
            return res.status(400).json({
                error: `No se puede eliminar el tallerista porque tiene ${talleresAsignados} taller(es) asignado(s). Debe desvincular o eliminar esos talleres antes de borrar el perfil. El usuario asociado no se elimina.`,
                talleresAsignados,
                eliminaUsuario: false
            });
        }

        const result = await conn.query(`DELETE FROM talleristas WHERE id = ?`, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Tallerista no encontrado' });
        }

        res.status(200).json({ message: 'Tallerista eliminado exitosamente' });
    } catch (err) {
        logError("Error en deleteTallerista:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

// =============================================================================
// TALLERES
// =============================================================================

const normalizeBigInt = (value) => {
    if (typeof value === 'bigint') return Number(value);
    if (Array.isArray(value)) return value.map(normalizeBigInt);
    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value).map(([key, item]) => [key, normalizeBigInt(item)])
        );
    }
    return value;
};

const normalizePrecioTallerRow = (row = {}) => {
    const precioClase = Number(row.precioClase ?? row.precio_clase ?? row.precio ?? 0) || 0;
    const precioSemana = Number(row.precioSemana ?? row.precio_semana ?? 0) || 0;
    const precioMes = Number(row.precioMes ?? row.precio_mes ?? 0) || 0;

    const primerPrecioDisponible = [
        { modalidad: 'por_clase', precio: precioClase, nombre: 'Precio por clase' },
        { modalidad: 'por_semana', precio: precioSemana, nombre: 'Precio por semana' },
        { modalidad: 'por_mes', precio: precioMes, nombre: 'Precio por mes' }
    ].find(item => Number(item.precio) > 0);

    return {
        ...row,
        precioClase,
        precioSemana,
        precioMes,
        precio: primerPrecioDisponible ? primerPrecioDisponible.precio : 0,
        modalidad: primerPrecioDisponible ? primerPrecioDisponible.modalidad : (row.modalidad || 'por_clase'),
        nombre_precio: row.nombre_precio || row.nombrePrecio || primerPrecioDisponible?.nombre || 'Precio del taller',
        nombrePrecio: row.nombre_precio || row.nombrePrecio || primerPrecioDisponible?.nombre || 'Precio del taller'
    };
};

const getTalleresPublicos = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const sql = `
            SELECT 
                t.id, t.tipo_taller_id as tipoTallerId, t.tallerista_id as talleristaId,
                t.nombre, t.descripcion, t.dia_semana as diaSemana,
                TIME_FORMAT(t.hora_inicio, '%H:%i') as horaInicio,
                TIME_FORMAT(t.hora_fin, '%H:%i') as horaFin,
                t.duracion_minutos as duracionMinutos, t.cupo_maximo as cupoMaximo,
                t.cupo_minimo as cupoMinimo, t.ubicacion, t.activo, t.creado_en as creadoEn,
                tal.nombre as talleristaNombre,
                tal.id_cliente as tallerista_id_cliente,
                c.nombre as tallerista_cliente_nombre,
                ot.nombre_para_mostrar as tipoNombre,
                CAST((t.cupo_maximo - COALESCE((SELECT COUNT(*) FROM inscripciones_talleres it WHERE it.taller_id = t.id AND it.estado = 'activa'), 0)) AS SIGNED) as cupos_disponibles
            FROM talleres t
            LEFT JOIN talleristas tal ON t.tallerista_id = tal.id
            LEFT JOIN clientes c ON tal.id_cliente = c.id_cliente
            LEFT JOIN opciones_tipos ot ON t.tipo_taller_id = ot.id_tipo_evento
            WHERE t.activo = 1
            ORDER BY t.dia_semana, t.hora_inicio
        `;

        const rows = await conn.query(sql);
        return res.status(200).json(normalizeBigInt(rows));
    } catch (err) {
        logError('Error en getTalleresPublicos:', err);
        return res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

const getTallerPublicoById = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const { id } = req.params;
        const rows = await conn.query(`
            SELECT 
                t.id, t.tipo_taller_id as tipoTallerId, t.tallerista_id as talleristaId,
                t.nombre, t.descripcion, t.dia_semana as diaSemana,
                TIME_FORMAT(t.hora_inicio, '%H:%i') as horaInicio,
                TIME_FORMAT(t.hora_fin, '%H:%i') as horaFin,
                t.duracion_minutos as duracionMinutos, t.cupo_maximo as cupoMaximo,
                t.cupo_minimo as cupoMinimo, t.ubicacion, t.activo, t.creado_en as creadoEn,
                tal.nombre as talleristaNombre,
                tal.id_cliente as tallerista_id_cliente,
                c.nombre as tallerista_cliente_nombre,
                ot.nombre_para_mostrar as tipoNombre,
                CAST((t.cupo_maximo - COALESCE((SELECT COUNT(*) FROM inscripciones_talleres it WHERE it.taller_id = t.id AND it.estado = 'activa'), 0)) AS SIGNED) as cupos_disponibles
            FROM talleres t
            LEFT JOIN talleristas tal ON t.tallerista_id = tal.id
            LEFT JOIN clientes c ON tal.id_cliente = c.id_cliente
            LEFT JOIN opciones_tipos ot ON t.tipo_taller_id = ot.id_tipo_evento
            WHERE t.id = ? AND t.activo = 1
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Taller público no encontrado' });
        }

        return res.status(200).json(normalizeBigInt(rows[0]));
    } catch (err) {
        logError('Error en getTallerPublicoById:', err);
        return res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

const getTalleres = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const { tipo, activos, tallerista } = req.query;

        let sql = `
            SELECT 
                t.id, t.tipo_taller_id as tipoTallerId, t.tallerista_id as talleristaId,
                t.nombre, t.descripcion, t.dia_semana as diaSemana,
                TIME_FORMAT(t.hora_inicio, '%H:%i') as horaInicio,
                TIME_FORMAT(t.hora_fin, '%H:%i') as horaFin,
                t.duracion_minutos as duracionMinutos, t.cupo_maximo as cupoMaximo,
                t.cupo_minimo as cupoMinimo, t.ubicacion, t.activo, t.creado_en as creadoEn,
                tal.nombre as talleristaNombre,
                tal.id_cliente as tallerista_id_cliente,
                c.nombre as tallerista_cliente_nombre,
                ot.nombre_para_mostrar as tipoNombre
            FROM talleres t
            LEFT JOIN talleristas tal ON t.tallerista_id = tal.id
            LEFT JOIN clientes c ON tal.id_cliente = c.id_cliente
            LEFT JOIN opciones_tipos ot ON t.tipo_taller_id = ot.id_tipo_evento
            WHERE 1=1
        `;
        const params = [];

        if (tipo) {
            sql += ` AND t.tipo_taller_id = ?`;
            params.push(tipo);
        }
        if (activos === '1') {
            sql += ` AND t.activo = 1`;
        }
        if (tallerista) {
            sql += ` AND t.tallerista_id = ?`;
            params.push(tallerista);
        }

        sql += ` ORDER BY t.dia_semana, t.hora_inicio`;

        const rows = await conn.query(sql, params);
        return res.status(200).json(rows);
    } catch (err) {
        logError("Error en getTalleres:", err);

        try {
            const fallbackSql = `
                SELECT 
                    t.id, t.tipo_taller_id as tipoTallerId, t.tallerista_id as talleristaId,
                    t.nombre, t.descripcion, t.dia_semana as diaSemana,
                    TIME_FORMAT(t.hora_inicio, '%H:%i') as horaInicio,
                    TIME_FORMAT(t.hora_fin, '%H:%i') as horaFin,
                    t.duracion_minutos as duracionMinutos, t.cupo_maximo as cupoMaximo,
                    t.cupo_minimo as cupoMinimo, t.ubicacion, t.activo, t.creado_en as creadoEn,
                    tal.nombre as talleristaNombre,
                    ot.nombre_para_mostrar as tipoNombre
                FROM talleres t
                LEFT JOIN talleristas tal ON t.tallerista_id = tal.id
                LEFT JOIN opciones_tipos ot ON t.tipo_taller_id = ot.id_tipo_evento
                WHERE 1=1
            `;
            const rows = await conn.query(fallbackSql);
            return res.status(200).json(rows);
        } catch (fallbackErr) {
            logError('Fallback de getTalleres falló:', fallbackErr);
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
    } finally {
        if (conn) conn.release();
    }
};

const getTallerById = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const { id } = req.params;
        const rows = await conn.query(`SELECT * FROM talleres WHERE id = ?`, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Taller no encontrado' });
        }

        res.status(200).json(rows[0]);
    } catch (err) {
        logError('Error en getTallerById:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

const createTaller = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const {
            tipoTallerId,
            talleristaId,
            nombre,
            descripcion,
            diaSemana,
            horaInicio,
            horaFin,
            duracionMinutos,
            cupoMaximo,
            cupoMinimo,
            ubicacion,
            activo = 1
        } = req.body;

        if (!nombre || !String(nombre).trim()) {
            return res.status(400).json({ error: 'El nombre del taller es obligatorio' });
        }

        const result = await conn.query(
            `INSERT INTO talleres 
                (tipo_taller_id, tallerista_id, nombre, descripcion, dia_semana, hora_inicio, hora_fin, duracion_minutos, cupo_maximo, cupo_minimo, ubicacion, activo) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                tipoTallerId || null,
                talleristaId || null,
                nombre,
                descripcion || null,
                diaSemana || null,
                horaInicio || null,
                horaFin || null,
                duracionMinutos || null,
                cupoMaximo || null,
                cupoMinimo || null,
                ubicacion || null,
                activo
            ]
        );

        res.status(201).json({
            message: 'Taller creado exitosamente',
            id: Number(result.insertId)
        });
    } catch (err) {
        logError('Error en createTaller:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

const updateTaller = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const { id } = req.params;
        const {
            tipoTallerId, talleristaId, nombre, descripcion,
            diaSemana, horaInicio, horaFin, duracionMinutos,
            cupoMaximo, cupoMinimo, ubicacion, activo
        } = req.body;

        const result = await conn.query(
            `UPDATE talleres SET 
                tipo_taller_id = COALESCE(?, tipo_taller_id),
                tallerista_id = COALESCE(?, tallerista_id),
                nombre = COALESCE(?, nombre),
                descripcion = COALESCE(?, descripcion),
                dia_semana = COALESCE(?, dia_semana),
                hora_inicio = COALESCE(?, hora_inicio),
                hora_fin = COALESCE(?, hora_fin),
                duracion_minutos = COALESCE(?, duracion_minutos),
                cupo_maximo = COALESCE(?, cupo_maximo),
                cupo_minimo = COALESCE(?, cupo_minimo),
                ubicacion = COALESCE(?, ubicacion),
                activo = COALESCE(?, activo)
             WHERE id = ?`,
            [tipoTallerId, talleristaId, nombre, descripcion, diaSemana, horaInicio, horaFin, duracionMinutos, cupoMaximo, cupoMinimo, ubicacion, activo, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Taller no encontrado' });
        }

        res.status(200).json({ message: 'Taller actualizado exitosamente' });
    } catch (err) {
        logError("Error en updateTaller:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

const deleteTaller = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const { id } = req.params;

        // Verificar inscripciones activas
        const inscripciones = await conn.query(
            `SELECT COUNT(*) as count FROM inscripciones_talleres WHERE taller_id = ? AND estado = 'activa'`,
            [id]
        );
        if (inscripciones[0].count > 0) {
            return res.status(400).json({
                error: 'No se puede eliminar: el taller tiene inscripciones activas',
                inscripcionesActivas: Number(inscripciones[0].count)
            });
        }

        const result = await conn.query(`DELETE FROM talleres WHERE id = ?`, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Taller no encontrado' });
        }

        res.status(200).json({ message: 'Taller eliminado exitosamente' });
    } catch (err) {
        logError("Error en deleteTaller:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

// =============================================================================
// PRECIOS DE TALLERES
// =============================================================================

const getPreciosTalleres = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const { tipo, taller, vigente } = req.query;

        const tipoFiltro = tipo || null;
        const tallerFiltro = taller || null;

        let sql = `
            SELECT 
                pt.id,
                pt.id_solicitud as solicitudId,
                pt.id_solicitud_taller as solicitudTallerId,
                COALESCE(pt.id_tipo_evento, pt.tipo_taller_id) as tipoTallerId,
                pt.tipo_taller_id as tipoTallerIdLegacy,
                pt.taller_id as tallerId,
                pt.nombre_precio as nombrePrecio,
                pt.descripcion,
                pt.precio_clase as precioClase,
                pt.precio_semana as precioSemana,
                pt.precio_mes as precioMes,
                pt.vigente_desde as vigenteDesde,
                pt.vigente_hasta as vigenteHasta,
                COALESCE(pt.activo, pt.vigente) as activo,
                COALESCE(pt.vigente, pt.activo) as vigente,
                t.nombre as tallerNombre,
                ot.nombre_para_mostrar as tipoNombre
            FROM precios_talleres pt
            LEFT JOIN talleres t ON pt.taller_id = t.id
            LEFT JOIN opciones_tipos ot ON COALESCE(pt.id_tipo_evento, pt.tipo_taller_id) = ot.id_tipo_evento
            WHERE 1=1
        `;
        const params = [];

        if (tipoFiltro) {
            sql += ` AND COALESCE(pt.id_tipo_evento, pt.tipo_taller_id) = ?`;
            params.push(tipoFiltro);
        }
        if (tallerFiltro) {
            sql += ` AND pt.taller_id = ?`;
            params.push(tallerFiltro);
        }
        if (vigente === '1') {
            sql += ` AND COALESCE(pt.activo, pt.vigente) = 1`;
        }

        sql += ` ORDER BY COALESCE(pt.id_tipo_evento, pt.tipo_taller_id), pt.vigente_desde DESC`;

        const rows = await conn.query(sql, params);
        res.status(200).json(rows.map(normalizePrecioTallerRow));
    } catch (err) {
        logError("Error en getPreciosTalleres:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

const createPrecioTaller = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const {
            tipoTallerId,
            tallerId,
            idTipoEvento,
            idSolicitud,
            idSolicitudTaller,
            nombrePrecio,
            descripcion,
            modalidad,
            precio,
            precioClase,
            precioSemana,
            precioMes,
            vigenteDesde,
            vigenteHasta,
            vigente = 1,
            activo = 1
        } = req.body;

        const legacyPrecio = Number(precio ?? 0) || 0;
        const normalizedPrecioClase = Number(precioClase ?? precio_clase ?? 0) || 0;
        const normalizedPrecioSemana = Number(precioSemana ?? precio_semana ?? 0) || 0;
        const normalizedPrecioMes = Number(precioMes ?? precio_mes ?? 0) || 0;

        let precioClaseFinal = normalizedPrecioClase;
        let precioSemanaFinal = normalizedPrecioSemana;
        let precioMesFinal = normalizedPrecioMes;

        if (legacyPrecio > 0 && precioClaseFinal === 0 && precioSemanaFinal === 0 && precioMesFinal === 0) {
            const modalidadNorm = String(modalidad || '').toLowerCase();
            if (['por_mes', 'mensual', 'mensualidad'].includes(modalidadNorm)) {
                precioMesFinal = legacyPrecio;
            } else if (['por_semana', 'semanal'].includes(modalidadNorm)) {
                precioSemanaFinal = legacyPrecio;
            } else {
                precioClaseFinal = legacyPrecio;
            }
        }

        if (!vigenteDesde || [precioClaseFinal, precioSemanaFinal, precioMesFinal].every(v => Number(v) <= 0)) {
            return res.status(400).json({ error: 'Fecha de vigencia y al menos un precio válido son obligatorios: por clase, por semana o por mes.' });
        }

        const finalTipoTallerId = idTipoEvento || tipoTallerId || null;
        if (!finalTipoTallerId && !tallerId && !idSolicitudTaller && !idSolicitud) {
            return res.status(400).json({ error: 'Debe especificar género, taller, solicitud o detalle del taller' });
        }

        const result = await conn.query(
            `INSERT INTO precios_talleres 
                (id_solicitud, id_solicitud_taller, id_tipo_evento, tipo_taller_id, taller_id, nombre_precio, descripcion, precio_clase, precio_semana, precio_mes, vigente_desde, vigente_hasta, vigente, activo)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                idSolicitud || null,
                idSolicitudTaller || null,
                finalTipoTallerId,
                finalTipoTallerId,
                tallerId || null,
                nombrePrecio || 'Precio del taller',
                descripcion || null,
                precioClaseFinal > 0 ? precioClaseFinal : null,
                precioSemanaFinal > 0 ? precioSemanaFinal : null,
                precioMesFinal > 0 ? precioMesFinal : null,
                vigenteDesde,
                vigenteHasta || null,
                vigente,
                activo
            ]
        );

        res.status(201).json({
            message: 'Precio creado exitosamente',
            id: Number(result.insertId)
        });
    } catch (err) {
        logError("Error en createPrecioTaller:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

const updatePrecioTaller = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const { id } = req.params;
        const {
            tipoTallerId,
            tallerId,
            idTipoEvento,
            idSolicitud,
            idSolicitudTaller,
            nombrePrecio,
            descripcion,
            modalidad,
            precio,
            precioClase,
            precioSemana,
            precioMes,
            vigenteDesde,
            vigenteHasta,
            vigente,
            activo
        } = req.body;

        const legacyPrecio = Number(precio ?? 0) || 0;
        const normalizedPrecioClase = Number(precioClase ?? precio_clase ?? 0) || 0;
        const normalizedPrecioSemana = Number(precioSemana ?? precio_semana ?? 0) || 0;
        const normalizedPrecioMes = Number(precioMes ?? precio_mes ?? 0) || 0;

        let finalPrecioClase = normalizedPrecioClase;
        let finalPrecioSemana = normalizedPrecioSemana;
        let finalPrecioMes = normalizedPrecioMes;

        if (legacyPrecio > 0 && finalPrecioClase === 0 && finalPrecioSemana === 0 && finalPrecioMes === 0) {
            const modalidadNorm = String(modalidad || '').toLowerCase();
            if (['por_mes', 'mensual', 'mensualidad'].includes(modalidadNorm)) {
                finalPrecioMes = legacyPrecio;
            } else if (['por_semana', 'semanal'].includes(modalidadNorm)) {
                finalPrecioSemana = legacyPrecio;
            } else {
                finalPrecioClase = legacyPrecio;
            }
        }

        if ([finalPrecioClase, finalPrecioSemana, finalPrecioMes].every(v => Number(v) <= 0)) {
            return res.status(400).json({ error: 'Debe indicar al menos un precio válido: por clase, por semana o por mes.' });
        }

        const finalTipoTallerId = idTipoEvento ?? tipoTallerId ?? undefined;

        const result = await conn.query(
            `UPDATE precios_talleres SET 
                id_solicitud = COALESCE(?, id_solicitud),
                id_solicitud_taller = COALESCE(?, id_solicitud_taller),
                id_tipo_evento = COALESCE(?, id_tipo_evento),
                tipo_taller_id = COALESCE(?, tipo_taller_id),
                taller_id = COALESCE(?, taller_id),
                nombre_precio = COALESCE(?, nombre_precio),
                descripcion = COALESCE(?, descripcion),
                precio_clase = ?,
                precio_semana = ?,
                precio_mes = ?,
                vigente_desde = COALESCE(?, vigente_desde),
                vigente_hasta = COALESCE(?, vigente_hasta),
                vigente = COALESCE(?, vigente),
                activo = COALESCE(?, activo)
             WHERE id = ?`,
            [idSolicitud, idSolicitudTaller, finalTipoTallerId, finalTipoTallerId, tallerId, nombrePrecio, descripcion,
             finalPrecioClase > 0 ? finalPrecioClase : null,
             finalPrecioSemana > 0 ? finalPrecioSemana : null,
             finalPrecioMes > 0 ? finalPrecioMes : null,
             vigenteDesde, vigenteHasta, vigente, activo, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Precio no encontrado' });
        }

        res.status(200).json({ message: 'Precio actualizado exitosamente' });
    } catch (err) {
        logError("Error en updatePrecioTaller:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

const deletePrecioTaller = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const { id } = req.params;

        const result = await conn.query(`DELETE FROM precios_talleres WHERE id = ?`, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Precio no encontrado' });
        }

        res.status(200).json({ message: 'Precio eliminado exitosamente' });
    } catch (err) {
        logError("Error en deletePrecioTaller:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

// =============================================================================
// TIPOS DE TALLER (usando opciones_tipos con categoria='TALLERES_ACTIVIDADES')
// =============================================================================

const normalizeTipoTallerId = (value) => {
    const base = String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9\s-]/g, ' ')
        .trim()
        .toUpperCase()
        .replace(/\s+/g, '_')
        .replace(/-+/g, '_');

    return base ? `TALLER_${base}` : 'TALLER_GENERICO';
};

const generateUniqueTipoTallerId = async (conn, nombre) => {
    const baseId = normalizeTipoTallerId(nombre);
    let candidate = baseId;
    let counter = 1;

    while (true) {
        const rows = await conn.query(`SELECT 1 FROM opciones_tipos WHERE id_tipo_evento = ? AND categoria = 'TALLERES_ACTIVIDADES'`, [candidate]);
        if (rows.length === 0) return candidate;

        candidate = `${baseId}_${counter}`;
        counter += 1;
    }
};

const getTiposTaller = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query(`
            SELECT id_tipo_evento as id, nombre_para_mostrar as nombre, descripcion, es_publico as esPublico, IFNULL(permite_adicionales, 0) as permiteAdicionales
            FROM opciones_tipos 
            WHERE categoria = 'TALLERES_ACTIVIDADES'
            ORDER BY nombre_para_mostrar
        `);
        res.status(200).json(rows);
    } catch (err) {
        logError("Error en getTiposTaller:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

const createTipoTaller = async (req, res) => {
    return res.status(403).json({
        error: 'Los tipos de talleres/actividades son un catálogo semilla y no se crean desde la UI.'
    });
};

const updateTipoTaller = async (req, res) => {
    return res.status(403).json({
        error: 'Los tipos de talleres/actividades no son editables desde la UI; se mantienen como catálogo semilla.'
    });
};

const deleteTipoTaller = async (req, res) => {
    return res.status(403).json({
        error: 'Los tipos de talleres/actividades no se eliminan desde la UI; el catálogo es semilla del sistema.'
    });
};

// =============================================================================
// INSCRIPCIONES
// =============================================================================

const getInscripciones = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const { taller_id, estado, alumno_email } = req.query;

        let sql = `
            SELECT i.*, t.nombre as taller_nombre, ta.nombre as tallerista_nombre,
                   p.modalidad as plan_modalidad, p.precio as plan_precio
            FROM inscripciones_talleres i
            LEFT JOIN talleres t ON i.taller_id = t.id
            LEFT JOIN talleristas ta ON t.tallerista_id = ta.id
            LEFT JOIN precios_talleres p ON i.precio_id = p.id
            WHERE 1=1
        `;
        const params = [];

        if (taller_id) {
            sql += ` AND i.taller_id = ?`;
            params.push(taller_id);
        }
        if (estado) {
            sql += ` AND i.estado = ?`;
            params.push(estado);
        }
        if (alumno_email) {
            sql += ` AND i.alumno_email = ?`;
            params.push(alumno_email);
        }

        sql += ` ORDER BY i.fecha_inscripcion DESC`;

        const rows = await conn.query(sql, params);
        res.status(200).json(rows);
    } catch (err) {
        logError("Error en getInscripciones:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

const getInscripcionById = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const { id } = req.params;

        const rows = await conn.query(`
            SELECT i.*, t.nombre as taller_nombre, ta.nombre as tallerista_nombre
            FROM inscripciones_talleres i
            LEFT JOIN talleres t ON i.taller_id = t.id
            LEFT JOIN talleristas ta ON t.tallerista_id = ta.id
            WHERE i.id = ?
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Inscripción no encontrada' });
        }

        res.status(200).json(rows[0]);
    } catch (err) {
        logError("Error en getInscripcionById:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

const createInscripcion = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const {
            taller_id, precio_id, alumno_nombre, alumno_telefono, alumno_email,
            modalidad = 'por_clase', clases_restantes, monto_pagado = 0,
            fecha_inscripcion, fecha_vencimiento, estado = 'activa'
        } = req.body;

        if (!taller_id || !alumno_nombre) {
            return res.status(400).json({ error: 'Taller y nombre del alumno son obligatorios' });
        }

        const result = await conn.query(`
            INSERT INTO inscripciones_talleres 
            (taller_id, precio_id, alumno_nombre, alumno_telefono, alumno_email,
             modalidad, clases_restantes, monto_pagado, fecha_inscripcion, fecha_vencimiento, estado)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [taller_id, precio_id || null, alumno_nombre, alumno_telefono || null, alumno_email || null,
            modalidad, clases_restantes || null, monto_pagado, fecha_inscripcion || new Date(), fecha_vencimiento || null, estado]);

        res.status(201).json({
            message: 'Inscripción creada exitosamente',
            id: Number(result.insertId)
        });
    } catch (err) {
        logError("Error en createInscripcion:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

const createInscripcionPublica = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const {
            taller_id,
            alumno_nombre,
            alumno_telefono,
            alumno_email,
            comentarios,
            modalidad = 'por_clase',
            monto_pagado = 0,
            fecha_inscripcion,
            estado = 'activa'
        } = req.body;

        if (!taller_id || !alumno_nombre || !alumno_email) {
            return res.status(400).json({
                error: 'Taller, nombre y email del alumno son obligatorios'
            });
        }

        const [taller] = await conn.query(`SELECT id, nombre, activo, cupo_maximo FROM talleres WHERE id = ? AND activo = 1 LIMIT 1`, [taller_id]);
        if (!taller) {
            return res.status(404).json({ error: 'Taller no disponible para inscripción' });
        }

        const cuposUsados = await conn.query(`
            SELECT COUNT(*) as count
            FROM inscripciones_talleres
            WHERE taller_id = ? AND estado = 'activa'
        `, [taller_id]);

        const totalActivas = Number(cuposUsados[0]?.count || 0);
        if (taller.cupo_maximo && totalActivas >= Number(taller.cupo_maximo)) {
            return res.status(409).json({ error: 'No quedan cupos disponibles para este taller' });
        }

        const result = await conn.query(`
            INSERT INTO inscripciones_talleres (
                taller_id,
                alumno_nombre,
                alumno_telefono,
                alumno_email,
                modalidad,
                monto_pagado,
                fecha_inscripcion,
                estado
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            taller_id,
            String(alumno_nombre).trim(),
            alumno_telefono || null,
            String(alumno_email).trim(),
            modalidad,
            monto_pagado,
            fecha_inscripcion || new Date(),
            estado
        ]);

        return res.status(201).json({
            message: 'Inscripción creada exitosamente',
            id: Number(result.insertId),
            taller_id: Number(taller_id)
        });
    } catch (err) {
        logError('Error en createInscripcionPublica:', err);
        return res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

const updateInscripcion = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const { id } = req.params;
        const {
            taller_id, precio_id, alumno_nombre, alumno_telefono, alumno_email,
            modalidad, clases_restantes, monto_pagado, fecha_vencimiento, estado
        } = req.body;

        const result = await conn.query(`
            UPDATE inscripciones_talleres SET
                taller_id = COALESCE(?, taller_id),
                precio_id = ?,
                alumno_nombre = COALESCE(?, alumno_nombre),
                alumno_telefono = ?,
                alumno_email = ?,
                modalidad = COALESCE(?, modalidad),
                clases_restantes = ?,
                monto_pagado = COALESCE(?, monto_pagado),
                fecha_vencimiento = ?,
                estado = COALESCE(?, estado)
            WHERE id = ?
        `, [taller_id, precio_id, alumno_nombre, alumno_telefono, alumno_email,
            modalidad, clases_restantes, monto_pagado, fecha_vencimiento, estado, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Inscripción no encontrada' });
        }

        res.status(200).json({ message: 'Inscripción actualizada exitosamente' });
    } catch (err) {
        logError("Error en updateInscripcion:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

const deleteInscripcion = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const { id } = req.params;

        // Primero eliminar asistencias asociadas
        await conn.query(`DELETE FROM asistencias_talleres WHERE inscripcion_id = ?`, [id]);

        const result = await conn.query(`DELETE FROM inscripciones_talleres WHERE id = ?`, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Inscripción no encontrada' });
        }

        res.status(200).json({ message: 'Inscripción eliminada exitosamente' });
    } catch (err) {
        logError("Error en deleteInscripcion:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

module.exports = {
    // Talleristas
    getTalleristas,
    getTalleristaById,
    createTallerista,
    updateTallerista,
    deleteTallerista,
    // Talleres
    getTalleres,
    getTallerById,
    getTalleresPublicos,
    getTallerPublicoById,
    createTaller,
    updateTaller,
    deleteTaller,
    // Precios
    getPreciosTalleres,
    createPrecioTaller,
    updatePrecioTaller,
    deletePrecioTaller,
    // Tipos
    getTiposTaller,
    createTipoTaller,
    updateTipoTaller,
    deleteTipoTaller,
    // Inscripciones
    getInscripciones,
    getInscripcionById,
    createInscripcion,
    createInscripcionPublica,
    updateInscripcion,
    deleteInscripcion
};
