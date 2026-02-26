// backend/controllers/solicitudFechaBandaController.js
// Controlador para gestión de solicitudes de fechas/shows de bandas

const pool = require('../db');
const { logVerbose, logError, logSuccess, logWarning } = require('../lib/debugFlags');
const { getOrCreateClient } = require('../lib/clients');
const { tryRecoverFlyerUrl } = require('./uploadsController');

/**
 * POST /api/solicitudes-fechas-bandas
 * Crear una nueva solicitud de fecha/show de banda
 */
const crearSolicitudFechaBanda = async (req, res) => {
    logVerbose('[FECHA_BANDA] POST - Crear solicitud de fecha');
    logVerbose('[FECHA_BANDA] Body:', JSON.stringify(req.body, null, 2));

    const {
        id_banda,
        nombre_banda, // Alternativa si la banda no existe en catálogo
        genero_musical,
        contacto_nombre,
        contacto_email,
        contacto_telefono,
        fecha_evento,
        hora_evento,
        duracion,
        descripcion,
        precio_basico,
        precio_puerta,
        expectativa_publico,
        cantidad_bandas,
        bandas_json,
        invitadas_json  // ← Aceptar ambas para compatibilidad
    } = req.body;

    // Usar invitadas_json si se envía en lugar de bandas_json (compatibilidad de transición)
    const gandasArrayParaGuardarEnPOST = bandas_json || invitadas_json;

    // Validar campos obligatorios
    if (!fecha_evento) {
        return res.status(400).json({ error: 'La fecha del evento es obligatoria.' });
    }

    if (!id_banda && !nombre_banda) {
        return res.status(400).json({ error: 'Debe proporcionar id_banda o nombre_banda.' });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        // 1. Crear o vincular cliente
        const clienteId = await getOrCreateClient(conn, {
            nombre: contacto_nombre,
            telefono: contacto_telefono,
            email: contacto_email
        });

        logVerbose(`[FECHA_BANDA] Cliente creado/vinculado: ${clienteId}`);

        // 2. Crear solicitud padre (tabla solicitudes)
        const sqlSolicitud = `
            INSERT INTO solicitudes (
                categoria,
                id_cliente,
                estado,
                descripcion,
                fecha_creacion,
                url_flyer
            ) VALUES ('BANDA', ?, 'Solicitado', ?, NOW(), ?)
        `;

        const resultSolicitud = await conn.query(sqlSolicitud, [
            clienteId,
            descripcion || '',
            req.body.url_flyer || null
        ]);

        const solicitudId = Number(resultSolicitud.insertId);

        logVerbose(`[FECHA_BANDA] Solicitud creada: ${solicitudId}`);

        // 3. Obtener o crear banda en bandas_artistas
        let bandaId = id_banda ? parseInt(id_banda, 10) : null;

        if (!bandaId && nombre_banda) {
            // Verificar si ya existe una banda con ese nombre
            const [bandaExistente] = await conn.query(
                'SELECT id_banda FROM bandas_artistas WHERE LOWER(nombre) = LOWER(?)',
                [nombre_banda.trim()]
            );

            if (bandaExistente) {
                bandaId = bandaExistente.id_banda;
                logVerbose(`[FECHA_BANDA] Banda encontrada en catálogo: ${bandaId}`);
            } else {
                // Crear banda nueva en el catálogo
                const sqlBandaNueva = `
                    INSERT INTO bandas_artistas (
                        nombre,
                        genero_musical,
                        contacto_nombre,
                        contacto_email,
                        contacto_telefono,
                        verificada,
                        activa,
                        creado_en
                    ) VALUES (?, ?, ?, ?, ?, 0, 1, NOW())
                `;

                const resultBandaNueva = await conn.query(sqlBandaNueva, [
                    nombre_banda.trim(),
                    genero_musical || null,
                    contacto_nombre || null,
                    contacto_email || null,
                    contacto_telefono || null
                ]);

                bandaId = Number(resultBandaNueva.insertId);
                logVerbose(`[FECHA_BANDA] Banda nueva creada: ${bandaId}`);
            }
        }

        // 4. Construir bandas_json desde banda principal + invitadas
        // ✅ NUEVA LÓGICA: bandas_json es la única fuente de verdad
        // Estructura: [{id_banda, nombre, orden_show, es_principal}, ...]
        let bandasArray = [];

        // Si bandas_json viene COMPLETO (con principal), usarlo directamente
        if (bandas_json && Array.isArray(bandas_json) && bandas_json.length > 0 && bandas_json.some(b => b.es_principal === true)) {
            bandasArray = bandas_json.map((b, idx) => ({
                id_banda: b.id_banda || b.id || null,
                nombre: b.nombre || '',
                orden_show: b.orden_show ?? idx,
                es_principal: b.es_principal === true
            }));
            logVerbose(`[FECHA_BANDA] POST: bandas_json COMPLETO recibido: ${bandasArray.length} bandas`);
        } else {
            // Si no viene bandas_json completo, construir desde id_banda + bandas_json parcial
            if (bandaId) {
                // Obtener nombre de la banda desde bandas_artistas
                const [bandaPrincipal] = await conn.query(
                    'SELECT id_banda, nombre FROM bandas_artistas WHERE id_banda = ?',
                    [bandaId]
                );

                if (bandaPrincipal) {
                    bandasArray.push({
                        id_banda: bandaPrincipal.id_banda,
                        nombre: bandaPrincipal.nombre,
                        orden_show: 0,
                        es_principal: true
                    });
                }
            }

            // Agregar bandas invitadas si existen (bandas_json parcial o gandasArrayParaGuardarEnPOST)
            const invitadas = bandas_json || gandasArrayParaGuardarEnPOST;
            if (invitadas && Array.isArray(invitadas)) {
                invitadas.forEach((banda, idx) => {
                    bandasArray.push({
                        id_banda: banda.id_banda || banda.id || null,
                        nombre: banda.nombre || '',
                        orden_show: idx + 1,
                        es_principal: false
                    });
                });
            }
        }

        // 4. Crear registro en solicitudes_fechas_bandas
        const sqlFechaBanda = `
            INSERT INTO solicitudes_fechas_bandas (
                id_solicitud,
                fecha_evento,
                hora_evento,
                duracion,
                descripcion,
                precio_basico,
                precio_puerta,
                expectativa_publico,
                cantidad_bandas,
                bandas_json,
                estado,
                creado_en,
                actualizado_en
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Solicitado', NOW(), NOW())
        `;

        const paramsFechaBanda = [
            solicitudId,
            fecha_evento,
            hora_evento || '21:00',
            duracion || null,
            descripcion || '',
            parseFloat(precio_basico) || 0,
            precio_puerta ? parseFloat(precio_puerta) : null,
            expectativa_publico || null,
            bandasArray.length,
            bandasArray.length > 0 ? JSON.stringify(bandasArray) : null
        ];

        await conn.query(sqlFechaBanda, paramsFechaBanda);

        logVerbose(`[FECHA_BANDA] Fecha/show creada para solicitud: ${solicitudId}`);

        await conn.commit();

        logVerbose(`[FECHA_BANDA] ✓ Solicitud de fecha creada exitosamente`);

        return res.status(201).json({
            solicitudId,
            bandaId,
            message: 'Solicitud de fecha creada exitosamente.'
        });

    } catch (err) {
        if (conn) await conn.rollback();
        logError('[FECHA_BANDA] Error al crear solicitud:', err.message);
        return res.status(500).json({ error: 'Error al crear solicitud de fecha.' });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * GET /api/solicitudes-fechas-bandas/:id
 * Obtener una solicitud de fecha específica con detalles completos
 */
const obtenerSolicitudFechaBanda = async (req, res) => {
    const { id } = req.params;
    logVerbose(`[FECHA_BANDA] GET - Obtener solicitud ID: ${id}`);

    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) {
        return res.status(400).json({ error: 'ID inválido.' });
    }

    let conn;
    try {
        conn = await pool.getConnection();

        // ✅ B3 ARCHITECTURE: Single Source of Truth
        // - Precios: SOLO desde solicitudes_fechas_bandas
        // - Bandas: SOLO desde bandas_json (not denormalized join)
        // - Cliente: FK only (id_cliente, no nested data)
        const sql = `
            SELECT
                sfb.id_solicitud,
                sfb.fecha_evento,
                sfb.hora_evento,
                sfb.duracion,
                sfb.descripcion,
                sfb.id_evento_generado,
                sfb.estado,
                sfb.fecha_alternativa,
                sfb.notas_admin,
                sfb.creado_en,
                sfb.actualizado_en,
                sfb.expectativa_publico,
                s.descripcion_corta AS nombre_evento,
                s.categoria,
                s.es_publico,
                s.id_cliente,
                COALESCE(ec.url_flyer, s.url_flyer) as url_flyer,
                sfb.precio_anticipada,
                sfb.precio_puerta,
                sfb.bandas_json
            FROM solicitudes_fechas_bandas sfb
            JOIN solicitudes s ON sfb.id_solicitud = s.id
            LEFT JOIN eventos_confirmados ec ON ec.id_solicitud = sfb.id_solicitud AND ec.tipo_evento = 'BANDA'
            WHERE sfb.id_solicitud = ?
        `;

        const [solicitud] = await conn.query(sql, [idNum]);

        if (!solicitud) {
            logWarning(`[FECHA_BANDA] Solicitud no encontrada: ${idNum}`);
            return res.status(404).json({ error: 'Solicitud no encontrada.' });
        }

        // ✅ Parsear bandas_json a array (si es string)
        if (solicitud.bandas_json && typeof solicitud.bandas_json === 'string') {
            try {
                solicitud.bandas_json = JSON.parse(solicitud.bandas_json);
            } catch (e) {
                logWarning(`[FECHA_BANDA] Error parseando bandas_json a JSON:`, e.message);
                solicitud.bandas_json = [];
            }
        } else if (!solicitud.bandas_json) {
            solicitud.bandas_json = [];
        }

        // ✅ cantidad_bandas es CALCULADO frontend-side (not denormalized)
        solicitud.cantidad_bandas = Array.isArray(solicitud.bandas_json) ? solicitud.bandas_json.length : 0;

        // ✅ AUTO-RECUPERACIÓN: Si url_flyer es NULL, intentar recuperar del disco
        if (!solicitud.url_flyer) {
            const recoveredUrl = tryRecoverFlyerUrl(solicitud.id_solicitud);
            if (recoveredUrl) {
                solicitud.url_flyer = recoveredUrl;
                logVerbose(`[FECHA_BANDA] ℹ url_flyer auto-recuperada para solicitud ${solicitud.id_solicitud}`);
            }
        }

        logVerbose(`[FECHA_BANDA] ✓ Solicitud #${solicitud.id_solicitud} obtenida - id_cliente: ${solicitud.id_cliente}, bandas: ${solicitud.cantidad_bandas}`);

        return res.status(200).json(solicitud);

    } catch (err) {
        logError('[FECHA_BANDA] Error al obtener solicitud:', err.message);
        logError('[FECHA_BANDA] Stack:', err.stack);
        logError('[FECHA_BANDA] Detalles:', JSON.stringify({ idNum, message: err.message }, null, 2));
        return res.status(500).json({ error: 'Error al obtener solicitud.', debug: err.message });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * GET /api/solicitudes-fechas-bandas
 * Obtener lista de solicitudes de fechas (con filtros)
 */
const listarSolicitudesFechasBandas = async (req, res) => {
    logVerbose('[FECHA_BANDA] GET - Listar solicitudes de fechas');

    const { estado, fecha_desde, fecha_hasta, ordenar_por, limit } = req.query;

    let conn;
    try {
        conn = await pool.getConnection();

        let sql = `
            SELECT
                sfb.id_solicitud,
                sfb.fecha_evento,
                sfb.hora_evento,
                sfb.duracion,
                sfb.descripcion,
                sfb.precio_anticipada,
                sfb.precio_puerta,
                sfb.estado,
                sfb.expectativa_publico,
                sfb.bandas_json,
                s.descripcion_corta AS nombre_evento,
                s.id_cliente,
                sfb.creado_en
            FROM solicitudes_fechas_bandas sfb
            JOIN solicitudes s ON sfb.id_solicitud = s.id
            WHERE 1=1
        `;

        const params = [];

        // Filtro por estado
        if (estado) {
            sql += ' AND sfb.estado = ?';
            params.push(estado);
        }

        // Filtro por rango de fechas
        if (fecha_desde) {
            sql += ' AND sfb.fecha_evento >= ?';
            params.push(fecha_desde);
        }
        if (fecha_hasta) {
            sql += ' AND sfb.fecha_evento <= ?';
            params.push(fecha_hasta);
        }

        // Ordenamiento
        const ordenValido = ['fecha_evento', 'creado_en', '-fecha_evento', '-creado_en'];
        const ordenFinal = ordenValido.includes(ordenar_por) ? ordenar_por : 'fecha_evento';

        if (ordenFinal.startsWith('-')) {
            sql += ` ORDER BY ${ordenFinal.substring(1)} DESC`;
        } else {
            sql += ` ORDER BY ${ordenFinal} ASC`;
        }

        // Límite
        const limitNum = Math.min(parseInt(limit) || 50, 500);
        sql += ` LIMIT ${limitNum}`;

        const solicitudes = await conn.query(sql, params);

        // ✅ Parsear bandas_json para cada solicitud y limpiar campos denormalizados
        const result = solicitudes.map(s => {
            // Limpiar campos denormalizados que no debería haber
            delete s.cliente_nombre;
            delete s.cliente_email;
            delete s.cliente_telefono;
            delete s.banda_id;
            delete s.banda_nombre;
            delete s.genero_musical;
            delete s.logo_url;
            delete s.instagram;
            delete s.facebook;
            delete s.youtube;
            delete s.spotify;
            delete s.precio_base;
            delete s.precio_puerta_propuesto;
            delete s.invitadas;

            // Parsear bandas_json
            if (s.bandas_json && typeof s.bandas_json === 'string') {
                try {
                    s.bandas_json = JSON.parse(s.bandas_json);
                } catch (e) {
                    logWarning(`[FECHA_BANDA] Error parseando bandas_json para id=${s.id_solicitud}:`, e.message);
                    s.bandas_json = [];
                }
            } else if (!s.bandas_json) {
                s.bandas_json = [];
            }

            // Calcular cantidad_bandas
            s.cantidad_bandas = s.bandas_json && Array.isArray(s.bandas_json)
                ? s.bandas_json.length
                : 0;

            // ✅ AUTO-RECUPERACIÓN: Si url_flyer es NULL, intentar recuperar del disco
            if (!s.url_flyer) {
                const recoveredUrl = tryRecoverFlyerUrl(s.id_solicitud);
                if (recoveredUrl) {
                    s.url_flyer = recoveredUrl;
                }
            }

            return s;
        });

        logVerbose(`[FECHA_BANDA] ✓ ${result.length} solicitudes encontradas`);

        return res.status(200).json(result);

    } catch (err) {
        logError('[FECHA_BANDA] Error al listar solicitudes:', err.message);
        return res.status(500).json({ error: 'Error al listar solicitudes.' });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * PUT /api/solicitudes-fechas-bandas/:id
 * Actualizar una solicitud de fecha
 */
const actualizarSolicitudFechaBanda = async (req, res) => {
    const { id } = req.params;
    logVerbose(`[FECHA_BANDA] PUT - Actualizar solicitud ID: ${id}`);
    logVerbose('[FECHA_BANDA] Body completo:', JSON.stringify(req.body, null, 2));

    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) {
        return res.status(400).json({ error: 'ID inválido.' });
    }

    const {
        id_banda,
        fecha_evento,
        hora_evento,
        duracion,
        descripcion,
        precio_anticipada,
        precio_puerta,
        expectativa_publico,
        cantidad_bandas,
        bandas_json,
        invitadas_json,  // ← Aceptar para compatibilidad de transición
        estado,
        fecha_alternativa,
        notas_admin,
        url_flyer,
        es_publico,
        id_cliente,  // ← Agregar id_cliente para actualizar tabla padre
        // contacto_*: permitir actualizar datos de cliente desde el formulario
        contacto_nombre,
        contacto_email,
        contacto_telefono
    } = req.body;

    logVerbose('[FECHA_BANDA] Parámetros desestructurados:');
    logVerbose('  id_banda:', id_banda);
    logVerbose('  id_cliente:', id_cliente);
    logVerbose('  precio_anticipada:', precio_anticipada);
    logVerbose('  precio_puerta:', precio_puerta);
    logVerbose('  bandas_json:', bandas_json);
    logVerbose('  invitadas_json:', invitadas_json);
    // Usar invitadas_json si se envía en lugar de bandas_json (compatibilidad de transición)
    const gandasArrayParaGuardar = bandas_json || invitadas_json;
    logVerbose('  gandasArrayParaGuardar:', gandasArrayParaGuardar);
    logVerbose('  gandasArrayParaGuardar type:', typeof gandasArrayParaGuardar);
    logVerbose('  es Array?:', Array.isArray(gandasArrayParaGuardar));
    logVerbose('[FECHA_BANDA] Body completo para debugging:', JSON.stringify(req.body, null, 2));

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        // Verificar que la solicitud existe
        const [solicitudExistente] = await conn.query(
            'SELECT id_solicitud FROM solicitudes_fechas_bandas WHERE id_solicitud = ?',
            [idNum]
        );

        if (!solicitudExistente) {
            return res.status(404).json({ error: 'Solicitud no encontrada.' });
        }

        // Si viene nombre/descripcion corta del evento, guardarla en la fila padre `solicitudes` (titulo visible)
        if (typeof req.body.descripcion_corta !== 'undefined' || typeof req.body.nombre_evento !== 'undefined') {
            const nuevoNombre = req.body.descripcion_corta || req.body.nombre_evento || null;
            await conn.query('UPDATE solicitudes SET descripcion_corta = ? WHERE id_solicitud = ?', [nuevoNombre, idNum]);
            logVerbose(`[FECHA_BANDA] solicitudes.descripcion_corta actualizado para id=${idNum} -> "${nuevoNombre}"`);
        }

        // Si vienen campos de contacto, actualizarlos en `clientes` (o crearlos) y propagar a eventos_confirmados
        if (typeof contacto_nombre !== 'undefined' || typeof contacto_email !== 'undefined' || typeof contacto_telefono !== 'undefined') {
            // Obtener id_cliente desde la tabla padre `solicitudes`
            const [parentRow] = await conn.query('SELECT id_cliente FROM solicitudes WHERE id_solicitud = ?', [idNum]);
            const clienteId = parentRow && parentRow.id_cliente ? parentRow.id_cliente : null;

            if (clienteId) {
                const clientUpdates = [];
                const clientParams = [];
                if (typeof contacto_nombre !== 'undefined') { clientUpdates.push('nombre = ?'); clientParams.push(contacto_nombre); }
                if (typeof contacto_email !== 'undefined') { clientUpdates.push('email = ?'); clientParams.push(contacto_email); }
                if (typeof contacto_telefono !== 'undefined') { clientUpdates.push('telefono = ?'); clientParams.push(contacto_telefono); }

                if (clientUpdates.length) {
                    clientParams.push(clienteId);
                    try {
                        await conn.query(`UPDATE clientes SET ${clientUpdates.join(', ')} WHERE id_cliente = ?`, clientParams);
                        logVerbose(`[FECHA_BANDA] Cliente id=${clienteId} actualizado desde PUT solicitud ${idNum}`);
                    } catch (err) {
                        // Si el UPDATE falla por email duplicado, intentar ligar la solicitud al cliente existente con ese email
                        if (err && err.errno === 1062 && contacto_email) {
                            const [existing] = await conn.query('SELECT id_cliente FROM clientes WHERE email = ?', [contacto_email]);
                            if (existing && existing.id_cliente && existing.id_cliente !== clienteId) {
                                await conn.query('UPDATE solicitudes SET id_cliente = ? WHERE id_solicitud = ?', [existing.id_cliente, idNum]);
                                logVerbose(`[FECHA_BANDA] Cliente conflict (email existente). Solicitud ${idNum} ligada a cliente id=${existing.id_cliente}`);
                            } else {
                                // No podemos resolver el conflicto automáticamente
                                throw err;
                            }
                        } else {
                            throw err;
                        }
                    }
                }
            } else {
                // No hay cliente asociado: crear uno y ligar a la solicitud padre
                const newClienteId = await getOrCreateClient(conn, {
                    nombre: contacto_nombre || null,
                    telefono: contacto_telefono || null,
                    email: contacto_email || null
                });
                await conn.query('UPDATE solicitudes SET id_cliente = ? WHERE id_solicitud = ?', [newClienteId, idNum]);
                logVerbose(`[FECHA_BANDA] Nuevo cliente id=${newClienteId} ligado a solicitud ${idNum}`);
            }

            // No se propagan campos de contacto a eventos_confirmados: ahora usamos id_cliente en la tabla
            // Si hubo cambios de contacto (getOrCreateClient arriba los actualizó en clientes), no hacemos nada extra aquí.
        }

        // Construir UPDATE dinámico
        const actualizaciones = [];
        const params = [];

        // Declarar bandasActual en scope de función para usar en sincronización
        let bandasActual = [];

        // ✅ REFACTORIZACIÓN: Construir bandas_json cuando viene id_banda o bandas_json/invitadas_json
        if (id_banda !== undefined || gandasArrayParaGuardar !== undefined) {
            // Obtener bandas_json actual para preservar datos no modificados
            const [currentRecord] = await conn.query(
                'SELECT bandas_json FROM solicitudes_fechas_bandas WHERE id_solicitud = ?',
                [idNum]
            );
            if (currentRecord && currentRecord.bandas_json) {
                try {
                    bandasActual = JSON.parse(currentRecord.bandas_json);
                } catch (e) {
                    bandasActual = [];
                }
            }

            // ✅ NUEVA LÓGICA: bandas_json es la ÚNICA fuente de verdad
            // Si viene bandas_json COMPLETO (con principal + invitadas), usarlo directamente
            if (bandas_json !== undefined && Array.isArray(bandas_json) && bandas_json.length > 0) {
                // Verificar si contiene una banda marcada como principal
                const tienePrincipal = bandas_json.some(b => b.es_principal === true);

                if (tienePrincipal) {
                    // bandas_json está COMPLETO: principal + invitadas
                    // Usarlo como está, es la nueva fuente de verdad
                    bandasActual = bandas_json.map((b, idx) => ({
                        id_banda: b.id_banda || b.id || null,
                        nombre: b.nombre || '',
                        orden_show: b.orden_show ?? idx,
                        es_principal: b.es_principal === true
                    }));
                    logVerbose(`[FECHA_BANDA] bandas_json COMPLETO recibido: ${bandasActual.length} bandas (incluye principal)`);
                } else {
                    // bandas_json solo contiene invitadas (sin principal)
                    // Combinar con banda principal existente o nueva
                    bandasActual = bandasActual.filter(b => b.es_principal === true);
                    bandas_json.forEach((banda, idx) => {
                        bandasActual.push({
                            id_banda: banda.id_banda || banda.id || null,
                            nombre: banda.nombre || '',
                            orden_show: idx + 1,
                            es_principal: false
                        });
                    });
                    logVerbose(`[FECHA_BANDA] bandas_json PARCIAL recibido: ${bandas_json.length} invitadas + principal existente`);
                }
            } else if (gandasArrayParaGuardar !== undefined && Array.isArray(gandasArrayParaGuardar)) {
                // Compatibilidad: si viene invitadas_json (frontend viejo)
                // Remover invitadas anteriores
                bandasActual = bandasActual.filter(b => b.es_principal === true);

                // Agregar nuevas invitadas
                if (gandasArrayParaGuardar.length > 0) {
                    gandasArrayParaGuardar.forEach((banda, idx) => {
                        bandasActual.push({
                            id_banda: banda.id_banda,
                            nombre: banda.nombre || '',
                            orden_show: idx + 1,
                            es_principal: false
                        });
                    });
                }
                logVerbose(`[FECHA_BANDA] invitadas_json PARCIAL recibido: ${gandasArrayParaGuardar.length} invitadas`);
            }

            // Si viene id_banda SEPARADO, actualizar banda principal (compatibilidad)
            if (id_banda !== undefined && (!bandas_json || !Array.isArray(bandas_json) || !bandas_json.some(b => b.es_principal === true))) {
                // Solo aplicar si bandas_json no existe, no es array, o no tiene una principal
                bandasActual = bandasActual.filter(b => !b.es_principal);

                if (id_banda) {
                    const [bandaInfo] = await conn.query(
                        'SELECT id_banda, nombre FROM bandas_artistas WHERE id_banda = ?',
                        [id_banda]
                    );
                    if (bandaInfo) {
                        bandasActual.unshift({
                            id_banda: bandaInfo.id_banda,
                            nombre: bandaInfo.nombre,
                            orden_show: 0,
                            es_principal: true
                        });
                    }
                }
                logVerbose(`[FECHA_BANDA] Banda principal actualizada (compatibilidad): ${id_banda}`);
            }

            // Persistir bandas_json actualizado
            actualizaciones.push('bandas_json = ?');
            params.push(bandasActual.length > 0 ? JSON.stringify(bandasActual) : null);

            // También actualizar cantidad_bandas automáticamente
            actualizaciones.push('cantidad_bandas = ?');
            params.push(bandasActual.length);
        }

        if (fecha_evento !== undefined) {
            actualizaciones.push('fecha_evento = ?');
            params.push(fecha_evento);
        }
        if (hora_evento !== undefined) {
            actualizaciones.push('hora_evento = ?');
            params.push(hora_evento);
        }
        if (duracion !== undefined) {
            actualizaciones.push('duracion = ?');
            params.push(duracion);
        }
        if (descripcion !== undefined) {
            actualizaciones.push('descripcion = ?');
            params.push(descripcion);
        }
        // ✅ B3: Precios desde solicitudes_fechas_bandas (ÚNICA fuente de verdad)
        if (precio_anticipada !== undefined) {
            actualizaciones.push('precio_anticipada = ?');
            params.push(precio_anticipada ? parseFloat(precio_anticipada) : null);
        }
        if (precio_puerta !== undefined) {
            actualizaciones.push('precio_puerta = ?');
            params.push(precio_puerta ? parseFloat(precio_puerta) : null);
        }

        if (expectativa_publico !== undefined) {
            actualizaciones.push('expectativa_publico = ?');
            params.push(expectativa_publico);
        }
        // NOTA: cantidad_bandas ya fue actualizado arriba si bandas_json cambió
        if (cantidad_bandas !== undefined && id_banda === undefined && gandasArrayParaGuardar === undefined) {
            actualizaciones.push('cantidad_bandas = ?');
            params.push(cantidad_bandas ? parseInt(cantidad_bandas, 10) : 1);
        }
        if (estado !== undefined) {
            // Sólo admin/staff puede cambiar el estado a 'Confirmado'
            if (String(estado) === 'Confirmado') {
                const rol = req.user && (req.user.role || (req.user.roles && req.user.roles[0]));
                const nivel = req.user && req.user.nivel;
                if (!(rol === 'admin' || rol === 'staff' || (nivel && nivel >= 50))) {
                    logWarning(`[FECHA_BANDA] Intento de cambiar estado a 'Confirmado' por usuario no-admin (user=${req.user && req.user.id})`);
                    return res.status(403).json({ error: 'Sólo administrador puede confirmar solicitudes.' });
                }
            }
            actualizaciones.push('estado = ?');
            params.push(estado);
        }
        if (fecha_alternativa !== undefined) {
            actualizaciones.push('fecha_alternativa = ?');
            params.push(fecha_alternativa);
        }
        if (notas_admin !== undefined) {
            actualizaciones.push('notas_admin = ?');
            params.push(notas_admin);
        }
        // url_flyer se guarda en la tabla padre 'solicitudes', no en solicitudes_fechas_bandas
        let urlFlyerPendiente = null;
        if (url_flyer !== undefined) {
            const flyerLen = url_flyer ? url_flyer.length : 0;
            logVerbose(`[FECHA_BANDA] url_flyer length: ${flyerLen}`);
            // Rechazar payloads excesivamente grandes y sugerir la API de uploads
            if (flyerLen > 1_000_000) {
                logWarning(`[FECHA_BANDA] url_flyer demasiado grande (${flyerLen} chars). Rechazando.`);
                return res.status(413).json({ error: 'Flyer demasiado grande. Suba la imagen vía /api/uploads y guarde la URL.' });
            }
            urlFlyerPendiente = url_flyer && url_flyer.trim() ? url_flyer.trim() : null;
            logVerbose(`[FECHA_BANDA] url_flyer será guardado en tabla 'solicitudes' (length=${flyerLen})`);
        }

        // NOTE: 'es_publico' ahora vive en la tabla padre `solicitudes`.
        // No intentar actualizar `solicitudes_fechas_bandas.es_publico` (columna inexistente).
        // En su lugar: marcar para actualizar la fila padre y sincronizar `eventos_confirmados`.
        let parentEsPublico = null;
        if (es_publico !== undefined) {
            parentEsPublico = es_publico ? 1 : 0;
            logVerbose(`[FECHA_BANDA] es_publico será guardado en tabla 'solicitudes':`, parentEsPublico);
        }

        // Siempre actualizar timestamp
        actualizaciones.push('actualizado_en = NOW()');

        if (actualizaciones.length > 0) {
            params.push(idNum);

            const sqlUpdate = `
                UPDATE solicitudes_fechas_bandas 
                SET ${actualizaciones.join(', ')} 
                WHERE id_solicitud = ?
            `;

            logVerbose(`[FECHA_BANDA] SQL UPDATE:`, sqlUpdate);
            logVerbose(`[FECHA_BANDA] Parámetros:`, JSON.stringify(params, null, 2));

            const result = await conn.query(sqlUpdate, params);
            logVerbose(`[FECHA_BANDA] ✓ Solicitud actualizada: ${result.affectedRows} fila(s)`);
        }

        // ✅ Opción B3: Single Source of Truth
        // Los precios viven SOLO en solicitudes_fechas_bandas
        // NO se sincronizan a eventos_confirmados (que ya no tiene campos precio_base/precio_final)
        // Si se edita el precio en solicitudes_fechas_bandas,
        // eventos_confirmado automáticamente reflejará el cambio al hacer JOIN para lecturas

        // ✅ SINCRONIZAR bandas_json CON eventos_lineup
        // Sincronizar si se recibió bandas_json (completo o parcial) o invitadas_json
        logVerbose(`[FECHA_BANDA] SINCRONIZANDO BANDAS - bandasActual: ${bandasActual.length}, gandasArrayParaGuardar: ${(gandasArrayParaGuardar && Array.isArray(gandasArrayParaGuardar) ? gandasArrayParaGuardar.length : 0)}`);

        try {
            // Extraer INVITADAS de bandasActual (bandas sin es_principal=true)
            const invitadas = bandasActual.filter(b => b.es_principal !== true);

            if ((bandas_json || gandasArrayParaGuardar) && invitadas.length > 0) {
                // Obtener el id_evento_confirmado para esta solicitud
                const [eventoRow] = await conn.query(
                    "SELECT id FROM eventos_confirmados WHERE id_solicitud = ? AND tipo_evento = 'BANDA'",
                    [idNum]
                );

                if (eventoRow && eventoRow.id) {
                    const eventoId = eventoRow.id;
                    logVerbose(`[FECHA_BANDA] Evento encontrado para solicitud ${idNum}: id=${eventoId}`);

                    // Borrar todas las invitadas EXCEPTO la banda principal (es_principal=1)
                    await conn.query(
                        `DELETE FROM eventos_lineup 
                         WHERE id_evento_confirmado = ? AND es_principal = 0 AND es_solicitante = 0`,
                        [eventoId]
                    );
                    logVerbose(`[FECHA_BANDA] Invitadas borradas de eventos_lineup para evento ${eventoId}`);

                    // Insertar nuevas bandas invitadas desde bandasActual
                    let orden = 0;
                    for (const inv of invitadas) {
                        if (inv.id_banda && inv.nombre) {
                            await conn.query(
                                `INSERT INTO eventos_lineup (id_evento_confirmado, id_banda, nombre_banda, orden_show, es_principal, es_solicitante, estado) 
                                 VALUES (?, ?, ?, ?, 0, 0, 'invitada')`,
                                [eventoId, inv.id_banda, inv.nombre, orden++]
                            );
                        }
                    }
                    logVerbose(`[FECHA_BANDA] ${invitadas.length} nuevas bandas invitadas insertadas en eventos_lineup para evento ${eventoId}`);
                } else {
                    logWarning(`[FECHA_BANDA] No existe evento_confirmado para solicitud ${idNum} - no se pueden sincronizar bandas`);
                }
            }
        } catch (e) {
            logWarning(`[FECHA_BANDA] Error sincronizando bandas con eventos_lineup:`, e.message);
            // No fallar el PUT por error en sincronización de invitadas
        }

        // Si se pidió actualizar es_publico en el PUT, persistirlo en la tabla padre `solicitudes`
        if (parentEsPublico !== null) {
            await conn.query('UPDATE solicitudes SET es_publico = ? WHERE id_solicitud = ?', [parentEsPublico, idNum]);
            logVerbose(`[FECHA_BANDA] ✓ es_publico guardado en tabla 'solicitudes' (id=${idNum} -> es_publico=${parentEsPublico})`);

            // Sincronizar valor en eventos_confirmados (si existe)
            await conn.query('UPDATE eventos_confirmados SET es_publico = ? WHERE id_solicitud = ?', [parentEsPublico, idNum]);
            logVerbose(`[FECHA_BANDA] ✓ es_publico sincronizado en 'eventos_confirmados' para solicitud ${idNum}`);
        }

        // Si se pidió actualizar id_cliente en el PUT, persistirlo en la tabla padre `solicitudes`
        if (id_cliente !== undefined && id_cliente !== null) {
            const idClienteNum = parseInt(id_cliente, 10);
            if (!isNaN(idClienteNum)) {
                await conn.query('UPDATE solicitudes SET id_cliente = ? WHERE id_solicitud = ?', [idClienteNum, idNum]);
                logVerbose(`[FECHA_BANDA] ✓ id_cliente guardado en tabla 'solicitudes' (id=${idNum} -> id_cliente=${idClienteNum})`);
            } else {
                logWarning(`[FECHA_BANDA] ⚠ id_cliente inválido recibido: ${id_cliente}`);
            }
        }
        // Si en este PUT se cambió el estado a 'Confirmado', garantizar que exista el registro en eventos_confirmados
        if (typeof estado !== 'undefined' && estado === 'Confirmado') {
            logVerbose(`[FECHA_BANDA] Estado cambiado a 'Confirmado' en PUT - verificación idempotente para id=${idNum}`);
            // Comprobar si ya existe un eventos_confirmados para esta solicitud
            const [existingEventoRow] = await conn.query(
                "SELECT id FROM eventos_confirmados WHERE id_solicitud = ? AND tipo_evento = 'BANDA'",
                [idNum]
            );

            const eventoExiste = existingEventoRow && existingEventoRow.id;
            if (eventoExiste) {
                logVerbose(`[FECHA_BANDA] Ya existe evento_confirmado (id=${existingEventoRow.id}) para solicitud ${idNum} — no se crea otro.`);
            } else {
                logVerbose(`[FECHA_BANDA] No existe evento_confirmado para solicitud ${idNum} — procediendo a crear.`);

                // Obtener datos necesarios para crear el evento_confirmado
                const [solicitudData] = await conn.query(`
                    SELECT
                        sfb.id_solicitud,
                        sfb.fecha_evento,
                        sfb.hora_evento,
                        sfb.duracion,
                        sfb.descripcion,
                        sfb.precio_basico,
                        sfb.cantidad_bandas,
                        s.descripcion_corta AS nombre_evento,
                        s.es_publico AS solicitud_es_publico,
                        ba.nombre as banda_nombre,
                        ba.genero_musical,
                        c.nombre as cliente_nombre,
                        c.email as cliente_email,
                        c.telefono as cliente_telefono
                    FROM solicitudes_fechas_bandas sfb
                    JOIN solicitudes s ON sfb.id_solicitud = s.id
                    LEFT JOIN eventos_confirmados ec ON ec.id_solicitud = sfb.id_solicitud AND ec.tipo_evento = 'BANDA'
                    LEFT JOIN eventos_lineup el_principal ON el_principal.id_evento_confirmado = ec.id AND (el_principal.es_principal = 1 OR el_principal.es_solicitante = 1)
                    LEFT JOIN bandas_artistas ba ON ba.id_banda = el_principal.id_banda
                    LEFT JOIN clientes c ON s.id_cliente = c.id_cliente
                    WHERE sfb.id_solicitud = ?
                `, [idNum]);

                if (solicitudData) {
                    const sqlEventoConfirmado = `
                        INSERT INTO eventos_confirmados (
                            id_solicitud,
                            tipo_evento,
                            tabla_origen,
                            nombre_evento,
                            descripcion,
                            fecha_evento,
                            hora_inicio,
                            duracion_estimada,
                            id_cliente,
                            genero_musical,
                            cantidad_personas,
                            es_publico,
                            activo,
                            confirmado_en
                        ) VALUES (?, 'BANDA', 'solicitudes_fechas_bandas', ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, NOW())
                    `;

                    // ✅ Opción B3: No insertar precios en eventos_confirmados
                    // Los precios viven SOLO en solicitudes_fechas_bandas (Single Source of Truth)
                    const esPublicoParaEvento = (typeof es_publico !== 'undefined') ? (es_publico ? 1 : 0) : (solicitudData.solicitud_es_publico ? 1 : 0);

                    const resultEvento = await conn.query(sqlEventoConfirmado, [
                        idNum,
                        solicitudData.banda_nombre || solicitudData.nombre_evento || 'Sin nombre',
                        solicitudData.descripcion || '',
                        solicitudData.fecha_evento,
                        solicitudData.hora_evento || '21:00',
                        solicitudData.duracion || null,
                        solicitudData.cliente_id || null,
                        solicitudData.genero_musical || solicitudData.banda_nombre || '',
                        solicitudData.cantidad_bandas || 120,
                        esPublicoParaEvento
                    ]);

                    const nuevoEventoId = Number(resultEvento.insertId);
                    logVerbose(`[FECHA_BANDA] Evento confirmado creado (id=${nuevoEventoId}) para solicitud ${idNum}`);

                    // Insertar lineup: banda principal + invitadas
                    try {
                        // Banda principal desde eventos_lineup (obtenida en el SELECT anterior)
                        await conn.query(
                            `INSERT INTO eventos_lineup (id_evento_confirmado, id_banda, nombre_banda, orden_show, es_principal, es_solicitante, estado) VALUES (?, ?, ?, 99, 1, 1, 'confirmada')`,
                            [nuevoEventoId, null, solicitudData.banda_nombre || solicitudData.nombre_evento || 'Sin nombre']
                        );

                        // ✅ invitadas_json fue removido en Phase 2 - ahora se gestiona directamente en eventos_lineup
                        logVerbose(`[FECHA_BANDA] Banda principal insertada en eventos_lineup. Invitadas se gestionan directamente en eventos_lineup.`);
                    } catch (e) {
                        logWarning(`[FECHA_BANDA] Error insertando lineup para evento ${nuevoEventoId}:`, e.message);
                    }

                    // Actualizar id_evento_generado en la solicitud
                    await conn.query('UPDATE solicitudes_fechas_bandas SET id_evento_generado = ? WHERE id_solicitud = ?', [nuevoEventoId, idNum]);
                    logVerbose(`[FECHA_BANDA] solicitudes_fechas_bandas.id_evento_generado actualizado para solicitud ${idNum} -> evento ${nuevoEventoId}`);
                } else {
                    logWarning(`[FECHA_BANDA] No se encontraron datos de solicitud para id=${idNum} al intentar crear evento_confirmado`);
                }
            }
        }
        // Guardar url_flyer en la tabla padre 'solicitudes' si está pendiente
        if (urlFlyerPendiente !== null) {
            await conn.query(
                'UPDATE solicitudes SET url_flyer = ? WHERE id_solicitud = ?',
                [urlFlyerPendiente, idNum]
            );
            logVerbose(`[FECHA_BANDA] ✓ url_flyer guardado en tabla 'solicitudes'`);
        }

        await conn.commit();

        logVerbose(`[FECHA_BANDA] ✓ Solicitud ID ${idNum} actualizada exitosamente`);

        return res.status(200).json({
            solicitudId: idNum,
            message: 'Solicitud actualizada exitosamente.'
        });

    } catch (err) {
        if (conn) await conn.rollback();
        logError('[FECHA_BANDA] Error al actualizar solicitud:', err.message);
        logError('[FECHA_BANDA] Stack:', err.stack);
        return res.status(500).json({ error: 'Error al actualizar solicitud.', debug: err.message });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * PUT /api/solicitudes-fechas-bandas/:id/confirmar
 * Confirmar una solicitud de fecha (cambiar estado y crear evento confirmado)
 */
const confirmarSolicitudFechaBanda = async (req, res) => {
    const { id } = req.params;
    logVerbose(`[FECHA_BANDA] PUT /confirmar - Confirmar solicitud ID: ${id}`);

    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) {
        return res.status(400).json({ error: 'ID inválido.' });
    }

    const { es_publico } = req.body;

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        // 1. Obtener datos de la solicitud
        const sqlSelect = `
            SELECT
                sfb.id_solicitud,
                sfb.fecha_evento,
                sfb.hora_evento,
                sfb.duracion,
                sfb.descripcion,
                sfb.precio_basico,
                ba.nombre as banda_nombre,
                c.nombre as cliente_nombre,
                c.email as cliente_email,
                c.telefono as cliente_telefono
            FROM solicitudes_fechas_bandas sfb
            JOIN solicitudes s ON sfb.id_solicitud = s.id
            LEFT JOIN bandas_artistas ba ON sfb.id_banda = ba.id_banda
            LEFT JOIN clientes c ON s.id_cliente = c.id_cliente
            WHERE sfb.id_solicitud = ?
        `;

        const [solicitudFecha] = await conn.query(sqlSelect, [idNum]);

        // Si ya existe un evento_confirmado para esta solicitud, reutilizarlo (idempotencia)
        const [existingEventoRow] = await conn.query(
            "SELECT id FROM eventos_confirmados WHERE id_solicitud = ? AND tipo_evento = 'BANDA'",
            [idNum]
        );
        logVerbose('[FECHA_BANDA] existingEventoRow (raw):', JSON.stringify(existingEventoRow));
        let eventoId = existingEventoRow && existingEventoRow.id ? existingEventoRow.id : null;

        if (eventoId) {
            logVerbose(`[FECHA_BANDA] Evento ya existe para solicitud ${idNum}: eventoId=${eventoId}. Procediendo a sincronizar lineup si hace falta.`);

            // Asegurar que el lineup tenga la banda principal y las invitadas (insertar faltantes)
            const existingLineup = await conn.query('SELECT id, id_banda, nombre_banda, es_principal, orden_show FROM eventos_lineup WHERE id_evento_confirmado = ?', [eventoId]);
            const hasPrincipal = (existingLineup || []).some(r => r.es_principal === 1 || r.es_principal === '1');

            if (!hasPrincipal) {
                await conn.query(
                    `INSERT INTO eventos_lineup (id_evento_confirmado, id_banda, nombre_banda, orden_show, es_principal, es_solicitante, estado) VALUES (?, ?, ?, 99, 1, 1, 'confirmada')`,
                    [eventoId, solicitudFecha.id_banda || null, solicitudFecha.banda_nombre || solicitudFecha.descripcion || 'Sin nombre']
                );
                logVerbose(`[FECHA_BANDA] Banda principal insertada en eventos_lineup para evento ${eventoId}`);
            }

            // Insertar invitadas faltantes (si vienen en la solicitud)
            if (solicitudFecha.invitadas_json) {
                let invitadas;
                try {
                    invitadas = JSON.parse(solicitudFecha.invitadas_json || '[]');
                } catch (e) {
                    invitadas = [];
                }

                // Re-leer lineup actual para calcular orden inicial (incluye la posible inserción de la principal)
                const freshLineupRows = await conn.query('SELECT id, id_banda, nombre_banda, es_principal, orden_show FROM eventos_lineup WHERE id_evento_confirmado = ?', [eventoId]);
                const lineupArray = Array.isArray(freshLineupRows) ? freshLineupRows : (freshLineupRows || []);

                // Calcular orden inicial (último orden existente + 1)
                const maxOrdenRow = lineupArray.reduce((acc, r) => Math.max(acc, Number(r.orden_show || 0)), 0);
                let orden = maxOrdenRow + 1;

                for (const inv of invitadas) {
                    const exists = lineupArray.some(r => (r.id_banda && inv.id_banda && Number(r.id_banda) === Number(inv.id_banda)) || (r.nombre_banda && r.nombre_banda === (inv.nombre || '')));
                    if (!exists) {
                        await conn.query(
                            `INSERT INTO eventos_lineup (id_evento_confirmado, id_banda, nombre_banda, orden_show, es_principal, es_solicitante, estado) VALUES (?, ?, ?, ?, 0, 0, 'invitada')`,
                            [eventoId, inv.id_banda || null, inv.nombre || '', orden++]
                        );
                        logVerbose(`[FECHA_BANDA] Invitada '${inv.nombre || inv.id_banda}' insertada en eventos_lineup para evento ${eventoId}`);
                    }
                }
            }

            // Asegurar id_evento_generado en la solicitud
            await conn.query('UPDATE solicitudes_fechas_bandas SET id_evento_generado = ? WHERE id_solicitud = ?', [eventoId, idNum]);

            await conn.commit();

            return res.status(200).json({ solicitudId: idNum, eventoId, message: 'Solicitud ya confirmada anteriormente; lineup sincronizado.' });
        }

        if (!solicitudFecha) {
            return res.status(404).json({ error: 'Solicitud no encontrada.' });
        }

        // 2. Actualizar estado en solicitudes_fechas_bandas
        const sqlUpdateFecha = `
            UPDATE solicitudes_fechas_bandas 
            SET estado = 'Confirmado', actualizado_en = NOW()
            WHERE id_solicitud = ?
        `;

        await conn.query(sqlUpdateFecha, [idNum]);

        // 3. Actualizar tabla solicitudes
        const sqlUpdateSolicitud = `
            UPDATE solicitudes 
            SET estado = 'Confirmado', es_publico = ?
            WHERE id = ?
        `;

        await conn.query(sqlUpdateSolicitud, [
            es_publico ? 1 : 0,
            idNum
        ]);

        // 4. Crear evento_confirmado
        const sqlEventoConfirmado = `
            INSERT INTO eventos_confirmados (
                id_solicitud,
                tipo_evento,
                tabla_origen,
                nombre_evento,
                descripcion,
                fecha_evento,
                hora_inicio,
                duracion_estimada,
                id_cliente,
                genero_musical,
                cantidad_personas,
                es_publico,
                activo,
                confirmado_en
            ) VALUES (?, 'BANDA', 'solicitudes_fechas_bandas', ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())
        `;

        // ✅ precio_final fue removido en Phase 2 - usar solo precio_basico
        const resultEvento = await conn.query(sqlEventoConfirmado, [
            idNum,
            solicitudFecha.banda_nombre || 'Sin nombre',
            solicitudFecha.descripcion || '',
            solicitudFecha.fecha_evento,
            solicitudFecha.hora_evento || '21:00',
            solicitudFecha.duracion || null,
            solicitudFecha.cliente_id || null,
            solicitudFecha.banda_nombre || '',
            solicitudFecha.cantidad_personas || 120,
            es_publico ? 1 : 0
        ]);

        eventoId = Number(resultEvento.insertId);

        // Insertar lineup: banda principal + bandas invitadas (si existen)
        try {
            // Banda principal (si existe catálogo o nombre de banda)
            await conn.query(
                `INSERT INTO eventos_lineup (id_evento_confirmado, id_banda, nombre_banda, orden_show, es_principal, es_solicitante, estado) VALUES (?, ?, ?, 99, 1, 1, 'confirmada')`,
                [eventoId, solicitudFecha.id_banda || null, solicitudFecha.banda_nombre || 'Sin nombre']
            );

            // ✅ invitadas_json fue removido en Phase 2 - ahora se gestiona a través de eventos_lineup directamente
            logVerbose(`[FECHA_BANDA] Banda principal insertada en eventos_lineup para evento ${eventoId}. Invitadas se gestionan directamente en eventos_lineup.`);
        } catch (e) {
            logWarning(`[FECHA_BANDA] Error al insertar lineup para evento ${eventoId}: ${e.message}`);
            // No abortamos la confirmación por fallo al insertar lineup; registrar y continuar
        }

        // 5. Actualizar id_evento_generado en solicitudes_fechas_bandas
        await conn.query(
            'UPDATE solicitudes_fechas_bandas SET id_evento_generado = ? WHERE id_solicitud = ?',
            [eventoId, idNum]
        );

        await conn.commit();

        logVerbose(`[FECHA_BANDA] ✓ Solicitud confirmada. Evento creado: ${eventoId}`);

        return res.status(200).json({
            solicitudId: idNum,
            eventoId,
            message: 'Solicitud confirmada y evento creado exitosamente.'
        });

    } catch (err) {
        if (conn) await conn.rollback();
        logError('[FECHA_BANDA] Error al confirmar solicitud:', err.message);
        return res.status(500).json({ error: 'Error al confirmar solicitud.' });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * DELETE /api/solicitudes-fechas-bandas/:id
 * Eliminar una solicitud de fecha
 */
const eliminarSolicitudFechaBanda = async (req, res) => {
    const { id } = req.params;
    logVerbose(`[FECHA_BANDA] DELETE - Eliminar solicitud ID: ${id}`);

    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) {
        return res.status(400).json({ error: 'ID inválido.' });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        // Verificar si ya fue confirmada (tiene evento)
        const [solicitud] = await conn.query(
            'SELECT id_evento_generado FROM solicitudes_fechas_bandas WHERE id_solicitud = ?',
            [idNum]
        );

        if (!solicitud) {
            return res.status(404).json({ error: 'Solicitud no encontrada.' });
        }

        if (solicitud.id_evento_generado) {
            logWarning(`[FECHA_BANDA] Solicitud ${idNum} tiene evento confirmado. Se eliminará tanto solicitud como evento.`);

            // Eliminar evento confirmado
            await conn.query('DELETE FROM eventos_confirmados WHERE id = ?', [solicitud.id_evento_generado]);
        }

        // Eliminar solicitud de fecha
        await conn.query('DELETE FROM solicitudes_fechas_bandas WHERE id_solicitud = ?', [idNum]);

        // Eliminar solicitud padre (esto elimina en cascada)
        await conn.query('DELETE FROM solicitudes WHERE id_solicitud = ?', [idNum]);

        await conn.commit();

        logVerbose(`[FECHA_BANDA] ✓ Solicitud ID ${idNum} eliminada`);

        return res.status(200).json({
            solicitudId: idNum,
            message: 'Solicitud eliminada exitosamente.'
        });

    } catch (err) {
        if (conn) await conn.rollback();
        logError('[FECHA_BANDA] Error al eliminar solicitud:', err.message);
        return res.status(500).json({ error: 'Error al eliminar solicitud.' });
    } finally {
        if (conn) conn.release();
    }
};

module.exports = {
    crearSolicitudFechaBanda,
    obtenerSolicitudFechaBanda,
    listarSolicitudesFechasBandas,
    actualizarSolicitudFechaBanda,
    confirmarSolicitudFechaBanda,
    eliminarSolicitudFechaBanda
};
