const db = require('../db');

/**
 * Verificar si hay una caja abierta actualmente
 */
async function verificarCajaActiva(req, res) {
    try {
        const query = `
            SELECT 
                c.id,
                c.numero_caja,
                c.fecha_apertura,
                c.saldo_inicial,
                c.estado,
                u.nombre as usuario_apertura
            FROM cajas c
            JOIN usuarios u ON c.usuario_apertura_id = u.id_usuario
            WHERE c.estado = 'abierta'
            ORDER BY c.fecha_apertura DESC
            LIMIT 1
        `;

        db.query(query, async (err, results) => {
            if (err) {
                console.error('[cajasController] Error verificando caja:', err);
                return res.status(500).json({ error: 'Error verificando caja' });
            }

            if (results.length === 0) {
                return res.status(404).json({ error: 'No hay caja abierta' });
            }

            const caja = results[0];

            // Obtener movimientos de la caja
            const movQuery = `
                SELECT 
                    id,
                    tipo,
                    categoria,
                    subcategoria,
                    descripcion,
                    monto,
                    metodo_pago,
                    comprobante_ref,
                    creado_en
                FROM movimientos_caja
                WHERE id_caja = ?
                ORDER BY creado_en DESC
            `;

            db.query(movQuery, [caja.id], (err2, movimientos) => {
                if (err2) {
                    console.error('[cajasController] Error obteniendo movimientos:', err2);
                    return res.status(500).json({ error: 'Error obteniendo movimientos' });
                }

                return res.json({
                    ...caja,
                    movimientos: movimientos || []
                });
            });
        });
    } catch (err) {
        console.error('[cajasController] Error:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
}

/**
 * Crear/abrir una nueva caja
 */
async function crearCaja(req, res) {
    try {
        const { saldoInicial, notas } = req.body;
        const usuarioId = req.user.id;

        if (saldoInicial === undefined || saldoInicial < 0) {
            return res.status(400).json({ error: 'Saldo inicial inválido' });
        }

        // Verificar que no haya otra caja abierta
        const verificarQuery = 'SELECT id FROM cajas WHERE estado = "abierta" LIMIT 1';
        db.query(verificarQuery, (err, results) => {
            if (err) {
                console.error('[cajasController] Error verificando cajas abiertas:', err);
                return res.status(500).json({ error: 'Error verificando cajas' });
            }

            if (results.length > 0) {
                return res.status(400).json({ error: 'Ya hay una caja abierta' });
            }

            // Obtener el próximo número de caja
            const numeroQuery = 'SELECT COALESCE(MAX(numero_caja), 0) + 1 as siguiente FROM cajas';
            db.query(numeroQuery, (err2, numResults) => {
                if (err2) {
                    console.error('[cajasController] Error obteniendo número caja:', err2);
                    return res.status(500).json({ error: 'Error obteniendo número' });
                }

                const numeroCaja = numResults[0].siguiente;

                // Crear caja
                const insertQuery = `
                    INSERT INTO cajas (numero_caja, usuario_apertura_id, saldo_inicial, notas_apertura, estado)
                    VALUES (?, ?, ?, ?, 'abierta')
                `;

                db.query(insertQuery, [numeroCaja, usuarioId, saldoInicial, notas], (err3, result) => {
                    if (err3) {
                        console.error('[cajasController] Error creando caja:', err3);
                        return res.status(500).json({ error: 'Error creando caja' });
                    }

                    const cajaId = result.insertId;

                    // Log de actividad
                    console.log('[CAJA_ABIERTA]', {
                        caja_id: cajaId,
                        numero_caja: numeroCaja,
                        saldo_inicial: saldoInicial,
                        usuario_id: usuarioId
                    });

                    return res.status(201).json({
                        id: cajaId,
                        numero_caja: numeroCaja,
                        saldo_inicial: saldoInicial,
                        estado: 'abierta',
                        fecha_apertura: new Date()
                    });
                });
            });
        });
    } catch (err) {
        console.error('[cajasController] Error:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
}

/**
 * Obtener detalles de una caja específica
 */
async function obtenerCaja(req, res) {
    try {
        const cajaId = req.params.id;

        const query = `
            SELECT 
                c.*,
                u.nombre as usuario_apertura
            FROM cajas c
            LEFT JOIN usuarios u ON c.usuario_apertura_id = u.id_usuario
            WHERE c.id = ?
        `;

        db.query(query, [cajaId], (err, results) => {
            if (err) {
                console.error('[cajasController] Error:', err);
                return res.status(500).json({ error: 'Error obteniendo caja' });
            }

            if (results.length === 0) {
                return res.status(404).json({ error: 'Caja no encontrada' });
            }

            return res.json(results[0]);
        });
    } catch (err) {
        console.error('[cajasController] Error:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
}

/**
 * Obtener movimientos de una caja
 */
async function obtenerMovimientosCaja(req, res) {
    try {
        const cajaId = req.params.id;

        const query = `
            SELECT 
                id,
                tipo,
                categoria,
                subcategoria,
                descripcion,
                monto,
                metodo_pago,
                comprobante_ref,
                creado_en
            FROM movimientos_caja
            WHERE id_caja = ?
            ORDER BY creado_en DESC
        `;

        db.query(query, [cajaId], (err, results) => {
            if (err) {
                console.error('[cajasController] Error:', err);
                return res.status(500).json({ error: 'Error obteniendo movimientos' });
            }

            return res.json(results || []);
        });
    } catch (err) {
        console.error('[cajasController] Error:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
}

/**
 * Agregar un movimiento a la caja
 */
async function agregarMovimiento(req, res) {
    try {
        const cajaId = req.params.id;
        const usuarioId = req.user.id;
        const { tipo, categoria, subcategoria, descripcion, monto, metodo, comprobante, id_evento_confirmado, id_solicitud } = req.body;

        // Validar entrada
        if (!tipo || !categoria || !descripcion || monto <= 0) {
            return res.status(400).json({ error: 'Datos incompletos o inválidos' });
        }

        // Verificar que la caja existe y está abierta
        const verificarQuery = 'SELECT id, estado FROM cajas WHERE id = ?';
        db.query(verificarQuery, [cajaId], (err, results) => {
            if (err) {
                console.error('[cajasController] Error:', err);
                return res.status(500).json({ error: 'Error verificando caja' });
            }

            if (results.length === 0 || results[0].estado !== 'abierta') {
                return res.status(400).json({ error: 'Caja no encontrada o cerrada' });
            }

            // Insertar movimiento
            const insertQuery = `
                INSERT INTO movimientos_caja 
                (id_caja, tipo, categoria, subcategoria, descripcion, monto, metodo_pago, comprobante_ref, usuario_id, id_evento_confirmado, id_solicitud)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            db.query(
                insertQuery,
                [cajaId, tipo, categoria, subcategoria, descripcion, monto, metodo || 'efectivo', comprobante, usuarioId, id_evento_confirmado || null, id_solicitud || null],
                (err2, result) => {
                    if (err2) {
                        console.error('[cajasController] Error inserting movimiento:', err2);
                        return res.status(500).json({ error: 'Error guardando movimiento' });
                    }

                    // Log de actividad
                    console.log('[MOVIMIENTO_CAJA_AGREGADO]', {
                        caja_id: cajaId,
                        movimiento_id: result.insertId,
                        tipo,
                        categoria,
                        monto,
                        usuario_id: usuarioId
                    });

                    return res.status(201).json({
                        id: result.insertId,
                        id_caja: cajaId,
                        tipo,
                        categoria,
                        subcategoria,
                        descripcion,
                        monto,
                        metodo_pago: metodo || 'efectivo',
                        comprobante_ref: comprobante,
                        creado_en: new Date()
                    });
                }
            );
        });
    } catch (err) {
        console.error('[cajasController] Error:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
}

/**
 * Eliminar un movimiento
 */
async function eliminarMovimiento(req, res) {
    try {
        const movimientoId = req.params.movimientoId;
        const usuarioId = req.user.id;

        // Verificar que el movimiento existe y obtener su caja
        const verificarQuery = 'SELECT id_caja FROM movimientos_caja WHERE id = ?';
        db.query(verificarQuery, [movimientoId], (err, results) => {
            if (err) {
                console.error('[cajasController] Error:', err);
                return res.status(500).json({ error: 'Error verificando movimiento' });
            }

            if (results.length === 0) {
                return res.status(404).json({ error: 'Movimiento no encontrado' });
            }

            const cajaId = results[0].id_caja;

            // Verificar que la caja está abierta
            const verificarCajaQuery = 'SELECT estado FROM cajas WHERE id = ?';
            db.query(verificarCajaQuery, [cajaId], (err2, cajaResults) => {
                if (err2 || cajaResults.length === 0 || cajaResults[0].estado !== 'abierta') {
                    return res.status(400).json({ error: 'Caja no encontrada o cerrada' });
                }

                // Eliminar movimiento
                const deleteQuery = 'DELETE FROM movimientos_caja WHERE id = ?';
                db.query(deleteQuery, [movimientoId], (err3) => {
                    if (err3) {
                        console.error('[cajasController] Error:', err3);
                        return res.status(500).json({ error: 'Error eliminando movimiento' });
                    }

                    console.log('[MOVIMIENTO_CAJA_ELIMINADO]', {
                        movimiento_id: movimientoId,
                        caja_id: cajaId,
                        usuario_id: usuarioId
                    });

                    return res.json({ mensaje: 'Movimiento eliminado' });
                });
            });
        });
    } catch (err) {
        console.error('[cajasController] Error:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
}

/**
 * Cerrar una caja
 */
async function cerrarCaja(req, res) {
    try {
        const cajaId = req.params.id;
        const usuarioId = req.user.id;
        const { saldoFinal, notas } = req.body;

        if (saldoFinal === undefined || saldoFinal < 0) {
            return res.status(400).json({ error: 'Saldo final inválido' });
        }

        // Verificar que la caja existe y está abierta
        const verificarQuery = 'SELECT * FROM cajas WHERE id = ? AND estado = "abierta"';
        db.query(verificarQuery, [cajaId], (err, results) => {
            if (err) {
                console.error('[cajasController] Error:', err);
                return res.status(500).json({ error: 'Error verificando caja' });
            }

            if (results.length === 0) {
                return res.status(400).json({ error: 'Caja no encontrada o no está abierta' });
            }

            const caja = results[0];

            // Obtener totales de movimientos
            const totalQuery = `
                SELECT 
                    SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE -monto END) as total_movimientos
                FROM movimientos_caja
                WHERE id_caja = ?
            `;

            db.query(totalQuery, [cajaId], (err2, totalResults) => {
                if (err2) {
                    console.error('[cajasController] Error:', err2);
                    return res.status(500).json({ error: 'Error calculando totales' });
                }

                const totalMovimientos = totalResults[0].total_movimientos || 0;
                const saldoEsperado = caja.saldo_inicial + totalMovimientos;
                const diferencia = saldoFinal - saldoEsperado;

                // Actualizar caja
                const updateQuery = `
                    UPDATE cajas
                    SET estado = 'cerrada',
                        saldo_final = ?,
                        fecha_cierre = NOW(),
                        usuario_cierre_id = ?,
                        notas_cierre = ?
                    WHERE id = ?
                `;

                db.query(updateQuery, [saldoFinal, usuarioId, notas, cajaId], (err3) => {
                    if (err3) {
                        console.error('[cajasController] Error:', err3);
                        return res.status(500).json({ error: 'Error cerrando caja' });
                    }

                    console.log('[CAJA_CERRADA]', {
                        caja_id: cajaId,
                        numero_caja: caja.numero_caja,
                        saldo_inicial: caja.saldo_inicial,
                        saldo_final: saldoFinal,
                        diferencia: diferencia,
                        usuario_id: usuarioId
                    });

                    return res.json({
                        id: cajaId,
                        numero_caja: caja.numero_caja,
                        estado: 'cerrada',
                        saldo_inicial: caja.saldo_inicial,
                        saldo_final: saldoFinal,
                        saldo_esperado: saldoEsperado,
                        diferencia: diferencia,
                        fecha_cierre: new Date()
                    });
                });
            });
        });
    } catch (err) {
        console.error('[cajasController] Error:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
}

/**
 * Obtener historial de cajas cerradas
 */
async function obtenerHistorialCajas(req, res) {
    console.log('[cajasController] ✅ obtenerHistorialCajas CALLED');
    try {
        console.log('[cajasController] 🔄 Ejecutando query de historial...');
        
        const query = `
            SELECT 
                c.id,
                c.numero_caja,
                c.nombre,
                c.fecha_apertura,
                c.fecha_cierre,
                c.saldo_inicial,
                c.saldo_final,
                u1.nombre as usuario_apertura,
                u2.nombre as usuario_cierre,
                (
                    SELECT SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE -monto END)
                    FROM movimientos_caja
                    WHERE id_caja = c.id
                ) as total_movimientos
            FROM cajas c
            LEFT JOIN usuarios u1 ON c.usuario_apertura_id = u1.id_usuario
            LEFT JOIN usuarios u2 ON c.usuario_cierre_id = u2.id_usuario
            WHERE c.estado = 'cerrada'
            ORDER BY c.fecha_cierre DESC
            LIMIT 100
        `;

        console.log('[cajasController] 🔄 Ejecutando query...');
        const results = await db.query(query);
        
        console.log('[cajasController] ✅ Query success, returning', results?.length || 0, 'cajas');
        return res.json(results || []);
    } catch (err) {
        console.error('[cajasController] ❌ Error:', err.message);
        res.status(500).json({ error: 'Error obteniendo historial', details: err.message });
    }
}

/**
 * Actualizar nombre de una caja
 */
async function actualizarNombreCaja(req, res) {
    try {
        const cajaId = req.params.id;
        const { nombre } = req.body;

        if (!nombre || nombre.trim().length === 0) {
            return res.status(400).json({ error: 'Nombre inválido' });
        }

        // Actualizar nombre
        const updateQuery = `
            UPDATE cajas
            SET nombre = ?
            WHERE id = ?
        `;

        db.query(updateQuery, [nombre.trim(), cajaId], (err) => {
            if (err) {
                console.error('[cajasController] Error actualizando nombre:', err);
                return res.status(500).json({ error: 'Error actualizando nombre' });
            }

            return res.json({
                id: cajaId,
                nombre: nombre.trim(),
                mensaje: 'Nombre actualizado correctamente'
            });
        });
    } catch (err) {
        console.error('[cajasController] Error:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
}

module.exports = {
    verificarCajaActiva,
    crearCaja,
    obtenerCaja,
    obtenerMovimientosCaja,
    agregarMovimiento,
    eliminarMovimiento,
    cerrarCaja,
    obtenerHistorialCajas,
    actualizarNombreCaja
};
