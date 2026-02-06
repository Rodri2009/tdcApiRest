// backend/controllers/serviciosController.js
// Controlador para gestión de Servicios (Depilación, Masajes, etc.)
const pool = require('../db');

// =============================================================================
// PROFESIONALES DE SERVICIOS
// =============================================================================

const getProfesionales = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const soloActivos = req.query.activos === '1';
        let sql = `
            SELECT p.id, p.nombre, p.especialidad, p.telefono, p.email, 
                   p.dias_trabaja as diasTrabaja,
                   TIME_FORMAT(p.hora_inicio, '%H:%i') as horaInicio,
                   TIME_FORMAT(p.hora_fin, '%H:%i') as horaFin,
                   p.activo, p.creado_en as creadoEn,
                   p.cliente_id as cliente_id,
                   c.nombre as cliente_nombre, c.telefono as cliente_telefono, c.email as cliente_email
            FROM profesionales_servicios p
            LEFT JOIN clientes c ON p.cliente_id = c.id
        `;
        if (soloActivos) sql += ` WHERE activo = 1`;
        sql += ` ORDER BY nombre`;
        const rows = await conn.query(sql);
        res.status(200).json(rows);
    } catch (err) {
        console.error("Error en getProfesionales:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

const getProfesionalById = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const { id } = req.params;
        const rows = await conn.query(`SELECT * FROM profesionales_servicios WHERE id = ?`, [id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Profesional no encontrado' });
        }
        res.status(200).json(rows[0]);
    } catch (err) {
        console.error("Error en getProfesionalById:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

const createProfesional = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const { nombre, especialidad, telefono, email, diasTrabaja, horaInicio, horaFin, activo = 1, cliente_id = null } = req.body;

        console.log('[PROF] createProfesional payload:', { nombre, especialidad, telefono, email, diasTrabaja, horaInicio, horaFin, activo, cliente_id });

        if (!nombre) {
            return res.status(400).json({ error: 'El nombre es obligatorio' });
        }

        const result = await conn.query(
            `INSERT INTO profesionales_servicios (nombre, especialidad, telefono, email, dias_trabaja, hora_inicio, hora_fin, activo, cliente_id) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [nombre, especialidad || null, telefono || null, email || null, diasTrabaja || null, horaInicio || '09:00:00', horaFin || '18:00:00', activo, cliente_id || null]
        );

        res.status(201).json({
            message: 'Profesional creado exitosamente',
            id: Number(result.insertId)
        });
    } catch (err) {
        console.error("Error en createProfesional:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

const updateProfesional = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const { id } = req.params;
        const { nombre, especialidad, telefono, email, diasTrabaja, horaInicio, horaFin, activo, cliente_id = null } = req.body;

        const result = await conn.query(
            `UPDATE profesionales_servicios SET 
                nombre = COALESCE(?, nombre),
                especialidad = COALESCE(?, especialidad),
                telefono = COALESCE(?, telefono),
                email = COALESCE(?, email),
                dias_trabaja = COALESCE(?, dias_trabaja),
                hora_inicio = COALESCE(?, hora_inicio),
                hora_fin = COALESCE(?, hora_fin),
                activo = COALESCE(?, activo),
                cliente_id = COALESCE(?, cliente_id)
             WHERE id = ?`,
            [nombre, especialidad, telefono, email, diasTrabaja, horaInicio, horaFin, activo, cliente_id, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Profesional no encontrado' });
        }

        res.status(200).json({ message: 'Profesional actualizado exitosamente' });
    } catch (err) {
        console.error("Error en updateProfesional:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

const deleteProfesional = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const { id } = req.params;

        // Verificar si tiene turnos asignados
        const turnos = await conn.query(`SELECT COUNT(*) as count FROM turnos_servicios WHERE profesional_id = ?`, [id]);
        if (turnos[0].count > 0) {
            return res.status(400).json({
                error: 'No se puede eliminar: el profesional tiene turnos asignados',
                turnosAsignados: Number(turnos[0].count)
            });
        }

        const result = await conn.query(`DELETE FROM profesionales_servicios WHERE id = ?`, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Profesional no encontrado' });
        }

        res.status(200).json({ message: 'Profesional eliminado exitosamente' });
    } catch (err) {
        console.error("Error en deleteProfesional:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

// =============================================================================
// CATÁLOGO DE SERVICIOS
// =============================================================================

const getServiciosCatalogo = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const { tipo, activos } = req.query;

        let sql = `
            SELECT 
                sc.id, sc.tipo_servicio_id as tipoServicioId, sc.nombre, sc.descripcion,
                sc.duracion_minutos as duracionMinutos, sc.activo, sc.orden,
                ot.nombre_para_mostrar as tipoNombre,
                (SELECT precio FROM precios_servicios ps WHERE ps.servicio_id = sc.id AND ps.vigente = 1 ORDER BY ps.vigente_desde DESC LIMIT 1) as precioVigente
            FROM servicios_catalogo sc
            LEFT JOIN opciones_tipos ot ON sc.tipo_servicio_id = ot.id_tipo_evento
            WHERE 1=1
        `;
        const params = [];

        if (tipo) {
            sql += ` AND sc.tipo_servicio_id = ?`;
            params.push(tipo);
        }
        if (activos === '1') {
            sql += ` AND sc.activo = 1`;
        }

        sql += ` ORDER BY sc.tipo_servicio_id, sc.orden, sc.nombre`;

        const rows = await conn.query(sql, params);
        res.status(200).json(rows);
    } catch (err) {
        console.error("Error en getServiciosCatalogo:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

const getServicioById = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const { id } = req.params;
        const rows = await conn.query(`
            SELECT 
                sc.*, ot.nombre_para_mostrar as tipo_nombre,
                (SELECT precio FROM precios_servicios ps WHERE ps.servicio_id = sc.id AND ps.vigente = 1 ORDER BY ps.vigente_desde DESC LIMIT 1) as precio_vigente
            FROM servicios_catalogo sc
            LEFT JOIN opciones_tipos ot ON sc.tipo_servicio_id = ot.id_tipo_evento
            WHERE sc.id = ?
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Servicio no encontrado' });
        }
        res.status(200).json(rows[0]);
    } catch (err) {
        console.error("Error en getServicioById:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

const createServicio = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const { tipoServicioId, nombre, descripcion, duracionMinutos = 60, activo = 1, orden = 0 } = req.body;

        if (!tipoServicioId || !nombre) {
            return res.status(400).json({ error: 'Tipo de servicio y nombre son obligatorios' });
        }

        const result = await conn.query(
            `INSERT INTO servicios_catalogo (tipo_servicio_id, nombre, descripcion, duracion_minutos, activo, orden) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [tipoServicioId, nombre, descripcion || null, duracionMinutos, activo, orden]
        );

        res.status(201).json({
            message: 'Servicio creado exitosamente',
            id: Number(result.insertId)
        });
    } catch (err) {
        console.error("Error en createServicio:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

const updateServicio = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const { id } = req.params;
        const { tipoServicioId, nombre, descripcion, duracionMinutos, activo, orden } = req.body;

        const result = await conn.query(
            `UPDATE servicios_catalogo SET 
                tipo_servicio_id = COALESCE(?, tipo_servicio_id),
                nombre = COALESCE(?, nombre),
                descripcion = COALESCE(?, descripcion),
                duracion_minutos = COALESCE(?, duracion_minutos),
                activo = COALESCE(?, activo),
                orden = COALESCE(?, orden)
             WHERE id = ?`,
            [tipoServicioId, nombre, descripcion, duracionMinutos, activo, orden, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Servicio no encontrado' });
        }

        res.status(200).json({ message: 'Servicio actualizado exitosamente' });
    } catch (err) {
        console.error("Error en updateServicio:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

const deleteServicio = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const { id } = req.params;

        // Verificar si tiene turnos asignados
        const turnos = await conn.query(`SELECT COUNT(*) as count FROM turnos_servicios WHERE servicio_id = ?`, [id]);
        if (turnos[0].count > 0) {
            return res.status(400).json({
                error: 'No se puede eliminar: el servicio tiene turnos asignados',
                turnosAsignados: Number(turnos[0].count)
            });
        }

        const result = await conn.query(`DELETE FROM servicios_catalogo WHERE id = ?`, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Servicio no encontrado' });
        }

        res.status(200).json({ message: 'Servicio eliminado exitosamente' });
    } catch (err) {
        console.error("Error en deleteServicio:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

// =============================================================================
// PRECIOS DE SERVICIOS
// =============================================================================

const getPreciosServicios = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const { servicio, tipo, vigente } = req.query;

        let sql = `
            SELECT 
                ps.id, ps.servicio_id as servicioId, ps.precio,
                ps.vigente_desde as vigenteDesde, ps.vigente_hasta as vigenteHasta, ps.vigente,
                sc.nombre as servicioNombre, sc.tipo_servicio_id as tipoServicioId,
                ot.nombre_para_mostrar as tipoNombre
            FROM precios_servicios ps
            JOIN servicios_catalogo sc ON ps.servicio_id = sc.id
            LEFT JOIN opciones_tipos ot ON sc.tipo_servicio_id = ot.id_tipo_evento
            WHERE 1=1
        `;
        const params = [];

        if (servicio) {
            sql += ` AND ps.servicio_id = ?`;
            params.push(servicio);
        }
        if (tipo) {
            sql += ` AND sc.tipo_servicio_id = ?`;
            params.push(tipo);
        }
        if (vigente === '1') {
            sql += ` AND ps.vigente = 1`;
        }

        sql += ` ORDER BY sc.tipo_servicio_id, sc.nombre, ps.vigente_desde DESC`;

        const rows = await conn.query(sql, params);
        res.status(200).json(rows);
    } catch (err) {
        console.error("Error en getPreciosServicios:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

const createPrecioServicio = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const { servicioId, precio, vigenteDesde, vigenteHasta, vigente = 1 } = req.body;

        if (!servicioId || !precio || !vigenteDesde) {
            return res.status(400).json({ error: 'Servicio, precio y fecha de vigencia son obligatorios' });
        }

        const result = await conn.query(
            `INSERT INTO precios_servicios (servicio_id, precio, vigente_desde, vigente_hasta, vigente) 
             VALUES (?, ?, ?, ?, ?)`,
            [servicioId, precio, vigenteDesde, vigenteHasta || null, vigente]
        );

        res.status(201).json({
            message: 'Precio creado exitosamente',
            id: Number(result.insertId)
        });
    } catch (err) {
        console.error("Error en createPrecioServicio:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

const updatePrecioServicio = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const { id } = req.params;
        const { servicioId, precio, vigenteDesde, vigenteHasta, vigente } = req.body;

        const result = await conn.query(
            `UPDATE precios_servicios SET 
                servicio_id = COALESCE(?, servicio_id),
                precio = COALESCE(?, precio),
                vigente_desde = COALESCE(?, vigente_desde),
                vigente_hasta = COALESCE(?, vigente_hasta),
                vigente = COALESCE(?, vigente)
             WHERE id = ?`,
            [servicioId, precio, vigenteDesde, vigenteHasta, vigente, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Precio no encontrado' });
        }

        res.status(200).json({ message: 'Precio actualizado exitosamente' });
    } catch (err) {
        console.error("Error en updatePrecioServicio:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

const deletePrecioServicio = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const { id } = req.params;

        const result = await conn.query(`DELETE FROM precios_servicios WHERE id = ?`, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Precio no encontrado' });
        }

        res.status(200).json({ message: 'Precio eliminado exitosamente' });
    } catch (err) {
        console.error("Error en deletePrecioServicio:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

// =============================================================================
// AGENDA / TURNOS DE SERVICIOS
// =============================================================================

const getTurnos = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const { profesional, servicio, fecha, fechaDesde, fechaHasta, estado } = req.query;

        let sql = `
            SELECT 
                ts.id, ts.profesional_id as profesionalId, ts.servicio_id as servicioId,
                ts.precio_id as precioId, ts.fecha,
                TIME_FORMAT(ts.hora_inicio, '%H:%i') as horaInicio,
                TIME_FORMAT(ts.hora_fin, '%H:%i') as horaFin,
                ts.cliente_nombre as clienteNombre, ts.cliente_telefono as clienteTelefono,
                ts.cliente_email as clienteEmail, ts.monto, ts.pagado, ts.metodo_pago as metodoPago,
                ts.estado, ts.notas, ts.creado_en as creadoEn,
                p.nombre as profesionalNombre,
                sc.nombre as servicioNombre, sc.duracion_minutos as duracionMinutos
            FROM turnos_servicios ts
            JOIN profesionales_servicios p ON ts.profesional_id = p.id
            JOIN servicios_catalogo sc ON ts.servicio_id = sc.id
            WHERE 1=1
        `;
        const params = [];

        if (profesional) {
            sql += ` AND ts.profesional_id = ?`;
            params.push(profesional);
        }
        if (servicio) {
            sql += ` AND ts.servicio_id = ?`;
            params.push(servicio);
        }
        if (fecha) {
            sql += ` AND ts.fecha = ?`;
            params.push(fecha);
        }
        if (fechaDesde) {
            sql += ` AND ts.fecha >= ?`;
            params.push(fechaDesde);
        }
        if (fechaHasta) {
            sql += ` AND ts.fecha <= ?`;
            params.push(fechaHasta);
        }
        if (estado) {
            sql += ` AND ts.estado = ?`;
            params.push(estado);
        }

        sql += ` ORDER BY ts.fecha, ts.hora_inicio`;

        const rows = await conn.query(sql, params);
        res.status(200).json(rows);
    } catch (err) {
        console.error("Error en getTurnos:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

const getTurnoById = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const { id } = req.params;
        const rows = await conn.query(`
            SELECT 
                ts.*, p.nombre as profesional_nombre,
                sc.nombre as servicio_nombre, sc.duracion_minutos
            FROM turnos_servicios ts
            JOIN profesionales_servicios p ON ts.profesional_id = p.id
            JOIN servicios_catalogo sc ON ts.servicio_id = sc.id
            WHERE ts.id = ?
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Turno no encontrado' });
        }
        res.status(200).json(rows[0]);
    } catch (err) {
        console.error("Error en getTurnoById:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

const createTurno = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const {
            profesionalId, servicioId, precioId, fecha, horaInicio, horaFin,
            clienteNombre, clienteTelefono, clienteEmail, monto, pagado = 0, metodoPago,
            estado = 'reservado', notas
        } = req.body;

        if (!profesionalId || !servicioId || !fecha || !horaInicio || !horaFin) {
            return res.status(400).json({ error: 'Profesional, servicio, fecha y horarios son obligatorios' });
        }

        // Verificar disponibilidad del profesional
        const conflictos = await conn.query(`
            SELECT id FROM turnos_servicios 
            WHERE profesional_id = ? AND fecha = ? 
            AND estado NOT IN ('cancelado', 'no_asistio')
            AND (
                (hora_inicio < ? AND hora_fin > ?) OR
                (hora_inicio < ? AND hora_fin > ?) OR
                (hora_inicio >= ? AND hora_fin <= ?)
            )
        `, [profesionalId, fecha, horaFin, horaInicio, horaFin, horaInicio, horaInicio, horaFin]);

        if (conflictos.length > 0) {
            return res.status(400).json({ error: 'El profesional ya tiene un turno en ese horario' });
        }

        const result = await conn.query(
            `INSERT INTO turnos_servicios 
                (profesional_id, servicio_id, precio_id, fecha, hora_inicio, hora_fin, 
                 cliente_nombre, cliente_telefono, cliente_email, monto, pagado, metodo_pago, estado, notas) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [profesionalId, servicioId, precioId || null, fecha, horaInicio, horaFin,
                clienteNombre || null, clienteTelefono || null, clienteEmail || null,
                monto || null, pagado, metodoPago || null, estado, notas || null]
        );

        res.status(201).json({
            message: 'Turno creado exitosamente',
            id: Number(result.insertId)
        });
    } catch (err) {
        console.error("Error en createTurno:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

const updateTurno = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const { id } = req.params;
        const {
            profesionalId, servicioId, precioId, fecha, horaInicio, horaFin,
            clienteNombre, clienteTelefono, clienteEmail, monto, pagado, metodoPago,
            estado, notas
        } = req.body;

        const result = await conn.query(
            `UPDATE turnos_servicios SET 
                profesional_id = COALESCE(?, profesional_id),
                servicio_id = COALESCE(?, servicio_id),
                precio_id = COALESCE(?, precio_id),
                fecha = COALESCE(?, fecha),
                hora_inicio = COALESCE(?, hora_inicio),
                hora_fin = COALESCE(?, hora_fin),
                cliente_nombre = COALESCE(?, cliente_nombre),
                cliente_telefono = COALESCE(?, cliente_telefono),
                cliente_email = COALESCE(?, cliente_email),
                monto = COALESCE(?, monto),
                pagado = COALESCE(?, pagado),
                metodo_pago = COALESCE(?, metodo_pago),
                estado = COALESCE(?, estado),
                notas = COALESCE(?, notas)
             WHERE id = ?`,
            [profesionalId, servicioId, precioId, fecha, horaInicio, horaFin,
                clienteNombre, clienteTelefono, clienteEmail, monto, pagado, metodoPago,
                estado, notas, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Turno no encontrado' });
        }

        res.status(200).json({ message: 'Turno actualizado exitosamente' });
    } catch (err) {
        console.error("Error en updateTurno:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

const deleteTurno = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const { id } = req.params;

        const result = await conn.query(`DELETE FROM turnos_servicios WHERE id = ?`, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Turno no encontrado' });
        }

        res.status(200).json({ message: 'Turno eliminado exitosamente' });
    } catch (err) {
        console.error("Error en deleteTurno:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

// =============================================================================
// TIPOS DE SERVICIO (usando opciones_tipos con categoria='SERVICIOS')
// =============================================================================

const getTiposServicio = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query(`
            SELECT id_tipo_evento as id, nombre_para_mostrar as nombre, descripcion, es_publico as esPublico
            FROM opciones_tipos 
            WHERE categoria = 'SERVICIOS'
            ORDER BY nombre_para_mostrar
        `);
        res.status(200).json(rows);
    } catch (err) {
        console.error("Error en getTiposServicio:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

const createTipoServicio = async (req, res) => {
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
             VALUES (?, ?, ?, 'SERVICIOS', ?)`,
            [id.toUpperCase(), nombre, descripcion || null, esPublico]
        );

        res.status(201).json({ message: 'Tipo de servicio creado exitosamente', id: id.toUpperCase() });
    } catch (err) {
        console.error("Error en createTipoServicio:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

const updateTipoServicio = async (req, res) => {
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
             WHERE id_tipo_evento = ? AND categoria = 'SERVICIOS'`,
            [nombre, descripcion, esPublico, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Tipo de servicio no encontrado' });
        }

        res.status(200).json({ message: 'Tipo de servicio actualizado exitosamente' });
    } catch (err) {
        console.error("Error en updateTipoServicio:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

const deleteTipoServicio = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const { id } = req.params;

        // Verificar si hay servicios usando este tipo
        const servicios = await conn.query(`SELECT COUNT(*) as count FROM servicios_catalogo WHERE tipo_servicio_id = ?`, [id]);
        if (servicios[0].count > 0) {
            return res.status(400).json({
                error: 'No se puede eliminar: hay servicios usando este tipo',
                serviciosAsociados: Number(servicios[0].count)
            });
        }

        const result = await conn.query(
            `DELETE FROM opciones_tipos WHERE id_tipo_evento = ? AND categoria = 'SERVICIOS'`,
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Tipo de servicio no encontrado' });
        }

        res.status(200).json({ message: 'Tipo de servicio eliminado exitosamente' });
    } catch (err) {
        console.error("Error en deleteTipoServicio:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

module.exports = {
    // Profesionales
    getProfesionales,
    getProfesionalById,
    createProfesional,
    updateProfesional,
    deleteProfesional,
    // Catálogo de servicios
    getServiciosCatalogo,
    getServicioById,
    createServicio,
    updateServicio,
    deleteServicio,
    // Precios
    getPreciosServicios,
    createPrecioServicio,
    updatePrecioServicio,
    deletePrecioServicio,
    // Turnos/Agenda
    getTurnos,
    getTurnoById,
    createTurno,
    updateTurno,
    deleteTurno,
    // Tipos
    getTiposServicio,
    createTipoServicio,
    updateTipoServicio,
    deleteTipoServicio
};
