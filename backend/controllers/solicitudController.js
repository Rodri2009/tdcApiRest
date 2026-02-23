// backend/controllers/solicitudController.js
const pool = require('../db');
const { logVerbose, logError, logSuccess, logWarning } = require('../lib/debugFlags');
logVerbose('[SOLICITUDCONTROLLER FILE LOADED] (workspace)');
const { sendAdminNotification } = require('../services/emailService');
const { sendComprobanteEmail } = require('../services/emailService');
const { getOrCreateClient, updateClient } = require('../lib/clients');

const crearSolicitud = async (req, res) => {
    logVerbose("\n-> Controlador crearSolicitud. Body recibido:", req.body);

    const {
        tipoEvento,
        cantidadPersonas,
        duracionEvento,
        fechaEvento,
        horaInicio,
        precioBase,
        fingerprintId,
        nombreCompleto,
        nombre_solicitante,
        telefono,
        telefono_solicitante,
        email,
        email_solicitante,
        descripcion,
        descripcionCorta,
        descripcionLarga
    } = req.body;



    // Usar nombre_solicitante si nombreCompleto no existe
    const nombreFinal = nombreCompleto || nombre_solicitante || '';
    const telefonoFinal = telefono || telefono_solicitante || '';
    const emailFinal = email || email_solicitante || '';

    logVerbose("[DEBUG] nombreFinal:", nombreFinal, "telefonoFinal:", telefonoFinal, "emailFinal:", emailFinal);

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
        await conn.beginTransaction();


        // 1. Insertar en la tabla general 'solicitudes'
        // Detectar si es solicitud de banda (siempre en minúsculas)
        const tipoEventoNorm = (tipoEvento || '').toString().trim().toLowerCase();
        const esBanda = tipoEventoNorm.includes('banda');
        const categoria = esBanda ? 'BANDA' : 'ALQUILER';
        // Before inserting the solicitud, create or reuse the cliente
        const clienteId = await getOrCreateClient(conn, { nombre: nombreFinal, telefono: telefonoFinal, email: emailFinal });

        const sqlGeneral = `
            INSERT INTO solicitudes (categoria, fecha_creacion, estado, descripcion_corta, descripcion_larga, descripcion, id_cliente, url_flyer)
            VALUES (?, NOW(), 'Solicitado', ?, ?, ?, ?, ?)
        `;
        const paramsGeneral = [
            categoria,
            descripcionCorta || (descripcion ? descripcion.substring(0, 200) : null),
            descripcionLarga || null,
            descripcion || '',
            clienteId,
            req.body.url_flyer || null
        ];
        const resultGeneral = await conn.query(sqlGeneral, paramsGeneral);
        const newId = Number(resultGeneral.insertId);

        if (esBanda) {
            // Delegar a controlador especializado para solicitudes de fecha de banda (normalizado)
            // Reutilizamos la ruta/logic existente para mantener consistencia.
            const solicitudFechaBandaController = require('./solicitudFechaBandaController');
            // Liberar la conexión actual (será gestionada por el controlador delegado)
            if (conn) { conn.release(); conn = null; }
            return solicitudFechaBandaController.crearSolicitudFechaBanda(req, res);
        } else {
            // 2. Insertar en la tabla específica 'solicitudes_alquiler'
            const sqlAlquiler = `
                INSERT INTO solicitudes_alquiler (
                    id_solicitud, tipo_servicio, fecha_evento, hora_evento, duracion,
                    cantidad_de_personas, precio_basico, precio_final, tipo_de_evento, descripcion, estado
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const paramsAlquiler = [
                newId,                                      // id_solicitud
                tipoEvento,                                 // tipo_servicio
                fechaEvento,                                // fecha_evento
                horaInicio,                                 // hora_evento
                duracionEvento,                             // duracion
                cantidadPersonas,                           // cantidad_de_personas
                parseFloat(precioBase) || 0,               // precio_basico
                null,                                       // precio_final
                tipoEvento,                                 // tipo_de_evento
                descripcion || '',                          // descripcion
                'Solicitado'                                // estado
            ];
            await conn.query(sqlAlquiler, paramsAlquiler);
        }

        await conn.commit();
        const respuesta = { solicitudId: newId };
        logVerbose(`Nueva solicitud creada con ID: ${newId}. Enviando respuesta:`, respuesta);
        res.status(201).json(respuesta);

    } catch (err) {
        logError("Error al crear la solicitud:", err);
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
    logVerbose(`[SOLICITUD][GET] Obteniendo solicitud/evento ID: ${id}`);

    let conn;
    try {
        conn = await pool.getConnection();

        // Verificar si es un evento (prefijo ev_)
        if (id && id.toString().startsWith('ev_')) {
            const eventoId = parseInt(id.substring(3)); // Remover 'ev_' y convertir a número
            logVerbose(`[SOLICITUD][GET] Detectado evento con ID: ${eventoId}`);

            const sql = `
                SELECT 
                    CONCAT('ev_', e.id) as solicitudId,
                    e.tipo_evento as tipoEvento,
                    NULL as cantidadPersonas,
                    NULL as duracionEvento,
                    DATE_FORMAT(e.fecha_evento, '%Y-%m-%d') as fechaEvento,
                    TIME_FORMAT(e.hora_inicio, '%H:%i') as horaInicio,
                    e.precio_base as precioBase,
                    e.nombre_evento as nombreCompleto,
                    NULL as telefono,
                    NULL as email,
                    e.descripcion as descripcion_larga,
                    SUBSTRING(e.descripcion,1,200) as descripcion_corta,
                    CASE WHEN e.activo = 1 THEN 'Confirmado' ELSE 'Solicitado' END as estado,
                    e.tipo_evento as nombreParaMostrar,
                    e.nombre_evento as nombreBanda,
                    NULL as bandaContactoEmail,
                    NULL as bandaLinkMusica,
                    NULL as bandaPropuesta,
                    NULL as bandaEventId,
                    NULL as bandaInvitados,
                    sfb.precio_anticipada as bandaPrecioAnticipada,
                    sfb.precio_puerta as bandaPrecioPuerta
                FROM eventos_confirmados e
                LEFT JOIN solicitudes_fechas_bandas sfb ON e.id_solicitud = sfb.id_solicitud AND e.tipo_evento = 'BANDA'
                WHERE e.id = ?;
            `;

            const [evento] = await conn.query(sql, [eventoId]);

            if (!evento) {
                logWarning(`[SOLICITUD][GET] Evento no encontrado: ${eventoId}`);
                return res.status(404).json({ error: 'Evento no encontrado.' });
            }

            logVerbose(`[SOLICITUD][GET] Evento obtenido: ${evento.nombreCompleto}`);
            return res.status(200).json(evento);
        }

        // Verificar si es una solicitud de alquiler (prefijo alq_)
        if (id && id.toString().startsWith('alq_')) {
            const alquilerId = parseInt(id.substring(4)); // Remover 'alq_' y convertir a número
            logVerbose(`[SOLICITUD][GET] Detectado alquiler con ID: ${alquilerId}`);

            const sql = `
                SELECT
                    CONCAT('alq_', sa.id_solicitud) as solicitudId,
                    sa.tipo_servicio as tipoServicio,
                    sa.fecha_evento as fechaEvento,
                    sa.hora_evento as horaInicio,
                    sa.duracion as duracionEvento,
                    sa.cantidad_de_personas as cantidadPersonas,
                    sa.precio_basico as precioBase,
                    sa.descripcion as descripcion_alquiler,
                    sa.estado,
                    COALESCE(c.nombre, '') as nombreCompleto,
                    c.telefono as telefono,
                    c.email as email,
                    sa.tipo_de_evento as tipoEvento,
                    COALESCE(sol.es_publico, 0) as esPublico,
                    COALESCE(sol.descripcion_corta, '') as descripcion_corta,
                    COALESCE(sol.descripcion_larga, '') as descripcion_larga
                FROM solicitudes_alquiler sa
                JOIN solicitudes sol ON sa.id_solicitud = sol.id
                LEFT JOIN clientes c ON sol.id_cliente = c.id_cliente
                WHERE sa.id_solicitud = ?
            `;

            const [alquiler] = await conn.query(sql, [alquilerId]);

            if (!alquiler) {
                logWarning(`[SOLICITUD][GET] Alquiler no encontrado: ${alquilerId}`);
                return res.status(404).json({ error: 'Solicitud no encontrada.' });
            }

            console.debug('[SOLICITUD][GET] alquiler row:', alquiler);

            // Obtener adicionales seleccionados para este alquiler
            let adicionalesRows = [];
            try {
                adicionalesRows = await conn.query(
                    "SELECT adicional_nombre as nombre, adicional_precio as precio FROM solicitudes_adicionales WHERE id_solicitud = ?",
                    [alquilerId]
                );
            } catch (e) {
                logWarning('No se pudieron obtener adicionales para la solicitud', alquilerId, e);
            }

            const respuesta = {
                ...alquiler,
                adicionales: adicionalesRows || []
            };

            logVerbose(`[SOLICITUD][GET] Alquiler obtenido: ${alquiler.nombreCompleto}`);
            return res.status(200).json(respuesta);
        }

        // Verificar si es una solicitud de banda (prefijo bnd_)
        if (id && id.toString().startsWith('bnd_')) {
            const bandaId = parseInt(id.substring(4)); // Remover 'bnd_' y convertir a número
            logVerbose(`[SOLICITUD][GET] Detectado banda con ID: ${bandaId}`);

            const sql = `
                SELECT
                    CONCAT('bnd_', sfb.id_solicitud) as solicitudId,
                    'BANDA' as tipoEvento,
                    sfb.fecha_evento as fechaEvento,
                    sfb.hora_evento as horaInicio,
                    sfb.duracion as duracionEvento,
                    sfb.cantidad_bandas as cantidadPersonas,
                    sfb.precio_basico as precioBase,
                    COALESCE(c.nombre, '') as nombreCompleto,
                    c.telefono as telefono,
                    c.email as email,
                    COALESCE(sfb.descripcion, b.bio) as descripcion_banda,
                    sfb.estado,
                    COALESCE(b.genero_musical, sfb.genero_musical) as genero_musical,
                    COALESCE(b.instagram, NULL) as instagram,
                    COALESCE(b.facebook, NULL) as facebook,
                    COALESCE(b.youtube, NULL) as youtube,
                    COALESCE(b.spotify, NULL) as spotify,
                    COALESCE(b.otras_redes, NULL) as otras_redes,
                    COALESCE(b.logo_url, sfb.logo_url) as logo_url,
                    COALESCE(b.contacto_rol, sfb.contacto_rol) as contacto_rol,
                    sfb.fecha_alternativa,
                    sfb.bandas_json,
                    sfb.cantidad_bandas,
                    sfb.precio_puerta_propuesto,
                    sfb.expectativa_publico,
                    sfb.notas_admin,
                    COALESCE(sol.es_publico, 0) as esPublico,
                    COALESCE(sol.descripcion_corta, '') as descripcion_corta,
                    COALESCE(sol.descripcion_larga, '') as descripcion_larga
                FROM solicitudes_fechas_bandas sfb
                JOIN solicitudes sol ON sfb.id_solicitud = sol.id
                LEFT JOIN clientes c ON sol.id_cliente = c.id_cliente
                LEFT JOIN bandas_artistas b ON sfb.id_banda = b.id_banda
                WHERE sfb.id_solicitud = ?
            `;

            const [banda] = await conn.query(sql, [bandaId]);

            if (!banda) {
                logWarning(`[SOLICITUD][GET] Banda no encontrada: ${bandaId}`);
                return res.status(404).json({ error: 'Solicitud no encontrada.' });
            }

            const respuesta = {
                ...banda,
                adicionales: []
            };

            logVerbose(`[SOLICITUD][GET] Banda obtenida: ${banda.nombreCompleto}`);
            return res.status(200).json(respuesta);
        }

        // Verificar si es una solicitud de servicio (prefijo srv_)
        if (id && id.toString().startsWith('srv_')) {
            const servicioId = parseInt(id.substring(4)); // Remover 'srv_' y convertir a número
            logVerbose(`[SOLICITUD][GET] Detectado servicio con ID: ${servicioId}`);

            const sql = `
                SELECT
                    CONCAT('srv_', ss.id_solicitud) as solicitudId,
                    'SERVICIO' as tipoEvento,
                    ss.fecha_evento as fechaEvento,
                    ss.hora_evento as horaInicio,
                    ss.duracion as duracionEvento,
                    NULL as cantidadPersonas,
                    ss.precio as precioBase,
                    COALESCE(c.nombre, '') as nombreCompleto,
                    c.telefono as telefono,
                    c.email as email,
                    sol.descripcion,
                    sol.estado,
                    ss.tipo_servicio as tipoServicio,
                    COALESCE(sol.es_publico, 0) as esPublico
                FROM solicitudes_servicios ss
                JOIN solicitudes sol ON ss.id_solicitud = sol.id
                LEFT JOIN clientes c ON sol.id_cliente = c.id_cliente
                WHERE ss.id_solicitud = ?
            `;
            logVerbose('[SOLICITUD][GET] SQL servicio:', sql);

            const [servicio] = await conn.query(sql, [servicioId]);

            if (!servicio) {
                logWarning(`[SOLICITUD][GET] Servicio no encontrado: ${servicioId}`);
                return res.status(404).json({ error: 'Solicitud no encontrada.' });
            }

            const respuesta = {
                ...servicio,
                adicionales: []
            };

            logVerbose(`[SOLICITUD][GET] Servicio obtenido: ${servicio.nombreCompleto}`);
            return res.status(200).json(respuesta);
        }

        // Verificar si es una solicitud de taller (prefijo tll_)
        if (id && id.toString().startsWith('tll_')) {
            const tallerId = parseInt(id.substring(4)); // Remover 'tll_' y convertir a número
            logVerbose(`[SOLICITUD][GET] Detectado taller con ID: ${tallerId}`);

            const sql = `
                SELECT
                    CONCAT('tll_', st.id_solicitud) as solicitudId,
                    'TALLERES' as tipoEvento,
                    st.fecha_evento as fechaEvento,
                    st.hora_evento as horaInicio,
                    st.duracion as duracionEvento,
                    NULL as cantidadPersonas,
                    st.precio as precioBase,
                    COALESCE(c.nombre, '') as nombreCompleto,
                    c.telefono as telefono,
                    c.email as email,
                    sol.descripcion,
                    sol.estado,
                    st.nombre_taller as nombreTaller,
                    COALESCE(sol.es_publico, 0) as esPublico
                FROM solicitudes_talleres st
                JOIN solicitudes sol ON st.id_solicitud = sol.id
                LEFT JOIN clientes c ON sol.id_cliente = c.id_cliente
                WHERE st.id_solicitud = ?
            `;

            const [taller] = await conn.query(sql, [tallerId]);

            if (!taller) {
                logWarning(`[SOLICITUD][GET] Taller no encontrado: ${tallerId}`);
                return res.status(404).json({ error: 'Solicitud no encontrada.' });
            }

            const respuesta = {
                ...taller,
                adicionales: []
            };

            logVerbose(`[SOLICITUD][GET] Taller obtenido: ${taller.nombreCompleto}`);
            return res.status(200).json(respuesta);
        }

        // Si no tiene prefijo conocido, devolver error
        logWarning(`[SOLICITUD][GET] ID no reconocido: ${id}`);
        return res.status(404).json({ error: 'Solicitud no encontrada.' });

    } catch (err) {
        logError(`Error al obtener la solicitud ${id}:`, err);
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
    const { nombreCompleto, celular, email, detallesAdicionales, main_contact_email, invitados_emails, descripcionCorta, descripcionLarga } = req.body;

    logVerbose(`-> Finalizando solicitud con ID: ${id}`);

    if (!nombreCompleto || !celular || !email) {
        return res.status(400).json({ error: 'Nombre, celular y email son obligatorios.' });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        // Crear o obtener cliente y guardar referencia en solicitudes
        const clienteId = await getOrCreateClient(conn, { nombre: nombreCompleto, telefono: celular, email });

        // Actualizar datos en la tabla general 'solicitudes'
        const sqlUpdateGeneral = `
            UPDATE solicitudes SET 
                id_cliente = ?,
                descripcion_corta = ?,
                descripcion_larga = ?,
                descripcion = ?, 
                estado = 'Solicitado'
            WHERE id = ?
        `;
        const paramsUpdateGeneral = [clienteId, descripcionCorta || (detallesAdicionales ? String(detallesAdicionales).substring(0, 200) : null), descripcionLarga || null, detallesAdicionales, id];
        const resultGeneral = await conn.query(sqlUpdateGeneral, paramsUpdateGeneral);

        if (resultGeneral.affectedRows === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'La solicitud a actualizar no fue encontrada.' });
        }

        // Actualizar datos en la tabla 'solicitudes_alquiler' (no actualizamos campos de contacto aquí)
        const sqlUpdateAlquiler = `
            UPDATE solicitudes_alquiler SET 
                descripcion = ?
            WHERE id = ?
        `;
        const paramsUpdateAlquiler = [detallesAdicionales, id];
        await conn.query(sqlUpdateAlquiler, paramsUpdateAlquiler);

        // Obtener los datos completos para los emails
        const sqlSelect = `
            SELECT s.*, sa.* FROM solicitudes s LEFT JOIN solicitudes_alquiler sa ON s.id = sa.id_solicitud WHERE s.id = ?
        `;
        const [solicitudCompleta] = await conn.query(sqlSelect, [id]);

        await conn.commit();
        res.status(200).json({ message: 'Solicitud creada como solicitada.', solicitudId: parseInt(id) });
        logVerbose(`Solicitud ${id} creada como solicitada. Respuesta enviada al cliente.`);

        // Emails (en segundo plano)
        if (solicitudCompleta) {
            sendComprobanteEmail(
                process.env.EMAIL_ADMIN,
                `Nueva Solicitud Confirmada - ID ${id} - ${nombreCompleto}`,
                solicitudCompleta,
                {
                    titulo: "Nueva Solicitud Recibida",
                    subtitulo: "Un cliente ha confirmado su solicitud de reserva."
                }
            );
            sendComprobanteEmail(
                email,
                "Confirmación de tu Solicitud de Reserva - El Templo de Claypole",
                solicitudCompleta,
                {
                    titulo: "¡Gracias por tu Solicitud!",
                    subtitulo: "Hemos recibido los detalles de tu evento. Nos pondremos en contacto a la brevedad."
                }
            );
        }
    } catch (err) {
        if (conn) await conn.rollback();
        logError(`Error al finalizar la solicitud ${id}:`, err);
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
    logVerbose("\n-> Controlador guardarAdicionales. Body recibido:", req.body);

    if (!id || !Array.isArray(adicionales)) {
        return res.status(400).json({ error: 'Se requiere un ID de solicitud y un array de adicionales.' });
    }

    logVerbose(`Guardando ${adicionales.length} adicionales para la solicitud ID: ${id}...`);

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

        logVerbose(`Adicionales guardados correctamente, solicitud ID: ${id} .`);
        res.status(200).json({ message: 'Adicionales guardados exitosamente.' });

    } catch (err) {
        if (conn) await conn.rollback();
        logError(`Error al guardar adicionales para la solicitud ID: ${id}:`, err);
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
    logVerbose(`[SOLICITUD][EDIT] ========== ACTUALIZAR SOLICITUD ==========`);
    logVerbose(`[SOLICITUD][EDIT] ID recibido (raw): ${id}`);
    logVerbose(`[SOLICITUD][EDIT] Body recibido:`, JSON.stringify(req.body, null, 2));

    // Parsear ID con prefijo (bnd_11, alq_5, etc.)
    const match = String(id).match(/^([a-z]*_)?(\d+)$/);
    let prefijo = '';
    let idNumerico = null;

    if (match) {
        prefijo = match[1] || '';
        idNumerico = parseInt(match[2], 10);
        logVerbose(`[SOLICITUD][EDIT] ID parseado: prefijo="${prefijo}" idNumerico=${idNumerico}`);
    } else {
        logError(`[SOLICITUD][EDIT] ID inválido: ${id}`);
        return res.status(400).json({ error: 'ID de solicitud inválido.' });
    }

    const {
        tipoEvento,
        cantidadPersonas,
        duracionEvento,
        fechaEvento,
        horaInicio,
        precioBase,
        nombreCompleto,
        nombre_solicitante,
        telefono,
        telefono_solicitante,
        email,
        email_solicitante,
        descripcion,
        detallesAdicionales,
        descripcionCorta,
        descripcionLarga,
        // Campos específicos para bandas
        nombre_evento,
        genero_musical,
        url_flyer,
        cantidad_personas,
        precio_final,
        nombre_cliente,
        email_cliente,
        telefono_cliente,
        es_publico
    } = req.body;

    // Usar el nombre correcto si viene en snake_case
    const nombreFinal = nombreCompleto || nombre_solicitante || nombre_cliente || nombre_evento || '';
    const telefonoFinal = telefono || telefono_solicitante || telefono_cliente || '';
    const emailFinal = email || email_solicitante || email_cliente || '';

    logVerbose(`[SOLICITUD][EDIT] Determinando tabla según prefijo: "${prefijo}"`);

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        // Crear o actualizar cliente y asociarlo a la solicitud
        const clienteId = await getOrCreateClient(conn, { nombre: nombreFinal, telefono: telefonoFinal, email: emailFinal });

        // Actualizar datos en la tabla general 'solicitudes'
        const sqlUpdateGeneral = `
            UPDATE solicitudes SET 
                descripcion_corta = ?,
                descripcion_larga = ?,
                descripcion = ?,
                id_cliente = ?
            WHERE id = ?
        `;
        const paramsUpdateGeneral = [
            descripcionCorta || (descripcion || detallesAdicionales ? String((descripcion || detallesAdicionales)).substring(0, 200) : null),
            descripcionLarga || null,
            descripcion || detallesAdicionales || '',
            clienteId,
            idNumerico
        ];
        logVerbose(`[SOLICITUD][EDIT] Ejecutando UPDATE en solicitudes (id=${idNumerico})`);
        await conn.query(sqlUpdateGeneral, paramsUpdateGeneral);

        // NUEVA LÓGICA: Determinar tabla según tipo de evento
        let affectedRowsEspecifico = 0;
        let tablaActualizada = '';
        let tipoEventoReal = null;

        // PASO 0: Consultar el tipo real según prefijo
        logVerbose(`[SOLICITUD][EDIT] PASO 0: Consultando tipo de evento (prefijo="${prefijo}") para id=${idNumerico}`);

        // Si es evento confirmado (ev_*), consultar eventos_confirmados.tipo_evento
        if (prefijo === 'ev_') {
            const sqlSelectEvento = `SELECT tipo_evento FROM eventos_confirmados WHERE id = ? LIMIT 1`;
            const rowsEvento = await conn.query(sqlSelectEvento, [idNumerico]);
            if (rowsEvento.length > 0) {
                tipoEventoReal = rowsEvento[0].tipo_evento;
                logVerbose(`[SOLICITUD][EDIT] ✓ Evento confirmado encontrado: tipo_evento=${tipoEventoReal}`);
            } else {
                logWarning(`[SOLICITUD][EDIT] ⚠️ Evento confirmado no encontrado en eventos_confirmados (id=${idNumerico})`);
            }
        } else {
            // Para solicitudes normales (bnd_, alq_, etc.), consultar solicitudes.categoria
            const sqlSelectSolicitud = `SELECT categoria FROM solicitudes WHERE id = ? LIMIT 1`;
            const rowsSolicitud = await conn.query(sqlSelectSolicitud, [idNumerico]);
            if (rowsSolicitud.length > 0) {
                tipoEventoReal = rowsSolicitud[0].categoria;
                logVerbose(`[SOLICITUD][EDIT] ✓ Solicitud encontrada: categoria=${tipoEventoReal}`);
            } else {
                logWarning(`[SOLICITUD][EDIT] ⚠️ Solicitud no encontrada en tabla solicitudes (id=${idNumerico})`);
            }
        }

        // Determinar tabla según tipo real encontrado O prefijo de fallback
        let tableTarget = null;

        if (tipoEventoReal === 'BANDA' || tipoEventoReal === 'BANDAS') {
            tableTarget = 'solicitudes_fechas_bandas';
            logVerbose(`[SOLICITUD][EDIT] PASO 1: Tipo BANDA → usando solicitudes_fechas_bandas`);
        } else if (tipoEventoReal === 'ALQUILER') {
            tableTarget = 'solicitudes_alquiler';
            logVerbose(`[SOLICITUD][EDIT] PASO 1: Tipo ALQUILER → usando solicitudes_alquiler`);
        } else if (tipoEventoReal) {
            // Otros tipos: determinar por prefijo
            logVerbose(`[SOLICITUD][EDIT] PASO 1: Tipo desconocido (${tipoEventoReal}). Usando fallback por prefijo`);
            if (prefijo === 'bnd_') tableTarget = 'solicitudes_fechas_bandas';
            else if (prefijo === 'alq_') tableTarget = 'solicitudes_alquiler';
            else if (prefijo === 'ev_') tableTarget = 'solicitudes_fechas_bandas'; // Eventos confirmados suelen ser bandas
            else tableTarget = 'solicitudes_alquiler'; // Por defecto
        } else {
            // Sin tipo encontrado: usar prefijo
            logVerbose(`[SOLICITUD][EDIT] PASO 1: Tipo no determinado. Usando fallback por prefijo (${prefijo})`);
            if (prefijo === 'bnd_') tableTarget = 'solicitudes_fechas_bandas';
            else if (prefijo === 'alq_') tableTarget = 'solicitudes_alquiler';
            else if (prefijo === 'ev_') tableTarget = 'solicitudes_fechas_bandas'; // Eventos confirmados suelen ser bandas
            else tableTarget = 'solicitudes_alquiler'; // Por defecto
        }

        logVerbose(`[SOLICITUD][EDIT] PASO 2: Tabla destino = ${tableTarget}`);

        // Para eventos confirmados (ev_*), actualizar eventos_confirmados directamente
        if (prefijo === 'ev_') {
            logVerbose(`[SOLICITUD][EDIT] PASO 3: Actualizando eventos_confirmados (id=${idNumerico}) - EVENTO CONFIRMADO`);

            // Construir SQL dinámico que solo actualice campos proporcionados
            let setClauses = [];
            let params = [];

            if (nombreFinal || nombre_evento) {
                setClauses.push('nombre_evento = ?');
                params.push(nombreFinal || nombre_evento || '');
            }
            if (genero_musical || tipoEvento) {
                setClauses.push('genero_musical = ?');
                params.push(genero_musical || tipoEvento || '');
            }
            if (descripcion || detallesAdicionales) {
                setClauses.push('descripcion = ?');
                params.push(descripcion || detallesAdicionales || '');
            }
            if (fechaEvento) {
                setClauses.push('fecha_evento = ?');
                params.push(fechaEvento);
            }
            if (horaInicio) {
                setClauses.push('hora_inicio = ?');
                params.push(horaInicio);
            }
            // ✅ Opción B3: NO actualizar precios en eventos_confirmados
            // Los precios viven SOLO en tabla de origen (solicitudes_fechas_bandas, etc)
            // Removido: precioBase, precio_final (columnas no existen)
            if (cantidad_personas || cantidadPersonas) {
                setClauses.push('cantidad_personas = ?');
                params.push(cantidad_personas || cantidadPersonas || 0);
            }
            if (typeof id_cliente !== 'undefined') {
                setClauses.push('id_cliente = ?');
                params.push(id_cliente);
            }

            if (setClauses.length === 0) {
                logVerbose(`[SOLICITUD][EDIT] ⚠️ No hay campos para actualizar`);
                await conn.commit();
                return res.status(400).json({ error: 'No hay campos para actualizar.' });
            }

            params.push(idNumerico); // Agregar WHERE id

            const sqlUpdateEvento = `UPDATE eventos_confirmados SET ${setClauses.join(', ')} WHERE id = ?`;

            try {
                logVerbose(`[SOLICITUD][EDIT] SQL dinámico:`, sqlUpdateEvento);
                const result = await conn.query(sqlUpdateEvento, params);
                affectedRowsEspecifico = result.affectedRows || 0;
                tablaActualizada = 'eventos_confirmados';
                logVerbose(`[SOLICITUD][EDIT] ✓ UPDATE eventos_confirmados: affectedRows=${affectedRowsEspecifico}`);
            } catch (eventoErr) {
                logError(`[SOLICITUD][EDIT] ✗ Error en eventos_confirmados:`, eventoErr.message);
                throw eventoErr;
            }
        }
        // ACTUALIZAR EN LA TABLA DE SOLICITUDES ESPECÍFICA
        else if (tableTarget === 'solicitudes_fechas_bandas' || tableTarget === 'solicitudes_bandas') {
            // Soportar tanto la nueva tabla normalizada como el nombre legacy (compatibilidad)
            logVerbose(`[SOLICITUD][EDIT] PASO 3: Actualizando solicitudes_fechas_bandas (id=${idNumerico})`);

            const sqlUpdateBandas = `
                UPDATE solicitudes_fechas_bandas SET
                    id_banda = ?,
                    genero_musical = ?,
                    descripcion = ?,
                    fecha_evento = ?,
                    hora_evento = ?,
                    duracion = ?,
                    cantidad_bandas = ?,
                    precio_basico = ?,
                    precio_final = ?,
                    precio_puerta_propuesto = ?,
                    expectativa_publico = ?
                WHERE id_solicitud = ?
            `;
            const paramsBandas = [
                req.body.id_banda || null,
                genero_musical || tipoEvento || null,
                descripcion || detallesAdicionales || null,
                fechaEvento || null,
                horaInicio || null,
                duracionEvento || null,
                cantidad_personas || cantidadPersonas || null,
                precioBase || null,
                precio_final || null,
                req.body.precio_puerta_propuesto || null,
                req.body.expectativa_publico || null,
                idNumerico
            ];
            try {
                const result = await conn.query(sqlUpdateBandas, paramsBandas);
                affectedRowsEspecifico = result.affectedRows || 0;
                tablaActualizada = 'solicitudes_fechas_bandas';
                logVerbose(`[SOLICITUD][EDIT] ✓ UPDATE solicitudes_fechas_bandas: affectedRows=${affectedRowsEspecifico}`);
            } catch (bandaErr) {
                logError(`[SOLICITUD][EDIT] ✗ Error en solicitudes_fechas_bandas:`, bandaErr.message);
                throw bandaErr;
            }
        } else if (tableTarget === 'solicitudes_alquiler') {
            logVerbose(`[SOLICITUD][EDIT] PASO 3: Actualizando solicitudes_alquiler (id=${idNumerico})`);

            const sqlUpdateAlquiler = `
                UPDATE solicitudes_alquiler SET
                    tipo_servicio = ?,
                    cantidad_de_personas = ?,
                    duracion = ?,
                    fecha_evento = ?,
                    hora_evento = ?,
                    precio_basico = ?,
                    descripcion = ?
                WHERE id_solicitud = ?
            `;
            const paramsAlquiler = [
                tipoEvento || '',
                cantidadPersonas || '',
                duracionEvento || '',
                fechaEvento || null,
                horaInicio || '',
                parseFloat(precioBase) || 0,
                descripcion || detallesAdicionales || '',
                idNumerico
            ];
            try {
                const result = await conn.query(sqlUpdateAlquiler, paramsAlquiler);
                affectedRowsEspecifico = result.affectedRows || 0;
                tablaActualizada = 'solicitudes_alquiler';
                logVerbose(`[SOLICITUD][EDIT] ✓ UPDATE solicitudes_alquiler: affectedRows=${affectedRowsEspecifico}`);
            } catch (alqErr) {
                logError(`[SOLICITUD][EDIT] ✗ Error en solicitudes_alquiler:`, alqErr.message);
                throw alqErr;
            }
        }

        // VERIFICAR que realmente se actualizó algo
        if (affectedRowsEspecifico === 0) {
            logWarning(`[SOLICITUD][EDIT] ⚠️ ADVERTENCIA: UPDATE en ${tablaActualizada} no afectó ninguna fila. ID=${id}`);
            await conn.commit();
            return res.status(404).json({
                error: 'Solicitud no encontrada en la tabla esperada.',
                debug: {
                    prefijo,
                    idNumerico,
                    tablaIntentada: tablaActualizada,
                    affectedRows: affectedRowsEspecifico
                }
            });
        }

        await conn.commit();
        const respuesta = {
            solicitudId: id,
            affectedRows: affectedRowsEspecifico,
            tablaActualizada: tablaActualizada
        };
        logVerbose(`[SOLICITUD][EDIT] ✓ Solicitud ID: ${id} actualizada exitosamente en ${tablaActualizada} (affectedRows=${affectedRowsEspecifico})`);
        res.status(200).json(respuesta);
    } catch (err) {
        if (conn) await conn.rollback();
        logError(`[SOLICITUD][ERROR] Error al actualizar la solicitud ID: ${id}: ${err.message}`);
        logError(`[SOLICITUD][ERROR] Stack:`, err.stack);
        res.status(500).json({ error: 'Error interno del servidor.' });
    } finally {
        if (conn) conn.release();
    }
};

// ... (al final del archivo, antes de module.exports)
const getSesionExistente = async (req, res) => {
    const { fingerprintId } = req.query;
    logVerbose(`\n-> Controlador getSesionExistente. query recibido:`, req.query);

    if (!fingerprintId) {
        return res.status(400).json({ error: 'fingerprintId es requerido' });
    }

    logVerbose(`Buscando sesión para Fingerprint ID: ${fingerprintId}`);

    let conn;
    try {
        conn = await pool.getConnection();

        // Buscar sesión más reciente por fingerprint.
        // Priorizar solicitudes de bandas (almacenan 'fingerprintid'), y devolver campos útiles para rellenar el formulario.
        const sql = `
            SELECT
                sb.id_solicitud as solicitudId,
                'BANDA' as tipoEvento,
                NULL as tipoServicio,
                sb.cantidad_bandas as cantidadPersonas,
                sb.duracion as duracionEvento,
                DATE_FORMAT(sb.fecha_evento, '%Y-%m-%d') as fechaEvento,
                sb.hora_evento as horaInicio,
                sb.descripcion as descripcion
            FROM solicitudes_fechas_bandas sb
            WHERE sb.fingerprintid = ?
            ORDER BY sb.id_solicitud DESC
            LIMIT 1
        `;

        const [sesion] = await conn.query(sql, [fingerprintId]);

        if (sesion) {
            logVerbose(`Sesión encontrada:`, sesion);
            res.status(200).json(sesion);
        } else {
            logVerbose("No se encontró ninguna sesión reciente.");
            // Es importante devolver null para que el frontend sepa que no hay nada que rellenar.
            res.status(200).json(null);
        }
    } catch (err) {
        logError("Error al buscar sesión existente:", err);
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
    let { id } = req.params;

    // Permitir id con prefijos tipo 'alq_4' o 'bnd_11' o solo '4'
    if (!id) return res.status(400).json({ error: 'ID de solicitud inválido.' });
    const match = String(id).match(/(\d+)/);
    const numericId = match ? parseInt(match[1], 10) : NaN;
    if (isNaN(numericId)) return res.status(400).json({ error: 'ID de solicitud inválido.' });

    let conn;
    try {
        conn = await pool.getConnection();

        // Obtener los adicionales guardados para esta solicitud (por id numérico)
        const adicionales = await conn.query(
            "SELECT adicional_nombre as nombre, adicional_precio as precio FROM solicitudes_adicionales WHERE id_solicitud = ?",
            [numericId]
        );

        return res.status(200).json({
            seleccionados: adicionales || []
        });
    } catch (error) {
        // Registrar y devolver lista vacía en caso de cualquier error para no bloquear la UI
        logError(`Error al obtener adicionales para solicitud ${id}:`, error);
        logWarning('Devolviendo lista vacía de adicionales debido a un error.');
        return res.status(200).json({ seleccionados: [] });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * Obtiene todas las fechas públicas confirmadas para la agenda cultural.
 * Incluye fechas de bandas, talleres/actividades y servicios públicos.
 */
const getSolicitudesPublicas = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();

        // Consultar fechas de bandas confirmadas desde la tabla padre donde es_publico = 1
        const bandasQuery = `
            SELECT
                sb.id_solicitud as id,
                'BANDA' as tipoEvento,
                sb.fecha_evento as fechaEvento,
                sb.hora_evento as horaEvento,
                sb.duracion,
                sb.cantidad_bandas as cantidad,
                sb.precio_basico as precio,
                sb.precio_anticipada as precio_anticipada,
                sb.precio_puerta as precio_puerta,
                -- Priorizar nombre de evento (si existe), luego nombre_banda, luego descripción, luego cliente
                COALESCE(e.nombre_evento, b.nombre, sb.descripcion, COALESCE(c.nombre, '')) AS nombreEvento,
                COALESCE(c.nombre, '') as nombreCompleto,
                sb.descripcion,
                COALESCE(sol.es_publico, 0) as esPublico,
                e.url_flyer as flyer_url
            FROM solicitudes_fechas_bandas sb
            JOIN solicitudes sol ON sb.id_solicitud = sol.id
            LEFT JOIN clientes c ON sol.id_cliente = c.id_cliente
            LEFT JOIN bandas_artistas b ON sb.id_banda = b.id_banda
            LEFT JOIN eventos_confirmados e ON e.id_solicitud = sb.id_solicitud AND e.tipo_evento = 'BANDA' AND e.activo = 1
            WHERE sol.es_publico = 1
              AND sol.estado = 'Confirmado'
              AND sb.fecha_evento >= CURDATE()
        `;
        const bandas = await conn.query(bandasQuery);

        // Consultar fechas de talleres/actividades confirmadas desde la tabla padre
        const talleresQuery = `
            SELECT
                st.id_solicitud as id,
                'TALLER' as tipoEvento,
                st.fecha_evento as fechaEvento,
                st.hora_evento as horaEvento,
                st.duracion,
                NULL as cantidad,
                st.precio as precio,
                -- Preferir nombre de evento si existe, luego nombre del taller, luego cliente
                COALESCE(e.nombre_evento, st.nombre_taller, COALESCE(c.nombre, '')) AS nombreEvento,
                NULL as descripcion,
                COALESCE(sol.es_publico, 0) as esPublico,
                e.url_flyer as flyer_url
            FROM solicitudes_talleres st
            JOIN solicitudes sol ON st.id_solicitud = sol.id
            LEFT JOIN clientes c ON sol.id_cliente = c.id_cliente
            LEFT JOIN eventos_confirmados e ON e.id_solicitud = st.id_solicitud AND e.tipo_evento = 'TALLER' AND e.activo = 1
            WHERE sol.es_publico = 1
              AND sol.estado = 'Confirmado'
              AND st.fecha_evento >= CURDATE()
        `;
        const talleres = await conn.query(talleresQuery);

        // Consultar fechas de servicios públicos confirmados desde la tabla padre
        const serviciosQuery = `
            SELECT
                ss.id_solicitud as id,
                'SERVICIO' as tipoEvento,
                ss.fecha_evento as fechaEvento,
                ss.hora_evento as horaEvento,
                ss.duracion,
                NULL as cantidad,
                ss.precio as precio,
                -- Preferir nombre de evento si existe, luego tipo_servicio, luego cliente
                COALESCE(e.nombre_evento, ss.tipo_servicio, COALESCE(c.nombre, '')) AS nombreEvento,
                NULL as descripcion,
                COALESCE(sol.es_publico, 0) as esPublico,
                e.url_flyer as flyer_url
            FROM solicitudes_servicios ss
            JOIN solicitudes sol ON ss.id_solicitud = sol.id
            LEFT JOIN clientes c ON sol.id_cliente = c.id_cliente
            LEFT JOIN eventos_confirmados e ON e.id_solicitud = ss.id_solicitud AND e.tipo_evento = 'SERVICIO' AND e.activo = 1
            WHERE sol.es_publico = 1
              AND sol.estado = 'Confirmado'
              AND ss.fecha_evento >= CURDATE()
        `;
        const servicios = await conn.query(serviciosQuery);

        // Combinar resultados
        const resultados = [...bandas, ...talleres, ...servicios];

        // Ordenar por fecha
        resultados.sort((a, b) => new Date(a.fechaEvento) - new Date(b.fechaEvento));

        return res.status(200).json(resultados);
    } catch (error) {
        logError('Error al obtener solicitudes públicas:', error);
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

    logVerbose(`[VISIBILIDAD][REQ] id recibido: ${id}, es_publico: ${es_publico}`);

    if (typeof es_publico === 'undefined') {
        return res.status(400).json({ message: 'Falta el campo es_publico' });
    }

    let conn;
    try {
        conn = await pool.getConnection();

        // Soportar IDs con prefijos: alq_, bnd_, srv_, tll_, ev_
        let idValue = id;

        if (String(id).startsWith('ev_')) {
            // Evento confirmado: actualizamos directamente en eventos_confirmados
            idValue = parseInt(String(id).substring(3), 10);
            const result = await conn.query(`UPDATE eventos_confirmados SET es_publico = ? WHERE id = ?`, [es_publico ? 1 : 0, idValue]);
            if (result.affectedRows === 0) return res.status(404).json({ message: 'Evento no encontrado' });
            return res.status(200).json({ message: es_publico ? 'Evento visible en agenda pública' : 'Evento oculto de agenda pública', es_publico: es_publico ? 1 : 0 });
        }

        // Para todos los demás tipos, la fuente de verdad es la tabla padre `solicitudes`
        if (String(id).startsWith('alq_') || String(id).startsWith('bnd_') || String(id).startsWith('srv_') || String(id).startsWith('tll_')) {
            idValue = parseInt(String(id).split('_')[1], 10);
        } else if (!isNaN(parseInt(id, 10))) {
            idValue = parseInt(id, 10);
        } else {
            return res.status(400).json({ message: 'ID inválido' });
        }

        const resultParent = await conn.query(`UPDATE solicitudes SET es_publico = ? WHERE id = ?`, [es_publico ? 1 : 0, idValue]);
        if (resultParent.affectedRows === 0) {
            return res.status(404).json({ message: 'Solicitud no encontrada' });
        }

        // Propagar a eventos_confirmados si existen
        try {
            await conn.query(`UPDATE eventos_confirmados SET es_publico = ? WHERE id_solicitud = ?`, [es_publico ? 1 : 0, idValue]);
        } catch (err) {
            logWarning('No se pudo propagar es_publico a eventos_confirmados:', err.message);
        }

        return res.status(200).json({ message: es_publico ? 'Solicitud visible en agenda pública' : 'Solicitud oculta de agenda pública', es_publico: es_publico ? 1 : 0 });
    } catch (error) {
        logError('Error al actualizar visibilidad:', error);
        return res.status(500).json({ message: 'Error interno al actualizar visibilidad' });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * GET público: Obtiene una versión limitada de la solicitud por ID (no requiere autenticación)
 * Devuelve los campos necesarios para mostrar el resumen en el formulario público sin exponer datos sensibles.
 */
const getSolicitudPublicById = async (req, res) => {
    const { id } = req.params;
    logVerbose(`[SOLICITUD][PUBLIC GET] Obteniendo (público) solicitud/evento ID: ${id}`);

    let conn;
    try {
        conn = await pool.getConnection();
        logVerbose('[PUBLIC GET] conexión obtenida para id:', id);

        // Si es un ID con prefijo (ev_, alq_, bnd_, srv_, tll_) lo manejamos como antes
        const hasPrefix = !!(id && (id.toString().startsWith('ev_') || id.toString().startsWith('alq_') || id.toString().startsWith('bnd_') || id.toString().startsWith('srv_') || id.toString().startsWith('tll_')));
        logVerbose('[PUBLIC GET] hasPrefix=', hasPrefix, ' idString=', String(id));
        if (hasPrefix) {
            // Aprovechamos la lógica previa: delegar al mismo flujo
            // Evento confirmado (ev_)
            if (id.toString().startsWith('ev_')) {
                const eventoId = parseInt(id.substring(3));
                const sql = `
                    SELECT 
                        CONCAT('ev_', e.id) as solicitudId,
                        e.tipo_evento as tipoEvento,
                        DATE_FORMAT(e.fecha_evento, '%Y-%m-%d') as fechaEvento,
                        TIME_FORMAT(e.hora_inicio, '%H:%i') as horaInicio,
                        e.precio_base as precioBase,
                        e.nombre_evento as nombreParaMostrar,
                        e.url_flyer as flyer_url,
                        CASE WHEN e.activo = 1 THEN 'Confirmado' ELSE 'Solicitado' END as estado
                    FROM eventos_confirmados e
                    WHERE e.id = ?;
                `;
                const [evento] = await conn.query(sql, [eventoId]);
                if (!evento) return res.status(404).json({ error: 'Evento no encontrado.' });
                return res.status(200).json(evento);
            }

            // Alquiler (alq_)
            if (id.toString().startsWith('alq_')) {
                const alquilerId = parseInt(id.substring(4));
                const sql = `
                    SELECT
                        CONCAT('alq_', sa.id_solicitud) as solicitudId,
                        sa.tipo_servicio as tipoServicio,
                        sa.fecha_evento as fechaEvento,
                        sa.hora_evento as horaInicio,
                        sa.duracion as duracionEvento,
                        sa.cantidad_de_personas as cantidadPersonas,
                        sa.precio_basico as precioBase,
                        COALESCE(c.nombre, '') as nombreParaMostrar,
                        sa.tipo_de_evento as tipoEvento,
                        COALESCE(sol.es_publico, 0) as esPublico
                    FROM solicitudes_alquiler sa
                    JOIN solicitudes sol ON sa.id_solicitud = sol.id
                    LEFT JOIN clientes c ON sol.id_cliente = c.id_cliente
                    WHERE sa.id_solicitud = ?
                `;

                const [alquiler] = await conn.query(sql, [alquilerId]);
                if (!alquiler) return res.status(404).json({ error: 'Solicitud no encontrada.' });

                let adicionalesRows = [];
                try {
                    adicionalesRows = await conn.query(
                        "SELECT adicional_nombre as nombre, adicional_precio as precio FROM solicitudes_adicionales WHERE id_solicitud = ?",
                        [alquilerId]
                    );
                } catch (e) { /* ignore adicionales */ }

                const respuesta = { ...alquiler, adicionales: adicionalesRows || [] };
                return res.status(200).json(respuesta);
            }

            // Banda (bnd_)
            if (id.toString().startsWith('bnd_')) {
                const bandaId = parseInt(id.substring(4));
                const sql = `
                    SELECT
                        CONCAT('bnd_', sfb.id_solicitud) as solicitudId,
                        'BANDA' as tipoEvento,
                        sfb.fecha_evento as fechaEvento,
                        sfb.hora_evento as horaInicio,
                        sfb.duracion as duracionEvento,
                        sfb.cantidad_bandas as cantidadPersonas,
                        sfb.precio_basico as precioBase,
                        COALESCE(c.nombre, '') as nombreCompleto,
                        c.telefono as telefono,
                        c.email as email,
                        COALESCE(sfb.descripcion, b.bio) as descripcion_banda,
                        sfb.estado,
                        COALESCE(b.genero_musical, sfb.genero_musical) as genero_musical,
                        COALESCE(b.instagram, NULL) as instagram,
                        COALESCE(b.facebook, NULL) as facebook,
                        COALESCE(b.youtube, NULL) as youtube,
                        COALESCE(b.spotify, NULL) as spotify,
                        COALESCE(b.otras_redes, NULL) as otras_redes,
                        COALESCE(b.logo_url, sfb.logo_url) as logo_url,
                        COALESCE(b.contacto_rol, sfb.contacto_rol) as contacto_rol,
                        sfb.fecha_alternativa,
                        sfb.bandas_json,
                        sfb.cantidad_bandas,
                        sfb.precio_puerta_propuesto,
                        sfb.expectativa_publico,
                        sfb.notas_admin,
                        COALESCE(sol.es_publico, 0) as esPublico,
                        COALESCE(sol.descripcion_corta, '') as descripcion_corta,
                        COALESCE(sol.descripcion_larga, '') as descripcion_larga
                    FROM solicitudes_fechas_bandas sfb
                    JOIN solicitudes sol ON sfb.id_solicitud = sol.id
                    LEFT JOIN clientes c ON sol.id_cliente = c.id_cliente
                    LEFT JOIN bandas_artistas b ON sfb.id_banda = b.id_banda
                    WHERE sfb.id_solicitud = ?
                `;

                const [banda] = await conn.query(sql, [bandaId]);
                if (!banda) return res.status(404).json({ error: 'Solicitud no encontrada.' });
                return res.status(200).json(respuesta = { ...banda, adicionales: [] });
            }

            // Servicio (srv_)
            if (id.toString().startsWith('srv_')) {
                const servicioId = parseInt(id.substring(4));
                const sql = `
                    SELECT
                        CONCAT('srv_', ss.id_solicitud) as solicitudId,
                        'SERVICIO' as tipoEvento,
                        ss.fecha_evento as fechaEvento,
                        ss.hora_evento as horaInicio,
                        ss.duracion as duracionEvento,
                        ss.precio as precioBase,
                        COALESCE(c.nombre, '') as nombreParaMostrar,
                        sol.estado
                    FROM solicitudes_servicios ss
                    JOIN solicitudes sol ON ss.id_solicitud = sol.id
                    LEFT JOIN clientes c ON sol.id_cliente = c.id_cliente
                    WHERE ss.id_solicitud = ?
                `;

                const [servicio] = await conn.query(sql, [servicioId]);
                if (!servicio) return res.status(404).json({ error: 'Solicitud no encontrada.' });
                return res.status(200).json({ ...servicio, adicionales: [] });
            }

            // Taller (tll_)
            if (id.toString().startsWith('tll_')) {
                const tallerId = parseInt(id.substring(4));
                const sql = `
                    SELECT
                        CONCAT('tll_', st.id_solicitud) as solicitudId,
                        'TALLERES' as tipoEvento,
                        st.fecha_evento as fechaEvento,
                        st.hora_evento as horaInicio,
                        st.duracion as duracionEvento,
                        st.precio as precioBase,
                        COALESCE(c.nombre, '') as nombreParaMostrar,
                        sol.estado
                    FROM solicitudes_talleres st
                    JOIN solicitudes sol ON st.id_solicitud = sol.id
                    LEFT JOIN clientes c ON sol.id_cliente = c.id_cliente
                    WHERE st.id_solicitud = ?
                `;

                const [taller] = await conn.query(sql, [tallerId]);
                if (!taller) return res.status(404).json({ error: 'Solicitud no encontrada.' });
                return res.status(200).json({ ...taller, adicionales: [] });
            }
        }

        // Si es un ID numérico simple, intentamos consultar directamente cada tabla específica
        const idNum = parseInt(id, 10);
        if (!isNaN(idNum)) {
            logVerbose('[PUBLIC GET] entrando en rama numérica con idNum =', idNum);
            // 1) intentar alquiler
            const sqlAlq = `
                SELECT
                    CONCAT('alq_', sa.id_solicitud) as solicitudId,
                    sa.tipo_servicio as tipoServicio,
                    sa.fecha_evento as fechaEvento,
                    sa.hora_evento as horaInicio,
                    sa.duracion as duracionEvento,
                    sa.cantidad_de_personas as cantidadPersonas,
                    sa.precio_basico as precioBase,
                    COALESCE(c.nombre, '') as nombreParaMostrar,
                    sa.tipo_de_evento as tipoEvento,
                    COALESCE(sol.es_publico, 0) as esPublico
                FROM solicitudes_alquiler sa
                JOIN solicitudes sol ON sa.id_solicitud = sol.id
                LEFT JOIN clientes c ON sol.id_cliente = c.id_cliente
                WHERE sa.id_solicitud = ?
            `;
            const resAlq = await conn.query(sqlAlq, [idNum]);
            logVerbose('[PUBLIC GET] sqlAlq result sample:', Array.isArray(resAlq) ? (resAlq.length > 0 ? resAlq[0] : '[]') : typeof resAlq);
            const alquiler = Array.isArray(resAlq) ? resAlq[0] : resAlq;
            if (alquiler) {
                let adicionalesRows = [];
                try { adicionalesRows = await conn.query("SELECT adicional_nombre as nombre, adicional_precio as precio FROM solicitudes_adicionales WHERE id_solicitud = ?", [idNum]); } catch (e) { }
                return res.status(200).json({ ...alquiler, adicionales: adicionalesRows || [] });
            }

            // 2) intentar bandas
            const sqlBnd = `
                SELECT
                    CONCAT('bnd_', sfb.id_solicitud) as solicitudId,
                    'BANDA' as tipoEvento,
                    sfb.fecha_evento as fechaEvento,
                    sfb.hora_evento as horaInicio,
                    sfb.duracion as duracionEvento,
                    sfb.cantidad_bandas as cantidadPersonas,
                    sfb.precio_basico as precioBase,
                    COALESCE(c.nombre, '') as nombreParaMostrar,
                    sfb.estado
                FROM solicitudes_fechas_bandas sfb
                JOIN solicitudes sol ON sfb.id_solicitud = sol.id
                LEFT JOIN clientes c ON sol.id_cliente = c.id_cliente
                WHERE sfb.id_solicitud = ?
            `;
            const [banda] = await conn.query(sqlBnd, [idNum]);
            if (banda) return res.status(200).json({ ...banda, adicionales: [] });

            // 3) intentar servicios
            const sqlSrv = `
                SELECT
                    CONCAT('srv_', ss.id_solicitud) as solicitudId,
                    'SERVICIO' as tipoEvento,
                    ss.fecha_evento as fechaEvento,
                    ss.hora_evento as horaInicio,
                    ss.duracion as duracionEvento,
                    ss.precio as precioBase,
                    COALESCE(c.nombre, '') as nombreParaMostrar,
                    sol.estado
                FROM solicitudes_servicios ss
                JOIN solicitudes sol ON ss.id_solicitud = sol.id
                LEFT JOIN clientes c ON sol.id_cliente = c.id_cliente
                WHERE ss.id_solicitud = ?
            `;
            const [servicio] = await conn.query(sqlSrv, [idNum]);
            if (servicio) return res.status(200).json({ ...servicio, adicionales: [] });

            // 4) intentar talleres
            const sqlTll = `
                SELECT
                    CONCAT('tll_', st.id_solicitud) as solicitudId,
                    'TALLERES' as tipoEvento,
                    st.fecha_evento as fechaEvento,
                    st.hora_evento as horaInicio,
                    st.duracion as duracionEvento,
                    st.precio as precioBase,
                    COALESCE(c.nombre, '') as nombreParaMostrar,
                    sol.estado
                FROM solicitudes_talleres st
                JOIN solicitudes sol ON st.id_solicitud = sol.id
                LEFT JOIN clientes c ON sol.id_cliente = c.id_cliente
                WHERE st.id_solicitud = ?
            `;
            const [taller] = await conn.query(sqlTll, [idNum]);
            if (taller) return res.status(200).json({ ...taller, adicionales: [] });
        }

        return res.status(404).json({ error: 'Solicitud no encontrada.' });

    } catch (err) {
        logError(`Error al obtener la solicitud (público) ${id}:`, err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    } finally {
        if (conn) conn.release();
    }
};

// Y no olvides exportarla:
module.exports = {
    crearSolicitud,
    getSolicitudPorId,
    getSolicitudPublicById,
    actualizarSolicitud,
    finalizarSolicitud,
    guardarAdicionales,
    obtenerAdicionales,
    getSesionExistente,
    getSolicitudesPublicas,
    updateVisibilidad
};