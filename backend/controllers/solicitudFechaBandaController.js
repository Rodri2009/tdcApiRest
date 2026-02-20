// backend/controllers/solicitudFechaBandaController.js
// Controlador para gestión de solicitudes de fechas/shows de bandas

const pool = require('../db');
const { logVerbose, logError, logSuccess, logWarning } = require('../lib/debugFlags');
const { getOrCreateClient } = require('../lib/clients');

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
        precio_puerta_propuesto,
        expectativa_publico,
        cantidad_bandas,
        invitadas_json
    } = req.body;

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
                cliente_id,
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
                'SELECT id FROM bandas_artistas WHERE LOWER(nombre) = LOWER(?)',
                [nombre_banda.trim()]
            );

            if (bandaExistente) {
                bandaId = bandaExistente.id;
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

        // 4. Crear registro en solicitudes_fechas_bandas
        const sqlFechaBanda = `
            INSERT INTO solicitudes_fechas_bandas (
                id_solicitud,
                id_banda,
                fecha_evento,
                hora_evento,
                duracion,
                descripcion,
                precio_basico,
                precio_puerta_propuesto,
                expectativa_publico,
                cantidad_bandas,
                invitadas_json,
                estado,
                creado_en,
                actualizado_en
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Solicitado', NOW(), NOW())
        `;

        const paramsFechaBanda = [
            solicitudId,
            bandaId || null,
            fecha_evento,
            hora_evento || '21:00',
            duracion || null,
            descripcion || '',
            parseFloat(precio_basico) || 0,
            precio_puerta_propuesto ? parseFloat(precio_puerta_propuesto) : null,
            expectativa_publico || null,
            cantidad_bandas || 1,
            invitadas_json ? JSON.stringify(invitadas_json) : null
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

        const sql = `
            SELECT
                sfb.id_solicitud,
                sfb.id_banda,
                sfb.fecha_evento,
                sfb.hora_evento,
                sfb.duracion,
                sfb.descripcion,
                sfb.precio_basico,
                sfb.precio_final,
                sfb.id_evento_generado,
                sfb.precio_puerta_propuesto,
                sfb.cantidad_bandas,
                sfb.invitadas_json,
                sfb.estado,
                sfb.fecha_alternativa,
                sfb.notas_admin,
                sfb.creado_en,
                sfb.actualizado_en,
                -- Exponer expectativa_publico para que el frontend muestre/edite aforo
                sfb.expectativa_publico,
                -- Representar precio anticipada (frontend usa 'precio_anticipada') a partir de precio_basico
                sfb.precio_basico AS precio_anticipada,
                -- Devolver nombre corto desde la fila padre 'solicitudes' como 'nombre_evento' para la UI
                s.descripcion_corta AS nombre_evento,
                s.categoria,
                s.es_publico,
                -- Usar COALESCE: primero el de eventos_confirmados, luego el de solicitudes
                COALESCE(ec.url_flyer, s.url_flyer) as url_flyer,
                c.nombre as cliente_nombre,
                c.email as cliente_email,
                c.telefono as cliente_telefono,
                ba.id as banda_id,
                ba.nombre as banda_nombre,
                ba.genero_musical,
                ba.logo_url,
                ba.instagram,
                ba.facebook,
                ba.youtube,
                ba.spotify
            FROM solicitudes_fechas_bandas sfb
            JOIN solicitudes s ON sfb.id_solicitud = s.id
            LEFT JOIN bandas_artistas ba ON sfb.id_banda = ba.id
            LEFT JOIN clientes c ON s.cliente_id = c.id
            LEFT JOIN eventos_confirmados ec ON ec.id_solicitud = sfb.id_solicitud AND ec.tipo_evento = 'BANDA'
            WHERE sfb.id_solicitud = ?
        `;

        const [solicitud] = await conn.query(sql, [idNum]);

        if (!solicitud) {
            logWarning(`[FECHA_BANDA] Solicitud no encontrada: ${idNum}`);
            return res.status(404).json({ error: 'Solicitud no encontrada.' });
        }

        // Parsear invitadas_json si existe
        if (solicitud.invitadas_json) {
            try {
                solicitud.invitadas = JSON.parse(solicitud.invitadas_json);
            } catch (e) {
                solicitud.invitadas = [];
            }
        } else {
            solicitud.invitadas = [];
        }

        logVerbose(`[FECHA_BANDA] ✓ Solicitud obtenida`);

        return res.status(200).json(solicitud);

    } catch (err) {
        logError('[FECHA_BANDA] Error al obtener solicitud:', err.message);
        return res.status(500).json({ error: 'Error al obtener solicitud.' });
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
                sfb.id_banda,
                sfb.fecha_evento,
                sfb.hora_evento,
                sfb.duracion,
                sfb.descripcion,
                sfb.precio_basico,
                sfb.estado,
                ba.nombre as banda_nombre,
                ba.genero_musical,
                c.nombre as cliente_nombre,
                c.email as cliente_email,
                sfb.creado_en
            FROM solicitudes_fechas_bandas sfb
            LEFT JOIN bandas_artistas ba ON sfb.id_banda = ba.id
            JOIN solicitudes s ON sfb.id_solicitud = s.id
            LEFT JOIN clientes c ON s.cliente_id = c.id
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

        logVerbose(`[FECHA_BANDA] ✓ ${solicitudes.length} solicitudes encontradas`);

        return res.status(200).json(solicitudes);

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
        precio_basico,
        precio_final,
        precio_puerta_propuesto,
        expectativa_publico,
        cantidad_bandas,
        invitadas_json,
        estado,
        fecha_alternativa,
        notas_admin,
        url_flyer,
        es_publico,
        // contacto_*: permitir actualizar datos de cliente desde el formulario
        contacto_nombre,
        contacto_email,
        contacto_telefono
    } = req.body;

    logVerbose('[FECHA_BANDA] Parámetros desestructurados:');
    logVerbose('  id_banda:', id_banda);
    logVerbose('  invitadas_json:', invitadas_json);
    logVerbose('  invitadas_json type:', typeof invitadas_json);
    logVerbose('  es Array?:', Array.isArray(invitadas_json));

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
            await conn.query('UPDATE solicitudes SET descripcion_corta = ? WHERE id = ?', [nuevoNombre, idNum]);
            logVerbose(`[FECHA_BANDA] solicitudes.descripcion_corta actualizado para id=${idNum} -> "${nuevoNombre}"`);
        }

        // Si vienen campos de contacto, actualizarlos en `clientes` (o crearlos) y propagar a eventos_confirmados
        if (typeof contacto_nombre !== 'undefined' || typeof contacto_email !== 'undefined' || typeof contacto_telefono !== 'undefined') {
            // Obtener cliente_id desde la tabla padre `solicitudes`
            const [parentRow] = await conn.query('SELECT cliente_id FROM solicitudes WHERE id = ?', [idNum]);
            const clienteId = parentRow && parentRow.cliente_id ? parentRow.cliente_id : null;

            if (clienteId) {
                const clientUpdates = [];
                const clientParams = [];
                if (typeof contacto_nombre !== 'undefined') { clientUpdates.push('nombre = ?'); clientParams.push(contacto_nombre); }
                if (typeof contacto_email !== 'undefined') { clientUpdates.push('email = ?'); clientParams.push(contacto_email); }
                if (typeof contacto_telefono !== 'undefined') { clientUpdates.push('telefono = ?'); clientParams.push(contacto_telefono); }

                if (clientUpdates.length) {
                    clientParams.push(clienteId);
                    try {
                        await conn.query(`UPDATE clientes SET ${clientUpdates.join(', ')} WHERE id = ?`, clientParams);
                        logVerbose(`[FECHA_BANDA] Cliente id=${clienteId} actualizado desde PUT solicitud ${idNum}`);
                    } catch (err) {
                        // Si el UPDATE falla por email duplicado, intentar ligar la solicitud al cliente existente con ese email
                        if (err && err.errno === 1062 && contacto_email) {
                            const [existing] = await conn.query('SELECT id FROM clientes WHERE email = ?', [contacto_email]);
                            if (existing && existing.id && existing.id !== clienteId) {
                                await conn.query('UPDATE solicitudes SET cliente_id = ? WHERE id = ?', [existing.id, idNum]);
                                logVerbose(`[FECHA_BANDA] Cliente conflict (email existente). Solicitud ${idNum} ligada a cliente id=${existing.id}`);
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
                await conn.query('UPDATE solicitudes SET cliente_id = ? WHERE id = ?', [newClienteId, idNum]);
                logVerbose(`[FECHA_BANDA] Nuevo cliente id=${newClienteId} ligado a solicitud ${idNum}`);
            }

            // Propagar cambios al evento confirmado (si existe)
            const evUpdates = [];
            const evParams = [];
            if (typeof contacto_nombre !== 'undefined') { evUpdates.push('nombre_cliente = ?'); evParams.push(contacto_nombre); }
            if (typeof contacto_email !== 'undefined') { evUpdates.push('email_cliente = ?'); evParams.push(contacto_email); }
            if (typeof contacto_telefono !== 'undefined') { evUpdates.push('telefono_cliente = ?'); evParams.push(contacto_telefono); }

            if (evUpdates.length) {
                evParams.push(idNum);
                await conn.query(`UPDATE eventos_confirmados SET ${evUpdates.join(', ')} WHERE id_solicitud = ?`, evParams);
                logVerbose(`[FECHA_BANDA] eventos_confirmados sincronizado con contacto para solicitud ${idNum}`);
            }
        }

        // Construir UPDATE dinámico
        const actualizaciones = [];
        const params = [];

        if (id_banda !== undefined) {
            actualizaciones.push('id_banda = ?');
            params.push(id_banda ? parseInt(id_banda, 10) : null);
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
        if (precio_basico !== undefined) {
            actualizaciones.push('precio_basico = ?');
            params.push(parseFloat(precio_basico) || 0);
        }
        if (precio_final !== undefined) {
            actualizaciones.push('precio_final = ?');
            params.push(precio_final ? parseFloat(precio_final) : null);
        }
        if (precio_puerta_propuesto !== undefined) {
            actualizaciones.push('precio_puerta_propuesto = ?');
            params.push(precio_puerta_propuesto ? parseFloat(precio_puerta_propuesto) : null);
        }
        if (expectativa_publico !== undefined) {
            actualizaciones.push('expectativa_publico = ?');
            params.push(expectativa_publico);
        }
        if (cantidad_bandas !== undefined) {
            actualizaciones.push('cantidad_bandas = ?');
            params.push(cantidad_bandas ? parseInt(cantidad_bandas, 10) : 1);
        }
        if (invitadas_json !== undefined) {
            logVerbose(`[FECHA_BANDA] invitadas_json recibido:`, invitadas_json);
            logVerbose(`[FECHA_BANDA] invitadas_json tipo:`, typeof invitadas_json);
            logVerbose(`[FECHA_BANDA] invitadas_json es array:`, Array.isArray(invitadas_json));
            if (Array.isArray(invitadas_json)) {
                logVerbose(`[FECHA_BANDA] invitadas_json cantidad de elementos:`, invitadas_json.length);
                invitadas_json.forEach((inv, idx) => {
                    logVerbose(`[FECHA_BANDA]   invitada[${idx}]:`, JSON.stringify(inv));
                });
            }
            const jsonString = invitadas_json ? JSON.stringify(invitadas_json) : null;
            logVerbose(`[FECHA_BANDA] invitadas_json stringificado:`, jsonString);
            actualizaciones.push('invitadas_json = ?');
            params.push(jsonString);
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

            // Verificación POST-actualización: leer recurso actualizado
            const [verifyRow] = await conn.query(
                'SELECT id_solicitud, id_banda, invitadas_json FROM solicitudes_fechas_bandas WHERE id_solicitud = ?',
                [idNum]
            );
            if (verifyRow) {
                logVerbose(`[FECHA_BANDA] ✓ Verificación POST-UPDATE:`);
                logVerbose(`[FECHA_BANDA]   id_solicitud:`, verifyRow.id_solicitud);
                logVerbose(`[FECHA_BANDA]   id_banda:`, verifyRow.id_banda);
                logVerbose(`[FECHA_BANDA]   invitadas_json (raw):`, verifyRow.invitadas_json);
                if (verifyRow.invitadas_json) {
                    try {
                        const parsed = JSON.parse(verifyRow.invitadas_json);
                        logVerbose(`[FECHA_BANDA]   invitadas_json (parsed):`, JSON.stringify(parsed, null, 2));
                        logVerbose(`[FECHA_BANDA]   cantidad de invitadas:`, Array.isArray(parsed) ? parsed.length : 'NO ES ARRAY');
                    } catch (e) {
                        logVerbose(`[FECHA_BANDA]   Error parsing invitadas_json:`, e.message);
                    }
                }
            }
        }

        // Si se pidió actualizar es_publico en el PUT, persistirlo en la tabla padre `solicitudes`
        if (parentEsPublico !== null) {
            await conn.query('UPDATE solicitudes SET es_publico = ? WHERE id = ?', [parentEsPublico, idNum]);
            logVerbose(`[FECHA_BANDA] ✓ es_publico guardado en tabla 'solicitudes' (id=${idNum} -> es_publico=${parentEsPublico})`);

            // Sincronizar valor en eventos_confirmados (si existe)
            await conn.query('UPDATE eventos_confirmados SET es_publico = ? WHERE id_solicitud = ?', [parentEsPublico, idNum]);
            logVerbose(`[FECHA_BANDA] ✓ es_publico sincronizado en 'eventos_confirmados' para solicitud ${idNum}`);
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
                        sfb.id_banda,
                        sfb.fecha_evento,
                        sfb.hora_evento,
                        sfb.duracion,
                        sfb.descripcion,
                        sfb.precio_basico,
                        sfb.precio_puerta_propuesto,
                        sfb.invitadas_json,
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
                    LEFT JOIN bandas_artistas ba ON sfb.id_banda = ba.id
                    LEFT JOIN clientes c ON s.cliente_id = c.id
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
                            nombre_cliente,
                            email_cliente,
                            telefono_cliente,
                            precio_base,
                            precio_final,
                            genero_musical,
                            cantidad_personas,
                            es_publico,
                            activo,
                            confirmado_en
                        ) VALUES (?, 'BANDA', 'solicitudes_fechas_bandas', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())
                    `;

                    const precioFinalParaEvento = typeof precio_final !== 'undefined' ? (precio_final ? parseFloat(precio_final) : solicitudData.precio_basico) : solicitudData.precio_basico;
                    const esPublicoParaEvento = (typeof es_publico !== 'undefined') ? (es_publico ? 1 : 0) : (solicitudData.solicitud_es_publico ? 1 : 0);

                    const resultEvento = await conn.query(sqlEventoConfirmado, [
                        idNum,
                        solicitudData.banda_nombre || solicitudData.nombre_evento || 'Sin nombre',
                        solicitudData.descripcion || '',
                        solicitudData.fecha_evento,
                        solicitudData.hora_evento || '21:00',
                        solicitudData.duracion || null,
                        solicitudData.cliente_nombre || '',
                        solicitudData.cliente_email || '',
                        solicitudData.cliente_telefono || '',
                        solicitudData.precio_basico || 0,
                        precioFinalParaEvento,
                        solicitudData.genero_musical || solicitudData.banda_nombre || '',
                        solicitudData.cantidad_bandas || 120,
                        esPublicoParaEvento
                    ]);

                    const nuevoEventoId = Number(resultEvento.insertId);
                    logVerbose(`[FECHA_BANDA] Evento confirmado creado (id=${nuevoEventoId}) para solicitud ${idNum}`);

                    // Insertar lineup: banda principal + invitadas
                    try {
                        await conn.query(
                            `INSERT INTO eventos_lineup (id_evento_confirmado, id_banda, nombre_banda, orden_show, es_principal, es_solicitante, estado) VALUES (?, ?, ?, 99, 1, 1, 'confirmada')`,
                            [nuevoEventoId, solicitudData.id_banda || null, solicitudData.banda_nombre || solicitudData.nombre_evento || 'Sin nombre']
                        );

                        if (solicitudData.invitadas_json) {
                            let invitadas = [];
                            try { invitadas = JSON.parse(solicitudData.invitadas_json || '[]'); } catch (e) { invitadas = []; }
                            let orden = 0;
                            for (const inv of invitadas) {
                                await conn.query(
                                    `INSERT INTO eventos_lineup (id_evento_confirmado, id_banda, nombre_banda, orden_show, es_principal, es_solicitante, estado) VALUES (?, ?, ?, ?, 0, 0, 'invitada')`,
                                    [nuevoEventoId, inv.id_banda || null, inv.nombre || '', orden++]
                                );
                            }
                        }
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
                'UPDATE solicitudes SET url_flyer = ? WHERE id = ?',
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
        return res.status(500).json({ error: 'Error al actualizar solicitud.' });
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

    const { precio_final, es_publico } = req.body;

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        // 1. Obtener datos de la solicitud
        const sqlSelect = `
            SELECT
                sfb.id_solicitud,
                sfb.id_banda,
                sfb.fecha_evento,
                sfb.hora_evento,
                sfb.duracion,
                sfb.descripcion,
                sfb.precio_basico,
                sfb.precio_puerta_propuesto,
                sfb.invitadas_json,
                ba.nombre as banda_nombre,
                c.nombre as cliente_nombre,
                c.email as cliente_email,
                c.telefono as cliente_telefono
            FROM solicitudes_fechas_bandas sfb
            LEFT JOIN bandas_artistas ba ON sfb.id_banda = ba.id
            JOIN solicitudes s ON sfb.id_solicitud = s.id
            LEFT JOIN clientes c ON s.cliente_id = c.id
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
            SET estado = 'Confirmado', precio_final = ?, actualizado_en = NOW()
            WHERE id_solicitud = ?
        `;

        await conn.query(sqlUpdateFecha, [
            precio_final ? parseFloat(precio_final) : solicitudFecha.precio_basico,
            idNum
        ]);

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
                nombre_cliente,
                email_cliente,
                telefono_cliente,
                precio_base,
                precio_final,
                genero_musical,
                cantidad_personas,
                es_publico,
                activo,
                confirmado_en
            ) VALUES (?, 'BANDA', 'solicitudes_fechas_bandas', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())
        `;

        const resultEvento = await conn.query(sqlEventoConfirmado, [
            idNum,
            solicitudFecha.banda_nombre || 'Sin nombre',
            solicitudFecha.descripcion || '',
            solicitudFecha.fecha_evento,
            solicitudFecha.hora_evento || '21:00',
            solicitudFecha.duracion || null,
            solicitudFecha.cliente_nombre || '',
            solicitudFecha.cliente_email || '',
            solicitudFecha.cliente_telefono || '',
            solicitudFecha.precio_basico || 0,
            precio_final ? parseFloat(precio_final) : solicitudFecha.precio_basico,
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
                [eventoId, solicitudFecha.id_banda || null, solicitudFecha.banda_nombre || solicitudFecha.descripcion || 'Sin nombre']
            );

            // Invitadas desde invitadas_json
            if (solicitudFecha.invitadas_json) {
                try {
                    const invitadas = JSON.parse(solicitudFecha.invitadas_json || '[]');
                    let orden = 0;
                    for (const inv of invitadas) {
                        await conn.query(
                            `INSERT INTO eventos_lineup (id_evento_confirmado, id_banda, nombre_banda, orden_show, es_principal, es_solicitante, estado) VALUES (?, ?, ?, ?, 0, 0, 'invitada')`,
                            [eventoId, inv.id_banda || null, inv.nombre || '', orden++]
                        );
                    }
                    logVerbose(`[FECHA_BANDA] Se insertaron ${invitadas.length} bandas invitadas en eventos_lineup para evento ${eventoId}`);
                } catch (e) {
                    logWarning(`[FECHA_BANDA] No se pudo parsear/insertar invitadas_json para solicitud ${idNum}: ${e.message}`);
                }
            }
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
        await conn.query('DELETE FROM solicitudes WHERE id = ?', [idNum]);

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
