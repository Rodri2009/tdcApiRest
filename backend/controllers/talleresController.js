// backend/controllers/talleresController.js
// Controlador para gestión de Talleres/Actividades
const pool = require('../db');

// =============================================================================
// TALLERISTAS
// =============================================================================

const getTalleristas = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const soloActivos = req.query.activos === '1';
        let sql = `SELECT id, nombre, especialidad, bio, telefono, email, instagram, activo, creado_en as creadoEn FROM talleristas`;
        if (soloActivos) sql += ` WHERE activo = 1`;
        sql += ` ORDER BY nombre`;
        const rows = await conn.query(sql);
        res.status(200).json(rows);
    } catch (err) {
        console.error("Error en getTalleristas:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

const getTalleristaById = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const { id } = req.params;
        const rows = await conn.query(`SELECT * FROM talleristas WHERE id = ?`, [id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Tallerista no encontrado' });
        }
        res.status(200).json(rows[0]);
    } catch (err) {
        console.error("Error en getTalleristaById:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

const createTallerista = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const { nombre, especialidad, bio, telefono, email, instagram, cliente_id = null, activo = 1 } = req.body;

        if (!nombre) {
            return res.status(400).json({ error: 'El nombre es obligatorio' });
        }

        const result = await conn.query(
            `INSERT INTO talleristas (nombre, especialidad, bio, telefono, email, instagram, cliente_id, activo) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [nombre, especialidad || null, bio || null, telefono || null, email || null, instagram || null, cliente_id || null, activo]
        );

        res.status(201).json({
            message: 'Tallerista creado exitosamente',
            id: Number(result.insertId)
        });
    } catch (err) {
        console.error("Error en createTallerista:", err);
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
        const { nombre, especialidad, bio, telefono, email, instagram, cliente_id, activo } = req.body;

        const result = await conn.query(
            `UPDATE talleristas SET 
                nombre = COALESCE(?, nombre),
                especialidad = COALESCE(?, especialidad),
                bio = COALESCE(?, bio),
                telefono = COALESCE(?, telefono),
                email = COALESCE(?, email),
                instagram = COALESCE(?, instagram),
                cliente_id = COALESCE(?, cliente_id),
                activo = COALESCE(?, activo)
             WHERE id = ?`,
            [nombre, especialidad, bio, telefono, email, instagram, cliente_id || null, activo, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Tallerista no encontrado' });
        }

        res.status(200).json({ message: 'Tallerista actualizado exitosamente' });
    } catch (err) {
        console.error("Error en updateTallerista:", err);
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
        if (talleres[0].count > 0) {
            return res.status(400).json({
                error: 'No se puede eliminar: el tallerista tiene talleres asignados',
                talleresAsignados: Number(talleres[0].count)
            });
        }

        const result = await conn.query(`DELETE FROM talleristas WHERE id = ?`, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Tallerista no encontrado' });
        }

        res.status(200).json({ message: 'Tallerista eliminado exitosamente' });
    } catch (err) {
        console.error("Error en deleteTallerista:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

// =============================================================================
// TALLERES
// =============================================================================

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
                tal.cliente_id as tallerista_cliente_id,
                c.nombre as tallerista_cliente_nombre,
                ot.nombre_para_mostrar as tipoNombre
            FROM talleres t
            LEFT JOIN talleristas tal ON t.tallerista_id = tal.id
            LEFT JOIN clientes c ON tal.cliente_id = c.id
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
        res.status(200).json(rows);
    } catch (err) {
        console.error("Error en getTalleres:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

const getTallerById = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const { id } = req.params;
        const rows = await conn.query(`
            SELECT 
                t.*, tal.nombre as tallerista_nombre,
                ot.nombre_para_mostrar as tipo_nombre
            FROM talleres t
            LEFT JOIN talleristas tal ON t.tallerista_id = tal.id
            LEFT JOIN opciones_tipos ot ON t.tipo_taller_id = ot.id_tipo_evento
            WHERE t.id = ?
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Taller no encontrado' });
        }
        res.status(200).json(rows[0]);
    } catch (err) {
        console.error("Error en getTallerById:", err);
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
            tipoTallerId, talleristaId, nombre, descripcion,
            diaSemana, horaInicio, horaFin, duracionMinutos = 60,
            cupoMaximo = 15, cupoMinimo = 3, ubicacion = 'Salón TDC', activo = 1
        } = req.body;

        if (!tipoTallerId || !nombre) {
            return res.status(400).json({ error: 'Tipo de taller y nombre son obligatorios' });
        }

        const result = await conn.query(
            `INSERT INTO talleres 
                (tipo_taller_id, tallerista_id, nombre, descripcion, dia_semana, hora_inicio, hora_fin, duracion_minutos, cupo_maximo, cupo_minimo, ubicacion, activo) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [tipoTallerId, talleristaId || null, nombre, descripcion || null, diaSemana || null, horaInicio || null, horaFin || null, duracionMinutos, cupoMaximo, cupoMinimo, ubicacion, activo]
        );

        res.status(201).json({
            message: 'Taller creado exitosamente',
            id: Number(result.insertId)
        });
    } catch (err) {
        console.error("Error en createTaller:", err);
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
        console.error("Error en updateTaller:", err);
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
        console.error("Error en deleteTaller:", err);
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

        let sql = `
            SELECT 
                pt.id, pt.tipo_taller_id as tipoTallerId, pt.taller_id as tallerId,
                pt.modalidad, pt.cantidad_clases as cantidadClases, pt.precio,
                pt.vigente_desde as vigenteDesde, pt.vigente_hasta as vigenteHasta, pt.vigente,
                t.nombre as tallerNombre,
                ot.nombre_para_mostrar as tipoNombre
            FROM precios_talleres pt
            LEFT JOIN talleres t ON pt.taller_id = t.id
            LEFT JOIN opciones_tipos ot ON pt.tipo_taller_id = ot.id_tipo_evento
            WHERE 1=1
        `;
        const params = [];

        if (tipo) {
            sql += ` AND pt.tipo_taller_id = ?`;
            params.push(tipo);
        }
        if (taller) {
            sql += ` AND pt.taller_id = ?`;
            params.push(taller);
        }
        if (vigente === '1') {
            sql += ` AND pt.vigente = 1`;
        }

        sql += ` ORDER BY pt.tipo_taller_id, pt.modalidad, pt.vigente_desde DESC`;

        const rows = await conn.query(sql, params);
        res.status(200).json(rows);
    } catch (err) {
        console.error("Error en getPreciosTalleres:", err);
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
            tipoTallerId, tallerId, modalidad = 'clase_suelta',
            cantidadClases, precio, vigenteDesde, vigenteHasta, vigente = 1
        } = req.body;

        if (!precio || !vigenteDesde) {
            return res.status(400).json({ error: 'Precio y fecha de vigencia son obligatorios' });
        }

        if (!tipoTallerId && !tallerId) {
            return res.status(400).json({ error: 'Debe especificar tipo de taller o taller específico' });
        }

        const result = await conn.query(
            `INSERT INTO precios_talleres 
                (tipo_taller_id, taller_id, modalidad, cantidad_clases, precio, vigente_desde, vigente_hasta, vigente) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [tipoTallerId || null, tallerId || null, modalidad, cantidadClases || null, precio, vigenteDesde, vigenteHasta || null, vigente]
        );

        res.status(201).json({
            message: 'Precio creado exitosamente',
            id: Number(result.insertId)
        });
    } catch (err) {
        console.error("Error en createPrecioTaller:", err);
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
            tipoTallerId, tallerId, modalidad,
            cantidadClases, precio, vigenteDesde, vigenteHasta, vigente
        } = req.body;

        const result = await conn.query(
            `UPDATE precios_talleres SET 
                tipo_taller_id = COALESCE(?, tipo_taller_id),
                taller_id = COALESCE(?, taller_id),
                modalidad = COALESCE(?, modalidad),
                cantidad_clases = COALESCE(?, cantidad_clases),
                precio = COALESCE(?, precio),
                vigente_desde = COALESCE(?, vigente_desde),
                vigente_hasta = COALESCE(?, vigente_hasta),
                vigente = COALESCE(?, vigente)
             WHERE id = ?`,
            [tipoTallerId, tallerId, modalidad, cantidadClases, precio, vigenteDesde, vigenteHasta, vigente, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Precio no encontrado' });
        }

        res.status(200).json({ message: 'Precio actualizado exitosamente' });
    } catch (err) {
        console.error("Error en updatePrecioTaller:", err);
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
        console.error("Error en deletePrecioTaller:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

// =============================================================================
// TIPOS DE TALLER (usando opciones_tipos con categoria='TALLERES_ACTIVIDADES')
// =============================================================================

const getTiposTaller = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query(`
            SELECT id_tipo_evento as id, nombre_para_mostrar as nombre, descripcion, es_publico as esPublico
            FROM opciones_tipos 
            WHERE categoria = 'TALLERES_ACTIVIDADES'
            ORDER BY nombre_para_mostrar
        `);
        res.status(200).json(rows);
    } catch (err) {
        console.error("Error en getTiposTaller:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

const createTipoTaller = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const { id, nombre, descripcion, esPublico = 1 } = req.body;

        if (!id || !nombre) {
            return res.status(400).json({ error: 'ID y nombre son obligatorios' });
        }

        // Verificar que no exista
        const exists = await conn.query(`SELECT 1 FROM opciones_tipos WHERE id_tipo_evento = ?`, [id]);
        if (exists.length > 0) {
            return res.status(400).json({ error: 'Ya existe un tipo con ese ID' });
        }

        await conn.query(
            `INSERT INTO opciones_tipos (id_tipo_evento, nombre_para_mostrar, descripcion, categoria, es_publico) 
             VALUES (?, ?, ?, 'TALLERES_ACTIVIDADES', ?)`,
            [id.toUpperCase(), nombre, descripcion || null, esPublico]
        );

        res.status(201).json({ message: 'Tipo de taller creado exitosamente', id: id.toUpperCase() });
    } catch (err) {
        console.error("Error en createTipoTaller:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

const updateTipoTaller = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const { id } = req.params;
        const { nombre, descripcion, esPublico } = req.body;

        const result = await conn.query(
            `UPDATE opciones_tipos SET 
                nombre_para_mostrar = COALESCE(?, nombre_para_mostrar),
                descripcion = COALESCE(?, descripcion),
                es_publico = COALESCE(?, es_publico)
             WHERE id_tipo_evento = ? AND categoria = 'TALLERES_ACTIVIDADES'`,
            [nombre, descripcion, esPublico, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Tipo de taller no encontrado' });
        }

        res.status(200).json({ message: 'Tipo de taller actualizado exitosamente' });
    } catch (err) {
        console.error("Error en updateTipoTaller:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

const deleteTipoTaller = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const { id } = req.params;

        // Verificar si hay talleres usando este tipo
        const talleres = await conn.query(`SELECT COUNT(*) as count FROM talleres WHERE tipo_taller_id = ?`, [id]);
        if (talleres[0].count > 0) {
            return res.status(400).json({
                error: 'No se puede eliminar: hay talleres usando este tipo',
                talleresAsociados: Number(talleres[0].count)
            });
        }

        const result = await conn.query(
            `DELETE FROM opciones_tipos WHERE id_tipo_evento = ? AND categoria = 'TALLERES_ACTIVIDADES'`,
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Tipo de taller no encontrado' });
        }

        res.status(200).json({ message: 'Tipo de taller eliminado exitosamente' });
    } catch (err) {
        console.error("Error en deleteTipoTaller:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
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
        console.error("Error en getInscripciones:", err);
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
        console.error("Error en getInscripcionById:", err);
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
            modalidad = 'clase_suelta', clases_restantes, monto_pagado = 0,
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
        console.error("Error en createInscripcion:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
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
        console.error("Error en updateInscripcion:", err);
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
        console.error("Error en deleteInscripcion:", err);
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
    updateInscripcion,
    deleteInscripcion
};
