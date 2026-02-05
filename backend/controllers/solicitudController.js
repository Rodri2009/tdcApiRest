// backend/controllers/solicitudController.js
const pool = require('../db');
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
        fingerprintId,
        nombreCompleto,
        nombre_solicitante,
        telefono,
        telefono_solicitante,
        email,
        email_solicitante,
        descripcion
    } = req.body;

    // Usar nombre_solicitante si nombreCompleto no existe
    const nombreFinal = nombreCompleto || nombre_solicitante || '';
    const telefonoFinal = telefono || telefono_solicitante || '';
    const emailFinal = email || email_solicitante || '';

    console.log("[DEBUG] nombreFinal:", nombreFinal, "telefonoFinal:", telefonoFinal, "emailFinal:", emailFinal);

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
        const sqlGeneral = `
            INSERT INTO solicitudes (categoria, fecha_creacion, estado, descripcion, nombre_solicitante, telefono_solicitante, email_solicitante)
            VALUES (?, NOW(), 'Solicitado', ?, ?, ?, ?)
        `;
        const paramsGeneral = [
            categoria,
            descripcion || '',
            nombreFinal,
            telefonoFinal,
            emailFinal
        ];
        const resultGeneral = await conn.query(sqlGeneral, paramsGeneral);
        const newId = Number(resultGeneral.insertId);

        if (esBanda) {
            // 2. Insertar en la tabla específica 'solicitudes_bandas' (todas las columnas y en el orden exacto del SQL)
            const sqlBandas = `
                INSERT INTO solicitudes_bandas (
                    id_solicitud, tipo_de_evento, tipo_servicio, es_publico, fecha_hora, fecha_evento, hora_evento, duracion,
                    cantidad_de_personas, precio_basico, precio_final, nombre_completo, telefono, email, descripcion, estado, fingerprintid,
                    id_banda, genero_musical, formacion_json, instagram, facebook, youtube, spotify, otras_redes, logo_url, contacto_rol,
                    fecha_alternativa, invitadas_json, cantidad_bandas, precio_puerta_propuesto, expectativa_publico, notas_admin, id_evento_generado
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const now = new Date();
            let paramsBandas = [
                newId, // id_solicitud
                tipoEvento || 'FECHA_BANDAS', // tipo_de_evento
                null, // tipo_servicio
                0, // es_publico
                now, // fecha_hora
                req.body.fechaEvento || null, // fecha_evento
                req.body.horaInicio || null, // hora_evento
                req.body.duracionEvento || null, // duracion
                req.body.cantidadPersonas ? String(req.body.cantidadPersonas) : null, // cantidad_de_personas
                req.body.precioBase ? parseFloat(req.body.precioBase) : null, // precio_basico
                null, // precio_final
                nombreFinal, // nombre_completo
                telefonoFinal, // telefono
                emailFinal, // email
                req.body.descripcion || '', // descripcion
                'Solicitado', // estado
                req.body.fingerprintId || null, // fingerprintid
                null, // id_banda
                req.body.genero_musical || null, // genero_musical
                req.body.formacion_json || null, // formacion_json
                req.body.instagram || null, // instagram
                req.body.facebook || null, // facebook
                req.body.youtube || null, // youtube
                req.body.spotify || null, // spotify
                req.body.otras_redes || null, // otras_redes
                req.body.logo_url || null, // logo_url
                req.body.contacto_rol || null, // contacto_rol
                req.body.fecha_alternativa || null, // fecha_alternativa
                req.body.invitadas_json || null, // invitadas_json
                req.body.cantidad_bandas ? parseInt(req.body.cantidad_bandas) : 1, // cantidad_bandas
                req.body.precio_puerta_propuesto ? parseFloat(req.body.precio_puerta_propuesto) : null, // precio_puerta_propuesto
                req.body.expectativa_publico || null, // expectativa_publico
                req.body.notas_admin || null, // notas_admin
                null // id_evento_generado
            ];
            // Forzar exactamente 34 valores (coincidiendo con el SQL INSERT que tiene 34 columnas)
            paramsBandas = paramsBandas.slice(0, 34);
            while (paramsBandas.length < 34) paramsBandas.push(null);
            console.log('paramsBandas FINAL:', paramsBandas.length, 'valores:', paramsBandas);
            await conn.query(sqlBandas, paramsBandas);
        } else {
            // 2. Insertar en la tabla específica 'solicitudes_alquiler'
            const sqlAlquiler = `
                INSERT INTO solicitudes_alquiler (
                    id, tipo_servicio, fecha_evento, hora_evento, duracion,
                    cantidad_de_personas, precio_basico, precio_final, es_publico, 
                    tipo_de_evento, nombre_completo, telefono, email, descripcion, estado
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const paramsAlquiler = [
                newId,                                      // id
                tipoEvento,                                 // tipo_servicio
                fechaEvento,                                // fecha_evento
                horaInicio,                                 // hora_evento
                duracionEvento,                             // duracion
                cantidadPersonas,                           // cantidad_de_personas
                parseFloat(precioBase) || 0,               // precio_basico
                null,                                       // precio_final
                0,                                          // es_publico
                tipoEvento,                                 // tipo_de_evento
                nombreFinal,                                // nombre_completo
                telefonoFinal,                              // telefono
                emailFinal,                                 // email
                descripcion || '',                          // descripcion
                'Solicitado'                                // estado
            ];
            await conn.query(sqlAlquiler, paramsAlquiler);
        }

        await conn.commit();
        const respuesta = { solicitudId: newId };
        console.log(`Nueva solicitud creada con ID: ${newId}. Enviando respuesta:`, respuesta);
        res.status(201).json(respuesta);

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
                    DATE_FORMAT(e.fecha_evento, '%Y-%m-%d') as fechaEvento,
                    TIME_FORMAT(e.hora_inicio, '%H:%i') as horaInicio,
                    e.precio_base as precioBase,
                    e.nombre_evento as nombreCompleto,
                    NULL as telefono,
                    NULL as email,
                    e.descripcion,
                    CASE WHEN e.activo = 1 THEN 'Confirmado' ELSE 'Solicitado' END as estado,
                    e.tipo_evento as nombreParaMostrar,
                    e.nombre_evento as nombreBanda,
                    NULL as bandaContactoEmail,
                    NULL as bandaLinkMusica,
                    NULL as bandaPropuesta,
                    NULL as bandaEventId,
                    NULL as bandaInvitados,
                    NULL as bandaPrecioAnticipada,
                    e.precio_final as bandaPrecioPuerta
                FROM eventos_confirmados e
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

        // Verificar si es una solicitud de alquiler (prefijo alq_)
        if (id && id.toString().startsWith('alq_')) {
            const alquilerId = parseInt(id.substring(4)); // Remover 'alq_' y convertir a número
            console.log(`[SOLICITUD][GET] Detectado alquiler con ID: ${alquilerId}`);

            const sql = `
                SELECT
                    CONCAT('alq_', sa.id) as solicitudId,
                    sa.tipo_servicio as tipoServicio,
                    sa.fecha_evento as fechaEvento,
                    sa.hora_evento as horaInicio,
                    sa.duracion as duracionEvento,
                    sa.cantidad_de_personas as cantidadPersonas,
                    sa.precio_basico as precioBase,
                    sa.descripcion,
                    sa.estado,
                    sa.nombre_completo as nombreCompleto,
                    sa.telefono as telefono,
                    sa.email as email,
                    sa.tipo_de_evento as tipoEvento,
                    sa.es_publico as esPublico
                FROM solicitudes_alquiler sa
                WHERE sa.id_solicitud = ?
            `;

            const [alquiler] = await conn.query(sql, [alquilerId]);

            if (!alquiler) {
                console.warn(`[SOLICITUD][GET] Alquiler no encontrado: ${alquilerId}`);
                return res.status(404).json({ error: 'Solicitud no encontrada.' });
            }

            const respuesta = {
                ...alquiler,
                adicionales: []
            };

            console.log(`[SOLICITUD][GET] Alquiler obtenido: ${alquiler.nombreCompleto}`);
            return res.status(200).json(respuesta);
        }

        // Verificar si es una solicitud de banda (prefijo bnd_)
        if (id && id.toString().startsWith('bnd_')) {
            const bandaId = parseInt(id.substring(4)); // Remover 'bnd_' y convertir a número
            console.log(`[SOLICITUD][GET] Detectado banda con ID: ${bandaId}`);

            const sql = `
                SELECT
                    CONCAT('bnd_', sb.id_solicitud) as solicitudId,
                    sb.tipo_de_evento as tipoEvento,
                    sb.fecha_evento as fechaEvento,
                    sb.hora_evento as horaInicio,
                    sb.duracion as duracionEvento,
                    sb.cantidad_de_personas as cantidadPersonas,
                    sb.precio_basico as precioBase,
                    sb.nombre_completo as nombreCompleto,
                    sb.telefono as telefono,
                    sb.email as email,
                    sb.descripcion,
                    sb.estado,
                    sb.genero_musical,
                    sb.instagram,
                    sb.facebook,
                    sb.youtube,
                    sb.spotify,
                    sb.otras_redes,
                    sb.logo_url,
                    sb.contacto_rol,
                    sb.fecha_alternativa,
                    sb.invitadas_json,
                    sb.cantidad_bandas,
                    sb.precio_puerta_propuesto,
                    sb.expectativa_publico,
                    sb.notas_admin,
                    sb.es_publico as esPublico
                FROM solicitudes_bandas sb
                WHERE sb.id_solicitud = ?
            `;

            const [banda] = await conn.query(sql, [bandaId]);

            if (!banda) {
                console.warn(`[SOLICITUD][GET] Banda no encontrada: ${bandaId}`);
                return res.status(404).json({ error: 'Solicitud no encontrada.' });
            }

            const respuesta = {
                ...banda,
                adicionales: []
            };

            console.log(`[SOLICITUD][GET] Banda obtenida: ${banda.nombreCompleto}`);
            return res.status(200).json(respuesta);
        }

        // Verificar si es una solicitud de servicio (prefijo srv_)
        if (id && id.toString().startsWith('srv_')) {
            const servicioId = parseInt(id.substring(4)); // Remover 'srv_' y convertir a número
            console.log(`[SOLICITUD][GET] Detectado servicio con ID: ${servicioId}`);

            const sql = `
                SELECT
                    CONCAT('srv_', ss.id_solicitud) as solicitudId,
                    'SERVICIO' as tipoEvento,
                    ss.fecha_evento as fechaEvento,
                    ss.hora_evento as horaInicio,
                    ss.duracion as duracionEvento,
                    NULL as cantidadPersonas,
                    ss.precio as precioBase,
                    sol.nombre_solicitante as nombreCompleto,
                    sol.telefono_solicitante as telefono,
                    sol.email_solicitante as email,
                    sol.descripcion,
                    sol.estado,
                    ss.tipo_servicio as tipoServicio,
                    0 as esPublico
                FROM solicitudes_servicios ss
                JOIN solicitudes sol ON ss.id_solicitud = sol.id
                WHERE ss.id_solicitud = ?
            `;

            const [servicio] = await conn.query(sql, [servicioId]);

            if (!servicio) {
                console.warn(`[SOLICITUD][GET] Servicio no encontrado: ${servicioId}`);
                return res.status(404).json({ error: 'Solicitud no encontrada.' });
            }

            const respuesta = {
                ...servicio,
                adicionales: []
            };

            console.log(`[SOLICITUD][GET] Servicio obtenido: ${servicio.nombreCompleto}`);
            return res.status(200).json(respuesta);
        }

        // Verificar si es una solicitud de taller (prefijo tll_)
        if (id && id.toString().startsWith('tll_')) {
            const tallerId = parseInt(id.substring(4)); // Remover 'tll_' y convertir a número
            console.log(`[SOLICITUD][GET] Detectado taller con ID: ${tallerId}`);

            const sql = `
                SELECT
                    CONCAT('tll_', st.id) as solicitudId,
                    'TALLERES' as tipoEvento,
                    st.fecha_evento as fechaEvento,
                    st.hora_evento as horaInicio,
                    st.duracion as duracionEvento,
                    NULL as cantidadPersonas,
                    st.precio as precioBase,
                    sol.nombre_solicitante as nombreCompleto,
                    sol.telefono_solicitante as telefono,
                    sol.email_solicitante as email,
                    sol.descripcion,
                    sol.estado,
                    st.nombre_taller as nombreTaller,
                    0 as esPublico
                FROM solicitudes_talleres st
                JOIN solicitudes sol ON st.id_solicitud = sol.id
                WHERE st.id_solicitud = ?
            `;

            const [taller] = await conn.query(sql, [tallerId]);

            if (!taller) {
                console.warn(`[SOLICITUD][GET] Taller no encontrado: ${tallerId}`);
                return res.status(404).json({ error: 'Solicitud no encontrada.' });
            }

            const respuesta = {
                ...taller,
                adicionales: []
            };

            console.log(`[SOLICITUD][GET] Taller obtenido: ${taller.nombreCompleto}`);
            return res.status(200).json(respuesta);
        }

        // Si no tiene prefijo conocido, devolver error
        console.warn(`[SOLICITUD][GET] ID no reconocido: ${id}`);
        return res.status(404).json({ error: 'Solicitud no encontrada.' });

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
        await conn.beginTransaction();

        // Actualizar datos en la tabla general 'solicitudes'
        const sqlUpdateGeneral = `
            UPDATE solicitudes SET 
                nombre_solicitante = ?, 
                telefono_solicitante = ?, 
                email_solicitante = ?, 
                descripcion = ?, 
                estado = 'Solicitado'
            WHERE id = ?
        `;
        const paramsUpdateGeneral = [nombreCompleto, celular, email, detallesAdicionales, id];
        const resultGeneral = await conn.query(sqlUpdateGeneral, paramsUpdateGeneral);

        if (resultGeneral.affectedRows === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'La solicitud a actualizar no fue encontrada.' });
        }

        // Actualizar datos en la tabla 'solicitudes_alquiler'
        const sqlUpdateAlquiler = `
            UPDATE solicitudes_alquiler SET 
                nombre_completo = ?, 
                telefono = ?, 
                email = ?, 
                descripcion = ?
            WHERE id = ?
        `;
        const paramsUpdateAlquiler = [nombreCompleto, celular, email, detallesAdicionales, id];
        await conn.query(sqlUpdateAlquiler, paramsUpdateAlquiler);

        // Obtener los datos completos para los emails
        const sqlSelect = `
            SELECT s.*, sa.* FROM solicitudes s LEFT JOIN solicitudes_alquiler sa ON s.id = sa.id_solicitud WHERE s.id = ?
        `;
        const [solicitudCompleta] = await conn.query(sqlSelect, [id]);

        await conn.commit();
        res.status(200).json({ message: 'Solicitud creada como solicitada.', solicitudId: parseInt(id) });
        console.log(`Solicitud ${id} creada como solicitada. Respuesta enviada al cliente.`);

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
        console.error(`Error al finalizar la solicitud ${id}:`, err);
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
        nombreCompleto,
        nombre_solicitante,
        telefono,
        telefono_solicitante,
        email,
        email_solicitante,
        descripcion,
        detallesAdicionales
    } = req.body;

    // Usar el nombre correcto si viene en snake_case
    const nombreFinal = nombreCompleto || nombre_solicitante || '';
    const telefonoFinal = telefono || telefono_solicitante || '';
    const emailFinal = email || email_solicitante || '';

    console.log(`[SOLICITUD][EDIT] Campos básicos: tipo=${tipoEvento}, cantidad=${cantidadPersonas}, duración=${duracionEvento}`);

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        // Actualizar datos en la tabla general 'solicitudes'
        const sqlUpdateGeneral = `
            UPDATE solicitudes SET 
                descripcion = ?,
                nombre_solicitante = ?,
                telefono_solicitante = ?,
                email_solicitante = ?
            WHERE id = ?
        `;
        const paramsUpdateGeneral = [
            descripcion || detallesAdicionales || '',
            nombreFinal,
            telefonoFinal,
            emailFinal,
            id
        ];
        await conn.query(sqlUpdateGeneral, paramsUpdateGeneral);

        // Actualizar datos en la tabla específica 'solicitudes_alquiler'
        const sqlUpdateAlquiler = `
            UPDATE solicitudes_alquiler SET
                tipo_servicio = ?,
                cantidad_de_personas = ?,
                duracion = ?,
                fecha_evento = ?,
                hora_evento = ?,
                precio_basico = ?,
                nombre_completo = ?,
                telefono = ?,
                email = ?,
                descripcion = ?
            WHERE id = ?
        `;
        const paramsAlquiler = [
            tipoEvento || '',
            cantidadPersonas || '',
            duracionEvento || '',
            fechaEvento || null,
            horaInicio || '',
            parseFloat(precioBase) || 0,
            nombreFinal,
            telefonoFinal,
            emailFinal,
            descripcion || detallesAdicionales || '',
            id
        ];
        await conn.query(sqlUpdateAlquiler, paramsAlquiler);

        await conn.commit();
        const respuesta = { solicitudId: parseInt(id) };
        console.log(`[SOLICITUD][EDIT] Solicitud ID: ${id} actualizada exitosamente`);
        res.status(200).json(respuesta);
    } catch (err) {
        if (conn) await conn.rollback();
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

        // --- ¡CONSULTA SQL CORREGIDA! ---
        // Buscar en solicitudes_alquiler y hacer JOIN con solicitudes para obtener la información completa
        const sql = `
            SELECT
                sa.id as solicitudId,
                sa.tipo_de_evento as tipoEvento,
                sa.tipo_servicio as tipoServicio,
                sa.cantidad_de_personas as cantidadPersonas,
                sa.duracion as duracionEvento,
                DATE_FORMAT(sa.fecha_evento, '%Y-%m-%d') as fechaEvento,
                sa.hora_evento as horaInicio
            FROM solicitudes_alquiler sa
            WHERE sa.id IN (
                SELECT s.id FROM solicitudes s 
                WHERE s.id = sa.id
            )
            ORDER BY sa.id DESC
            LIMIT 1
        `;

        const [sesion] = await conn.query(sql);

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
 * Obtiene todas las fechas públicas confirmadas para la agenda cultural.
 * Incluye fechas de bandas, talleres/actividades y servicios públicos.
 */
const getSolicitudesPublicas = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();

        // Consultar fechas de bandas confirmadas
        const bandasQuery = `
            SELECT
                id_solicitud as id,
                'BANDA' as tipoEvento,
                fecha_evento as fechaEvento,
                hora_evento as horaEvento,
                duracion,
                cantidad_de_personas as cantidad,
                precio_basico as precio,
                nombre_completo as nombreCompleto,
                descripcion,
                es_publico as esPublico
            FROM solicitudes_bandas
            WHERE es_publico = 1
              AND estado = 'Confirmado'
              AND fecha_evento >= CURDATE()
        `;
        const bandas = await conn.query(bandasQuery);

        // Consultar fechas de talleres/actividades confirmadas
        const talleresQuery = `
            SELECT
                id as id,
                'TALLER' as tipoEvento,
                fecha_evento as fechaEvento,
                hora_evento as horaEvento,
                duracion,
                NULL as cantidad, -- La columna no existe en la tabla
                precio as precio,
                nombre_taller as nombreCompleto,
                NULL as descripcion,
                1 as esPublico
            FROM solicitudes_talleres
            WHERE fecha_evento >= CURDATE()
        `;
        const talleres = await conn.query(talleresQuery);

        // Consultar fechas de servicios públicos confirmados
        const serviciosQuery = `
            SELECT
                id as id,
                'SERVICIO' as tipoEvento,
                fecha_evento as fechaEvento,
                hora_evento as horaEvento,
                duracion,
                NULL as cantidad, -- La columna no existe en la tabla
                precio as precio,
                tipo_servicio as nombreCompleto,
                NULL as descripcion,
                1 as esPublico
            FROM solicitudes_servicios
            WHERE fecha_evento >= CURDATE()
        `;
        const servicios = await conn.query(serviciosQuery);

        // Combinar resultados
        const resultados = [...bandas, ...talleres, ...servicios];

        // Ordenar por fecha
        resultados.sort((a, b) => new Date(a.fechaEvento) - new Date(b.fechaEvento));

        return res.status(200).json(resultados);
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

    console.log(`[VISIBILIDAD][REQ] id recibido: ${id}, es_publico: ${es_publico}`);

    if (typeof es_publico === 'undefined') {
        return res.status(400).json({ message: 'Falta el campo es_publico' });
    }

    let conn;
    try {
        conn = await pool.getConnection();

        // Soportar IDs con prefijos: alq_, bnd_, srv_, tll_, ev_
        let tabla = null;
        let idColumnName = null;
        let publicColumn = 'es_publico';
        let idValue = id; // por defecto puede ser numérico o con prefijo

        if (String(id).startsWith('alq_')) {
            idValue = parseInt(String(id).substring(4), 10);
            tabla = 'solicitudes_alquiler';
            idColumnName = 'id_solicitud';
            publicColumn = 'es_publico';
        } else if (String(id).startsWith('bnd_')) {
            idValue = parseInt(String(id).substring(4), 10);
            tabla = 'solicitudes_bandas';
            idColumnName = 'id_solicitud';
            publicColumn = 'es_publico';
        } else if (String(id).startsWith('srv_')) {
            idValue = parseInt(String(id).substring(4), 10);
            tabla = 'solicitudes_servicios';
            idColumnName = 'id_solicitud';
            // Servicios usan es_publico_cuando_confirmada en la tabla padre `solicitudes`
            publicColumn = 'es_publico_cuando_confirmada';
        } else if (String(id).startsWith('tll_')) {
            idValue = parseInt(String(id).substring(4), 10);
            tabla = 'solicitudes_talleres';
            idColumnName = 'id_solicitud';
            publicColumn = 'es_publico_cuando_confirmada';
        } else if (String(id).startsWith('ev_')) {
            // Evento confirmado (eventos_confirmados)
            idValue = parseInt(String(id).substring(3), 10);
            tabla = 'eventos_confirmados';
            idColumnName = 'id';
            publicColumn = 'es_publico';
        } else {
            // Intentar detectar en las tablas con ID numérico
            // Primero alquiler
            let [found] = await conn.query('SELECT id_solicitud FROM solicitudes_alquiler WHERE id_solicitud = ?', [id]);
            if (found) {
                tabla = 'solicitudes_alquiler';
                idColumnName = 'id_solicitud';
                publicColumn = 'es_publico';
                idValue = id;
            } else {
                [found] = await conn.query('SELECT id_solicitud FROM solicitudes_bandas WHERE id_solicitud = ?', [id]);
                if (found) {
                    tabla = 'solicitudes_bandas';
                    idColumnName = 'id_solicitud';
                    publicColumn = 'es_publico';
                    idValue = id;
                }
            }
        }

        if (!tabla) {
            return res.status(404).json({ message: 'Solicitud no encontrada' });
        }

        // Actualizar la columna correspondiente (es_publico o es_publico_cuando_confirmada)
        let result;
        try {
            result = await conn.query(
                `UPDATE ${tabla} SET ${publicColumn} = ? WHERE ${idColumnName} = ?`,
                [es_publico ? 1 : 0, idValue]
            );

            // También actualizar la visibilidad en la tabla padre `solicitudes` para que
            // la vista administrativa y la agenda pública muestren el valor final.
            if (tabla !== 'eventos_confirmados') {
                await conn.query(`UPDATE solicitudes SET es_publico = ? WHERE id = ?`, [es_publico ? 1 : 0, idValue]);
            }
        } catch (err) {
            // Si es por columna desconocida, intentar un fallback a 'es_publico' o 'es_publico_cuando_confirmada'
            if (err && err.sqlState === '42S22') {
                const altColumn = publicColumn === 'es_publico' ? 'es_publico_cuando_confirmada' : 'es_publico';
                try {
                    result = await conn.query(
                        `UPDATE ${tabla} SET ${altColumn} = ? WHERE ${idColumnName} = ?`,
                        [es_publico ? 1 : 0, idValue]
                    );
                    if (tabla !== 'eventos_confirmados') {
                        await conn.query(`UPDATE solicitudes SET es_publico = ? WHERE id = ?`, [es_publico ? 1 : 0, idValue]);
                    }
                } catch (err2) {
                    console.warn('Fallback update column also failed:', err2.message);
                    throw err; // dejar que el catch externo maneje el error
                }
            } else {
                throw err;
            }
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Solicitud no encontrada' });
        }

        // Si la solicitud tiene un evento confirmado asociado, propagar la visibilidad
        // Buscamos por id_solicitud y tabla_origen
        if (tabla !== 'eventos_confirmados') {
            try {
                await conn.query(`UPDATE eventos_confirmados SET es_publico = ? WHERE id_solicitud = ? AND tabla_origen = ?`, [es_publico ? 1 : 0, idValue, tabla]);
            } catch (err) {
                // No crítico, informar en logs pero no fallar la petición
                console.warn('No se pudo propagar es_publico a eventos_confirmados:', err.message);
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