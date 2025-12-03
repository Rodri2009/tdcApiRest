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

        // --- ¡CORRECCIÓN FINAL! ---
        // Ahora: tipo_de_evento es ENUM('ALQUILER_SALON') fijo
        //        tipo_servicio es VARCHAR con el subtipo (CON_SERVICIO_DE_MESA, INFORMALES, etc.)
        const sql = `
            INSERT INTO solicitudes (
                fecha_hora, tipo_de_evento, tipo_servicio, cantidad_de_personas, duracion, 
                fecha_evento, hora_evento, precio_basico, estado, fingerprintid
            ) VALUES (NOW(), 'ALQUILER_SALON', ?, ?, ?, ?, ?, ?, 'Solicitado', ?);
        `;

        const params = [
            tipoEvento,  // Este va en tipo_servicio (ej: 'CON_SERVICIO_DE_MESA')
            cantidadPersonas,
            duracionEvento,
            fechaEvento,
            horaInicio,
            parseFloat(precioBase) || 0,
            fingerprintId
        ];

        const result = await conn.query(sql, params);

        if (result.affectedRows > 0) {
            const newId = Number(result.insertId);
            // Si la request trae datos estructurados de banda, los persistimos en bandas_solicitudes
            try {
                const { nombre_banda, contacto_email, link_musica, propuesta, event_id, precio_anticipada, precio_puerta } = req.body;
                if (nombre_banda || contacto_email || link_musica || propuesta || event_id || precio_anticipada || precio_puerta) {
                    try {
                        await conn.query("ALTER TABLE bandas_solicitudes ADD COLUMN IF NOT EXISTS precio_anticipada DECIMAL(10,2) NULL;");
                        await conn.query("ALTER TABLE bandas_solicitudes ADD COLUMN IF NOT EXISTS precio_puerta DECIMAL(10,2) NULL;");
                    } catch (alterErr) {
                        console.warn('Advertencia: no se pudo asegurar columnas de precios en bandas_solicitudes al crear:', alterErr.message || alterErr);
                    }
                    const insertBandSql = `
                            INSERT INTO bandas_solicitudes (id_solicitud, nombre_banda, contacto_email, link_musica, propuesta, event_id, precio_anticipada, precio_puerta, created_at, updated_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                        `;
                    await conn.query(insertBandSql, [newId, nombre_banda || null, contacto_email || null, link_musica || null, propuesta || null, event_id || null, precio_anticipada || null, precio_puerta || null]);
                }
            } catch (err) {
                console.warn('No se pudo insertar en bandas_solicitudes al crear solicitud:', err.message);
            }

            const respuesta = { solicitudId: newId };
            console.log(`Nueva solicitud creada con ID: ${newId}. Enviando respuesta:`, respuesta);
            res.status(201).json(respuesta);
        } else {
            throw new Error('La inserción en la base de datos no afectó ninguna fila.');
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
                    DATE_FORMAT(e.fecha_hora, '%Y-%m-%d') as fechaEvento,
                    DATE_FORMAT(e.fecha_hora, '%H:%i') as horaInicio,
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

        // --- Construir consulta de forma dinámica según columnas disponibles ---
        // Algunos entornos aún no tienen las columnas de precio en `bandas_solicitudes`.
        const colsInfo = await conn.query(
            "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'bandas_solicitudes' AND COLUMN_NAME IN ('precio_anticipada','precio_puerta')",
            [process.env.DB_NAME]
        );
        const hasPrecioAnt = colsInfo.some(c => c.COLUMN_NAME === 'precio_anticipada');
        const hasPrecioPuerta = colsInfo.some(c => c.COLUMN_NAME === 'precio_puerta');

        const extraCols = [];
        if (hasPrecioAnt) extraCols.push('bs.precio_anticipada as bandaPrecioAnticipada');
        else extraCols.push('NULL as bandaPrecioAnticipada');
        if (hasPrecioPuerta) extraCols.push('bs.precio_puerta as bandaPrecioPuerta');
        else extraCols.push('NULL as bandaPrecioPuerta');

        const sql = `
            SELECT 
                s.id_solicitud as solicitudId,
                s.tipo_servicio as tipoEvento,
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
                ot.nombre_para_mostrar as nombreParaMostrar,
                bs.nombre_banda as nombreBanda,
                bs.contacto_email as bandaContactoEmail,
                bs.link_musica as bandaLinkMusica,
                bs.propuesta as bandaPropuesta,
                bs.event_id as bandaEventId,
                bs.invitados as bandaInvitados,
                ${extraCols.join(',\n                ')}
            FROM solicitudes s
            LEFT JOIN opciones_tipos ot ON s.tipo_servicio = ot.id_evento
            LEFT JOIN bandas_solicitudes bs ON s.id_solicitud = bs.id_solicitud
            WHERE s.id_solicitud = ?;
        `;

        const [solicitud] = await conn.query(sql, [id]);

        if (!solicitud) {
            console.warn(`[SOLICITUD][GET] Solicitud no encontrada: ${id}`);
            return res.status(404).json({ error: 'Solicitud no encontrada.' });
        }

        const adicionales = await conn.query("SELECT adicional_nombre as nombre, adicional_precio as precio FROM solicitudes_adicionales WHERE id_solicitud = ?", [id]);

        const respuesta = {
            ...solicitud,
            adicionales: adicionales || []
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

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'La solicitud a actualizar no fue encontrada.' });
        }

        // --- LÓGICA DE EMAIL SEPARADA ---
        // Obtenemos los datos completos para los emails
        const sqlSelect = `
            SELECT s.*, ot.nombre_para_mostrar, ot.descripcion as descripcion_evento 
            FROM solicitudes s
            LEFT JOIN opciones_tipos ot ON s.tipo_servicio = ot.id_evento
            WHERE s.id_solicitud = ?;
        `;
        const [solicitudCompleta] = await conn.query(sqlSelect, [id]);


        // Obtenemos los adicionales
        const adicionales = await conn.query("SELECT * FROM solicitudes_adicionales WHERE id_solicitud = ?", [id]);
        solicitudCompleta.adicionales = adicionales;

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
                    // Upsert main contact and invited emails into bandas_solicitudes
                    const upsertSql = `
                        INSERT INTO bandas_solicitudes (id_solicitud, contacto_email, invitados, updated_at)
                        VALUES (?, ?, ?, NOW())
                        ON DUPLICATE KEY UPDATE contacto_email = VALUES(contacto_email), invitados = VALUES(invitados), updated_at = NOW();
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
            UPDATE solicitudes SET
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

        // Si es una solicitud de banda, persistimos los campos estructurados en bandas_solicitudes
        try {
            if (['FECHA_EN_VIVO', 'FECHA_BANDAS', 'BANDA'].includes((tipoEvento || '').toUpperCase())) {
                const { nombre_banda, contacto_email, link_musica, propuesta, event_id, precio_anticipada, precio_puerta } = req.body;
                console.log(`[SOLICITUD][BANDA] Guardando datos de banda para ID: ${id}`);

                // Asegurarnos de que las columnas de precio existan (migración dinámica segura)
                try {
                    await conn.query("ALTER TABLE bandas_solicitudes ADD COLUMN IF NOT EXISTS precio_anticipada DECIMAL(10,2) NULL;");
                    await conn.query("ALTER TABLE bandas_solicitudes ADD COLUMN IF NOT EXISTS precio_puerta DECIMAL(10,2) NULL;");
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
                    INSERT INTO bandas_solicitudes (id_solicitud, nombre_banda, contacto_email, link_musica, propuesta, event_id, precio_anticipada, precio_puerta, created_at, updated_at)
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

        // --- ¡CONSULTA SQL CORREGIDA! ---
        // Usamos los nombres de columna snake_case y los alias correctos que el frontend espera.
        const sql = `
            SELECT 
                id_solicitud as solicitudId, 
                tipo_servicio as tipoEvento, 
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

// Y no olvides exportarla:
module.exports = {
    crearSolicitud,
    getSolicitudPorId,
    actualizarSolicitud,
    finalizarSolicitud,
    guardarAdicionales,
    obtenerAdicionales,
    getSesionExistente
};