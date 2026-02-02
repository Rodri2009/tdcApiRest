// backend/controllers/solicitudController.js
const pool = require('../db');

// CHANGES: Normalización de solicitudes
// - Se agregó la tabla `solicitudes` (base) y tablas específicas `solicitudes_talleres` y `solicitudes_servicios`.
// - Este controlador comienza la migración: nuevas solicitudes se insertan primero en `solicitudes` y luego
//   en tablas específicas cuando corresponde. Para compatibilidad posterior, se mantiene una inserción
//   adicional en `solicitudes_alquiler` (legacy) durante la transición.
const { sendAdminNotification } = require('../services/emailService');
const { sendComprobanteEmail } = require('../services/emailService');

const crearSolicitud = async (req, res) => {
    console.log("\n-> Controlador crearSolicitud. Body recibido:", req.body);

    const {
        tipoEvento,
        cantidadPersonas,
        duracionEvento,
        fechaEvento,
        horaInicio,
        precioBase,
        fingerprintId
    } = req.body;

    if (!tipoEvento || !fechaEvento) {
        return res.status(400).json({ error: 'Faltan datos obligatorios (tipoEvento, fechaEvento).' });
    }

    let conn;
    try {
        // --- VALIDACIONES BÁSICAS PARA CAMPOS DE BANDA SI VIENEN EN EL BODY ---
        const isValidEmail = (email) => {
            if (!email) return false;
            // Simple regex para validación básica
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        };

        const isValidUrl = (url) => {
            if (!url) return false;
            try {
                const u = new URL(url);
                return ['http:', 'https:'].includes(u.protocol);
            } catch (e) {
                return false;
            }
        };

        const { nombre_banda, contacto_email, link_musica, event_id } = req.body;
        if (nombre_banda || contacto_email || link_musica || (typeof event_id !== 'undefined' && event_id !== null)) {
            // Si llegan campos de banda, validamos los obligatorios
            if (nombre_banda && String(nombre_banda).trim().length === 0) {
                return res.status(400).json({ error: 'nombre_banda no puede estar vacío.' });
            }
            if (contacto_email && !isValidEmail(contacto_email)) {
                return res.status(400).json({ error: 'contacto_email inválido.' });
            }
            if (link_musica && !isValidUrl(link_musica)) {
                return res.status(400).json({ error: 'link_musica inválido. Use http(s)://' });
            }
            if (typeof event_id !== 'undefined' && event_id !== null && isNaN(Number(event_id))) {
                return res.status(400).json({ error: 'event_id debe ser numérico o null.' });
            }
        }

        conn = await pool.getConnection();

        // --- MIGRACIÓN: insertar en tabla normalizada `solicitudes` ---
        // Insertamos en la tabla base `solicitudes` y luego en tablas específicas según tipo.
        const insertBaseSql = `
            INSERT INTO solicitudes (fecha_hora, tipo_de_evento, tipo_servicio, cantidad_de_personas, duracion, fecha_evento, hora_evento, precio_basico, estado, fingerprintid, es_publico)
            VALUES (NOW(), ?, ?, ?, ?, ?, ?, ?, 'Solicitado', ?, ?);
        `;

        // Determinar la categoría de la solicitud (por defecto ALQUILER_SALON para compatibilidad)
        const categoria = req.body.tipoCategoria || (tipoEvento === 'FECHA_BANDAS' ? 'FECHA_BANDAS' : 'ALQUILER_SALON');
        const paramsBase = [categoria, tipoEvento, cantidadPersonas, duracionEvento, fechaEvento, horaInicio, parseFloat(precioBase) || 0, fingerprintId, (categoria === 'FECHA_BANDAS' ? 1 : 0)];

        const baseResult = await conn.query(insertBaseSql, paramsBase);

        if (baseResult.affectedRows > 0) {
            const newId = Number(baseResult.insertId);

            // Temporal: también insertamos en `solicitudes_alquiler` para conservar compatibilidad mientras migramos.
            try {
                const legacySql = `
                    INSERT INTO solicitudes_alquiler (
                        fecha_hora, tipo_de_evento, tipo_servicio, cantidad_de_personas, duracion,
                        fecha_evento, hora_evento, precio_basico, estado, fingerprintid, es_publico
                    ) VALUES (NOW(), ?, ?, ?, ?, ?, ?, ?, 'Solicitado', ?, ?);
                `;
                const legacyParams = [categoria, tipoEvento, cantidadPersonas, duracionEvento, fechaEvento, horaInicio, parseFloat(precioBase) || 0, fingerprintId, (categoria === 'FECHA_BANDAS' ? 1 : 0)];
                await conn.query(legacySql, legacyParams);
            } catch (legacyErr) {
                console.warn('Advertencia: fallo al insertar en legacy solicitudes_alquiler (no crítico durante migración):', legacyErr.message || legacyErr);
            }

            // Si es taller, insertar metadata específica
            if (categoria === 'TALLERES_ACTIVIDADES' || tipoEvento === 'TALLERES_ACTIVIDADES') {
                try {
                    const { taller_id, tallerista_id, modalidad, cupo } = req.body;
                    await conn.query(`INSERT INTO solicitudes_talleres (id_solicitud, taller_id, tallerista_id, modalidad, cupo) VALUES (?, ?, ?, ?, ?)`, [newId, taller_id || null, tallerista_id || null, modalidad || null, cupo || null]);
                } catch (tErr) {
                    console.warn('Advertencia: no se pudo insertar metadata de taller para la solicitud:', tErr.message || tErr);
                }
            }

            // Si es servicio, insertar metadata específica
            if (categoria === 'SERVICIOS' || tipoEvento === 'SERVICIOS') {
                try {
                    const { servicio_id, profesional_id, duracion_minutos, notas_servicio } = req.body;
                    await conn.query(`INSERT INTO solicitudes_servicios (id_solicitud, servicio_id, profesional_id, duracion_minutos, notas_servicio) VALUES (?, ?, ?, ?, ?)`, [newId, servicio_id || null, profesional_id || null, duracion_minutos || null, notas_servicio || null]);
                } catch (sErr) {
                    console.warn('Advertencia: no se pudo insertar metadata de servicio para la solicitud:', sErr.message || sErr);
                }
            }

            // Mantener comportamiento previo: si trae campos de banda, persistirlos (usa newId)
            try {
                const { nombre_banda, contacto_email, link_musica, propuesta, event_id, precio_anticipada, precio_puerta } = req.body;
                if (nombre_banda || contacto_email || link_musica || propuesta || event_id || precio_anticipada || precio_puerta) {
                    try {
                        await conn.query("ALTER TABLE solicitudes_bandas ADD COLUMN IF NOT EXISTS precio_anticipada DECIMAL(10,2) NULL;");
                        await conn.query("ALTER TABLE solicitudes_bandas ADD COLUMN IF NOT EXISTS precio_puerta DECIMAL(10,2) NULL;");
                    } catch (alterErr) {
                        console.warn('Advertencia: no se pudo asegurar columnas de precios en solicitudes_bandas al crear:', alterErr.message || alterErr);
                    }
                    const insertBandSql = `
                            INSERT INTO solicitudes_bandas (id_solicitud, nombre_banda, contacto_email, link_musica, propuesta, event_id, precio_anticipada, precio_puerta, created_at, updated_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                        `;
                    await conn.query(insertBandSql, [newId, nombre_banda || null, contacto_email || null, link_musica || null, propuesta || null, event_id || null, precio_anticipada || null, precio_puerta || null]);
                }
            } catch (bandErr) {
                console.warn('Advertencia: error al persistir datos de banda:', bandErr.message || bandErr);
            }

            // Finalmente respondemos con el id base
            res.status(201).json({ message: 'Solicitud creada', id: newId });
            return;
        } else {
            return res.status(500).json({ error: 'No se pudo crear la solicitud' });
        }
    } catch (err) {
        console.error("Error al crear la solicitud:", err);
        res.status(500).json({ error: 'Error interno del servidor al guardar la solicitud.' });
    } finally {
        if (conn) conn.release();
    }
};


/**
 * Obtiene los detalles de una única solicitud por su ID.
 */
const getSolicitudPorId = async (req, res) => {
    const { id } = req.params;
    console.log(`[SOLICITUD][GET] Obteniendo solicitud/evento ID: ${id}`);

    let conn;
    try {
        conn = await pool.getConnection();

        // Verificar si es un evento (prefijo ev_)
        if (id && id.toString().startsWith('ev_')) {
            const eventoId = parseInt(id.substring(3)); // Remover 'ev_' y convertir a número
            console.log(`[SOLICITUD][GET] Detectado evento con ID: ${eventoId}`);

            const sql = `
                SELECT 
                    CONCAT('ev_', e.id) as solicitudId,
                    e.tipo_evento as tipoEvento,
                    NULL as cantidadPersonas,
                    NULL as duracionEvento,
                    DATE_FORMAT(e.fecha, '%Y-%m-%d') as fechaEvento,
                    TIME_FORMAT(e.hora_inicio, '%H:%i') as horaInicio,
                    e.precio_base as precioBase,
                    e.nombre_banda as nombreCompleto,
                    NULL as telefono,
                    NULL as email,
                    e.descripcion,
                    CASE WHEN e.activo = 1 THEN 'Confirmado' ELSE 'Solicitado' END as estado,
                    e.tipo_evento as nombreParaMostrar,
                    e.nombre_banda as nombreBanda,
                    NULL as bandaContactoEmail,
                    NULL as bandaLinkMusica,
                    NULL as bandaPropuesta,
                    NULL as bandaEventId,
                    NULL as bandaInvitados,
                    e.precio_anticipada as bandaPrecioAnticipada,
                    e.precio_puerta as bandaPrecioPuerta
                FROM eventos e
                WHERE e.id = ?;
            `;

            const [evento] = await conn.query(sql, [eventoId]);

            if (!evento) {
                console.warn(`[SOLICITUD][GET] Evento no encontrado: ${eventoId}`);
                return res.status(404).json({ error: 'Evento no encontrado.' });
            }

            console.log(`[SOLICITUD][GET] Evento obtenido: ${evento.nombreCompleto}`);
            return res.status(200).json(evento);
        }

        // --- Consulta simplificada para solicitudes normales (no bandas) ---
        const sql = `
            SELECT
                s.id_solicitud as solicitudId,
                s.tipo_de_evento as tipoEvento,
                s.tipo_servicio as tipoServicio,
                s.cantidad_de_personas as cantidadPersonas,
                s.duracion as duracionEvento,
                DATE_FORMAT(s.fecha_evento, '%Y-%m-%d') as fechaEvento,
                s.hora_evento as horaInicio,
                s.precio_basico as precioBase,
                s.nombre_completo as nombreCompleto,
                s.telefono,
                s.email,
                s.descripcion,
                s.estado,
                COALESCE(ot.nombre_para_mostrar, s.tipo_de_evento) as nombreParaMostrar,
                COALESCE(ot.categoria, 'ALQUILER_SALON') as categoria
            FROM solicitudes s
            LEFT JOIN opciones_tipos ot ON s.tipo_de_evento = ot.id_evento OR s.tipo_servicio = ot.id_evento
            WHERE s.id_solicitud = ?;
        `;

        const rows = await conn.query(sql, [id]);
        console.log('[SOLICITUD][GET] rows (debug):', Array.isArray(rows) ? rows.length : typeof rows);
        const solicitud = (rows && rows.length > 0) ? rows[0] : null;

        // Si no existe en la tabla nueva, intentar fallback a la legacy para compatibilidad
        if (!solicitud) {
            const legacySql = `
                SELECT s.*, ot.nombre_para_mostrar, ot.categoria as categoria
                FROM solicitudes_alquiler s
                LEFT JOIN opciones_tipos ot ON s.tipo_de_evento = ot.id_evento OR s.tipo_servicio = ot.id_evento
                WHERE s.id_solicitud = ?;
            `;
            const legacyRows = await conn.query(legacySql, [id]);
            const legacy = (legacyRows && legacyRows.length > 0) ? legacyRows[0] : null;
            if (!legacy) {
                console.warn(`[SOLICITUD][GET] Solicitud no encontrada: ${id}`);
                return res.status(404).json({ error: 'Solicitud no encontrada.' });
            }
            const adicionalesLegacy = await conn.query("SELECT nombre_adicional as nombre, precio_adicional as precio FROM solicitudes_adicionales WHERE id_solicitud = ?", [id]);
            return res.status(200).json({ ...legacy, adicionales: adicionalesLegacy || [] });
        }

        const adicionales = await conn.query("SELECT nombre_adicional as nombre, precio_adicional as precio FROM solicitudes_adicionales WHERE id_solicitud = ?", [id]);

        // Si es una solicitud de banda, traemos metadata de solicitudes_bandas
        let bandaData = null;
        if (solicitud.tipoEvento && ['FECHA_BANDAS', 'BANDA', 'FECHA_EN_VIVO'].includes((solicitud.tipoEvento || '').toUpperCase())) {
            const bandRows = await conn.query("SELECT nombre_banda as nombreBanda, contacto_email as bandaContactoEmail, link_musica as bandaLinkMusica, propuesta as bandaPropuesta, event_id as bandaEventId, invitadas_json as bandaInvitados, precio_anticipada as bandaPrecioAnticipada, precio_puerta as bandaPrecioPuerta FROM solicitudes_bandas WHERE id_solicitud = ?", [id]);
            const b = (bandRows && bandRows.length > 0) ? bandRows[0] : null;
            bandaData = b || null;
        }

        const respuesta = {
            ...solicitud,
            adicionales: adicionales || [],
            ...(bandaData ? bandaData : {})
        };

        console.log(`[SOLICITUD][GET] Datos obtenidos exitosamente para ID: ${id}`);
        res.status(200).json(respuesta);

    } catch (err) {
        console.error(`Error al obtener la solicitud ${id}:`, err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    } finally {
        if (conn) conn.release();
    }

};

/**
 * Actualiza una solicitud con los datos de contacto y cambia su estado.
 * Reemplaza la lógica de `saveFinalDataAndSendEmails`.
 */
const finalizarSolicitud = async (req, res) => {
    const { id } = req.params;
    const { nombreCompleto, celular, email, detallesAdicionales, main_contact_email, invitados_emails } = req.body;

    console.log(`-> Finalizando solicitud con ID: ${id}`);

    if (!nombreCompleto || !celular || !email) {
        return res.status(400).json({ error: 'Nombre, celular y email son obligatorios.' });
    }

    let conn;
    try {
        conn = await pool.getConnection();

        const sqlUpdate = `
            UPDATE solicitudes SET nombre_completo = ?, telefono = ?, email = ?, descripcion = ?, estado = 'Solicitado'
            WHERE id_solicitud = ?;
        `;
        const paramsUpdate = [nombreCompleto, celular, email, detallesAdicionales, id];
        const result = await conn.query(sqlUpdate, paramsUpdate);

        // Si no afectó filas, intentar actualizar la tabla legacy
        if (result.affectedRows === 0) {
            const legacyUpdate = `
                UPDATE solicitudes_alquiler SET nombre_completo = ?, telefono = ?, email = ?, descripcion = ?, estado = 'Solicitado' WHERE id_solicitud = ?;
            `;
            const legacyResult = await conn.query(legacyUpdate, paramsUpdate);
            if (legacyResult.affectedRows === 0) {
                return res.status(404).json({ error: 'La solicitud a actualizar no fue encontrada.' });
            }
        }

        // --- LÓGICA DE EMAIL SEPARADA ---
        // Obtenemos los datos completos para los emails desde la tabla normalizada (si existe)
        const sqlSelect = `
            SELECT s.*, ot.nombre_para_mostrar, ot.descripcion as descripcion_evento
            FROM solicitudes s
            LEFT JOIN opciones_tipos ot ON s.tipo_servicio = ot.id_evento
            WHERE s.id_solicitud = ?;
        `;
        const solicitudRows = await conn.query(sqlSelect, [id]);
        let solicitudCompleta = (solicitudRows && solicitudRows.length > 0) ? solicitudRows[0] : null;

        // Si no existe en la tabla normalizada, obtener desde legacy
        if (!solicitudCompleta) {
            const legacySql = `
                SELECT s.*, ot.nombre_para_mostrar, ot.descripcion as descripcion_evento
                FROM solicitudes_alquiler s
                LEFT JOIN opciones_tipos ot ON s.tipo_servicio = ot.id_evento
                WHERE s.id_solicitud = ?;
            `;
            const legacyRows = await conn.query(legacySql, [id]);
            const legacy = (legacyRows && legacyRows.length > 0) ? legacyRows[0] : null;
            solicitudCompleta = legacy;
        }

        // Obtenemos los adicionales
        const adicionales = await conn.query("SELECT * FROM solicitudes_adicionales WHERE id_solicitud = ?", [id]);
        if (solicitudCompleta) solicitudCompleta.adicionales = adicionales;

        // Enviamos respuesta al cliente INMEDIATAMENTE
        res.status(200).json({ message: 'Solicitud creada como solicitada.', solicitudId: parseInt(id) });
        console.log(`Solicitud ${id} creada como solicitada. Respuesta enviada al cliente.`);

        // AHORA, enviamos los emails "en segundo plano"
        if (solicitudCompleta) {
            // Email para el Administrador
            sendComprobanteEmail(
                process.env.EMAIL_ADMIN,
                `Nueva Solicitud Confirmada - ID ${id} - ${nombreCompleto}`,
                solicitudCompleta,
                {
                    titulo: "Nueva Solicitud Recibida",
                    subtitulo: "Un cliente ha confirmado su solicitud de reserva."
                }
            );

            // Email para el Cliente
            sendComprobanteEmail(
                email, // El email del cliente
                "Confirmación de tu Solicitud de Reserva - El Templo de Claypole",
                solicitudCompleta,
                {
                    titulo: "¡Gracias por tu Solicitud!",
                    subtitulo: "Hemos recibido los detalles de tu evento. Nos pondremos en contacto a la brevedad."
                }
            );
        }

        // Persistir contactos de banda si vienen (main_contact_email + invitados_emails)
        try {
            if ((solicitudCompleta && solicitudCompleta.tipoEvento) && (solicitudCompleta.tipoEvento.toUpperCase() === 'FECHA_EN_VIVO' || solicitudCompleta.tipoEvento.toUpperCase() === 'FECHA_BANDAS' || solicitudCompleta.tipoEvento.toUpperCase() === 'BANDA')) {
                const conn2 = await pool.getConnection();
                try {
                    // Upsert main contact and invited emails into solicitudes_bandas
                    const upsertSql = `
                        INSERT INTO solicitudes_bandas (id_solicitud, contacto_email, invitadas_json, updated_at)
                        VALUES (?, ?, ?, NOW())
                        ON DUPLICATE KEY UPDATE contacto_email = VALUES(contacto_email), invitadas_json = VALUES(invitadas_json), updated_at = NOW();
                    `;
                    const invitadosJson = invitados_emails ? JSON.stringify(invitados_emails) : null;
                    await conn2.query(upsertSql, [parseInt(id), main_contact_email || null, invitadosJson]);
                } finally {
                    conn2.release();
                }
            }
        } catch (err) {
            console.warn('No se pudieron persistir contactos de banda tras finalizar solicitud:', err.message);
        }

    } catch (err) {
        console.error(`Error al finalizar la solicitud ${id}:`, err);
        // Si ya se ha enviado una respuesta, Express no hará nada.
        // Si el error ocurrió antes de res.json(), se enviará esta respuesta de error.
        if (!res.headersSent) {
            res.status(500).json({ error: 'Error interno del servidor.' });
        }
    } finally {
        if (conn) conn.release();
    }
};



/**
 * Guarda los adicionales seleccionados para una solicitud existente.
 * Reemplaza la lógica de `saveAdicionalesData`.
 */
const guardarAdicionales = async (req, res) => {
    const { id } = req.params;
    const adicionales = req.body;
    console.log("\n-> Controlador guardarAdicionales. Body recibido:", req.body);

    if (!id || !Array.isArray(adicionales)) {
        return res.status(400).json({ error: 'Se requiere un ID de solicitud y un array de adicionales.' });
    }

    console.log(`Guardando ${adicionales.length} adicionales para la solicitud ID: ${id}...`);

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        await conn.query("DELETE FROM solicitudes_adicionales WHERE id_solicitud = ?", [id]);

        if (adicionales.length > 0) {
            // --- ¡CAMBIO A INSERCIONES INDIVIDUALES DENTRO DE UN BUCLE! ---
            const sql = "INSERT INTO solicitudes_adicionales (id_solicitud, adicional_nombre, adicional_precio, timestamp) VALUES (?, ?, ?, ?)";

            // Iteramos sobre cada adicional y ejecutamos una consulta por cada uno.
            // Como todo está dentro de una transacción, sigue siendo atómico y seguro.
            for (const ad of adicionales) {
                const values = [id, ad.nombre, ad.precio, new Date()];
                await conn.query(sql, values);
            }
        }

        await conn.commit();

        console.log(`Adicionales guardados correctamente, solicitud ID: ${id} .`);
        res.status(200).json({ message: 'Adicionales guardados exitosamente.' });

    } catch (err) {
        if (conn) await conn.rollback();
        console.error(`Error al guardar adicionales para la solicitud ID: ${id}:`, err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    } finally {
        if (conn) conn.release();
    }
};


/**
 * Actualiza los datos básicos de una solicitud existente.
 */
const actualizarSolicitud = async (req, res) => {
    const { id } = req.params;
    console.log(`[SOLICITUD][EDIT] Actualizando solicitud ID: ${id}`);
    const {
        tipoEvento,
        cantidadPersonas,
        duracionEvento,
        fechaEvento,
        horaInicio,
        precioBase,
        detallesAdicionales // <-- NUEVO
    } = req.body;

    console.log(`[SOLICITUD][EDIT] Campos básicos: tipo=${tipoEvento}, cantidad=${cantidadPersonas}, duración=${duracionEvento}`);

    let conn;
    try {
        conn = await pool.getConnection();
        const sql = `
            UPDATE solicitudes_alquiler SET
                tipo_servicio = ?,
                cantidad_de_personas = ?,
                duracion = ?,
                fecha_evento = ?,
                hora_evento = ?,
                precio_basico = ?,
                descripcion = ?
            WHERE id_solicitud = ?;
        `;
        const params = [tipoEvento, cantidadPersonas, duracionEvento, fechaEvento, horaInicio, parseFloat(precioBase) || 0, detallesAdicionales, id];
        await conn.query(sql, params);

        // Si es una solicitud de banda, persistimos los campos estructurados en solicitudes_bandas
        try {
            if (['FECHA_EN_VIVO', 'FECHA_BANDAS', 'BANDA'].includes((tipoEvento || '').toUpperCase())) {
                const { nombre_banda, contacto_email, link_musica, propuesta, event_id, precio_anticipada, precio_puerta } = req.body;
                console.log(`[SOLICITUD][BANDA] Guardando datos de banda para ID: ${id}`);

                // Asegurarnos de que las columnas de precio existan (migración dinámica segura)
                try {
                    await conn.query("ALTER TABLE solicitudes_bandas ADD COLUMN IF NOT EXISTS precio_anticipada DECIMAL(10,2) NULL;");
                    await conn.query("ALTER TABLE solicitudes_bandas ADD COLUMN IF NOT EXISTS precio_puerta DECIMAL(10,2) NULL;");
                } catch (alterErr) {
                    console.warn('[SOLICITUD][BANDA] Advertencia: no se pudo asegurar columnas de precios:', alterErr.message || alterErr);
                }

                // Validaciones del lado servidor (simples) antes del upsert
                const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '');
                const isValidUrl = (url) => {
                    if (!url) return true; // campo opcional
                    try { const u = new URL(url); return ['http:', 'https:'].includes(u.protocol); } catch (e) { return false; }
                };

                if (contacto_email && !isValidEmail(contacto_email)) {
                    console.error('[SOLICITUD][BANDA] Email inválido:', contacto_email);
                    return res.status(400).json({ error: 'contacto_email inválido.' });
                }
                if (link_musica && !isValidUrl(link_musica)) {
                    console.error('[SOLICITUD][BANDA] URL inválida:', link_musica);
                    return res.status(400).json({ error: 'link_musica inválido. Use http(s)://' });
                }

                // Usamos INSERT ... ON DUPLICATE KEY UPDATE para upsert
                const upsertSql = `
                    INSERT INTO solicitudes_bandas (id_solicitud, nombre_banda, contacto_email, link_musica, propuesta, event_id, precio_anticipada, precio_puerta, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                    ON DUPLICATE KEY UPDATE
                        nombre_banda = VALUES(nombre_banda),
                        contacto_email = VALUES(contacto_email),
                        link_musica = VALUES(link_musica),
                        propuesta = VALUES(propuesta),
                        event_id = VALUES(event_id),
                        precio_anticipada = VALUES(precio_anticipada),
                        precio_puerta = VALUES(precio_puerta),
                        updated_at = NOW();
                `;
                await conn.query(upsertSql, [id, nombre_banda || null, contacto_email || null, link_musica || null, propuesta || null, event_id || null, precio_anticipada || null, precio_puerta || null]);
                console.log(`[SOLICITUD][BANDA] Datos de banda guardados exitosamente`);
            }
        } catch (err) {
            console.error('[SOLICITUD][BANDA] Error al persistir datos de banda:', err.message);
        }

        const respuesta = { solicitudId: parseInt(id) };
        console.log(`[SOLICITUD][EDIT] Solicitud ID: ${id} actualizada exitosamente`);
        res.status(200).json(respuesta);

    } catch (err) {
        console.error(`[SOLICITUD][ERROR] Error al actualizar la solicitud ID: ${id}: ${err.message}`);
        res.status(500).json({ error: 'Error interno del servidor.' });
    } finally {
        if (conn) conn.release();
    }
};

// ... (al final del archivo, antes de module.exports)
const getSesionExistente = async (req, res) => {
    const { fingerprintId } = req.query;
    console.log(`\n-> Controlador getSesionExistente. query recibido:`, req.query);

    if (!fingerprintId) {
        return res.status(400).json({ error: 'fingerprintId es requerido' });
    }

    console.log(`Buscando sesión para Fingerprint ID: ${fingerprintId}`);

    let conn;
    try {
        conn = await pool.getConnection();

        // --- Consulta a la tabla normalizada `solicitudes` para sesión existente ---
        const sql = `
            SELECT
                id_solicitud as solicitudId,
                tipo_de_evento as tipoEvento,
                tipo_servicio as tipoServicio,
                cantidad_de_personas as cantidadPersonas,
                duracion as duracionEvento,
                DATE_FORMAT(fecha_evento, '%Y-%m-%d') as fechaEvento,
                hora_evento as horaInicio
            FROM solicitudes
            WHERE fingerprintid = ?
              AND estado = 'Solicitado'
              AND fecha_hora > (NOW() - INTERVAL 24 HOUR)
            ORDER BY fecha_hora DESC
            LIMIT 1;
        `;

        const [sesion] = await conn.query(sql, [fingerprintId]);

        if (sesion) {
            console.log(`Sesión encontrada:`, sesion);
            res.status(200).json(sesion);
        } else {
            console.log("No se encontró ninguna sesión reciente.");
            // Es importante devolver null para que el frontend sepa que no hay nada que rellenar.
            res.status(200).json(null);
        }
    } catch (err) {
        console.error("Error al buscar sesión existente:", err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    } finally {
        if (conn) conn.release();
    }
};

// ============================================
// GET /api/solicitudes/:id/adicionales
// Obtener adicionales seleccionados para una solicitud
// ============================================
const obtenerAdicionales = async (req, res) => {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id, 10))) {
        return res.status(400).json({ error: 'ID de solicitud inválido.' });
    }

    let conn;
    try {
        conn = await pool.getConnection();

        // Obtener los adicionales guardados para esta solicitud
        const adicionales = await conn.query(
            "SELECT adicional_nombre as nombre, adicional_precio as precio FROM solicitudes_adicionales WHERE id_solicitud = ?",
            [id]
        );

        return res.status(200).json({
            seleccionados: adicionales || []
        });
    } catch (error) {
        console.error(`Error al obtener adicionales para solicitud ${id}:`, error);
        return res.status(500).json({
            error: 'Error interno al obtener adicionales.',
            details: error.message
        });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * Obtiene solicitudes públicas y confirmadas para mostrar en la agenda pública.
 * Solo devuelve talleres, servicios y alquileres que sean públicos (es_publico = 1) y confirmados.
 */
const getSolicitudesPublicas = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();

        // Seleccionar solicitudes públicas y confirmadas, con fecha futura
        const query = `
            SELECT
                id_solicitud as id,
                tipo_de_evento as tipoEvento,
                tipo_servicio as tipoServicio,
                fecha_evento as fechaEvento,
                hora_evento as horaEvento,
                duracion,
                cantidad_de_personas as cantidad,
                precio_basico as precio,
                nombre_completo as nombreCompleto,
                descripcion,
                es_publico as esPublico
            FROM solicitudes
            WHERE es_publico = 1
              AND estado = 'Confirmado'
              AND fecha_evento >= CURDATE()
            ORDER BY fecha_evento ASC
            LIMIT 50
        `;

        const rows = await conn.query(query);

        return res.status(200).json(rows || []);
    } catch (error) {
        console.error('Error al obtener solicitudes públicas:', error);
        return res.status(500).json({
            error: 'Error interno al obtener solicitudes públicas.',
            details: error.message
        });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * Actualiza la visibilidad pública de una solicitud (es_publico).
 */
const updateVisibilidad = async (req, res) => {
    const { id } = req.params;
    const { es_publico } = req.body;

    if (typeof es_publico === 'undefined') {
        return res.status(400).json({ message: 'Falta el campo es_publico' });
    }

    let conn;
    try {
        conn = await pool.getConnection();

        // Actualizar en la tabla normalizada primero
        const result = await conn.query(
            `UPDATE solicitudes SET es_publico = ? WHERE id_solicitud = ?`,
            [es_publico ? 1 : 0, id]
        );

        // Si no existe en la tabla normalizada, intentar legacy (alquiler o bandas)
        if (result.affectedRows === 0) {
            const resAlq = await conn.query(`UPDATE solicitudes_alquiler SET es_publico = ? WHERE id_solicitud = ?`, [es_publico ? 1 : 0, id]);
            const resBand = await conn.query(`UPDATE solicitudes_bandas SET es_publico = ? WHERE id_solicitud = ?`, [es_publico ? 1 : 0, id]);
            if ((resAlq.affectedRows || resBand.affectedRows) === 0) {
                return res.status(404).json({ message: 'Solicitud no encontrada' });
            }
        }

        return res.status(200).json({
            message: es_publico ? 'Solicitud visible en agenda pública' : 'Solicitud oculta de agenda pública',
            es_publico: es_publico ? 1 : 0
        });
    } catch (error) {
        console.error('Error al actualizar visibilidad:', error);
        return res.status(500).json({ message: 'Error interno al actualizar visibilidad' });
    } finally {
        if (conn) conn.release();
    }
};

// Y no olvides exportarla:
module.exports = {
    crearSolicitud,
    getSolicitudPorId,
    actualizarSolicitud,
    finalizarSolicitud,
    guardarAdicionales,
    obtenerAdicionales,
    getSesionExistente,
    getSolicitudesPublicas,
    updateVisibilidad
};