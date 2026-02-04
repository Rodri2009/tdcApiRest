// backend/controllers/bandasController.js
// API para gestión de bandas/artistas y solicitudes de fechas

const pool = require('../db');

// Helper para convertir BigInt a Number (MariaDB devuelve BigInt para COUNT, etc.)
const serializeBigInt = (obj) => {
    return JSON.parse(JSON.stringify(obj, (key, value) =>
        typeof value === 'bigint' ? Number(value) : value
    ));
};

// =============================================================================
// CATÁLOGO DE BANDAS/ARTISTAS
// =============================================================================

/**
 * GET /api/bandas
 * Lista todas las bandas activas (público) o todas (admin)
 */
const getBandas = async (req, res) => {
    try {
        const isAdmin = req.user && req.user.rol === 'admin';
        const { buscar, genero, verificada } = req.query;

        let query = `
            SELECT 
                b.*,
                (SELECT COUNT(*) FROM bandas_formacion WHERE id_banda = b.id) as cantidad_integrantes
            FROM bandas_artistas b
            WHERE 1=1
        `;
        const params = [];

        // Filtrar por activas si no es admin
        if (!isAdmin) {
            query += ' AND b.activa = 1';
        }

        // Búsqueda por nombre
        if (buscar) {
            query += ' AND b.nombre LIKE ?';
            params.push(`%${buscar}%`);
        }

        // Filtrar por género
        if (genero) {
            query += ' AND b.genero_musical LIKE ?';
            params.push(`%${genero}%`);
        }

        // Filtrar por verificadas
        if (verificada !== undefined) {
            query += ' AND b.verificada = ?';
            params.push(verificada === 'true' || verificada === '1' ? 1 : 0);
        }

        query += ' ORDER BY b.nombre ASC';

        const bandas = await pool.query(query, params);
        res.json(serializeBigInt(bandas));
    } catch (err) {
        console.error('Error al obtener bandas:', err);
        res.status(500).json({ error: 'Error al obtener bandas' });
    }
};

/**
 * GET /api/bandas/:id
 * Obtiene una banda con su formación completa
 */
const getBandaById = async (req, res) => {
    try {
        const { id } = req.params;

        // Obtener datos de la banda
        const [banda] = await pool.query(
            'SELECT * FROM bandas_artistas WHERE id = ?',
            [id]
        );

        if (!banda) {
            return res.status(404).json({ error: 'Banda no encontrada' });
        }

        // Obtener formación
        const formacion = await pool.query(
            'SELECT * FROM bandas_formacion WHERE id_banda = ? ORDER BY es_lider DESC, instrumento',
            [id]
        );

        // Obtener eventos donde participó
        const eventos = await pool.query(`
            SELECT 
                e.id, e.nombre_banda as titulo_evento, e.fecha, e.hora_inicio,
                el.es_principal, el.orden_show, el.estado
            FROM eventos_lineup el
            JOIN eventos e ON el.id_evento = e.id
            WHERE el.id_banda = ? AND e.activo = 1
            ORDER BY e.fecha DESC
            LIMIT 10
        `, [id]);

        res.json({
            ...banda,
            formacion,
            eventos
        });
    } catch (err) {
        console.error('Error al obtener banda:', err);
        res.status(500).json({ error: 'Error al obtener banda' });
    }
};

/**
 * POST /api/bandas
 * Crea una nueva banda (público: desde solicitud, admin: directo)
 */
const createBanda = async (req, res) => {
    try {
        const {
            nombre, genero_musical, bio,
            instagram, facebook, twitter, tiktok, web_oficial, youtube, spotify, otras_redes,
            logo_url, foto_prensa_url,
            contacto_nombre, contacto_email, contacto_telefono, contacto_rol,
            formacion // Array de {instrumento, nombre_integrante?, es_lider?, notas?}
        } = req.body;

        if (!nombre) {
            return res.status(400).json({ error: 'El nombre de la banda es requerido' });
        }

        // Verificar si ya existe
        const [existente] = await pool.query(
            'SELECT id FROM bandas_artistas WHERE LOWER(nombre) = LOWER(?)',
            [nombre]
        );

        if (existente) {
            return res.status(409).json({
                error: 'Ya existe una banda con ese nombre',
                id_existente: existente.id
            });
        }

        // Insertar banda
        const isAdmin = req.user && req.user.rol === 'admin';
        const result = await pool.query(`
            INSERT INTO bandas_artistas (
                nombre, genero_musical, bio,
                instagram, facebook, twitter, tiktok, web_oficial, youtube, spotify, otras_redes,
                logo_url, foto_prensa_url,
                contacto_nombre, contacto_email, contacto_telefono, contacto_rol,
                verificada
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            nombre, genero_musical || null, bio || null,
            instagram || null, facebook || null, twitter || null, tiktok || null,
            web_oficial || null, youtube || null, spotify || null, otras_redes || null,
            logo_url || null, foto_prensa_url || null,
            contacto_nombre || null, contacto_email || null, contacto_telefono || null, contacto_rol || null,
            isAdmin ? 1 : 0 // Si es admin, se marca como verificada
        ]);

        const bandaId = Number(result.insertId);

        // Insertar formación si viene
        if (formacion && Array.isArray(formacion) && formacion.length > 0) {
            for (const integrante of formacion) {
                await pool.query(`
                    INSERT INTO bandas_formacion (id_banda, nombre_integrante, instrumento, es_lider, notas)
                    VALUES (?, ?, ?, ?, ?)
                `, [
                    bandaId,
                    integrante.nombre_integrante || null,
                    integrante.instrumento,
                    integrante.es_lider ? 1 : 0,
                    integrante.notas || null
                ]);
            }
        }

        res.status(201).json({
            message: 'Banda creada exitosamente',
            id: bandaId
        });
    } catch (err) {
        console.error('Error al crear banda:', err);
        res.status(500).json({ error: 'Error al crear banda' });
    }
};

/**
 * PUT /api/bandas/:id
 * Actualiza una banda (admin o dueño)
 */
const updateBanda = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Campos permitidos para actualizar
        const camposPermitidos = [
            'nombre', 'genero_musical', 'bio',
            'instagram', 'facebook', 'twitter', 'tiktok', 'web_oficial', 'youtube', 'spotify', 'otras_redes',
            'logo_url', 'foto_prensa_url',
            'contacto_nombre', 'contacto_email', 'contacto_telefono', 'contacto_rol',
            'verificada', 'activa'
        ];

        const setClauses = [];
        const params = [];

        for (const campo of camposPermitidos) {
            if (updates[campo] !== undefined) {
                setClauses.push(`${campo} = ?`);
                params.push(updates[campo]);
            }
        }

        if (setClauses.length === 0) {
            return res.status(400).json({ error: 'No hay campos para actualizar' });
        }

        params.push(id);

        await pool.query(
            `UPDATE bandas_artistas SET ${setClauses.join(', ')} WHERE id = ?`,
            params
        );

        // Si viene formación, actualizarla
        if (updates.formacion && Array.isArray(updates.formacion)) {
            // Eliminar formación anterior
            await pool.query('DELETE FROM bandas_formacion WHERE id_banda = ?', [id]);

            // Insertar nueva
            for (const integrante of updates.formacion) {
                await pool.query(`
                    INSERT INTO bandas_formacion (id_banda, nombre_integrante, instrumento, es_lider, notas)
                    VALUES (?, ?, ?, ?, ?)
                `, [
                    id,
                    integrante.nombre_integrante || null,
                    integrante.instrumento,
                    integrante.es_lider ? 1 : 0,
                    integrante.notas || null
                ]);
            }
        }

        res.json({ message: 'Banda actualizada exitosamente' });
    } catch (err) {
        console.error('Error al actualizar banda:', err);
        res.status(500).json({ error: 'Error al actualizar banda' });
    }
};

/**
 * DELETE /api/bandas/:id (solo admin)
 */
const deleteBanda = async (req, res) => {
    try {
        const { id } = req.params;

        // Soft delete: marcar como inactiva
        await pool.query('UPDATE bandas_artistas SET activa = 0 WHERE id = ?', [id]);

        res.json({ message: 'Banda desactivada exitosamente' });
    } catch (err) {
        console.error('Error al eliminar banda:', err);
        res.status(500).json({ error: 'Error al eliminar banda' });
    }
};

// =============================================================================
// CATÁLOGO DE INSTRUMENTOS
// =============================================================================

/**
 * GET /api/bandas/instrumentos
 * Lista todos los instrumentos disponibles
 */
const getInstrumentos = async (req, res) => {
    try {
        const { categoria } = req.query;

        let query = 'SELECT * FROM catalogo_instrumentos';
        const params = [];

        if (categoria) {
            query += ' WHERE categoria = ?';
            params.push(categoria);
        }

        query += ' ORDER BY categoria, nombre';

        const instrumentos = await pool.query(query, params);
        res.json(serializeBigInt(instrumentos));
    } catch (err) {
        console.error('Error al obtener instrumentos:', err);
        res.status(500).json({ error: 'Error al obtener instrumentos' });
    }
};

/**
 * POST /api/bandas/instrumentos (admin)
 * Crea un nuevo instrumento
 */
const createInstrumento = async (req, res) => {
    try {
        const { nombre, categoria, icono } = req.body;

        if (!nombre) {
            return res.status(400).json({ error: 'El nombre del instrumento es requerido' });
        }

        const result = await pool.query(`
            INSERT INTO catalogo_instrumentos (nombre, categoria, icono)
            VALUES (?, ?, ?)
        `, [nombre, categoria || null, icono || null]);

        res.status(201).json({
            message: 'Instrumento creado exitosamente',
            id: Number(result.insertId)
        });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Ya existe un instrumento con ese nombre' });
        }
        console.error('Error al crear instrumento:', err);
        res.status(500).json({ error: 'Error al crear instrumento' });
    }
};

/**
 * PUT /api/bandas/instrumentos/:id (admin)
 * Actualiza un instrumento
 */
const updateInstrumento = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, categoria, icono } = req.body;

        const setClauses = [];
        const params = [];

        if (nombre !== undefined) {
            setClauses.push('nombre = ?');
            params.push(nombre);
        }
        if (categoria !== undefined) {
            setClauses.push('categoria = ?');
            params.push(categoria);
        }
        if (icono !== undefined) {
            setClauses.push('icono = ?');
            params.push(icono);
        }

        if (setClauses.length === 0) {
            return res.status(400).json({ error: 'No hay campos para actualizar' });
        }

        params.push(id);

        const result = await pool.query(
            `UPDATE catalogo_instrumentos SET ${setClauses.join(', ')} WHERE id = ?`,
            params
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Instrumento no encontrado' });
        }

        res.json({ message: 'Instrumento actualizado exitosamente' });
    } catch (err) {
        console.error('Error al actualizar instrumento:', err);
        res.status(500).json({ error: 'Error al actualizar instrumento' });
    }
};

/**
 * DELETE /api/bandas/instrumentos/:id (admin)
 * Elimina un instrumento
 */
const deleteInstrumento = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM catalogo_instrumentos WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Instrumento no encontrado' });
        }

        res.json({ message: 'Instrumento eliminado exitosamente' });
    } catch (err) {
        console.error('Error al eliminar instrumento:', err);
        res.status(500).json({ error: 'Error al eliminar instrumento' });
    }
};

// =============================================================================
// SOLICITUDES DE FECHAS
// =============================================================================

/**
 * GET /api/bandas/solicitudes (admin)
 * Lista todas las solicitudes de fechas
 */
const getSolicitudes = async (req, res) => {
    try {
        const { estado } = req.query;

        let query = `
            SELECT 
                s.*,
                b.nombre as banda_registrada_nombre,
                b.verificada as banda_verificada
            FROM solicitudes_bandas s
            LEFT JOIN bandas_artistas b ON s.id_banda = b.id
            WHERE 1=1
        `;
        const params = [];

        if (estado) {
            query += ' AND s.estado = ?';
            params.push(estado);
        }

        query += ' ORDER BY s.creado_en DESC';

        const solicitudes = await pool.query(query, params);
        res.json(serializeBigInt(solicitudes));
    } catch (err) {
        console.error('Error al obtener solicitudes:', err);
        res.status(500).json({ error: 'Error al obtener solicitudes' });
    }
};

/**
 * GET /api/bandas/solicitudes/:id
 * Obtiene detalle de una solicitud
 */
const getSolicitudById = async (req, res) => {
    try {
        const { id } = req.params;

        const [solicitud] = await pool.query(`
            SELECT 
                s.*,
                b.nombre as banda_registrada_nombre,
                b.verificada as banda_verificada
            FROM solicitudes_bandas s
            LEFT JOIN bandas_artistas b ON s.id_banda = b.id
            WHERE s.id = ?
        `, [id]);

        if (!solicitud) {
            return res.status(404).json({ error: 'Solicitud no encontrada' });
        }

        // Parsear JSONs
        try {
            solicitud.formacion = solicitud.formacion_json ? JSON.parse(solicitud.formacion_json) : [];
            solicitud.invitadas = solicitud.invitadas_json ? JSON.parse(solicitud.invitadas_json) : [];
        } catch (e) {
            solicitud.formacion = [];
            solicitud.invitadas = [];
        }

        res.json(serializeBigInt(solicitud));
    } catch (err) {
        console.error('Error al obtener solicitud:', err);
        res.status(500).json({ error: 'Error al obtener solicitud' });
    }
};

/**
 * POST /api/bandas/solicitudes
 * Crea una nueva solicitud de fecha (público)
 */
const createSolicitud = async (req, res) => {
    try {
        const {
            // Datos de la banda
            id_banda, // Si ya existe en catálogo
            nombre_banda,
            genero_musical,
            formacion, // Array de {instrumento, cantidad?, notas?}

            // Redes
            instagram, facebook, youtube, spotify, otras_redes,
            logo_url,

            // Contacto (acepta tanto telefono como whatsapp)
            contacto_nombre, contacto_email, contacto_telefono, contacto_whatsapp, contacto_rol,

            // Fecha propuesta
            fecha_preferida, fecha_alternativa, hora_preferida,

            // Bandas invitadas
            invitadas, // Array de {nombre, id_banda?}

            // Propuesta económica
            precio_anticipada_propuesto, precio_puerta_propuesto, expectativa_publico,

            // Mensaje
            mensaje,

            // Fingerprint
            fingerprintid
        } = req.body;

        // Usar whatsapp si viene, sino telefono (compatibilidad)
        const telefono = contacto_whatsapp || contacto_telefono;

        // Validaciones básicas
        if (!contacto_nombre || !contacto_email || !telefono) {
            return res.status(400).json({ error: 'Los datos de contacto (nombre, email y WhatsApp) son requeridos' });
        }

        // Calcular cantidad de bandas
        const cantidadBandas = 1 + (invitadas ? invitadas.length : 0);
        if (cantidadBandas > 4) {
            return res.status(400).json({ error: 'Máximo 4 bandas por fecha' });
        }

        const values = [
            id_banda || null,                          // 1
            genero_musical || null,                    // 2
            formacion ? JSON.stringify(formacion) : null, // 3
            instagram || null,                         // 4
            facebook || null,                          // 5
            youtube || null,                           // 6
            spotify || null,                           // 7
            otras_redes || null,                       // 8
            logo_url || null,                          // 9
            contacto_nombre,                           // 10
            contacto_email,                            // 11
            telefono || null,                          // 12
            contacto_rol || null,                      // 13
            fecha_preferida || null,                   // 14
            fecha_alternativa || null,                 // 15
            hora_preferida || null,                    // 16
            invitadas ? JSON.stringify(invitadas) : null, // 17
            cantidadBandas,                            // 18
            precio_puerta_propuesto || null,           // 19
            expectativa_publico || null,               // 20
            mensaje || null,                           // 21
            fingerprintid || null                      // 22
        ];

        const result = await pool.query(`
            INSERT INTO solicitudes_bandas (
                id_banda, genero_musical, formacion_json,
                instagram, facebook, youtube, spotify, otras_redes, logo_url,
                nombre_completo, email, telefono, contacto_rol,
                fecha_evento, fecha_alternativa, hora_evento,
                invitadas_json, cantidad_bandas,
                precio_puerta_propuesto, expectativa_publico,
                descripcion, fingerprintid
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, values);

        const solicitudId = Number(result.insertId);

        res.status(201).json({
            message: 'Solicitud enviada exitosamente',
            id: solicitudId
        });
    } catch (err) {
        console.error('Error al crear solicitud:', err);
        res.status(500).json({ error: 'Error al crear solicitud' });
    }
};

/**
 * PUT /api/bandas/solicitudes/:id (admin)
 * Actualiza una solicitud (estado, notas, etc.)
 */
const updateSolicitud = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const camposPermitidos = [
            'estado', 'notas_admin', 'id_evento_generado',
            // Permitir editar datos si admin quiere completarlos
            'nombre_banda', 'genero_musical', 'formacion_json',
            'instagram', 'facebook', 'youtube', 'spotify', 'otras_redes', 'logo_url',
            'contacto_nombre', 'contacto_email', 'contacto_telefono', 'contacto_rol',
            'fecha_preferida', 'fecha_alternativa', 'hora_preferida',
            'invitadas_json', 'cantidad_bandas',
            'precio_anticipada_propuesto', 'precio_puerta_propuesto', 'expectativa_publico',
            'mensaje'
        ];

        const setClauses = [];
        const params = [];

        for (const campo of camposPermitidos) {
            if (updates[campo] !== undefined) {
                // Convertir arrays/objetos a JSON
                if ((campo === 'formacion_json' || campo === 'invitadas_json') && typeof updates[campo] !== 'string') {
                    setClauses.push(`${campo} = ?`);
                    params.push(JSON.stringify(updates[campo]));
                } else {
                    setClauses.push(`${campo} = ?`);
                    params.push(updates[campo]);
                }
            }
        }

        if (setClauses.length === 0) {
            return res.status(400).json({ error: 'No hay campos para actualizar' });
        }

        params.push(id);

        await pool.query(
            `UPDATE solicitudes_bandas SET ${setClauses.join(', ')} WHERE id = ?`,
            params
        );

        res.json({ message: 'Solicitud actualizada exitosamente' });
    } catch (err) {
        console.error('Error al actualizar solicitud:', err);
        res.status(500).json({ error: 'Error al actualizar solicitud' });
    }
};

/**
 * POST /api/bandas/solicitudes/:id/aprobar (admin)
 * Aprueba una solicitud y crea el evento
 */
const aprobarSolicitud = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            fecha_evento, hora_inicio, hora_fin,
            precio_anticipada, precio_puerta,
            aforo_maximo, descripcion
        } = req.body;

        // Obtener la solicitud
        const [solicitud] = await pool.query(
            'SELECT * FROM solicitudes_bandas WHERE id = ?',
            [id]
        );

        if (!solicitud) {
            return res.status(404).json({ error: 'Solicitud no encontrada' });
        }

        if (solicitud.estado === 'aprobada') {
            return res.status(400).json({ error: 'La solicitud ya fue aprobada' });
        }

        // Crear el evento
        const fechaFinal = fecha_evento || solicitud.fecha_preferida;
        if (!fechaFinal) {
            return res.status(400).json({ error: 'Se requiere una fecha para el evento' });
        }

        const eventoResult = await pool.query(`
            INSERT INTO eventos (
                tipo_evento, nombre_banda, genero_musical, descripcion,
                fecha, hora_inicio, hora_fin,
                precio_anticipada, precio_puerta, aforo_maximo,
                estado, es_publico, activo
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Confirmado', 1, 1)
        `, [
            'BANDA',
            solicitud.nombre_banda,
            solicitud.genero_musical,
            descripcion || solicitud.mensaje,
            fechaFinal,
            hora_inicio || solicitud.hora_preferida || '21:00:00',
            hora_fin || '02:00:00',
            precio_anticipada || solicitud.precio_anticipada_propuesto || 0,
            precio_puerta || solicitud.precio_puerta_propuesto || 0,
            aforo_maximo || 150
        ]);

        const eventoId = Number(eventoResult.insertId);

        // Crear/obtener la banda en el catálogo si no existe
        let bandaId = solicitud.id_banda;
        if (!bandaId) {
            // Crear la banda
            const bandaResult = await pool.query(`
                INSERT INTO bandas_artistas (
                    nombre, genero_musical,
                    instagram, facebook, youtube, spotify, otras_redes, logo_url,
                    contacto_nombre, contacto_email, contacto_telefono, contacto_rol,
                    verificada
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            `, [
                solicitud.nombre_banda, solicitud.genero_musical,
                solicitud.instagram, solicitud.facebook, solicitud.youtube, solicitud.spotify,
                solicitud.otras_redes, solicitud.logo_url,
                solicitud.contacto_nombre, solicitud.contacto_email,
                solicitud.contacto_telefono, solicitud.contacto_rol
            ]);
            bandaId = Number(bandaResult.insertId);

            // Agregar formación si existe
            if (solicitud.formacion_json) {
                try {
                    const formacion = JSON.parse(solicitud.formacion_json);
                    for (const f of formacion) {
                        await pool.query(`
                            INSERT INTO bandas_formacion (id_banda, instrumento, notas)
                            VALUES (?, ?, ?)
                        `, [bandaId, f.instrumento, f.notas || null]);
                    }
                } catch (e) { /* ignore */ }
            }
        }

        // Crear lineup - banda principal
        await pool.query(`
            INSERT INTO eventos_lineup (
                id_evento, id_banda, nombre_banda, orden_show, es_principal, es_solicitante, estado
            ) VALUES (?, ?, ?, 99, 1, 1, 'confirmada')
        `, [eventoId, bandaId, solicitud.nombre_banda]);

        // Agregar bandas invitadas al lineup
        if (solicitud.invitadas_json) {
            try {
                const invitadas = JSON.parse(solicitud.invitadas_json);
                let orden = 0;
                for (const inv of invitadas) {
                    await pool.query(`
                        INSERT INTO eventos_lineup (
                            id_evento, id_banda, nombre_banda, orden_show, es_principal, es_solicitante, estado
                        ) VALUES (?, ?, ?, ?, 0, 0, 'invitada')
                    `, [eventoId, inv.id_banda || null, inv.nombre, orden++]);
                }
            } catch (e) { /* ignore */ }
        }

        // Actualizar solicitud
        await pool.query(`
            UPDATE solicitudes_bandas 
            SET estado = 'aprobada', id_evento_generado = ?, id_banda = ?
            WHERE id = ?
        `, [eventoId, bandaId, id]);

        res.json({
            message: 'Solicitud aprobada y evento creado',
            evento_id: eventoId,
            banda_id: bandaId
        });
    } catch (err) {
        console.error('Error al aprobar solicitud:', err);
        res.status(500).json({ error: 'Error al aprobar solicitud' });
    }
};

/**
 * POST /api/bandas/solicitudes/:id/rechazar (admin)
 */
const rechazarSolicitud = async (req, res) => {
    try {
        const { id } = req.params;
        const { notas_admin } = req.body;

        await pool.query(`
            UPDATE solicitudes_bandas 
            SET estado = 'rechazada', notas_admin = CONCAT(COALESCE(notas_admin, ''), '\n[RECHAZADA] ', ?)
            WHERE id = ?
        `, [notas_admin || 'Sin motivo especificado', id]);

        res.json({ message: 'Solicitud rechazada' });
    } catch (err) {
        console.error('Error al rechazar solicitud:', err);
        res.status(500).json({ error: 'Error al rechazar solicitud' });
    }
};

// =============================================================================
// EVENTOS DE BANDAS
// =============================================================================

/**
 * GET /api/bandas/eventos
 * Obtiene todos los eventos de tipo BANDA con sus bandas invitadas
 */
const getEventosBandas = async (req, res) => {
    try {
        const { estado, buscar } = req.query;

        let query = `
            SELECT 
                fbc.id,
                fbc.nombre_banda,
                fbc.genero_musical,
                fbc.descripcion,
                fbc.url_imagen,
                fbc.fecha,
                fbc.hora_inicio,
                fbc.hora_fin,
                fbc.aforo_maximo,
                fbc.es_publico,
                fbc.precio_base,
                fbc.precio_anticipada,
                fbc.precio_puerta,
                fbc.nombre_contacto,
                fbc.email_contacto,
                fbc.telefono_contacto,
                fbc.tipo_evento,
                fbc.activo,
                fbc.estado,
                fbc.creado_en,
                (SELECT COUNT(*) FROM tickets WHERE id_evento = fbc.id) as entradas_vendidas
            FROM fechas_bandas_confirmadas fbc
            WHERE 1=1
        `;
        const params = [];

        // Filtrar por estado
        if (estado) {
            query += ' AND fbc.estado = ?';
            params.push(estado);
        }

        // Búsqueda por nombre de banda
        if (buscar) {
            query += ' AND fbc.nombre_banda LIKE ?';
            params.push(`%${buscar}%`);
        }

        query += ' ORDER BY fbc.fecha DESC, fbc.hora_inicio ASC';

        const eventos = await pool.query(query, params);

        // Para cada evento, obtener las bandas invitadas
        for (let evento of eventos) {
            const invitadas = await pool.query(`
                SELECT 
                    id, id_banda, nombre_banda, orden
                FROM eventos_bandas_invitadas
                WHERE id_evento = ?
                ORDER BY orden ASC
            `, [evento.id]);
            evento.invitadas = invitadas || [];
        }

        res.json(serializeBigInt(eventos));
    } catch (err) {
        console.error('Error al obtener eventos de bandas:', err);
        res.status(500).json({ error: 'Error al obtener eventos' });
    }
};

/**
 * GET /api/bandas/eventos/:id
 * Obtiene un evento específico with sus bandas invitadas
 */
const getEventoBandaById = async (req, res) => {
    try {
        const { id } = req.params;

        const [evento] = await pool.query(`
            SELECT 
                e.*,
                (SELECT COUNT(*) FROM tickets WHERE id_evento = e.id) as entradas_vendidas
            FROM eventos e
            WHERE e.id = ? AND e.tipo_evento = 'BANDA'
        `, [id]);

        if (!evento) {
            return res.status(404).json({ error: 'Evento no encontrado' });
        }

        // Obtener bandas invitadas
        const invitadas = await pool.query(`
            SELECT 
                id, id_banda, nombre_banda, orden
            FROM eventos_bandas_invitadas
            WHERE id_evento = ?
            ORDER BY orden ASC
        `, [id]);
        evento.invitadas = invitadas || [];

        res.json(serializeBigInt(evento));
    } catch (err) {
        console.error('Error al obtener evento:', err);
        res.status(500).json({ error: 'Error al obtener evento' });
    }
};

// =============================================================================
// LINEUP DE EVENTOS
// =============================================================================

/**
 * GET /api/eventos/:id/lineup
 * Obtiene el lineup de un evento
 */
const getEventoLineup = async (req, res) => {
    try {
        const { id } = req.params;

        const lineup = await pool.query(`
            SELECT 
                el.*,
                b.genero_musical, b.instagram, b.youtube, b.spotify, b.logo_url,
                b.verificada
            FROM eventos_lineup el
            LEFT JOIN bandas_artistas b ON el.id_banda = b.id
            WHERE el.id_evento = ?
            ORDER BY el.orden_show ASC
        `, [id]);

        res.json(serializeBigInt(lineup));
    } catch (err) {
        console.error('Error al obtener lineup:', err);
        res.status(500).json({ error: 'Error al obtener lineup' });
    }
};

/**
 * PUT /api/eventos/:id/lineup (admin)
 * Actualiza el lineup completo de un evento
 */
const updateEventoLineup = async (req, res) => {
    try {
        const { id } = req.params;
        const { lineup } = req.body; // Array de bandas con orden

        if (!lineup || !Array.isArray(lineup)) {
            return res.status(400).json({ error: 'Se requiere un array de lineup' });
        }

        // Eliminar lineup anterior
        await pool.query('DELETE FROM eventos_lineup WHERE id_evento = ?', [id]);

        // Insertar nuevo lineup
        for (const banda of lineup) {
            await pool.query(`
                INSERT INTO eventos_lineup (
                    id_evento, id_banda, nombre_banda, orden_show, 
                    es_principal, es_solicitante, hora_inicio, duracion_minutos, estado, notas
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                id,
                banda.id_banda || null,
                banda.nombre_banda,
                banda.orden_show || 0,
                banda.es_principal ? 1 : 0,
                banda.es_solicitante ? 1 : 0,
                banda.hora_inicio || null,
                banda.duracion_minutos || null,
                banda.estado || 'invitada',
                banda.notas || null
            ]);
        }

        // Actualizar nombre_banda del evento con todas las bandas
        const nombresConcatenados = lineup
            .sort((a, b) => (a.orden_show || 0) - (b.orden_show || 0))
            .map(b => b.nombre_banda)
            .join(' / ');

        await pool.query(
            'UPDATE eventos SET nombre_banda = ? WHERE id = ?',
            [nombresConcatenados, id]
        );

        res.json({ message: 'Lineup actualizado exitosamente' });
    } catch (err) {
        console.error('Error al actualizar lineup:', err);
        res.status(500).json({ error: 'Error al actualizar lineup' });
    }
};

// =============================================================================
// BÚSQUEDA RÁPIDA (para autocomplete)
// =============================================================================

/**
 * GET /api/bandas/buscar?q=texto
 * Búsqueda rápida para autocomplete
 */
const buscarBandas = async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.length < 2) {
            return res.json([]);
        }

        const bandas = await pool.query(`
            SELECT id, nombre, genero_musical, logo_url, verificada
            FROM bandas_artistas
            WHERE activa = 1 AND nombre LIKE ?
            ORDER BY verificada DESC, nombre ASC
            LIMIT 10
        `, [`%${q}%`]);

        res.json(serializeBigInt(bandas));
    } catch (err) {
        console.error('Error en búsqueda:', err);
        res.status(500).json({ error: 'Error en búsqueda' });
    }
};

module.exports = {
    // Bandas
    getBandas,
    getBandaById,
    createBanda,
    updateBanda,
    deleteBanda,
    buscarBandas,

    // Instrumentos
    getInstrumentos,
    createInstrumento,
    updateInstrumento,
    deleteInstrumento,

    // Solicitudes
    getSolicitudes,
    getSolicitudById,
    createSolicitud,
    updateSolicitud,
    aprobarSolicitud,
    rechazarSolicitud,

    // Eventos de bandas
    getEventosBandas,
    getEventoBandaById,

    // Lineup
    getEventoLineup,
    updateEventoLineup
};
