const db = require('../db');

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
        const { saldoInicial, notas } = req.body;
        const usuarioId = req.user.id;

        if (saldoInicial === undefined || saldoInicial < 0) {
            return res.status(400).json({ error: 'Saldo inicial inválido' });
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
            INSERT INTO cajas (numero_caja, usuario_apertura_id, saldo_inicial, notas_apertura, estado)
            VALUES (?, ?, ?, ?, 'abierta')
        `;

        const result = await db.query(insertQuery, [numeroCaja, usuarioId, saldoInicial, notas]);
        const cajaId = result.insertId;

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
            saldo_inicial: saldoInicial,
            estado: 'abierta',
            fecha_apertura: new Date()
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
        const usuarioId = req.user.id;
        const { tipo, categoria, subcategoria, descripcion, monto, metodo, comprobante, id_evento_confirmado, id_solicitud } = req.body;

        // Validar entrada
        if (!tipo || !categoria || !descripcion || monto <= 0) {
            return res.status(400).json({ error: 'Datos incompletos o inválidos' });
        }

        // Verificar que la caja existe y está abierta
        const verificarQuery = 'SELECT id, estado FROM cajas WHERE id = ?';
        const cajaResults = await db.query(verificarQuery, [cajaId]);

        if (cajaResults.length === 0 || cajaResults[0].estado !== 'abierta') {
            return res.status(400).json({ error: 'Caja no encontrada o cerrada' });
        }

        // Insertar movimiento
        const insertQuery = `
            INSERT INTO movimientos_caja 
            (id_caja, tipo, categoria, subcategoria, descripcion, monto, metodo_pago, comprobante_ref, usuario_id, id_evento_confirmado, id_solicitud)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const result = await db.query(
            insertQuery,
            [cajaId, tipo, categoria, subcategoria, descripcion, monto, metodo || 'efectivo', comprobante, usuarioId, id_evento_confirmado || null, id_solicitud || null]
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
            monto,
            metodo_pago: metodo || 'efectivo',
            comprobante_ref: comprobante,
            creado_en: new Date()
        }));
    } catch (err) {
        console.error('[cajasController] Error:', err);
        res.status(500).json({ error: 'Error interno del servidor', details: err.message });
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

        // Verificar que la caja está abierta
        const verificarCajaQuery = 'SELECT estado FROM cajas WHERE id = ?';
        const cajaResults = await db.query(verificarCajaQuery, [cajaId]);

        if (cajaResults.length === 0 || cajaResults[0].estado !== 'abierta') {
            return res.status(400).json({ error: 'Caja no encontrada o cerrada' });
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

        await db.query(updateQuery, [saldoFinal, usuarioId, notas, cajaId]);

        console.log('[CAJA_CERRADA]', {
            caja_id: cajaId,
            numero_caja: caja.numero_caja,
            saldo_inicial: caja.saldo_inicial,
            saldo_final: saldoFinal,
            diferencia: diferencia,
            usuario_id: usuarioId
        });

        return res.json(serializeBigInt({
            id: cajaId,
            numero_caja: caja.numero_caja,
            estado: 'cerrada',
            saldo_inicial: caja.saldo_inicial,
            saldo_final: saldoFinal,
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
            if (!tx.dateTime && !tx.creationDate) return false;
            const txDate = new Date(tx.dateTime || tx.creationDate);
            return txDate >= cajaStart && txDate <= cajaEnd;
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

        // Filtrar transacciones que ya existen
        const newTransactions = transactionsWithIds.filter(tx => {
            const ref = `MP-${tx.id}`;
            if (existingRefs.has(ref)) {
                console.log(`  ⏭️  Saltando duplicado: ${ref}`);
                return false;
            }
            return true;
        });

        console.log(`[cajasController] ✅ Deduplicación: ${newTransactions.length} nuevas (${transactions.length - newTransactions.length} ya existentes)`);

        // 3b. Importar a BD
        let importedCount = 0;
        let failedCount = 0;

        for (const tx of newTransactions) {
            try {
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

                const descripcion = `${tx.title || 'Transacción'} - ${tx.description || ''}`.trim();
                // Usar el mismo ID normalizado que en deduplicación
                const comprobante_ref = `MP-${tx.id}`;

                // Convertir datetime a formato MySQL (YYYY-MM-DD HH:MM:SS)
                const txDateTime = tx.dateTime || tx.creationDate || new Date().toISOString();
                const dateObj = new Date(txDateTime);
                const mysqlDateTime = dateObj.toISOString().slice(0, 19).replace('T', ' ');

                await db.query(
                    `INSERT INTO movimientos_caja 
                    (id_caja, tipo, categoria, subcategoria, descripcion, monto, metodo_pago, comprobante_ref, usuario_id, creado_en)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        cajaId,
                        tipo,
                        'mercadopago',
                        tx.category || 'general',
                        descripcion,
                        monto,
                        'otro',  // metodo_pago ENUM válido
                        comprobante_ref,
                        2,  // usuario_id = Rodrigo (admin)
                        mysqlDateTime
                    ]
                );

                importedCount++;
                console.log(`  ✅ ${descripcion} ($${monto})`);
            } catch (err) {
                failedCount++;
                console.error(`  ❌ Error:`, err.message);
            }
        }

        console.log(`[cajasController] ✅ Importación: ${importedCount} exitosas, ${failedCount} fallidas`);

        return res.json({
            success: true,
            imported: importedCount,
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
        const cajaQuery = 'SELECT id, numero_caja, saldo_inicial FROM cajas WHERE id = ?';
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
            let txDateTime = null;

            // Intentar parsear datetime de la transacción (varios formatos posibles)
            if (tx.dateTime) {
                txDateTime = new Date(tx.dateTime);
            } else if (tx.creationDate) {
                txDateTime = new Date(tx.creationDate);
            } else if (tx.grouperDate?.value) {
                txDateTime = new Date(tx.grouperDate.value);
            }

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

        const newTransactions = transactionsWithIds.filter(tx => {
            const ref = `MP-${tx.id}`;
            if (existingRefs.has(ref)) {
                console.log(`  ⏭️  Duplicado: ${ref}`);
                return false;
            }
            return true;
        });

        console.log(`[cajasController] ✅ Deduplicación: ${newTransactions.length} nuevas (${filteredTransactions.length - newTransactions.length} existentes)`);

        // 5. Importar a BD
        let importedCount = 0;
        let failedCount = 0;
        const detailedLogs = [];

        for (const tx of newTransactions) {
            try {
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
                let createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
                if (tx.dateTime) {
                    createdAt = new Date(tx.dateTime).toISOString().slice(0, 19).replace('T', ' ');
                } else if (tx.creationDate) {
                    createdAt = new Date(tx.creationDate).toISOString().slice(0, 19).replace('T', ' ');
                }

                const insertQuery = `
                    INSERT INTO movimientos_caja (
                        id_caja, tipo, categoria, subcategoria, descripcion,
                        monto, metodo_pago, comprobante_ref, usuario_id, creado_en
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;

                await db.query(insertQuery, [
                    cajaId,
                    tipo,
                    'mercadopago',
                    tx.category || 'otros',
                    tx.description || tx.title || 'Transacción MP',
                    monto,
                    'otro',
                    `MP-${tx.id}`,
                    2, // usuario_id Rodrigo
                    createdAt
                ]);

                importedCount++;
                const log = `✅ ${tx.id}: ${tipo} $${monto} - ${tx.description}`;
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
            failed: failedCount,
            total: newTransactions.length,
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
        });

        const { transactions, totalPages, totalCount } = scrapingResult;

        // Filtrar por período
        const filteredTransactions = transactions.filter(tx => {
            const rawDate = tx.dateTime || tx.creationDate || tx.grouperDate?.value;
            if (!rawDate) return false;
            const txDateTime = new Date(rawDate);
            if (isNaN(txDateTime)) return false;
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
        const newTransactions = transactionsWithIds.filter(tx => {
            const ref = `MP-${tx.id}`;
            const isDup = existingRefs.has(ref);
            if (isDup) {
                console.log(`[cajasController]   ⏭️  DUP  ref=${ref.substring(0, 60)}`);
            } else {
                console.log(`[cajasController]   🆕  NEW  ref=${ref.substring(0, 60)}`);
            }
            return !isDup;
        });

        // Importar a BD
        let importedCount = 0;
        let failedCount = 0;

        for (const tx of newTransactions) {
            try {
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

                const createdAt = new Date(tx.dateTime || tx.creationDate || new Date())
                    .toISOString().slice(0, 19).replace('T', ' ');

                await db.query(
                    `INSERT IGNORE INTO movimientos_caja 
                    (id_caja, tipo, categoria, subcategoria, descripcion, monto, metodo_pago, comprobante_ref, usuario_id, creado_en)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [cajaId, tipo, 'mercadopago', tx.category || 'otros',
                        tx.description || tx.title || 'Transacción MP',
                        monto, 'otro', `MP-${tx.id}`, 2, createdAt]
                );

                importedCount++;
                send({ type: 'imported', tx: { id: tx.id, tipo, monto, title: tx.title, createdAt } });
            } catch (err) {
                failedCount++;
                send({ type: 'warning', message: `❌ ${tx.id}: ${err.message}` });
            }
        }

        end({
            type: 'done',
            imported: importedCount,
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
        // Obtener la página de Puppeteer del servidor
        const mpPage = req.mpPage;

        if (!mpPage) {
            return res.status(400).json({ error: 'Puppeteer MP no disponible' });
        }

        // Determinar acción según estado actual del watch service
        let action = 'paused';
        try {
            const { getWatchService } = require('../controllers/watchController');
            const watchSvc = getWatchService();
            if (watchSvc && watchSvc.isActive) {
                // ESTÁ ACTIVO → PAUSAR
                watchSvc.stop();
                console.log('[cajasController] ⏸️  TransactionWatchService pausado');
                action = 'paused';
            } else if (watchSvc && !watchSvc.isActive) {
                // ESTÁ PAUSADO → REANUDAR
                watchSvc.start();
                console.log('[cajasController] ▶️  TransactionWatchService reanudado');
                action = 'resumed';
            }
        } catch (e) {
            console.warn('[cajasController] ⚠️  No se pudo toglear watch service:', e.message);
        }

        if (action === 'paused') {
            console.log('[cajasController] 🔒 PAUSANDO refresh automático de MP en Puppeteer...');
            await mpPage.evaluate(() => {
                // ========== NIVEL 1: Congelar timers ==========
                window._originalSetInterval = window.setInterval;
                window._originalSetTimeout = window.setTimeout;
                window._originalRAF = window.requestAnimationFrame;

                const frozenIntervals = new Set();
                const frozenTimeouts = new Set();

                window.setInterval = function (...args) {
                    const id = Math.random();
                    frozenIntervals.add(id);
                    return id;
                };

                window.setTimeout = function (...args) {
                    const id = Math.random();
                    frozenTimeouts.add(id);
                    return id;
                };

                window.requestAnimationFrame = function (callback) {
                    return -1;
                };

                // ========== NIVEL 2: Bloquear listeners excepto interacción ==========
                window._originalAddEventListener = EventTarget.prototype.addEventListener;
                const ALLOWED_EVENTS = ['click', 'mouseover', 'mouseout', 'focus', 'blur'];

                EventTarget.prototype.addEventListener = function (event, handler, options) {
                    if (!ALLOWED_EVENTS.includes(event)) {
                        return;
                    }
                    return window._originalAddEventListener.call(this, event, handler, options);
                };

                // ========== NIVEL 3: Bloquear WebSocket ==========
                window.WebSocket = class {
                    constructor() { throw new Error('WebSocket bloqueado'); }
                };

                // ========== NIVEL 4: Bloquear fetch /api/ y /activities ==========
                window._originalFetch = window.fetch;
                window.fetch = function (url, options) {
                    const urlStr = String(url || '');
                    if (urlStr.includes('/api/') || urlStr.includes('/activities') || urlStr.includes('refresh')) {
                        return Promise.reject(new Error('Fetch bloqueado'));
                    }
                    return window._originalFetch.apply(this, arguments);
                };

                console.log('✓ Refresh de MP PAUSADO EXITOSAMENTE');
            });
            console.log('[cajasController] ✓ Refresh de MP pausado en Puppeteer');
            return res.json({ success: true, action: 'paused', message: 'Refresh de MP pausado' });
        } else {
            // REANUDAR: restaurar timers en el browser
            console.log('[cajasController] 🔓 REANUDANDO refresh de MP en Puppeteer...');
            try {
                await mpPage.evaluate(() => {
                    if (window._originalSetInterval) window.setInterval = window._originalSetInterval;
                    if (window._originalSetTimeout) window.setTimeout = window._originalSetTimeout;
                    if (window._originalRAF) window.requestAnimationFrame = window._originalRAF;
                    if (window._originalAddEventListener) EventTarget.prototype.addEventListener = window._originalAddEventListener;
                    if (window._originalFetch) window.fetch = window._originalFetch;
                    console.log('✓ Refresh de MP REANUDADO EXITOSAMENTE');
                });
            } catch (e) {
                console.warn('[cajasController] ⚠️  No se pudo restaurar browser:', e.message);
            }
            console.log('[cajasController] ✓ Refresh de MP reanudado');
            return res.json({ success: true, action: 'resumed', message: 'Refresh de MP reanudado' });
        }

    } catch (err) {
        console.error('[cajasController] ❌ Error pausando refresh:', err.message);
        res.status(500).json({ error: 'Error pausando refresh', details: err.message });
    }
}

/**
 * Importar movimientos de MP creando y cerrando la caja automáticamente (SSE)
 * GET /api/cajas/importar-auto-stream?fechaDesde=&fechaHasta=&maxPaginas=&token=
 */
async function importarAutoStream(req, res) {
    console.log('[importarAutoStream] 📥 req.query:', JSON.stringify(req.query));
    const { fechaDesde, fechaHasta, maxPaginas = 20 } = req.query;
    const { mpPage } = req;
    // El JWT payload usa id_usuario (con guión), no id
    const usuarioId = req.user.id_usuario || req.user.id;
    console.log(`[importarAutoStream] 📅 fechaDesde=${fechaDesde}, fechaHasta=${fechaHasta}, maxPaginas=${maxPaginas}`);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const send = (data) => { try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch (e) { } };
    const end = (data) => { try { send(data); res.end(); } catch (e) { } };

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
        // Ej: "2026-05-16T00:00" significa "00:00 en Buenos Aires" (03:00 UTC)
        // JavaScript interpreta strings sin Z como UTC, así que necesitamos ajustar
        function parseLocalDateTime(dateString) {
            const d = new Date(dateString);
            // Buenos Aires está en UTC-3, así que sumamos 3 horas
            // para convertir de "hora local" a UTC
            d.setUTCHours(d.getUTCHours() + 3);
            return d;
        }

        const dateFrom = parseLocalDateTime(fechaDesde);
        const dateTo = parseLocalDateTime(fechaHasta);
        if (isNaN(dateFrom) || isNaN(dateTo)) return end({ type: 'error', message: 'Fechas inválidas' });

        console.log(`[importarAutoStream] 🔧 Conversión de fechas locales a UTC:`);
        console.log(`[importarAutoStream]   Recibido: ${fechaDesde} → Interpretado como: ${dateFrom.toISOString()}`);
        console.log(`[importarAutoStream]   Recibido: ${fechaHasta} → Interpretado como: ${dateTo.toISOString()}`);

        // Formato legible para el nombre de la caja
        const fmtOpts = { timeZone: 'America/Argentina/Buenos_Aires', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' };
        const fmtDesde = dateFrom.toLocaleString('es-AR', fmtOpts);
        const fmtHasta = dateTo.toLocaleString('es-AR', fmtOpts);
        const cajaNombre = `Importación MP: ${fmtDesde} → ${fmtHasta}`;

        // Crear caja automáticamente (sin verificar si ya hay una abierta)
        const numeroQuery = 'SELECT COALESCE(MAX(numero_caja), 0) + 1 as siguiente FROM cajas';
        const numResults = await db.query(numeroQuery);
        const numeroCaja = numResults[0].siguiente;

        const insertCaja = `INSERT INTO cajas (numero_caja, nombre, usuario_apertura_id, saldo_inicial, notas_apertura, estado, fecha_apertura)
                            VALUES (?, ?, ?, 0, ?, 'abierta', ?)`;
        const cajaNota = `Importación automática desde MP. Período: ${fmtDesde} → ${fmtHasta}`;
        const cajaResult = await db.query(insertCaja, [numeroCaja, cajaNombre, usuarioId, cajaNota, dateFrom]);
        cajaId = cajaResult.insertId;

        send({ type: 'status', message: `📦 Caja #${numeroCaja} creada: ${cajaNombre}` });
        send({ type: 'status', message: `📅 Período: ${fmtDesde} → ${fmtHasta}` });
        send({ type: 'status', message: `📄 Máx páginas: ${maxPaginas}` });

        const { scrapeActivityAllPages } = require('../services/activityService');

        const scrapingResult = await scrapeActivityAllPages(mpPage, parseInt(maxPaginas), (event) => {
            send(event);
            // Loguear las transacciones en el backend también (no sólo enviarlas al cliente)
            if (event.type === 'page_done' && event.transactions && Array.isArray(event.transactions)) {
                console.log(`[🕷️  SCRAPER] ━━━ Página ${event.page}/${event.total || '?'} ━━━`);
                console.log(`[🕷️  SCRAPER] 📄 Página ${event.page}: ${event.count} transacciones (total: ${event.total})`);
                event.transactions.forEach(tx => {
                    if (tx) {
                        const fecha = tx.dateTime ? new Date(tx.dateTime).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }) : '?';
                        const hora = tx.dateTime ? new Date(tx.dateTime).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: true }) : '?';
                        const monto = typeof tx.amount === 'string' ? tx.amount : (tx.amount ? `$${tx.amount}` : '?');
                        const title = (tx.title || 'sin descripción').substring(0, 40);
                        console.log(`[🕷️  SCRAPER] ↳ ${fecha}, ${hora} | ${title} | ${monto}`);
                    }
                });
            }
        });

        const { transactions, totalPages, totalCount } = scrapingResult;

        console.log(`\n[cajasController] 📊 FILTRADO POR FECHA:`);
        console.log(`[cajasController] Total transacciones scrapeadas: ${transactions.length}`);
        console.log(`[cajasController] Período: ${dateFrom.toISOString()} → ${dateTo.toISOString()}`);

        const filteredTransactions = transactions.filter(tx => {
            const rawDate = tx.dateTime || tx.creationDate || tx.grouperDate?.value;
            if (!rawDate) return false;
            const txDateTime = new Date(rawDate);
            if (isNaN(txDateTime)) return false;
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

        const newTransactions = transactionsWithIds.filter(tx => {
            const ref = `MP-${tx.id}`;
            const isDuplicate = existingRefs.has(ref);
            if (isDuplicate && filteredTransactions.indexOf(tx) < 3) {
                console.log(`[cajasController] 🔁 DUP: ${ref} (${(tx.title || 'sin título').substring(0, 40)})`);
            }
            return !isDuplicate;
        });
        console.log(`[cajasController] 📌 Nuevas transacciones para importar: ${newTransactions.length}`);

        let importedCount = 0;
        let failedCount = 0;
        let totalMonto = 0;

        console.log(`[cajasController] 💾 IMPORTANDO ${newTransactions.length} transacciones a BD...`);

        for (const tx of newTransactions) {
            try {
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

                const createdAt = new Date(tx.dateTime || tx.creationDate || new Date())
                    .toISOString().slice(0, 19).replace('T', ' ');

                // Log each transaction
                if (importedCount < 5) {
                    console.log(`[cajasController] [${importedCount + 1}] ${tipo.toUpperCase()}: $${monto} | ${(tx.title || 'sin título').substring(0, 50)} | fecha: ${createdAt}`);
                }

                await db.query(
                    `INSERT IGNORE INTO movimientos_caja
                    (id_caja, tipo, categoria, subcategoria, descripcion, monto, metodo_pago, comprobante_ref, usuario_id, creado_en)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [cajaId, tipo, 'mercadopago', tx.category || 'otros',
                        tx.description || tx.title || 'Transacción MP',
                        monto, 'otro', `MP-${tx.id}`, usuarioId, createdAt]
                );

                if (tipo === 'ingreso') totalMonto += monto;
                else totalMonto -= monto;

                importedCount++;
                send({ type: 'imported', tx: { id: tx.id, tipo, monto, title: tx.title, createdAt } });
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
            `UPDATE cajas SET estado = 'cerrada', saldo_final = ?, fecha_cierre = ?, usuario_cierre_id = ?,
             notas_cierre = 'Cerrada automáticamente al finalizar importación'
             WHERE id = ?`,
            [saldoFinal, dateTo, usuarioId, cajaId]
        );

        send({ type: 'status', message: `📦 Caja #${numeroCaja} cerrada. Saldo: $${saldoFinal.toLocaleString('es-AR')}` });

        end({
            type: 'done',
            imported: importedCount,
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
                `UPDATE cajas SET estado = 'cerrada', saldo_final = 0, fecha_cierre = NOW(),
                 notas_cierre = 'Error durante importación: ${err.message.substring(0, 100)}'
                 WHERE id = ?`,
                [cajaId]
            ).catch(() => { });
        }
        end({ type: 'error', message: err.message });
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
    actualizarNombreCaja,
    importarMovimientosMPCaja,
    importarMovimientosRetroactivos,
    importarRetroactivosStream,
    importarAutoStream,
    pausarRefreshMP
};
