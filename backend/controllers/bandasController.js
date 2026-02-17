// backend/controllers/bandasController.js
// API para gestión de bandas/artistas y solicitudes de fechas

const pool = require('../db');
const { getOrCreateClient, updateClient } = require('../lib/clients');

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
        console.debug('DEBUG getBandaById START id=', id);

        // Obtener datos de la banda
        console.debug('DEBUG getBandaById: fetching banda row for id', id);
        const [banda] = await pool.query(
            'SELECT * FROM bandas_artistas WHERE id = ?',
            [id]
        );
        console.debug('DEBUG getBandaById: fetched banda row', !!banda);

        if (!banda) {
            return res.status(404).json({ error: 'Banda no encontrada' });
        }

        // Obtener formación (no fatal si falla)
        let formacion = [];
        try {
            console.debug('DEBUG getBandaById: fetching formacion for id', id);
            formacion = await pool.query(
                'SELECT * FROM bandas_formacion WHERE id_banda = ? ORDER BY es_lider DESC, instrumento',
                [id]
            );
            console.debug('DEBUG getBandaById: fetched formacion count', (formacion || []).length);
        } catch (e) {
            console.warn('Warning: no se pudo obtener formacion para banda', id, e.message || e);
            formacion = [];
        }

        // Obtener eventos donde participó (no fatal si falla)
        // Temporal: deshabilitado para evitar errores por columnas mismatched en algunas DB.
        let eventos = [];
        try {
            console.debug('DEBUG getBandaById: events query disabled, skipping');
            // Si necesitas volver a volver a habilitar, descomenta la consulta y reinicia el servicio
            // eventos = await pool.query(`
            //     SELECT 
            //         e.id, e.nombre_evento as titulo_evento, e.fecha, e.hora_inicio,
            //         el.es_principal, el.orden_show, el.estado
            //     FROM eventos_lineup el
            //     JOIN eventos_confirmados e ON el.id_evento_confirmado = e.id
            //     WHERE el.id_banda = ? AND e.activo = 1
            //     ORDER BY e.fecha DESC
            //     LIMIT 10
            // `, [id]);
            eventos = [];
        } catch (e) {
            console.warn('Warning: no se pudo obtener eventos para banda (deshabilitado temporalmente)', id, e.message || e);
            eventos = [];
        }

        // Serializar BigInt para evitar errores de JSON
        res.json(serializeBigInt({
            ...banda,
            formacion,
            eventos
        }));
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

        try { console.debug('DEBUG createBanda: creada id=', bandaId, 'formacion recibida:', JSON.stringify(formacion || [])); } catch (e) { console.debug('DEBUG createBanda: creada id=', bandaId, 'formacion recibida (non-serializable)'); }

        // Insertar formación si viene
        if (formacion && Array.isArray(formacion) && formacion.length > 0) {
            for (const integrante of formacion) {
                try { console.debug('DEBUG createBanda: insert integrante for id=', bandaId, 'data=', JSON.stringify(integrante)); } catch (e) { console.debug('DEBUG createBanda: insert integrante for id=', bandaId, 'data (non-serializable)'); }
                await pool.query(`
                    INSERT INTO bandas_formacion (id_banda, nombre_integrante, instrumento, es_lider, notas)
                    VALUES (?, ?, ?, ?, ?)
                `, [
                    bandaId,
                    integrante.nombre_integrante || null,
                    integrante.instrumento || integrante.nombre || null, // Permitir nombre como respaldo
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

        // Log incoming update for diagnostics
        try { console.debug('DEBUG updateBanda START id=', id, 'updates=', JSON.stringify(updates)); } catch (e) { console.debug('DEBUG updateBanda START id=', id, 'updates (non-serializable)'); }

        // Safety: if 'formacion' is present but is an empty array, remove it to avoid accidental deletion of existing formación
        if (updates.formacion && Array.isArray(updates.formacion) && updates.formacion.length === 0) {
            delete updates.formacion;
        }

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
            console.debug('DEBUG updateBanda: eliminando formación previa para id=', id);
            await pool.query('DELETE FROM bandas_formacion WHERE id_banda = ?', [id]);

            // Insertar nueva
            for (const integrante of updates.formacion) {
                try { console.debug('DEBUG updateBanda: insert integrante for id=', id, 'data=', JSON.stringify(integrante)); } catch (e) { console.debug('DEBUG updateBanda: insert integrante for id=', id, 'data (non-serializable)'); }
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

        // Return updated banda for frontend to refresh view
        const [updated] = await pool.query('SELECT * FROM bandas_artistas WHERE id = ?', [id]);
        let formacion = [];
        try { formacion = await pool.query('SELECT * FROM bandas_formacion WHERE id_banda = ? ORDER BY es_lider DESC, instrumento', [id]); } catch (e) { formacion = []; }
        res.json(serializeBigInt({ ...updated, formacion }));
    } catch (err) {
        console.error('Error al actualizar banda:', err);
        res.status(500).json({ error: 'Error al actualizar banda' });
    }
};

// -----------------------------------------------------------------------------
// Upload public handler (devuelve la URL pública para el logo subido)
// -----------------------------------------------------------------------------
const uploadLogoPublic = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No se recibió archivo' });
        const fs = require('fs');
        const path = require('path');
        const dir = path.join(__dirname, '..', 'uploads', 'bandas');
        const originalPath = req.file.path;

        // Si nos pasan 'nombre' tratamos de renombrar a logo_<sanitized_nombre>.<ext>
        let finalFilename = req.file.filename;
        if (req.body && (req.body.nombre || req.body.nombre_banda)) {
            const rawName = (req.body.nombre || req.body.nombre_banda).toString();
            const sanitized = rawName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '_').toLowerCase();
            const ext = path.extname(req.file.originalname).toLowerCase() || (req.file.mimetype === 'image/png' ? '.png' : '.jpg');
            const target = path.join(dir, `logo_${sanitized}${ext}`);

            try {
                if (fs.existsSync(target)) {
                    // sobrescribir
                    fs.unlinkSync(target);
                }
                fs.renameSync(originalPath, target);
                finalFilename = path.basename(target);
            } catch (e) {
                console.warn('No se pudo renombrar archivo a nombre limpio, usando nombre temporal', e.message || e);
                // en caso de error, mantenemos el archivo temporal
            }
        }

        const url = `/uploads/bandas/${finalFilename}`;
        res.status(201).json({ url });
    } catch (err) {
        console.error('Error al subir logo:', err);
        res.status(500).json({ error: 'Error al subir archivo' });
    }
};

/**
 * PUT /api/bandas (sin ID en URL, ID va en body)
 * Actualiza una banda (versión pública - para usuarios que actualizan sus bandas)
 */
const updateBandaPublic = async (req, res) => {
    try {
        const { id, ...updates } = req.body; // El ID viene en el body

        // Log incoming public update for diagnostics
        try { console.debug('DEBUG updateBandaPublic START id=', id, 'updates=', JSON.stringify(updates)); } catch (e) { console.debug('DEBUG updateBandaPublic START id=', id, 'updates (non-serializable)'); }

        // Safety: si viene 'formacion' como array vacío, removerlo para evitar borrado accidental
        if (updates.formacion && Array.isArray(updates.formacion) && updates.formacion.length === 0) {
            delete updates.formacion;
        }

        if (!id) {
            return res.status(400).json({ error: 'ID de banda es requerido' });
        }

        // Si intenta cambiar el nombre, verificar que no exista otro con ese nombre
        if (updates.nombre) {
            const [existente] = await pool.query(
                'SELECT id FROM bandas_artistas WHERE LOWER(nombre) = LOWER(?) AND id != ?',
                [updates.nombre, id]
            );

            if (existente) {
                return res.status(409).json({
                    error: 'Ya existe una banda con ese nombre en nuestro catálogo',
                    id: existente.id
                });
            }
        }

        // Campos permitidos para actualizar (sin verificada ni activa para usuarios públicos)
        const camposPermitidos = [
            'nombre', 'genero_musical', 'bio',
            'instagram', 'facebook', 'twitter', 'tiktok', 'web_oficial', 'youtube', 'spotify', 'otras_redes',
            'logo_url', 'foto_prensa_url',
            'contacto_nombre', 'contacto_email', 'contacto_telefono', 'contacto_rol'
        ];

        const setClauses = [];
        const params = [];

        for (const campo of camposPermitidos) {
            if (updates[campo] !== undefined) {
                setClauses.push(`${campo} = ?`);
                params.push(updates[campo]);
            }
        }

        // Permitir actualizaciones que solo incluyan formación
        if (setClauses.length === 0 && (!updates.formacion || updates.formacion.length === 0)) {
            return res.status(400).json({ error: 'No hay campos para actualizar' });
        }

        if (setClauses.length > 0) {
            params.push(id);

            await pool.query(
                `UPDATE bandas_artistas SET ${setClauses.join(', ')} WHERE id = ?`,
                params
            );
        }

        // Si viene formación, actualizarla
        if (updates.formacion && Array.isArray(updates.formacion)) {
            // Eliminar formación anterior
            console.debug('DEBUG updateBandaPublic: eliminando formación previa para id=', id);
            await pool.query('DELETE FROM bandas_formacion WHERE id_banda = ?', [id]);

            // Insertar nueva
            for (const integrante of updates.formacion) {
                try { console.debug('DEBUG updateBandaPublic: insert integrante for id=', id, 'data=', JSON.stringify(integrante)); } catch (e) { console.debug('DEBUG updateBandaPublic: insert integrante for id=', id, 'data (non-serializable)'); }
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

        // Return updated banda for frontend to refresh view
        const [updated] = await pool.query('SELECT * FROM bandas_artistas WHERE id = ?', [id]);
        let formacion = [];
        try { formacion = await pool.query('SELECT * FROM bandas_formacion WHERE id_banda = ? ORDER BY es_lider DESC, instrumento', [id]); } catch (e) { formacion = []; }
        res.json(serializeBigInt({ ...updated, formacion }));
    } catch (err) {
        console.error('Error al actualizar banda (público):', err);
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
                sfb.*,
                s.categoria,
                s.es_publico,
                b.nombre AS banda_registrada_nombre,
                b.verificada AS banda_verificada,
                c.nombre AS cliente_nombre,
                c.email AS cliente_email,
                c.telefono AS cliente_telefono
            FROM solicitudes_fechas_bandas sfb
            JOIN solicitudes s ON sfb.id_solicitud = s.id
            LEFT JOIN bandas_artistas b ON sfb.id_banda = b.id
            LEFT JOIN clientes c ON s.cliente_id = c.id
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
                sfb.*,
                s.categoria,
                s.es_publico,
                b.nombre AS banda_registrada_nombre,
                b.verificada AS banda_verificada,
                c.nombre AS cliente_nombre,
                c.email AS cliente_email,
                c.telefono AS cliente_telefono
            FROM solicitudes_fechas_bandas sfb
            JOIN solicitudes s ON sfb.id_solicitud = s.id
            LEFT JOIN bandas_artistas b ON sfb.id_banda = b.id
            LEFT JOIN clientes c ON s.cliente_id = c.id
            WHERE sfb.id_solicitud = ?
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
const solicitudFechaBandaController = require('./solicitudFechaBandaController');

const createSolicitud = async (req, res) => {
    // Delegamos la creación al controlador especializado `solicitudFechaBandaController`
    return solicitudFechaBandaController.crearSolicitudFechaBanda(req, res);
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
            'mensaje',
            // Nuevos campos de descripción en tabla padre
            'descripcion_corta', 'descripcion_larga'
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

        // Si recibimos campos de contacto, actualizamos la fila en `clientes` asociada (si existe)
        const contactoUpdates = {};
        if (typeof updates.contacto_nombre !== 'undefined') contactoUpdates.nombre = updates.contacto_nombre;
        if (typeof updates.contacto_email !== 'undefined') contactoUpdates.email = updates.contacto_email;
        if (typeof updates.contacto_telefono !== 'undefined') contactoUpdates.telefono = updates.contacto_telefono;

        let conn;
        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();

            if (Object.keys(contactoUpdates).length > 0) {
                const [row] = await conn.query('SELECT sol.cliente_id FROM solicitudes_fechas_bandas sfb JOIN solicitudes sol ON sfb.id_solicitud = sol.id WHERE sfb.id_solicitud = ?', [id]);
                if (row && row.cliente_id) {
                    await updateClient(conn, row.cliente_id, contactoUpdates);
                }
            }

            // Mapear campos legacy -> columnas de `solicitudes_fechas_bandas`
            const columnMap = {
                'fecha_preferida': 'fecha_evento',
                'hora_preferida': 'hora_evento',
                'mensaje': 'descripcion',
                'precio_anticipada_propuesto': 'precio_basico',
                // campos que ya coinciden: fecha_alternativa, invitadas_json, cantidad_bandas, precio_puerta_propuesto, expectativa_publico
            };

            // Filtrar setClauses para actualizar solo columnas válidas en solicitudes_fechas_bandas
            const validChildCols = new Set([
                'id_banda', 'fecha_evento', 'hora_evento', 'duracion', 'descripcion', 'precio_basico', 'precio_final', 'precio_puerta_propuesto', 'cantidad_bandas', 'expectativa_publico', 'invitadas_json', 'estado', 'fecha_alternativa', 'notas_admin', 'id_evento_generado'
            ]);

            const childSet = [];
            const childParams = [];

            for (let i = 0; i < setClauses.length; i++) {
                // setClauses entries are like "campo = ?"; params are in same order
                const raw = setClauses[i];
                const campo = raw.split('=')[0].trim();
                const mapped = columnMap[campo] || campo;
                if (validChildCols.has(mapped)) {
                    childSet.push(`${mapped} = ?`);
                    childParams.push(params[i]);
                }
            }

            if (childSet.length > 0) {
                childParams.push(id);
                await conn.query(`UPDATE solicitudes_fechas_bandas SET ${childSet.join(', ')} WHERE id_solicitud = ?`, childParams);
            }

            // Si vienen campos relacionados con la banda y la solicitud tiene id_banda, actualizar bandas_artistas
            const bandFields = ['nombre_banda', 'genero_musical', 'formacion_json', 'instagram', 'facebook', 'youtube', 'spotify', 'otras_redes', 'logo_url', 'contacto_rol'];
            const bandUpdates = {};
            for (const f of bandFields) if (updates[f] !== undefined) bandUpdates[f] = updates[f];

            if (Object.keys(bandUpdates).length > 0) {
                const [sbRow] = await conn.query('SELECT id_banda FROM solicitudes_fechas_bandas WHERE id_solicitud = ?', [id]);
                const idBanda = sbRow ? sbRow.id_banda : null;
                if (idBanda) {
                    const setB = [];
                    const paramsB = [];
                    if (bandUpdates.nombre_banda) { setB.push('nombre = ?'); paramsB.push(bandUpdates.nombre_banda); }
                    if (bandUpdates.genero_musical) { setB.push('genero_musical = ?'); paramsB.push(bandUpdates.genero_musical); }
                    if (bandUpdates.instagram) { setB.push('instagram = ?'); paramsB.push(bandUpdates.instagram); }
                    if (bandUpdates.facebook) { setB.push('facebook = ?'); paramsB.push(bandUpdates.facebook); }
                    if (bandUpdates.youtube) { setB.push('youtube = ?'); paramsB.push(bandUpdates.youtube); }
                    if (bandUpdates.spotify) { setB.push('spotify = ?'); paramsB.push(bandUpdates.spotify); }
                    if (bandUpdates.otras_redes) { setB.push('otras_redes = ?'); paramsB.push(bandUpdates.otras_redes); }
                    if (bandUpdates.logo_url) { setB.push('logo_url = ?'); paramsB.push(bandUpdates.logo_url); }
                    if (setB.length > 0) {
                        paramsB.push(idBanda);
                        await conn.query(`UPDATE bandas_artistas SET ${setB.join(', ')} WHERE id = ?`, paramsB);
                    }
                }
            }

            // Si recibimos descripcion_corta o descripcion_larga, actualizar la fila padre en `solicitudes`
            if (typeof updates.descripcion_corta !== 'undefined' || typeof updates.descripcion_larga !== 'undefined') {
                const descC = typeof updates.descripcion_corta !== 'undefined' ? updates.descripcion_corta : null;
                const descL = typeof updates.descripcion_larga !== 'undefined' ? updates.descripcion_larga : null;
                await conn.query(`UPDATE solicitudes SET descripcion_corta = ?, descripcion_larga = ? WHERE id = ?`, [descC, descL, id]);
            }

            await conn.commit();
            res.json({ message: 'Solicitud actualizada exitosamente' });
        } catch (err) {
            if (conn) await conn.rollback();
            console.error('Error al actualizar solicitud:', err);
            res.status(500).json({ error: 'Error al actualizar solicitud' });
        } finally {
            if (conn) conn.release();
        }
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
            aforo_maximo, descripcion, descripcion_corta, descripcion_larga
        } = req.body;

        // Obtener la solicitud (normalizada)
        const [solicitud] = await pool.query(
            `SELECT sfb.*, s.cliente_id, b.nombre AS banda_nombre, b.id AS banda_id, b.genero_musical AS banda_genero
             FROM solicitudes_fechas_bandas sfb
             JOIN solicitudes s ON sfb.id_solicitud = s.id
             LEFT JOIN bandas_artistas b ON sfb.id_banda = b.id
             WHERE sfb.id_solicitud = ?`,
            [id]
        );

        if (!solicitud) {
            return res.status(404).json({ error: 'Solicitud no encontrada' });
        }

        if (solicitud.estado === 'Confirmado' || solicitud.estado === 'aprobada') {
            return res.status(400).json({ error: 'La solicitud ya fue aprobada' });
        }

        // Determinar fecha final
        const fechaFinal = fecha_evento || solicitud.fecha_evento || solicitud.fecha_alternativa;
        if (!fechaFinal) {
            return res.status(400).json({ error: 'Se requiere una fecha para el evento' });
        }

        // Si se reciben descripciones para el padre, actualizarlas
        if (typeof descripcion_corta !== 'undefined' || typeof descripcion_larga !== 'undefined') {
            await pool.query(`UPDATE solicitudes SET descripcion_corta = ?, descripcion_larga = ? WHERE id = ?`, [descripcion_corta || null, descripcion_larga || null, id]);
        }

        // Obtener contacto desde clientes si existe
        let contacto = { nombre: null, email: null, telefono: null };
        if (solicitud.cliente_id) {
            const [cliente] = await pool.query('SELECT nombre, email, telefono FROM clientes WHERE id = ?', [solicitud.cliente_id]);
            if (cliente) contacto = { nombre: cliente.nombre, email: cliente.email, telefono: cliente.telefono };
        }

        // Crear evento_confirmado (estructura unificada)
        const sqlEvento = `
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

        const [resultEvento] = await pool.query(sqlEvento, [
            id,
            solicitud.banda_nombre || solicitud.descripcion || 'Sin nombre',
            descripcion || solicitud.descripcion || '',
            fechaFinal,
            hora_inicio || solicitud.hora_evento || '21:00:00',
            hora_fin || null,
            precio_anticipada || solicitud.precio_basico || 0,
            precio_puerta || solicitud.precio_puerta_propuesto || 0,
            solicitud.banda_genero || solicitud.genero_musical || null,
            solicitud.cantidad_bandas || 1,
            1 // es_publico
        ]);

        const eventoId = Number(resultEvento.insertId);

        // Crear/obtener banda en catálogo si no existe
        let bandaId = solicitud.banda_id || null;
        if (!bandaId && solicitud.banda_nombre) {
            const [bExist] = await pool.query('SELECT id FROM bandas_artistas WHERE LOWER(nombre) = LOWER(?)', [solicitud.banda_nombre]);
            if (bExist) bandaId = bExist.id;
            else {
                const [bRes] = await pool.query(`INSERT INTO bandas_artistas (nombre, genero_musical, verificada, activa, creado_en) VALUES (?, ?, 0, 1, NOW())`, [solicitud.banda_nombre, solicitud.banda_genero || null]);
                bandaId = Number(bRes.insertId);
            }
        }

        // Insertar lineup (principal)
        await pool.query(`INSERT INTO eventos_lineup (id_evento_confirmado, id_banda, nombre_banda, orden_show, es_principal, es_solicitante, estado) VALUES (?, ?, ?, 99, 1, 1, 'confirmada')`, [eventoId, bandaId, solicitud.banda_nombre || 'Sin nombre']);

        // Agregar bandas invitadas
        if (solicitud.invitadas_json) {
            try {
                const invitadas = JSON.parse(solicitud.invitadas_json);
                let orden = 0;
                for (const inv of invitadas) {
                    await pool.query(`INSERT INTO eventos_lineup (id_evento_confirmado, id_banda, nombre_banda, orden_show, es_principal, es_solicitante, estado) VALUES (?, ?, ?, ?, 0, 0, 'invitada')`, [eventoId, inv.id_banda || null, inv.nombre, orden++]);
                }
            } catch (e) { /* ignore */ }
        }

        // Actualizar solicitud hijo y padre
        await pool.query(`UPDATE solicitudes_fechas_bandas SET estado = 'Confirmado', id_evento_generado = ? WHERE id_solicitud = ?`, [eventoId, id]);
        await pool.query(`UPDATE solicitudes SET estado = 'Confirmado', es_publico = ? WHERE id = ?`, [1, id]);

        res.json({ message: 'Solicitud aprobada y evento creado', evento_id: eventoId, banda_id: bandaId });
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
        const { notas_admin, descripcion_corta, descripcion_larga } = req.body;

        await pool.query(`
            UPDATE solicitudes_fechas_bandas 
            SET estado = 'rechazada', notas_admin = CONCAT(COALESCE(notas_admin, ''), '\n[RECHAZADA] ', ?)
            WHERE id_solicitud = ?
        `, [notas_admin || 'Sin motivo especificado', id]);

        // También actualizar descripción en la fila padre si se proporcionó
        if (typeof descripcion_corta !== 'undefined' || typeof descripcion_larga !== 'undefined') {
            await pool.query(`UPDATE solicitudes SET descripcion_corta = ?, descripcion_larga = ? WHERE id = ?`, [descripcion_corta || null, descripcion_larga || null, id]);
        }

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
                e.id,
                e.nombre_evento as nombre_banda,
                e.genero_musical,
                e.descripcion,
                NULL as url_imagen,
                DATE_FORMAT(e.fecha_evento, '%Y-%m-%d') as fecha,
                TIME_FORMAT(e.hora_inicio, '%H:%i') as hora_inicio,
                NULL as hora_fin,
                e.cantidad_personas as aforo_maximo,
                e.es_publico,
                e.precio_base,
                NULL as precio_anticipada,
                e.precio_final as precio_puerta,
                e.nombre_cliente as nombre_contacto,
                e.email_cliente as email_contacto,
                e.telefono_cliente as telefono_contacto,
                e.tipo_evento,
                e.activo,
                CASE WHEN e.activo = 1 THEN 'Confirmado' ELSE 'Cancelado' END as estado,
                e.confirmado_en as creado_en,
                (SELECT COUNT(*) FROM tickets WHERE id_evento = e.id) as entradas_vendidas
            FROM eventos_confirmados e
            WHERE e.tipo_evento = 'BANDA'
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
            FROM eventos_confirmados e
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
            WHERE el.id_evento_confirmado = ?
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
        await pool.query('DELETE FROM eventos_lineup WHERE id_evento_confirmado = ?', [id]);

        // Insertar nuevo lineup
        for (const banda of lineup) {
            await pool.query(`
                INSERT INTO eventos_lineup (
                    id_evento_confirmado, id_banda, nombre_banda, orden_show, 
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
// DETALLE SEGURO (nuevo endpoint para evitar problemas con consultas antiguas)
// =============================================================================

const getBandaDetalle = async (req, res) => {
    try {
        const { id } = req.params;
        console.log('DEBUG getBandaDetalle called for id', id);
        const [banda] = await pool.query('SELECT * FROM bandas_artistas WHERE id = ?', [id]);
        if (!banda) return res.status(404).json({ error: 'Banda no encontrada' });

        let formacion = [];
        try {
            formacion = await pool.query('SELECT * FROM bandas_formacion WHERE id_banda = ? ORDER BY es_lider DESC, instrumento', [id]);
        } catch (e) {
            console.warn('Warning: no se pudo obtener formacion para banda (detalle)', id, e.message || e);
            formacion = [];
        }

        let eventos = [];
        try {
            eventos = await pool.query(`
                SELECT 
                    e.id, e.nombre_evento as titulo_evento, e.fecha_evento as fecha, e.hora_inicio,
                    el.es_principal, el.orden_show, el.estado
                FROM eventos_lineup el
                JOIN eventos_confirmados e ON el.id_evento_confirmado = e.id
                WHERE el.id_banda = ? AND e.activo = 1
                ORDER BY e.fecha_evento DESC
                LIMIT 10
            `, [id]);
        } catch (e) {
            console.warn('Warning: no se pudo obtener eventos para banda (detalle)', id, e.message || e);
            eventos = [];
        }

        res.json(serializeBigInt({ ...banda, formacion, eventos }));
    } catch (err) {
        console.error('Error al obtener detalle de banda:', err);
        res.status(500).json({ error: 'Error al obtener detalle de banda' });
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

// Versión segura para consumo público: evita consultas complejas que puedan fallar en algunas DB
const getBandaByIdSafe = async (req, res) => {
    try {
        const { id } = req.params;
        console.log('DEBUG: getBandaByIdSafe called for id', id);

        const [banda] = await pool.query('SELECT * FROM bandas_artistas WHERE id = ?', [id]);
        if (!banda) return res.status(404).json({ error: 'Banda no encontrada' });

        let formacion = [];
        try {
            formacion = await pool.query('SELECT * FROM bandas_formacion WHERE id_banda = ? ORDER BY es_lider DESC, instrumento', [id]);
        } catch (e) {
            console.warn('Warning: no se pudo obtener formacion para banda (safe)', id, e.message || e);
            formacion = [];
        }

        res.json(serializeBigInt({ ...banda, formacion }));
    } catch (err) {
        console.error('Error al obtener banda (safe):', err);
        res.status(500).json({ error: 'Error al obtener banda' });
    }
};

module.exports = {
    // Bandas
    getBandas,
    getBandaById: getBandaByIdSafe, // Públicas usan la versión safe
    getBandaByIdInternal: getBandaById, // Función completa disponible internamente
    getBandaDetalle, // detalle completo seguro
    createBanda,
    updateBanda,
    updateBandaPublic, // Actualización pública sin autenticación
    uploadLogoPublic, // Endpoint público para subir logos
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
