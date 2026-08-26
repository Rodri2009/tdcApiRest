const pool = require('../db');
const { logVerbose, logError, logSuccess, logWarning } = require('../lib/debugFlags');

// =============================================================================
// TARIFAS DEL PERSONAL
// =============================================================================

/**
 * Obtiene todas las tarifas del personal con información del personal y rol
 */
const getTarifas = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const tarifas = await conn.query(`
            SELECT
                t.id,
                t.nombre_rol,
                t.monto_por_hora,
                t.monto_fijo_evento,
                t.monto_minimo,
                t.vigente_desde,
                t.vigente_hasta,
                t.moneda,
                t.descripcion,
                t.activo,
                t.creado_en,
                t.actualizado_en
            FROM personal_tarifas t
            ORDER BY t.activo DESC, t.nombre_rol, t.vigente_desde DESC
        `);
        res.status(200).json(tarifas);
    } catch (err) {
        logError("Error al obtener tarifas:", err);
        res.status(500).json({ message: 'Error del servidor al obtener tarifas.' });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * Obtiene las tarifas vigentes (activas y en rango de fecha)
 */
const getTarifasVigentes = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const tarifas = await conn.query(`
            SELECT
                t.id,
                t.nombre_rol,
                t.monto_por_hora,
                t.monto_fijo_evento,
                t.monto_minimo,
                t.vigente_desde,
                t.vigente_hasta,
                t.moneda,
                t.descripcion
            FROM personal_tarifas t
            WHERE t.activo = 1
              AND t.vigente_desde <= CURDATE()
              AND (t.vigente_hasta IS NULL OR t.vigente_hasta >= CURDATE())
            ORDER BY t.nombre_rol
        `);
        res.status(200).json(tarifas);
    } catch (err) {
        logError("Error al obtener tarifas vigentes:", err);
        res.status(500).json({ message: 'Error del servidor al obtener tarifas vigentes.' });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * Obtiene una tarifa por ID
 */
const getTarifaById = async (req, res) => {
    const { id } = req.params;
    let conn;
    try {
        conn = await pool.getConnection();
        const [tarifa] = await conn.query(`
            SELECT
                t.*
            FROM personal_tarifas t
            WHERE t.id = ?
        `, [id]);

        if (!tarifa) {
            return res.status(404).json({ message: 'Tarifa no encontrada.' });
        }

        res.status(200).json(tarifa);
    } catch (err) {
        logError("Error al obtener tarifa:", err);
        res.status(500).json({ message: 'Error del servidor.' });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * Crea una nueva tarifa
 */
const createTarifa = async (req, res) => {
    const {
        nombre_rol,
        monto_por_hora,
        monto_fijo_evento,
        monto_minimo,
        vigente_desde,
        vigente_hasta,
        moneda,
        descripcion
    } = req.body;

    if (!nombre_rol || !vigente_desde) {
        return res.status(400).json({ message: 'nombre_rol y vigente_desde son requeridos.' });
    }

    let conn;
    try {
        conn = await pool.getConnection();

        const result = await conn.query(`
            INSERT INTO personal_tarifas
            (nombre_rol, monto_por_hora, monto_fijo_evento, monto_minimo,
             vigente_desde, vigente_hasta, moneda, descripcion, activo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
        `, [
            nombre_rol,
            monto_por_hora || null,
            monto_fijo_evento || null,
            monto_minimo || null,
            vigente_desde,
            vigente_hasta || null,
            moneda || 'ARS',
            descripcion || null
        ]);

        res.status(201).json({
            success: true,
            message: 'Tarifa creada correctamente.',
            id: result.insertId.toString()
        });
    } catch (err) {
        logError("Error al crear tarifa:", err);
        res.status(500).json({ message: 'Error del servidor al crear tarifa.' });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * Actualiza una tarifa existente
 */
const updateTarifa = async (req, res) => {
    const { id } = req.params;
    const {
        nombre_rol,
        monto_por_hora,
        monto_fijo_evento,
        monto_minimo,
        vigente_desde,
        vigente_hasta,
        moneda,
        descripcion,
        activo
    } = req.body;

    let conn;
    try {
        conn = await pool.getConnection();

        // Verificar que la tarifa existe
        const [existente] = await conn.query(
            "SELECT id FROM personal_tarifas WHERE id = ?",
            [id]
        );
        if (!existente) {
            return res.status(404).json({ message: 'Tarifa no encontrada.' });
        }

        await conn.query(`
            UPDATE personal_tarifas SET
                nombre_rol = COALESCE(?, nombre_rol),
                monto_por_hora = ?,
                monto_fijo_evento = ?,
                monto_minimo = ?,
                vigente_desde = COALESCE(?, vigente_desde),
                vigente_hasta = ?,
                moneda = COALESCE(?, moneda),
                descripcion = ?,
                activo = COALESCE(?, activo)
            WHERE id = ?
        `, [
            nombre_rol,
            monto_por_hora,
            monto_fijo_evento,
            monto_minimo,
            vigente_desde,
            vigente_hasta,
            moneda,
            descripcion,
            activo,
            id
        ]);

        res.status(200).json({
            success: true,
            message: 'Tarifa actualizada correctamente.'
        });
    } catch (err) {
        logError("Error al actualizar tarifa:", err);
        res.status(500).json({ message: 'Error del servidor al actualizar tarifa.' });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * Elimina una tarifa (borrado lógico: activo = 0)
 */
const deleteTarifa = async (req, res) => {
    const { id } = req.params;
    let conn;
    try {
        conn = await pool.getConnection();

        const result = await conn.query(
            "UPDATE personal_tarifas SET activo = 0 WHERE id = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Tarifa no encontrada.' });
        }

        res.status(200).json({
            success: true,
            message: 'Tarifa desactivada correctamente.'
        });
    } catch (err) {
        logError("Error al eliminar tarifa:", err);
        res.status(500).json({ message: 'Error del servidor.' });
    } finally {
        if (conn) conn.release();
    }
};

// =============================================================================
// PAGOS DEL PERSONAL
// =============================================================================

/**
 * Obtiene todos los pagos del personal
 */
const getPagos = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const pagos = await conn.query(`
            SELECT 
                pg.id,
                pg.id_personal,
                p.nombre_completo,
                pg.id_solicitud,
                pg.monto_acordado,
                pg.monto_pagado,
                pg.fecha_trabajo,
                pg.fecha_pago,
                pg.metodo_pago,
                pg.comprobante,
                pg.estado,
                pg.descripcion,
                pg.notas,
                pg.creado_en
            FROM personal_pagos pg
            LEFT JOIN personal_disponible p ON pg.id_personal COLLATE utf8mb4_unicode_ci = p.id_personal COLLATE utf8mb4_unicode_ci
            ORDER BY pg.creado_en DESC
        `);
        res.status(200).json(pagos);
    } catch (err) {
        logError("Error al obtener pagos:", err);
        res.status(500).json({ message: 'Error del servidor al obtener pagos.' });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * Obtiene pagos pendientes (estado = 'pendiente' o 'parcial')
 */
const getPagosPendientes = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const pagos = await conn.query(`
            SELECT 
                pg.id,
                pg.id_personal,
                p.nombre_completo,
                pg.id_solicitud,
                pg.monto_acordado,
                pg.monto_pagado,
                (pg.monto_acordado - COALESCE(pg.monto_pagado, 0)) as saldo_pendiente,
                pg.fecha_trabajo,
                pg.estado,
                pg.descripcion
            FROM personal_pagos pg
            LEFT JOIN personal_disponible p ON pg.id_personal COLLATE utf8mb4_unicode_ci = p.id_personal COLLATE utf8mb4_unicode_ci
            WHERE pg.estado IN ('pendiente', 'parcial')
            ORDER BY pg.fecha_trabajo ASC
        `);
        res.status(200).json(pagos);
    } catch (err) {
        logError("Error al obtener pagos pendientes:", err);
        res.status(500).json({ message: 'Error del servidor.' });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * Obtiene un pago por ID
 */
const getPagoById = async (req, res) => {
    const { id } = req.params;
    let conn;
    try {
        conn = await pool.getConnection();
        const [pago] = await conn.query(`
            SELECT 
                pg.*,
                p.nombre_completo
            FROM personal_pagos pg
            LEFT JOIN personal_disponible p ON pg.id_personal COLLATE utf8mb4_unicode_ci = p.id_personal COLLATE utf8mb4_unicode_ci
            WHERE pg.id = ?
        `, [id]);

        if (!pago) {
            return res.status(404).json({ message: 'Pago no encontrado.' });
        }

        res.status(200).json(pago);
    } catch (err) {
        logError("Error al obtener pago:", err);
        res.status(500).json({ message: 'Error del servidor.' });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * Crea un nuevo registro de pago
 */
const createPago = async (req, res) => {
    const {
        id_personal,
        id_solicitud,
        monto_acordado,
        monto_pagado,
        fecha_trabajo,
        fecha_pago,
        metodo_pago,
        comprobante,
        estado,
        descripcion,
        notas
    } = req.body;

    if (!id_personal || !monto_acordado) {
        return res.status(400).json({ message: 'id_personal y monto_acordado son requeridos.' });
    }

    let conn;
    try {
        conn = await pool.getConnection();

        // Determinar estado automáticamente si no se proporciona
        let estadoFinal = estado || 'pendiente';
        if (!estado && monto_pagado) {
            if (parseFloat(monto_pagado) >= parseFloat(monto_acordado)) {
                estadoFinal = 'pagado';
            } else if (parseFloat(monto_pagado) > 0) {
                estadoFinal = 'parcial';
            }
        }

        const result = await conn.query(`
            INSERT INTO personal_pagos 
            (id_personal, id_solicitud, monto_acordado, monto_pagado, fecha_trabajo,
             fecha_pago, metodo_pago, comprobante, estado, descripcion, notas, creado_por)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            id_personal,
            id_solicitud || null,
            monto_acordado,
            monto_pagado || 0,
            fecha_trabajo || null,
            fecha_pago || null,
            metodo_pago || 'efectivo',
            comprobante || null,
            estadoFinal,
            descripcion || null,
            notas || null,
            req.user?.id || null
        ]);

        res.status(201).json({
            success: true,
            message: 'Pago registrado correctamente.',
            id: result.insertId.toString()
        });
    } catch (err) {
        logError("Error al crear pago:", err);
        res.status(500).json({ message: 'Error del servidor al crear pago.' });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * Actualiza un pago existente
 */
const updatePago = async (req, res) => {
    const { id } = req.params;
    const {
        id_personal,
        id_solicitud,
        monto_acordado,
        monto_pagado,
        fecha_trabajo,
        fecha_pago,
        metodo_pago,
        comprobante,
        estado,
        descripcion,
        notas
    } = req.body;

    let conn;
    try {
        conn = await pool.getConnection();

        // Verificar que el pago existe
        const [existente] = await conn.query(
            "SELECT id FROM personal_pagos WHERE id = ?",
            [id]
        );
        if (!existente) {
            return res.status(404).json({ message: 'Pago no encontrado.' });
        }

        // Si se actualizan montos, recalcular estado si no se proporciona explícitamente
        let estadoFinal = estado;
        if (!estado && monto_acordado !== undefined && monto_pagado !== undefined) {
            if (parseFloat(monto_pagado) >= parseFloat(monto_acordado)) {
                estadoFinal = 'pagado';
            } else if (parseFloat(monto_pagado) > 0) {
                estadoFinal = 'parcial';
            } else {
                estadoFinal = 'pendiente';
            }
        }

        await conn.query(`
            UPDATE personal_pagos SET
                id_personal = COALESCE(?, id_personal),
                id_solicitud = ?,
                monto_acordado = COALESCE(?, monto_acordado),
                monto_pagado = COALESCE(?, monto_pagado),
                fecha_trabajo = ?,
                fecha_pago = ?,
                metodo_pago = COALESCE(?, metodo_pago),
                comprobante = ?,
                estado = COALESCE(?, estado),
                descripcion = ?,
                notas = ?
            WHERE id = ?
        `, [
            id_personal,
            id_solicitud,
            monto_acordado,
            monto_pagado,
            fecha_trabajo,
            fecha_pago,
            metodo_pago,
            comprobante,
            estadoFinal,
            descripcion,
            notas,
            id
        ]);

        res.status(200).json({
            success: true,
            message: 'Pago actualizado correctamente.'
        });
    } catch (err) {
        logError("Error al actualizar pago:", err);
        res.status(500).json({ message: 'Error del servidor al actualizar pago.' });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * Elimina un pago (borrado físico - usar con cuidado)
 */
const deletePago = async (req, res) => {
    const { id } = req.params;
    let conn;
    try {
        conn = await pool.getConnection();

        const result = await conn.query(
            "DELETE FROM personal_pagos WHERE id = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Pago no encontrado.' });
        }

        res.status(200).json({
            success: true,
            message: 'Pago eliminado correctamente.'
        });
    } catch (err) {
        logError("Error al eliminar pago:", err);
        res.status(500).json({ message: 'Error del servidor.' });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * Obtiene resumen de pagos por personal
 */
const getResumenPagosPorPersonal = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const resumen = await conn.query(`
            SELECT 
                p.id_personal,
                p.nombre_completo,
                COUNT(pg.id) as total_trabajos,
                SUM(pg.monto_acordado) as total_acordado,
                SUM(COALESCE(pg.monto_pagado, 0)) as total_pagado,
                SUM(pg.monto_acordado - COALESCE(pg.monto_pagado, 0)) as total_pendiente,
                SUM(CASE WHEN pg.estado = 'pendiente' THEN 1 ELSE 0 END) as pagos_pendientes,
                SUM(CASE WHEN pg.estado = 'parcial' THEN 1 ELSE 0 END) as pagos_parciales,
                SUM(CASE WHEN pg.estado = 'pagado' THEN 1 ELSE 0 END) as pagos_completados
            FROM personal_disponible p
            LEFT JOIN personal_pagos pg ON p.id_personal COLLATE utf8mb4_unicode_ci = pg.id_personal COLLATE utf8mb4_unicode_ci
            WHERE p.activo = 1
            GROUP BY p.id_personal, p.nombre_completo
            ORDER BY total_pendiente DESC, p.nombre_completo
        `);
        res.status(200).json(resumen);
    } catch (err) {
        logError("Error al obtener resumen de pagos:", err);
        res.status(500).json({ message: 'Error del servidor.' });
    } finally {
        if (conn) conn.release();
    }
};

module.exports = {
    // Tarifas
    getTarifas,
    getTarifasVigentes,
    getTarifaById,
    createTarifa,
    updateTarifa,
    deleteTarifa,
    // Pagos
    getPagos,
    getPagosPendientes,
    getPagoById,
    createPago,
    updatePago,
    deletePago,
    getResumenPagosPorPersonal
};
