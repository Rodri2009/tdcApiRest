const db = require('../db');
const { parseMercadoPagoDate } = require('../services/activityService');

const GENERIC_MP_LABEL_REGEX = /^(?:in_money|income|out|outflow|pays?|payment|transferencia|pago(?:s)?|ingreso|egreso|compra|venta|retiro|deposito|acreditad[oa]|abonad[oa]|recibid[oa]|cobro|movimiento)$/i;

function isGenericMpLabel(value) {
    if (!value) return true;
    const normalized = String(value).trim().toLowerCase();
    return GENERIC_MP_LABEL_REGEX.test(normalized);
}

function looksLikePersonName(value) {
    if (!value) return false;
    const trimmed = String(value).trim();
    return /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,4}$/.test(trimmed);
}

function normalizeMpDisplayFields(tx) {
    const name = (tx.name || '').trim();
    const title = (tx.title || '').trim();
    const description = (tx.description || '').trim();
    const category = (tx.category || '').trim();

    const titleGeneric = isGenericMpLabel(title);
    const descriptionGeneric = isGenericMpLabel(description);
    const categoryGeneric = isGenericMpLabel(category);
    const nameGeneric = isGenericMpLabel(name);

    let subcategoria = '';
    let descripcion = '';

    if (name && !nameGeneric) {
        subcategoria = name;
        descripcion = description && !descriptionGeneric && description !== name
            ? description
            : (!titleGeneric && title !== name ? title : (category && !categoryGeneric ? category : name));
    } else if (title && !titleGeneric && looksLikePersonName(title)) {
        subcategoria = title;
        descripcion = description && description !== title ? description : (category && !categoryGeneric ? category : title);
    } else if (titleGeneric && !descriptionGeneric && looksLikePersonName(description)) {
        subcategoria = description;
        descripcion = title;
    } else if (title && !titleGeneric) {
        subcategoria = title;
        descripcion = description && description !== title ? description : (category && !categoryGeneric ? category : title);
    } else if (description && !descriptionGeneric) {
        subcategoria = description;
        descripcion = title && title !== description ? title : (category && !categoryGeneric ? category : description);
    } else if (category && !categoryGeneric) {
        subcategoria = category;
        descripcion = title || description || category;
    } else if (title) {
        subcategoria = title;
        descripcion = description || title;
    } else if (description) {
        subcategoria = description;
        descripcion = description;
    } else if (category) {
        subcategoria = category;
        descripcion = category;
    } else {
        subcategoria = 'mercadopago';
        descripcion = 'Transacción MP';
    }

    if (!descripcion) descripcion = subcategoria;
    return { subcategoria, descripcion };
}

async function upsertMovimientoCajaMP(db, cajaId, tx, tipo, monto, createdAt, usuarioId, alreadyExists = false) {
    const comprobante_ref = `MP-${tx.id}`;
    const { subcategoria, descripcion } = normalizeMpDisplayFields(tx);

    // Convertir createdAt al formato que MariaDB espera (DATETIME: YYYY-MM-DD HH:MM:SS)
    let mysqlDatetime = createdAt;
    if (typeof createdAt === 'string' && createdAt.includes('T')) {
        // Es ISO 8601, convertir a DATETIME format
        const date = new Date(createdAt);
        mysqlDatetime = date.toISOString().slice(0, 19).replace('T', ' ');
    }

    if (alreadyExists) {
        await db.query(
            `UPDATE movimientos_caja
             SET tipo = ?, subcategoria = ?, descripcion = ?, monto = ?, metodo_pago = ?, usuario_id = ?, creado_en = ?
             WHERE id_caja = ? AND comprobante_ref = ?`,
            [tipo, subcategoria, descripcion, monto, 'otro', usuarioId || null, mysqlDatetime, cajaId, comprobante_ref]
        );
        return { inserted: false, updated: true, comprobante_ref, subcategoria, descripcion };
    }

    await db.query(
        `INSERT INTO movimientos_caja
         (id_caja, tipo, categoria, subcategoria, descripcion, monto, metodo_pago, comprobante_ref, usuario_id, creado_en)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [cajaId, tipo, 'mercadopago', subcategoria, descripcion, monto, 'otro', comprobante_ref, usuarioId || null, mysqlDatetime]
    );

    return { inserted: true, updated: false, comprobante_ref, subcategoria, descripcion };
}

// Serializar BigInt a Number para JSON
const serializeBigInt = (obj) => JSON.parse(JSON.stringify(obj, (key, value) => typeof value === 'bigint' ? Number(value) : value));

/**
 * Verificar si hay una caja abierta actualmente
 */
async function verificarCajaActiva(req, res) {
    try {
        const query = `
            SELECT 
                c.id,
                c.numero_caja,
                c.nombre,
                c.id_evento_confirmado,
                c.fecha_apertura,
                c.saldo_inicial_en_cuenta,
                c.saldo_inicial_en_efectivo,
                c.estado,
                u.nombre as usuario_apertura
            FROM cajas c
            JOIN usuarios u ON c.usuario_apertura_id = u.id_usuario
            WHERE c.estado = 'abierta'
            ORDER BY c.fecha_apertura DESC
            LIMIT 1
        `;

        const results = await db.query(query);

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

        const movimientos = await db.query(movQuery, [caja.id]);

        return res.json(serializeBigInt({
            ...caja,
            movimientos: movimientos || []
        }));
    } catch (err) {
        console.error('[cajasController] Error:', err);
        res.status(500).json({ error: 'Error interno del servidor', details: err.message });
    }
}

/**
 * Crear/abrir una nueva caja
 */
async function crearCaja(req, res) {
    try {
        const { saldoInicial, saldoInicialEnCuenta, saldoInicialEnEfectivo, idEventoConfirmado, notas } = req.body;
        const usuarioId = req.user?.id_usuario || req.user?.id;

        // Validar saldos: aceptar parámetros nuevos O antiguos (backward compatibility)
        const saldoCuenta = saldoInicialEnCuenta !== undefined ? saldoInicialEnCuenta : (saldoInicial || 0);
        const saldoEfectivo = saldoInicialEnEfectivo !== undefined ? saldoInicialEnEfectivo : 0;

        if (Number.isNaN(saldoCuenta) || saldoCuenta < 0 || Number.isNaN(saldoEfectivo) || saldoEfectivo < 0) {
            return res.status(400).json({ error: 'Saldos iniciales inválidos' });
        }

        if (!usuarioId) {
            return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        // Verificar que no haya otra caja abierta
        const verificarQuery = 'SELECT id FROM cajas WHERE estado = "abierta" LIMIT 1';
        const existentes = await db.query(verificarQuery);

        if (existentes.length > 0) {
            return res.status(400).json({ error: 'Ya hay una caja abierta' });
        }

        // Obtener el próximo número de caja
        const numeroQuery = 'SELECT COALESCE(MAX(numero_caja), 0) + 1 as siguiente FROM cajas';
        const numResults = await db.query(numeroQuery);
        const numeroCaja = numResults[0].siguiente;

        // Crear caja
        const insertQuery = `
            INSERT INTO cajas (numero_caja, nombre, id_evento_confirmado, usuario_apertura_id, saldo_inicial_en_cuenta, saldo_inicial_en_efectivo, notas_apertura, estado)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'abierta')
        `;

        const nombre = req.body.nombre || `Caja ${numeroCaja}`;  // Usar nombre proporcionado o generar uno por defecto
        const result = await db.query(insertQuery, [numeroCaja, nombre, idEventoConfirmado || null, usuarioId, saldoCuenta, saldoEfectivo, notas]);
        const cajaId = result.insertId;

        // NUEVO: Registrar el movimiento de apertura de caja
        try {
            const totalSaldoInicial = saldoCuenta + saldoEfectivo;
            const movimientoQuery = `
                INSERT INTO movimientos_caja 
                (id_caja, tipo, categoria, subcategoria, descripcion, monto, metodo_pago, creado_en)
                VALUES (?, 'ingreso', 'apertura', 'apertura_caja', ?, ?, 'manual', NOW())
            `;
            await db.query(movimientoQuery, [cajaId, `Apertura de caja #${numeroCaja}`, totalSaldoInicial]);
            console.log('[MOVIMIENTO] Apertura registrada para caja:', cajaId);
        } catch (movErr) {
            console.warn('[MOVIMIENTO] Error al registrar apertura:', movErr.message);
            // No retornar error, continuar igual
        }

        // Log de actividad
        console.log('[CAJA_ABIERTA]', {
            caja_id: cajaId,
            numero_caja: numeroCaja,
            saldo_inicial: saldoInicial,
            usuario_id: usuarioId
        });

        return res.status(201).json(serializeBigInt({
            id: cajaId,
            numero_caja: numeroCaja,
            nombre: nombre,
            saldo_inicial_en_cuenta: saldoCuenta,
            saldo_inicial_en_efectivo: saldoEfectivo,
            estado: 'abierta',
            fecha_apertura: new Date(),
            id_evento_confirmado: idEventoConfirmado || null
        }));
    } catch (err) {
        console.error('[cajasController] Error:', err);
        res.status(500).json({ error: 'Error interno del servidor', details: err.message });
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

        const results = await db.query(query, [cajaId]);

        if (results.length === 0) {
            return res.status(404).json({ error: 'Caja no encontrada' });
        }

        return res.json(serializeBigInt(results[0]));
    } catch (err) {
        console.error('[cajasController] Error:', err);
        res.status(500).json({ error: 'Error interno del servidor', details: err.message });
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
                mc.id,
                mc.tipo,
                mc.categoria,
                mc.subcategoria,
                mc.descripcion,
                mc.monto,
                mc.metodo_pago,
                mc.comprobante_ref,
                mc.usuario_id,
                u.nombre as usuario_nombre,
                mc.creado_en
            FROM movimientos_caja mc
            LEFT JOIN usuarios u ON mc.usuario_id = u.id_usuario
            WHERE mc.id_caja = ?
            ORDER BY mc.creado_en DESC
        `;

        const results = await db.query(query, [cajaId]);

        return res.json(serializeBigInt(results || []));
    } catch (err) {
        console.error('[cajasController] Error:', err);
        res.status(500).json({ error: 'Error interno del servidor', details: err.message });
    }
}

/**
 * Agregar un movimiento a la caja
 */
async function agregarMovimiento(req, res) {
    try {
        const cajaId = req.params.id;
        const usuarioId = req.user?.id_usuario || req.user?.id;
        const { tipo, categoria, subcategoria, descripcion, monto, metodo, metodo_pago, comprobante, comprobante_ref, id_evento_confirmado, id_solicitud } = req.body;
        const metodoPago = metodo_pago || metodo || 'efectivo';
        const comprobanteFinal = comprobante_ref ?? comprobante ?? null;

        // Validar entrada
        if (!tipo || !categoria || !descripcion || Number(monto) <= 0) {
            return res.status(400).json({ error: 'Datos incompletos o inválidos' });
        }

        // Verificar que la caja existe. La edición manual de movimientos se permite
        // aunque la caja ya esté cerrada, ya que la vista de detalle puede requerir
        // corregir movimientos históricos.
        const verificarQuery = 'SELECT id, estado FROM cajas WHERE id = ?';
        const cajaResults = await db.query(verificarQuery, [cajaId]);

        if (cajaResults.length === 0) {
            return res.status(400).json({ error: 'Caja no encontrada' });
        }

        // Insertar movimiento
        const insertQuery = `
            INSERT INTO movimientos_caja 
            (id_caja, tipo, categoria, subcategoria, descripcion, monto, metodo_pago, comprobante_ref, usuario_id, id_evento_confirmado, id_solicitud)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const result = await db.query(
            insertQuery,
            [cajaId, tipo, categoria, subcategoria, descripcion, Number(monto), metodoPago, comprobanteFinal, usuarioId || null, id_evento_confirmado || null, id_solicitud || null]
        );

        // Log de actividad
        console.log('[MOVIMIENTO_CAJA_AGREGADO]', {
            caja_id: cajaId,
            movimiento_id: result.insertId,
            tipo,
            categoria,
            monto,
            usuario_id: usuarioId
        });

        return res.status(201).json(serializeBigInt({
            id: result.insertId,
            id_caja: cajaId,
            tipo,
            categoria,
            subcategoria,
            descripcion,
            monto: Number(monto),
            metodo_pago: metodoPago,
            comprobante_ref: comprobanteFinal,
            creado_en: new Date()
        }));
    } catch (err) {
        console.error('[cajasController] Error:', err);
        res.status(500).json({ error: 'Error interno del servidor', details: err.message });
    }
}

/**
 * Actualizar un movimiento existente de la caja
 */
async function actualizarMovimientoCaja(req, res) {
    try {
        const movimientoId = req.params.movimientoId;
        const { tipo, categoria, subcategoria, descripcion, monto, metodo_pago, comprobante_ref, id_evento_confirmado, id_solicitud } = req.body;

        if (!movimientoId) {
            return res.status(400).json({ error: 'ID del movimiento inválido' });
        }

        if (!tipo || !categoria || !descripcion || Number(monto) <= 0) {
            return res.status(400).json({ error: 'Datos incompletos o inválidos' });
        }

        const movQuery = 'SELECT id_caja FROM movimientos_caja WHERE id = ?';
        const movResults = await db.query(movQuery, [movimientoId]);

        if (!movResults || movResults.length === 0) {
            return res.status(404).json({ error: 'Movimiento no encontrado' });
        }

        const cajaId = movResults[0].id_caja;
        const cajaQuery = 'SELECT estado FROM cajas WHERE id = ?';
        const cajaResults = await db.query(cajaQuery, [cajaId]);

        if (!cajaResults || cajaResults.length === 0) {
            return res.status(400).json({ error: 'Caja no encontrada' });
        }

        const updateQuery = `
            UPDATE movimientos_caja
            SET tipo = ?,
                categoria = ?,
                subcategoria = ?,
                descripcion = ?,
                monto = ?,
                metodo_pago = ?,
                comprobante_ref = ?,
                id_evento_confirmado = ?,
                id_solicitud = ?,
                actualizado_en = NOW()
            WHERE id = ?
        `;

        await db.query(updateQuery, [
            tipo,
            categoria,
            subcategoria || null,
            descripcion,
            Number(monto),
            metodo_pago || 'efectivo',
            comprobante_ref || null,
            id_evento_confirmado || null,
            id_solicitud || null,
            movimientoId
        ]);

        return res.status(200).json(serializeBigInt({
            id: Number(movimientoId),
            id_caja: Number(cajaId),
            tipo,
            categoria,
            subcategoria: subcategoria || null,
            descripcion,
            monto: Number(monto),
            metodo_pago: metodo_pago || 'efectivo',
            comprobante_ref: comprobante_ref || null,
            actualizado_en: new Date()
        }));
    } catch (err) {
        console.error('[cajasController] Error actualizando movimiento:', err);
        return res.status(500).json({ error: 'Error interno del servidor', details: err.message });
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
        const movResults = await db.query(verificarQuery, [movimientoId]);

        if (movResults.length === 0) {
            return res.status(404).json({ error: 'Movimiento no encontrado' });
        }

        const cajaId = movResults[0].id_caja;

        // La caja puede estar cerrada; el detalle histórico sigue permitiendo
        // eliminar un movimiento manual si la operación es administrativa.
        const verificarCajaQuery = 'SELECT estado FROM cajas WHERE id = ?';
        const cajaResults = await db.query(verificarCajaQuery, [cajaId]);

        if (cajaResults.length === 0) {
            return res.status(400).json({ error: 'Caja no encontrada' });
        }

        // Eliminar movimiento
        const deleteQuery = 'DELETE FROM movimientos_caja WHERE id = ?';
        await db.query(deleteQuery, [movimientoId]);

        console.log('[MOVIMIENTO_CAJA_ELIMINADO]', {
            movimiento_id: movimientoId,
            caja_id: cajaId,
            usuario_id: usuarioId
        });

        return res.json({ mensaje: 'Movimiento eliminado' });
    } catch (err) {
        console.error('[cajasController] Error:', err);
        res.status(500).json({ error: 'Error interno del servidor', details: err.message });
    }
}

/**
 * Eliminar una caja y sus movimientos asociados
 */
async function eliminarCaja(req, res) {
    try {
        const cajaId = req.params.id;
        const usuarioId = req.user.id;

        const cajaQuery = 'SELECT id, estado FROM cajas WHERE id = ?';
        const cajaResults = await db.query(cajaQuery, [cajaId]);

        if (cajaResults.length === 0) {
            return res.status(404).json({ error: 'Caja no encontrada' });
        }

        const caja = cajaResults[0];
        if (caja.estado === 'abierta') {
            return res.status(400).json({ error: 'No se puede eliminar una caja abierta' });
        }

        await db.query('DELETE FROM movimientos_caja WHERE id_caja = ?', [cajaId]);
        await db.query('DELETE FROM cajas WHERE id = ?', [cajaId]);

        console.log('[CAJA_ELIMINADA]', {
            caja_id: cajaId,
            usuario_id: usuarioId
        });

        return res.json({ mensaje: 'Caja eliminada' });
    } catch (err) {
        console.error('[cajasController] Error:', err);
        res.status(500).json({ error: 'Error interno del servidor', details: err.message });
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
        const cajaResults = await db.query(verificarQuery, [cajaId]);

        if (cajaResults.length === 0) {
            return res.status(400).json({ error: 'Caja no encontrada o no está abierta' });
        }

        const caja = cajaResults[0];

        // Obtener totales de movimientos
        const totalQuery = `
            SELECT 
                SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE -monto END) as total_movimientos
            FROM movimientos_caja
            WHERE id_caja = ?
        `;

        const totalResults = await db.query(totalQuery, [cajaId]);
        const totalMovimientos = totalResults[0].total_movimientos || 0;
        const totalSaldoInicial = caja.saldo_inicial_en_cuenta + (caja.saldo_inicial_en_efectivo || 0);
        const saldoEsperado = totalSaldoInicial + totalMovimientos;
        const diferencia = saldoFinal - saldoEsperado;

        // Actualizar caja
        const updateQuery = `
            UPDATE cajas
            SET estado = 'cerrada',
                saldo_final_en_cuenta = ?,
                saldo_final_en_efectivo = ?,
                fecha_cierre = NOW(),
                usuario_cierre_id = ?,
                notas_cierre = ?
            WHERE id = ?
        `;

        const saldoFinalEnCuenta = req.body.saldoFinalEnCuenta || 0;
        const saldoFinalEnEfectivo = req.body.saldoFinalEnEfectivo || saldoFinal; // Backward compatibility

        await db.query(updateQuery, [saldoFinalEnCuenta, saldoFinalEnEfectivo, usuarioId, notas, cajaId]);

        // NUEVO: Registrar el movimiento de cierre de caja (si hay diferencia)
        try {
            if (diferencia !== 0) {
                const movimientoQuery = `
                    INSERT INTO movimientos_caja 
                    (id_caja, tipo, categoria, subcategoria, descripcion, monto, metodo_pago, creado_en)
                    VALUES (?, ?, 'cierre', 'cierre_caja', ?, ?, 'manual', NOW())
                `;
                const tipoMovimiento = diferencia > 0 ? 'ingreso' : 'egreso';
                const montoAbs = Math.abs(diferencia);
                const descripcion = `Cierre de caja #${caja.numero_caja} - ${diferencia > 0 ? 'Sobrante' : 'Faltante'}: $${montoAbs}`;
                await db.query(movimientoQuery, [cajaId, tipoMovimiento, descripcion, montoAbs]);
                console.log('[MOVIMIENTO] Cierre registrado para caja:', cajaId, 'diferencia:', diferencia);
            }
        } catch (movErr) {
            console.warn('[MOVIMIENTO] Error al registrar cierre:', movErr.message);
            // No retornar error, continuar igual
        }

        console.log('[CAJA_CERRADA]', {
            caja_id: cajaId,
            numero_caja: caja.numero_caja,
            saldo_inicial_en_cuenta: caja.saldo_inicial_en_cuenta,
            saldo_inicial_en_efectivo: caja.saldo_inicial_en_efectivo || 0,
            saldo_final_en_cuenta: saldoFinalEnCuenta,
            saldo_final_en_efectivo: saldoFinalEnEfectivo,
            diferencia: diferencia,
            usuario_id: usuarioId
        });

        return res.json(serializeBigInt({
            id: cajaId,
            numero_caja: caja.numero_caja,
            estado: 'cerrada',
            saldo_inicial_en_cuenta: caja.saldo_inicial_en_cuenta,
            saldo_inicial_en_efectivo: caja.saldo_inicial_en_efectivo || 0,
            saldo_final_en_cuenta: saldoFinalEnCuenta,
            saldo_final_en_efectivo: saldoFinalEnEfectivo,
            saldo_esperado: saldoEsperado,
            diferencia: diferencia,
            fecha_cierre: new Date()
        }));
    } catch (err) {
        console.error('[cajasController] Error:', err);
        res.status(500).json({ error: 'Error interno del servidor', details: err.message });
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
                c.id_evento_confirmado,
                c.fecha_apertura,
                c.fecha_cierre,
                c.saldo_inicial_en_cuenta,
                c.saldo_inicial_en_efectivo,
                c.saldo_final_en_cuenta,
                c.saldo_final_en_efectivo,
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
                ORDER BY c.fecha_apertura DESC
            LIMIT 100
        `;

        console.log('[cajasController] 🔄 Ejecutando query...');
        const results = await db.query(query);

        console.log('[cajasController] ✅ Query success, returning', results?.length || 0, 'cajas');
        return res.json(serializeBigInt(results || []));
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

        await db.query(updateQuery, [nombre.trim(), cajaId]);

        return res.json(serializeBigInt({
            id: cajaId,
            nombre: nombre.trim(),
            mensaje: 'Nombre actualizado correctamente'
        }));
    } catch (err) {
        console.error('[cajasController] Error actualizando nombre:', err);
        res.status(500).json({ error: 'Error actualizando nombre', details: err.message });
    }
}

/**
 * Actualizar evento asociado a una caja
 * PUT /api/cajas/:id/evento
 */
async function actualizarEventoCaja(req, res) {
    try {
        const cajaId = req.params.id;
        const { idEventoConfirmado } = req.body;

        // idEventoConfirmado puede ser null (sin evento)
        const updateQuery = `
            UPDATE cajas
            SET id_evento_confirmado = ?
            WHERE id = ?
        `;

        await db.query(updateQuery, [idEventoConfirmado || null, cajaId]);

        return res.json(serializeBigInt({
            id: cajaId,
            id_evento_confirmado: idEventoConfirmado || null,
            mensaje: 'Evento actualizado correctamente'
        }));
    } catch (err) {
        console.error('[cajasController] Error actualizando evento:', err);
        res.status(500).json({ error: 'Error actualizando evento', details: err.message });
    }
}

/**
 * Importar movimientos de MP a una caja
 * POST /api/cajas/:id/importar-mp
 */
async function importarMovimientosMPCaja(req, res) {
    try {
        const cajaId = req.params.id;
        console.log(`[cajasController] 🔄 Importando movimientos MP para caja ${cajaId}...`);

        const mpPage = req.mpPage;

        // Verificar que Puppeteer está disponible
        if (!mpPage) {
            console.error('[cajasController] ❌ req.mpPage no disponible - ENABLE_PUPPETEER_MP debe ser true');
            return res.status(503).json({
                success: false,
                error: 'Puppeteer no disponible',
                details: 'ENABLE_PUPPETEER_MP debe estar habilitado. Reinicia con: ./scripts/up.sh --mp'
            });
        }

        // Obtener caja
        const cajaQuery = `SELECT * FROM cajas WHERE id = ?`;
        const cajaResults = await db.query(cajaQuery, [cajaId]);

        if (cajaResults.length === 0) {
            return res.status(404).json({ error: 'Caja no encontrada' });
        }

        const caja = cajaResults[0];
        console.log(`[cajasController] ✅ Caja encontrada: ${caja.numero_caja}`);

        // 1. Scraping paginado
        const { scrapeActivityAllPages } = require('../services/activityService');
        console.log('[cajasController] 🔍 Scrapeando todas las páginas de MP...');
        const scrapedData = await scrapeActivityAllPages(mpPage, 20);
        let transactions = scrapedData.transactions;
        console.log(`[cajasController] ✅ Scraping completado: ${transactions.length} transacciones`);

        // 2. Filtrar por fecha
        const cajaStart = new Date(caja.fecha_apertura);
        const cajaEnd = caja.fecha_cierre ? new Date(caja.fecha_cierre) : new Date();

        console.log(`[cajasController] 📅 Filtrando entre ${cajaStart.toISOString()} y ${cajaEnd.toISOString()}`);

        transactions = transactions.filter(tx => {
            const txDate = parseMercadoPagoDate(tx.creationDate || tx.dateTime || '');
            return txDate !== null && txDate >= cajaStart && txDate <= cajaEnd;
        });

        console.log(`[cajasController] ✅ Filtrado: ${transactions.length} transacciones en rango`);

        // 3a. Deduplicar transacciones (por comprobante_ref)
        // Obtener todos los comprobante_ref que ya existen para esta caja
        const existingRefsResults = await db.query(
            `SELECT DISTINCT comprobante_ref FROM movimientos_caja WHERE id_caja = ? AND comprobante_ref IS NOT NULL`,
            [cajaId]
        );
        const existingRefs = new Set(existingRefsResults.map(r => r.comprobante_ref));

        // Normalizar transacciones y asegurar que todas tienen ID único
        const transactionsWithIds = transactions.map(tx => {
            // Si no tiene ID válido, generar uno basado en la descripción y monto para consistencia
            if (!tx.id || tx.id.toString().startsWith('activity-') || tx.id.toString().startsWith('tx-')) {
                tx.id = `mp_${Math.abs(parseInt(tx.amount || 0))}_${(tx.title || 'tx').substring(0, 20).replace(/\s+/g, '_')}`;
            }
            return tx;
        });

        const duplicateCount = transactionsWithIds.reduce((count, tx) => {
            return count + (existingRefs.has(`MP-${tx.id}`) ? 1 : 0);
        }, 0);

        console.log(`[cajasController] ✅ Deduplicación: ${transactionsWithIds.length - duplicateCount} nuevas, ${duplicateCount} existentes (se actualizarán si cambian)`);

        // 3b. Importar a BD
        let importedCount = 0;
        let updatedCount = 0;
        let failedCount = 0;
        const processedRefs = new Set();

        for (const tx of transactionsWithIds) {
            try {
                const comprobante_ref = `MP-${tx.id}`;
                if (processedRefs.has(comprobante_ref)) {
                    continue;
                }
                processedRefs.add(comprobante_ref);

                let monto = tx.amount || 0;
                if (typeof monto === 'string') {
                    monto = parseFloat(monto.replace(/[^0-9.-]/g, '')) || 0;
                }

                let tipo = 'ingreso';
                const title = (tx.title || '').toLowerCase();
                if (title.includes('transferencia enviada') || title.includes('pago') || title.includes('compra')) {
                    tipo = 'egreso';
                }

                if (monto < 0) {
                    tipo = 'egreso';
                    monto = Math.abs(monto);
                }

                const createdAtDate = parseMercadoPagoDate(tx.creationDate || tx.dateTime || '') || new Date();
                const createdAt = createdAtDate.toISOString(); // ✅ Incluye 'Z' para indicar UTC

                const usuarioId = req.user?.id_usuario || req.user?.id;
                const { inserted, updated, subcategoria, descripcion } = await upsertMovimientoCajaMP(db, cajaId, tx, tipo, monto, createdAt, usuarioId, existingRefs.has(comprobante_ref));

                if (inserted) {
                    importedCount++;
                } else if (updated) {
                    updatedCount++;
                }

                console.log(`  ${inserted ? '✅' : '♻️'} ${comprobante_ref}: ${tipo} $${monto} - ${subcategoria} / ${descripcion}`);
            } catch (err) {
                failedCount++;
                console.error(`  ❌ Error:`, err.message);
            }
        }

        console.log(`[cajasController] ✅ Importación: ${importedCount} exitosas, ${failedCount} fallidas`);

        return res.json({
            success: true,
            imported: importedCount,
            updated: updatedCount,
            failed: failedCount,
            total: transactions.length,
            pagesScraped: scrapedData.totalPages,
            cajaId
        });

    } catch (err) {
        console.error('[cajasController] Error importando MP:', err);
        res.status(500).json({ error: 'Error importando movimientos', details: err.message });
    }
}

/**
 * POST /api/cajas/:id/importar-retroactivos
 * Importar movimientos de MP para un período específico
 * Body: { fechaDesde, fechaHasta, maxPaginas }
 * Permite debugging visual con período seleccionado por usuario
 */
async function importarMovimientosRetroactivos(req, res) {
    try {
        const cajaId = req.params.id;
        const { fechaDesde, fechaHasta, maxPaginas = 20 } = req.body;
        const { mpPage } = req;

        if (!mpPage) {
            return res.status(400).json({ error: 'Puppeteer no está habilitado (ENABLE_PUPPETEER_MP=false)' });
        }

        if (!cajaId || !fechaDesde || !fechaHasta) {
            return res.status(400).json({ error: 'Faltan parámetros: cajaId, fechaDesde, fechaHasta' });
        }

        // Parsear fechas
        const dateFrom = new Date(fechaDesde);
        const dateTo = new Date(fechaHasta);

        if (isNaN(dateFrom) || isNaN(dateTo)) {
            return res.status(400).json({ error: 'Fechas inválidas' });
        }

        console.log(`[cajasController] 🔍 Importación retroactiva de caja ${cajaId}`);
        console.log(`[cajasController] 📅 Período: ${dateFrom.toISOString()} → ${dateTo.toISOString()}`);
        console.log(`[cajasController] 📄 Máximo de páginas: ${maxPaginas}`);

        // 0. Requiere activityService localmente
        const { scrapeActivityAllPages } = require('../services/activityService');

        // 1. Obtener caja
        const cajaQuery = 'SELECT id, numero_caja, saldo_inicial_en_cuenta, saldo_inicial_en_efectivo FROM cajas WHERE id = ?';
        const cajaResults = await db.query(cajaQuery, [cajaId]);

        if (cajaResults.length === 0) {
            return res.status(404).json({ error: 'Caja no encontrada' });
        }

        // 2. Scrape todas las páginas
        console.log(`[cajasController] 🔄 Iniciando scraping de MP con Puppeteer...`);
        const scrapingResult = await scrapeActivityAllPages(mpPage, maxPaginas);
        const { transactions, totalPages, totalCount } = scrapingResult;

        console.log(`[cajasController] ✅ Scraping completado: ${totalCount} transacciones en ${totalPages} páginas`);

        // 3. Filtrar por período
        const filteredTransactions = transactions.filter(tx => {
            const txDateTime = parseMercadoPagoDate(tx.creationDate || tx.dateTime || tx.grouperDate?.value || '');

            if (!txDateTime || isNaN(txDateTime)) {
                console.warn(`  ⚠️  Transacción ${tx.id} sin fecha válida, ignorando`);
                return false;
            }

            return txDateTime >= dateFrom && txDateTime <= dateTo;
        });

        console.log(`[cajasController] 📅 Filtrado: ${filteredTransactions.length}/${totalCount} transacciones en rango`);

        // 4. Deduplicación - primero normalizar IDs
        const transactionsWithIds = filteredTransactions.map(tx => {
            // Si no tiene ID válido, generar uno basado en descripción y monto
            if (!tx.id || tx.id.toString().startsWith('activity-') || tx.id.toString().startsWith('tx-')) {
                tx.id = `mp_${Math.abs(parseInt(tx.amount || 0))}_${(tx.title || 'tx').substring(0, 20).replace(/\s+/g, '_')}`;
            }
            return tx;
        });

        const existingRefsResults = await db.query(
            `SELECT DISTINCT comprobante_ref FROM movimientos_caja WHERE id_caja = ? AND comprobante_ref IS NOT NULL`,
            [cajaId]
        );
        const existingRefs = new Set(existingRefsResults.map(r => r.comprobante_ref));

        const duplicateCount = transactionsWithIds.reduce((count, tx) => {
            return count + (existingRefs.has(`MP-${tx.id}`) ? 1 : 0);
        }, 0);

        console.log(`[cajasController] ✅ Deduplicación: ${transactionsWithIds.length - duplicateCount} nuevas (${duplicateCount} existentes)`);

        // 5. Importar a BD
        let importedCount = 0;
        let updatedCount = 0;
        let failedCount = 0;
        const detailedLogs = [];
        const processedRefs = new Set();

        for (const tx of transactionsWithIds) {
            try {
                const comprobante_ref = `MP-${tx.id}`;
                if (processedRefs.has(comprobante_ref)) {
                    continue;
                }
                processedRefs.add(comprobante_ref);

                // Parsear monto
                let monto = 0;
                if (typeof tx.amount === 'string') {
                    monto = parseFloat(tx.amount.replace(/\./g, '').replace(',', '.'));
                } else if (typeof tx.amount === 'number') {
                    monto = tx.amount;
                }

                if (isNaN(monto)) monto = 0;

                // Detectar tipo
                let tipo = 'ingreso';
                const titleLower = (tx.title || '').toLowerCase();
                const descLower = (tx.description || '').toLowerCase();
                if (titleLower.includes('enviada') || titleLower.includes('egreso') || descLower.includes('enviada')) {
                    tipo = 'egreso';
                }

                // Parsear datetime
                let createdAt = new Date().toISOString(); // ✅ Incluye 'Z' para indicar UTC
                if (tx.dateTime || tx.creationDate) {
                    const parsedDate = parseMercadoPagoDate(tx.creationDate || tx.dateTime || '');
                    if (parsedDate) {
                        createdAt = parsedDate.toISOString(); // ✅ Incluye 'Z' para indicar UTC
                    }
                }

                const usuarioId = req.user?.id_usuario || req.user?.id;
                const { inserted, updated, subcategoria, descripcion } = await upsertMovimientoCajaMP(db, cajaId, tx, tipo, monto, createdAt, usuarioId, existingRefs.has(comprobante_ref));

                if (inserted) importedCount++;
                if (updated) updatedCount++;

                const log = `${inserted ? '✅' : '♻️'} ${tx.id}: ${tipo} $${monto} - ${subcategoria} / ${descripcion}`;
                detailedLogs.push(log);
                console.log(`  ${log}`);

            } catch (err) {
                failedCount++;
                const log = `❌ ${tx.id}: ${err.message}`;
                detailedLogs.push(log);
                console.warn(`  ${log}`);
            }
        }

        console.log(`[cajasController] ✅ Importación completada: ${importedCount} exitosas, ${failedCount} fallos`);

        return res.status(200).json({
            success: true,
            imported: importedCount,
            updated: updatedCount,
            failed: failedCount,
            total: transactionsWithIds.length,
            filtered: filteredTransactions.length,
            pagesScraped: totalPages,
            totalInMP: totalCount,
            cajaId,
            periodFrom: fechaDesde,
            periodTo: fechaHasta,
            detailedLogs
        });

    } catch (err) {
        console.error('[cajasController] ❌ Error en importación retroactiva:', err);
        res.status(500).json({ error: 'Error importando movimientos', details: err.message, stack: err.stack });
    }
}

/**
 * GET /api/cajas/:id/importar-retroactivos-stream?fechaDesde=&fechaHasta=&maxPaginas=
 * SSE — Scraping en tiempo real con streaming de progreso
 */
async function importarRetroactivosStream(req, res) {
    const cajaId = req.params.id;
    const { fechaDesde, fechaHasta, maxPaginas = 20 } = req.query;
    const { mpPage } = req;

    // Headers SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const send = (data) => {
        try {
            res.write(`data: ${JSON.stringify(data)}\n\n`);
        } catch (e) { }
    };

    const end = (data) => {
        try {
            send(data);
            res.end();
        } catch (e) { }
    };

    try {
        if (!mpPage) {
            return end({ type: 'error', message: 'Puppeteer MP no disponible' });
        }
        if (!cajaId || !fechaDesde || !fechaHasta) {
            return end({ type: 'error', message: 'Faltan parámetros: cajaId, fechaDesde, fechaHasta' });
        }

        const dateFrom = new Date(fechaDesde);
        const dateTo = new Date(fechaHasta);
        if (isNaN(dateFrom) || isNaN(dateTo)) {
            return end({ type: 'error', message: 'Fechas inválidas' });
        }

        send({ type: 'status', message: `📅 Período: ${dateFrom.toLocaleString('es-AR')} → ${dateTo.toLocaleString('es-AR')}` });
        send({ type: 'status', message: `📄 Máx páginas: ${maxPaginas}` });

        const { scrapeActivityAllPages } = require('../services/activityService');

        // Verificar caja
        const cajaResults = await db.query('SELECT id FROM cajas WHERE id = ?', [cajaId]);
        if (cajaResults.length === 0) {
            return end({ type: 'error', message: 'Caja no encontrada' });
        }

        // Scraping con callback de progreso → emisión SSE en tiempo real
        const scrapingResult = await scrapeActivityAllPages(mpPage, parseInt(maxPaginas), (event) => {
            send(event); // Reenviar cada evento al cliente SSE
        }, dateFrom, dateTo);

        const { transactions, totalPages, totalCount } = scrapingResult;

        // Filtrar por período
        const filteredTransactions = transactions.filter(tx => {
            const txDateTime = parseMercadoPagoDate(tx.creationDate || tx.dateTime || tx.grouperDate?.value || '');
            if (!txDateTime || isNaN(txDateTime)) return false;
            return txDateTime >= dateFrom && txDateTime <= dateTo;
        });

        // Deduplicar
        const transactionsWithIds = filteredTransactions.map(tx => {
            if (!tx.id || tx.id.toString().startsWith('activity-') || tx.id.toString().startsWith('tx-')) {
                tx.id = `mp_${Math.abs(parseInt(tx.amount || 0))}_${(tx.title || 'tx').substring(0, 20).replace(/\s+/g, '_')}`;
            }
            return tx;
        });

        const existingRefsResults = await db.query(
            `SELECT DISTINCT comprobante_ref FROM movimientos_caja WHERE id_caja = ? AND comprobante_ref IS NOT NULL`,
            [cajaId]
        );
        const existingRefs = new Set(existingRefsResults.map(r => r.comprobante_ref));

        console.log(`[cajasController] 🔍 Dedup: ${filteredTransactions.length} filtradas, ${existingRefs.size} refs en DB para caja ${cajaId}`);
        const duplicateCount = transactionsWithIds.reduce((count, tx) => {
            return count + (existingRefs.has(`MP-${tx.id}`) ? 1 : 0);
        }, 0);
        console.log(`[cajasController] ✅ Deduplicación: ${transactionsWithIds.length - duplicateCount} nuevas, ${duplicateCount} existentes (se actualizarán si hay cambios)`);

        // Importar a BD
        let importedCount = 0;
        let updatedCount = 0;
        let failedCount = 0;
        const processedRefs = new Set();

        for (const tx of transactionsWithIds) {
            try {
                const comprobante_ref = `MP-${tx.id}`;
                if (processedRefs.has(comprobante_ref)) {
                    continue;
                }
                processedRefs.add(comprobante_ref);

                let monto = 0;
                if (typeof tx.amount === 'string') {
                    monto = parseFloat(tx.amount.replace(/\./g, '').replace(',', '.'));
                } else if (typeof tx.amount === 'number') {
                    monto = tx.amount;
                }
                if (isNaN(monto)) monto = 0;

                let tipo = 'ingreso';
                const titleLower = (tx.title || '').toLowerCase();
                if (titleLower.includes('enviada') || titleLower.includes('egreso')) tipo = 'egreso';
                if (monto < 0) { tipo = 'egreso'; monto = Math.abs(monto); }

                const createdAtDate = parseMercadoPagoDate(tx.creationDate || tx.dateTime || '') || new Date();
                const createdAt = createdAtDate.toISOString(); // ✅ Incluye 'Z' para indicar UTC
                const usuarioId = req.user?.id_usuario || req.user?.id;

                const { inserted, updated } = await upsertMovimientoCajaMP(db, cajaId, tx, tipo, monto, createdAt, usuarioId, existingRefs.has(comprobante_ref));

                if (inserted) importedCount++;
                if (updated) updatedCount++;

                send({ type: 'imported', tx: { id: tx.id, tipo, monto, title: tx.title, createdAt, updated } });
            } catch (err) {
                failedCount++;
                send({ type: 'warning', message: `❌ ${tx.id}: ${err.message}` });
            }
        }

        end({
            type: 'done',
            imported: importedCount,
            updated: updatedCount,
            failed: failedCount,
            filtered: filteredTransactions.length,
            pagesScraped: totalPages,
            totalInMP: totalCount
        });

    } catch (err) {
        console.error('[cajasController] ❌ Error SSE importación:', err);
        end({ type: 'error', message: err.message });
    }
}

/**
 * Pausar/Congelar el refresh automático de MP en Puppeteer
 */
async function pausarRefreshMP(req, res) {
    try {
        const mpPage = req.mpPage;

        if (!mpPage || typeof mpPage.evaluate !== 'function') {
            return res.status(400).json({
                success: false,
                error: 'Puppeteer MP no disponible',
                details: 'La página de Mercado Pago no está inicializada.'
            });
        }

        let action = 'paused';
        try {
            const { getWatchService } = require('../controllers/watchController');
            const watchSvc = getWatchService();

            if (watchSvc && watchSvc.isActive) {
                watchSvc.stop();
                console.log('[cajasController] ⏸️  TransactionWatchService pausado');
                action = 'paused';
            } else if (watchSvc && !watchSvc.isActive) {
                watchSvc.start().catch((e) => {
                    console.warn('[cajasController] ⚠️  No se pudo reanudar el watch service:', e.message);
                });
                console.log('[cajasController] ▶️  TransactionWatchService reanudado');
                action = 'resumed';
            }
        } catch (e) {
            console.warn('[cajasController] ⚠️  No se pudo togglear el watch service:', e.message);
        }

        if (action === 'paused') {
            console.log('[cajasController] 🔒 PAUSANDO refresh automático de MP en Puppeteer...');
            try {
                await mpPage.evaluate(() => {
                    window._originalSetInterval = window.setInterval;
                    window._originalSetTimeout = window.setTimeout;
                    window._originalRAF = window.requestAnimationFrame;
                    window._originalAddEventListener = EventTarget.prototype.addEventListener;
                    window._originalFetch = window.fetch;

                    const ALLOWED_EVENTS = ['click', 'mouseover', 'mouseout', 'focus', 'blur'];
                    window.setInterval = function () { return -1; };
                    window.setTimeout = function () { return -1; };
                    window.requestAnimationFrame = function () { return -1; };

                    EventTarget.prototype.addEventListener = function (event, handler, options) {
                        if (!ALLOWED_EVENTS.includes(event)) {
                            return;
                        }
                        return window._originalAddEventListener.call(this, event, handler, options);
                    };

                    window.WebSocket = class {
                        constructor() { throw new Error('WebSocket bloqueado'); }
                    };

                    window.fetch = function (url, options) {
                        const urlStr = String(url || '');
                        if (urlStr.includes('/api/') || urlStr.includes('/activities') || urlStr.includes('refresh')) {
                            return Promise.reject(new Error('Fetch bloqueado'));
                        }
                        return window._originalFetch.apply(this, arguments);
                    };
                });
            } catch (pageErr) {
                console.error('[cajasController] ❌ Error al pausar refresh en Puppeteer:', pageErr.message);
                return res.status(409).json({
                    success: false,
                    error: 'No se pudo pausar el refresh en Puppeteer',
                    details: pageErr.message
                });
            }

            console.log('[cajasController] ✓ Refresh de MP pausado en Puppeteer');
            return res.json({ success: true, action: 'paused', message: 'Refresh de MP pausado' });
        }

        console.log('[cajasController] 🔓 REANUDANDO refresh de MP en Puppeteer...');
        try {
            await mpPage.evaluate(() => {
                if (window._originalSetInterval) window.setInterval = window._originalSetInterval;
                if (window._originalSetTimeout) window.setTimeout = window._originalSetTimeout;
                if (window._originalRAF) window.requestAnimationFrame = window._originalRAF;
                if (window._originalAddEventListener) EventTarget.prototype.addEventListener = window._originalAddEventListener;
                if (window._originalFetch) window.fetch = window._originalFetch;
                if (window.WebSocket && window.WebSocket.name === 'WebSocket') {
                    delete window.WebSocket;
                }
            });
        } catch (pageErr) {
            console.warn('[cajasController] ⚠️  No se pudo restaurar el browser:', pageErr.message);
        }

        console.log('[cajasController] ✓ Refresh de MP reanudado');
        return res.json({ success: true, action: 'resumed', message: 'Refresh de MP reanudado' });
    } catch (err) {
        console.error('[cajasController] ❌ Error pausando refresh:', err.message);
        return res.status(500).json({
            success: false,
            error: 'Error pausando refresh',
            details: err.message
        });
    }
}

/**
 * Importar movimientos de MP creando y cerrando la caja automáticamente (SSE)
 * GET /api/cajas/importar-auto-stream?fechaDesde=&fechaHasta=&maxPaginas=&token=&nombreCaja=
 */
async function importarAutoStream(req, res) {
    console.log('[importarAutoStream] 📥 req.query:', JSON.stringify(req.query));
    const { fechaDesde, fechaHasta, maxPaginas, nombreCaja } = req.query;
    const { mpPage } = req;
    // El JWT payload usa id_usuario (con guión), no id
    const usuarioId = req.user.id_usuario || req.user.id;
    console.log(`[importarAutoStream] 📅 fechaDesde=${fechaDesde}, fechaHasta=${fechaHasta}, maxPaginas=${maxPaginas}, nombreCaja=${nombreCaja}`);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const send = (data) => {
        try {
            res.write(`data: ${JSON.stringify(data)}\n\n`);
            if (typeof res.flush === 'function') {
                res.flush();
            }
            if (data && data.type === 'imported' && data.tx) {
                console.log(`[importarAutoStream] SSE imported tx=${data.tx.id} tipo=${data.tx.tipo} monto=${data.tx.monto} title=${data.tx.title} createdAt=${data.tx.createdAt}`);
            }
            if (data && data.type === 'page_done') {
                console.log(`[importarAutoStream] SSE page_done page=${data.page} count=${data.count} rawCount=${data.rawCount || data.count} total=${data.total}`);
                if (Array.isArray(data.sampleDates) && data.sampleDates.length > 0) {
                    console.log('[importarAutoStream] SSE page_done sampleDates=', JSON.stringify(data.sampleDates, null, 2));
                }
            }
        } catch (e) {
            console.warn('[importarAutoStream] send failed:', e.message);
        }
    };
    const end = (data) => {
        try {
            send(data);
            setTimeout(() => {
                try {
                    res.end();
                } catch (e) {
                    console.warn('[importarAutoStream] end failed:', e.message);
                }
            }, 150);
        } catch (e) {
            console.warn('[importarAutoStream] end wrapper failed:', e.message);
        }
    };

    // Keep-alive cada 30 segundos para prevenir timeout de conexión
    const keepAliveInterval = setInterval(() => {
        send({ type: 'keep-alive', timestamp: Date.now() });
    }, 30000);

    // Limpiar el intervalo cuando se cierre la conexión
    res.on('close', () => clearInterval(keepAliveInterval));

    let cajaId = null;

    try {
        if (!mpPage) return end({ type: 'error', message: 'Puppeteer MP no disponible' });
        if (!fechaDesde || !fechaHasta) return end({ type: 'error', message: 'Faltan parámetros: fechaDesde, fechaHasta' });

        // ⚠️ IMPORTANTE: Las fechas del frontend vienen como datetime-local (Buenos Aires)
        // Ej: "2026-05-16T00:00" significa "00:00 en Buenos Aires".
        // Convertimos explícitamente ese horario a UTC con offset -03:00.
        function parseLocalDateTime(dateString) {
            if (typeof dateString !== 'string') return new Date(NaN);
            const normalized = dateString.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(dateString)
                ? dateString
                : `${dateString}-03:00`;
            return new Date(normalized);
        }

        const dateFrom = parseLocalDateTime(fechaDesde);
        const dateTo = parseLocalDateTime(fechaHasta);
        if (isNaN(dateFrom) || isNaN(dateTo)) return end({ type: 'error', message: 'Fechas inválidas' });

        const maxPaginasNum = parseInt(maxPaginas, 10);
        const maxPages = Number.isNaN(maxPaginasNum) || maxPaginasNum <= 0 ? Infinity : maxPaginasNum;
        const maxPagesLabel = Number.isFinite(maxPages) ? maxPages : 'Ilimitado';

        console.log(`[importarAutoStream] 🔧 Conversión de fechas locales a UTC:`);
        console.log(`[importarAutoStream]   Recibido: ${fechaDesde} → Interpretado como: ${dateFrom.toISOString()}`);
        console.log(`[importarAutoStream]   Recibido: ${fechaHasta} → Interpretado como: ${dateTo.toISOString()}`);

        // Formato legible para el nombre de la caja
        const fmtOpts = { timeZone: 'America/Argentina/Buenos_Aires', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' };
        const fmtDesde = dateFrom.toLocaleString('es-AR', fmtOpts);
        const fmtHasta = dateTo.toLocaleString('es-AR', fmtOpts);
        const cajaNombre = (typeof nombreCaja === 'string' && nombreCaja.trim())
            ? nombreCaja.trim()
            : `Importación MP: ${fmtDesde} → ${fmtHasta}`;

        // Crear caja automáticamente (sin verificar si ya hay una abierta)
        const numeroQuery = 'SELECT COALESCE(MAX(numero_caja), 0) + 1 as siguiente FROM cajas';
        const numResults = await db.query(numeroQuery);
        const numeroCaja = numResults[0].siguiente;

        const insertCaja = `INSERT INTO cajas (numero_caja, nombre, usuario_apertura_id, saldo_inicial_en_cuenta, saldo_inicial_en_efectivo, notas_apertura, estado, fecha_apertura)
                            VALUES (?, ?, ?, 0, 0, ?, 'abierta', ?)`;
        const cajaNota = `Importación automática desde MP${typeof nombreCaja === 'string' && nombreCaja.trim() ? `: ${nombreCaja.trim()}` : ''}. Período: ${fmtDesde} → ${fmtHasta}`;
        const cajaResult = await db.query(insertCaja, [numeroCaja, cajaNombre, usuarioId, cajaNota, dateFrom]);
        cajaId = cajaResult.insertId;

        send({ type: 'status', message: `📦 Caja #${numeroCaja} creada: ${cajaNombre}` });
        send({ type: 'status', message: `📅 Período: ${fmtDesde} → ${fmtHasta}` });
        send({ type: 'status', message: `📄 Máx páginas: ${maxPagesLabel}` });

        const { scrapeActivityAllPages } = require('../services/activityService');

        const scrapingResult = await scrapeActivityAllPages(mpPage, maxPages, (event) => {
            if (event && event.type) {
                if (event.type === 'page_start') {
                    console.log(`[importarAutoStream] page_start page=${event.page} maxPages=${event.maxPages}`);
                } else if (event.type === 'page_done') {
                    console.log(`[importarAutoStream] page_done page=${event.page} count=${event.count} rawCount=${event.rawCount || event.count} total=${event.total}`);
                } else if (event.type === 'page_duplicate') {
                    console.log(`[importarAutoStream] page_duplicate page=${event.page} message=${event.message}`);
                } else if (event.type === 'scraping_done') {
                    console.log(`[importarAutoStream] scraping_done total=${event.total} pages=${event.pages} navigationErrors=${event.navigationErrors} duplicatesRemoved=${event.duplicatesRemoved}`);
                } else if (event.type === 'warning') {
                    console.log(`[importarAutoStream] warning: ${event.message}`);
                }
            }
            send(event);
        }, dateFrom, dateTo);

        const { transactions, totalPages, totalCount } = scrapingResult;

        console.log(`\n[cajasController] 📊 FILTRADO POR FECHA:`);
        console.log(`[cajasController] Total transacciones scrapeadas: ${transactions.length}`);
        console.log(`[cajasController] Período: ${dateFrom.toISOString()} → ${dateTo.toISOString()}`);

        const filteredTransactions = transactions.filter(tx => {
            // PRIORITY: creationDate (ISO precise) > grouperDate > dateTime (group date only)
            // creationDate has the precise hour extracted from DOM <time> element
            const rawDate = tx.creationDate || tx.grouperDate?.value || tx.dateTime;
            if (!rawDate) return false;
            const txDateTime = parseMercadoPagoDate(rawDate);
            if (!txDateTime) return false;
            const isInRange = txDateTime >= dateFrom && txDateTime <= dateTo;
            if (!isInRange && transactions.indexOf(tx) < 3) {
                console.log(`[cajasController] ❌ FUERA DE RANGO: ${txDateTime.toISOString()} (tx: ${(tx.title || 'sin título').substring(0, 40)})`);
            }
            return isInRange;
        });
        console.log(`[cajasController] ✅ Transacciones dentro del período: ${filteredTransactions.length}`);

        const transactionsWithIds = filteredTransactions.map(tx => {
            if (!tx.id || tx.id.toString().startsWith('activity-') || tx.id.toString().startsWith('tx-')) {
                tx.id = `mp_${Math.abs(parseInt(tx.amount || 0))}_${(tx.title || 'tx').substring(0, 20).replace(/\s+/g, '_')}`;
            }
            return tx;
        });

        const existingRefsResults = await db.query(
            `SELECT DISTINCT comprobante_ref FROM movimientos_caja WHERE id_caja = ? AND comprobante_ref IS NOT NULL`,
            [cajaId]
        );
        const existingRefs = new Set(existingRefsResults.map(r => r.comprobante_ref));

        console.log(`[cajasController] 🔍 DEDUPLICACIÓN:`);
        console.log(`[cajasController] Refs existentes en BD para caja #${cajaId}: ${existingRefs.size}`);

        const duplicateCount = transactionsWithIds.reduce((count, tx) => {
            return count + (existingRefs.has(`MP-${tx.id}`) ? 1 : 0);
        }, 0);
        console.log(`[cajasController] 📌 Transacciones nuevas: ${transactionsWithIds.length - duplicateCount}, existentes: ${duplicateCount}`);

        let importedCount = 0;
        let updatedCount = 0;
        let failedCount = 0;
        let totalMonto = 0;

        console.log(`[cajasController] 💾 IMPORTANDO ${transactionsWithIds.length} transacciones a BD...`);
        const processedRefs = new Set();

        for (const tx of transactionsWithIds) {
            try {
                const comprobante_ref = `MP-${tx.id}`;
                if (processedRefs.has(comprobante_ref)) {
                    continue;
                }
                processedRefs.add(comprobante_ref);

                let monto = 0;
                if (typeof tx.amount === 'string') {
                    monto = parseFloat(tx.amount.replace(/\./g, '').replace(',', '.'));
                } else if (typeof tx.amount === 'number') {
                    monto = tx.amount;
                }
                if (isNaN(monto)) monto = 0;

                let tipo = 'ingreso';
                const titleLower = (tx.title || '').toLowerCase();
                if (titleLower.includes('enviada') || titleLower.includes('egreso')) tipo = 'egreso';
                if (monto < 0) { tipo = 'egreso'; monto = Math.abs(monto); }

                const createdAtDate = parseMercadoPagoDate(tx.creationDate || tx.dateTime || '') || new Date();
                const createdAt = createdAtDate.toISOString(); // ✅ Incluye 'Z' para indicar UTC
                const usuarioId = req.user?.id_usuario || req.user?.id;

                // Log each transaction
                if (importedCount < 5) {
                    console.log(`[cajasController] [${importedCount + 1}] ${tipo.toUpperCase()}: $${monto} | ${(tx.title || 'sin título').substring(0, 50)} | fecha: ${createdAt}`);
                }

                const { inserted, updated } = await upsertMovimientoCajaMP(db, cajaId, tx, tipo, monto, createdAt, usuarioId, existingRefs.has(comprobante_ref));
                if (inserted) {
                    if (tipo === 'ingreso') totalMonto += monto;
                    else totalMonto -= monto;
                    importedCount++;
                }
                if (updated) {
                    updatedCount++;
                }

                send({ type: 'imported', tx: { id: tx.id, tipo, monto, title: tx.title, createdAt, updated } });
            } catch (err) {
                failedCount++;
                console.error(`[cajasController] ❌ Error importando ${tx.id}: ${err.message}`);
                send({ type: 'warning', message: `❌ ${tx.id}: ${err.message}` });
            }
        }

        console.log(`[cajasController] ✅ IMPORTACIÓN COMPLETADA: ${importedCount} importadas, ${failedCount} errores`);

        // Cerrar la caja automáticamente
        const saldoFinal = Math.max(0, totalMonto);
        await db.query(
            `UPDATE cajas SET estado = 'cerrada', saldo_final_en_cuenta = ?, saldo_final_en_efectivo = 0, fecha_cierre = ?, usuario_cierre_id = ?,
             notas_cierre = 'Cerrada automáticamente al finalizar importación'
             WHERE id = ?`,
            [saldoFinal, dateTo, usuarioId, cajaId]
        );

        send({ type: 'status', message: `📦 Caja #${numeroCaja} cerrada. Saldo: $${saldoFinal.toLocaleString('es-AR')}` });

        end({
            type: 'done',
            imported: importedCount,
            updated: updatedCount,
            failed: failedCount,
            filtered: filteredTransactions.length,
            pagesScraped: totalPages,
            totalInMP: totalCount,
            cajaId,
            numeroCaja,
            cajaNombre
        });

    } catch (err) {
        console.error('[cajasController] ❌ Error importarAutoStream:', err);
        // Si se creó la caja pero falló el proceso, marcarla con error
        if (cajaId) {
            await db.query(
                `UPDATE cajas SET estado = 'cerrada', saldo_final_en_cuenta = 0, saldo_final_en_efectivo = 0, fecha_cierre = NOW(),
                 notas_cierre = 'Error durante importación: ${err.message.substring(0, 100)}'
                 WHERE id = ?`,
                [cajaId]
            ).catch(() => { });
        }
        end({ type: 'error', message: err.message });
    }
}

// GET /api/cajas/eventos-disponibles
// Obtener lista de eventos confirmados activos para asociar con cajas
async function obtenerEventosDisponibles(req, res) {
    console.log('[cajasController] ✅ obtenerEventosDisponibles CALLED');
    try {
        const query = `
            SELECT 
                id,
                nombre_evento,
                descripcion_corta,
                fecha_evento,
                hora_inicio,
                tipo_evento
            FROM eventos_confirmados
            WHERE activo = 1 AND cancelado_en IS NULL
            ORDER BY fecha_evento DESC
            LIMIT 50
        `;

        const results = await db.query(query);
        console.log('[cajasController] ✅ Query success, returning', results?.length || 0, 'eventos');
        return res.json(serializeBigInt(results || []));
    } catch (err) {
        console.error('[cajasController] ❌ Error:', err.message);
        res.status(500).json({ error: 'Error obteniendo eventos', details: err.message });
    }
}

module.exports = {
    verificarCajaActiva,
    crearCaja,
    obtenerCaja,
    obtenerMovimientosCaja,
    agregarMovimiento,
    actualizarMovimientoCaja,
    eliminarMovimiento,
    cerrarCaja,
    obtenerHistorialCajas,
    actualizarNombreCaja,
    actualizarEventoCaja,
    importarMovimientosMPCaja,
    importarMovimientosRetroactivos,
    importarRetroactivosStream,
    importarAutoStream,
    pausarRefreshMP,
    eliminarCaja,
    obtenerEventosDisponibles
};
