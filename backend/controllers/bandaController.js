// backend/controllers/bandaController.js
// Controlador para gestión de bandas/artistas (CRUD)

const pool = require('../db');
const { logVerbose, logError, logSuccess, logWarning } = require('../lib/debugFlags');

/**
 * GET /api/bandas
 * Obtener todas las bandas del catálogo
 */
const obtenerBandas = async (req, res) => {
    logVerbose('[BANDA] GET - Obtener todas las bandas');

    const { activas, ordenar_por } = req.query;

    let conn;
    try {
        conn = await pool.getConnection();

        let sql = `
            SELECT
                id_banda as id_banda,
                nombre,
                genero_musical,
                bio,
                instagram,
                facebook,
                twitter,
                tiktok,
                web_oficial,
                youtube,
                spotify,
                otras_redes,
                logo_url,
                foto_prensa_url,
                contacto_nombre,
                contacto_email,
                contacto_telefono,
                contacto_rol,
                verificada,
                activa,
                creado_en,
                actualizado_en
            FROM bandas_artistas
            WHERE 1=1
        `;

        const params = [];

        // Filtro: solo bandas activas
        if (activas === 'true' || activas === '1') {
            sql += ' AND activa = 1';
        }

        // Ordenamiento
        const ordenValido = ['nombre', 'genero_musical', 'creado_en', '-creado_en'];
        const ordenFinal = ordenValido.includes(ordenar_por) ? ordenar_por : 'nombre';

        if (ordenFinal.startsWith('-')) {
            sql += ` ORDER BY ${ordenFinal.substring(1)} DESC`;
        } else {
            sql += ` ORDER BY ${ordenFinal} ASC`;
        }

        const bandas = await conn.query(sql, params);

        logVerbose(`[BANDA] ✓ Se encontraron ${bandas.length} bandas`);

        return res.status(200).json(bandas);

    } catch (err) {
        console.error('[BANDA-ERROR] Fallo en obtenerBandas:', err.message);
        console.error('[BANDA-ERROR] Stack:', err.stack);
        logError('[BANDA] Error al obtener bandas:', err.message);
        return res.status(500).json({ error: 'Error al obtener bandas.', debug: err.message });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * GET /api/bandas/:id
 * Obtener una banda específica con sus detalles completos
 */
const obtenerBandaPorId = async (req, res) => {
    const { id } = req.params;
    logVerbose(`[BANDA] GET - Obtener banda ID: ${id}`);

    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) {
        return res.status(400).json({ error: 'ID de banda inválido.' });
    }

    let conn;
    try {
        conn = await pool.getConnection();

        const sql = `
            SELECT
                id_banda as id,
                nombre,
                genero_musical,
                bio,
                instagram,
                facebook,
                twitter,
                tiktok,
                web_oficial,
                youtube,
                spotify,
                otras_redes,
                logo_url,
                foto_prensa_url,
                contacto_nombre,
                contacto_email,
                contacto_telefono,
                contacto_rol,
                verificada,
                activa,
                creado_en,
                actualizado_en
            FROM bandas_artistas
            WHERE id_banda = ?
        `;

        const [banda] = await conn.query(sql, [idNum]);

        if (!banda) {
            logWarning(`[BANDA] Banda no encontrada: ${idNum}`);
            return res.status(404).json({ error: 'Banda no encontrada.' });
        }

        // Obtener formación (integrantes)
        const sqlFormacion = `
            SELECT
                bf.id,
                bf.nombre_integrante,
                ci.nombre as instrumento,
                ci.id_instrumento,
                bf.es_lider,
                bf.notas
            FROM bandas_formacion bf
            LEFT JOIN catalogo_instrumentos ci ON bf.id_instrumento = ci.id_instrumento
            WHERE bf.id_banda = ?
            ORDER BY bf.es_lider DESC, bf.id ASC
        `;

        const integrantes = await conn.query(sqlFormacion, [idNum]);

        banda.integrantes = integrantes || [];

        logVerbose(`[BANDA] ✓ Banda obtenida: ${banda.nombre}`);

        return res.status(200).json(banda);

    } catch (err) {
        logError('[BANDA] Error al obtener banda:', err.message);
        return res.status(500).json({ error: 'Error al obtener banda.' });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * POST /api/bandas
 * Crear una nueva banda/artista
 */
const crearBanda = async (req, res) => {
    logVerbose('[BANDA] POST - Crear banda');
    logVerbose('[BANDA] Body:', JSON.stringify(req.body, null, 2));

    const {
        nombre,
        genero_musical,
        bio,
        instagram,
        facebook,
        twitter,
        tiktok,
        web_oficial,
        youtube,
        spotify,
        otras_redes,
        logo_url,
        foto_prensa_url,
        contacto_nombre,
        contacto_email,
        contacto_telefono,
        contacto_rol,
        integrantes // Array de {nombre_integrante, instrumento, es_lider, notas}
    } = req.body;

    // Validar campos obligatorios
    if (!nombre || nombre.trim().length === 0) {
        return res.status(400).json({ error: 'El nombre de la banda es obligatorio.' });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        // 1. Insertar banda
        const sqlBanda = `
            INSERT INTO bandas_artistas (
                nombre,
                genero_musical,
                bio,
                instagram,
                facebook,
                twitter,
                tiktok,
                web_oficial,
                youtube,
                spotify,
                otras_redes,
                logo_url,
                foto_prensa_url,
                contacto_nombre,
                contacto_email,
                contacto_telefono,
                contacto_rol,
                verificada,
                activa,
                creado_en
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, NOW())
        `;

        const paramsBanda = [
            nombre.trim(),
            genero_musical || null,
            bio || null,
            instagram || null,
            facebook || null,
            twitter || null,
            tiktok || null,
            web_oficial || null,
            youtube || null,
            spotify || null,
            otras_redes || null,
            logo_url || null,
            foto_prensa_url || null,
            contacto_nombre || null,
            contacto_email || null,
            contacto_telefono || null,
            contacto_rol || null
        ];

        const resultBanda = await conn.query(sqlBanda, paramsBanda);
        const bandaId = Number(resultBanda.insertId);

        logVerbose(`[BANDA] ✓ Banda creada con ID: ${bandaId}`);

        // 2. Insertar integrantes (si vienen)
        if (integrantes && Array.isArray(integrantes) && integrantes.length > 0) {
            const sqlIntegrante = `
                INSERT INTO bandas_formacion (
                    id_banda,
                    nombre_integrante,
                    id_instrumento,
                    es_lider,
                    notas
                ) VALUES (?, ?, ?, ?, ?)
            `;

            for (const integrante of integrantes) {
                // Buscar el id_instrumento basado en el nombre
                let id_instrumento = null;
                if (integrante.instrumento) {
                    const [instResult] = await conn.query(
                        'SELECT id_instrumento FROM catalogo_instrumentos WHERE nombre = ? LIMIT 1',
                        [integrante.instrumento]
                    );
                    id_instrumento = instResult?.id_instrumento || null;
                }

                const paramsIntegrante = [
                    bandaId,
                    integrante.nombre_integrante || null,
                    id_instrumento,
                    integrante.es_lider ? 1 : 0,
                    integrante.notas || null
                ];

                await conn.query(sqlIntegrante, paramsIntegrante);
            }

            logVerbose(`[BANDA] ✓ ${integrantes.length} integrantes agregados`);
        }

        await conn.commit();

        logVerbose(`[BANDA] ✓ Banda creada exitosamente`);

        return res.status(201).json({
            bandaId,
            id: bandaId, // backward-compatible alias
            nombre,
            genero_musical,
            message: 'Banda creada exitosamente.'
        });

    } catch (err) {
        if (conn) await conn.rollback();
        logError('[BANDA] Error al crear banda:', err.message);
        return res.status(500).json({ error: 'Error al crear banda.' });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * PUT /api/bandas/:id
 * Actualizar una banda existente
 */
const actualizarBanda = async (req, res) => {
    const { id } = req.params;
    logVerbose(`[BANDA] PUT - Actualizar banda ID: ${id}`);
    logVerbose('[BANDA] Body:', JSON.stringify(req.body, null, 2));

    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) {
        return res.status(400).json({ error: 'ID de banda inválido.' });
    }

    const {
        nombre,
        genero_musical,
        bio,
        instagram,
        facebook,
        twitter,
        tiktok,
        web_oficial,
        youtube,
        spotify,
        otras_redes,
        logo_url,
        foto_prensa_url,
        contacto_nombre,
        contacto_email,
        contacto_telefono,
        contacto_rol,
        verificada,
        activa,
        integrantes_operacion // {action: 'add'|'update'|'delete', data: {...}}
    } = req.body;

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        // 1. Verificar que la banda existe
        const [bandaExistente] = await conn.query(
            'SELECT id_banda FROM bandas_artistas WHERE id_banda = ?',
            [idNum]
        );

        if (!bandaExistente) {
            return res.status(404).json({ error: 'Banda no encontrada.' });
        }

        // 2. Actualizar banda
        const actualizaciones = [];
        const params = [];

        if (nombre !== undefined) {
            actualizaciones.push('nombre = ?');
            params.push(nombre.trim());
        }
        if (genero_musical !== undefined) {
            actualizaciones.push('genero_musical = ?');
            params.push(genero_musical || null);
        }
        if (bio !== undefined) {
            actualizaciones.push('bio = ?');
            params.push(bio || null);
        }
        if (instagram !== undefined) {
            actualizaciones.push('instagram = ?');
            params.push(instagram || null);
        }
        if (facebook !== undefined) {
            actualizaciones.push('facebook = ?');
            params.push(facebook || null);
        }
        if (twitter !== undefined) {
            actualizaciones.push('twitter = ?');
            params.push(twitter || null);
        }
        if (tiktok !== undefined) {
            actualizaciones.push('tiktok = ?');
            params.push(tiktok || null);
        }
        if (web_oficial !== undefined) {
            actualizaciones.push('web_oficial = ?');
            params.push(web_oficial || null);
        }
        if (youtube !== undefined) {
            actualizaciones.push('youtube = ?');
            params.push(youtube || null);
        }
        if (spotify !== undefined) {
            actualizaciones.push('spotify = ?');
            params.push(spotify || null);
        }
        if (otras_redes !== undefined) {
            actualizaciones.push('otras_redes = ?');
            params.push(otras_redes || null);
        }
        if (logo_url !== undefined) {
            actualizaciones.push('logo_url = ?');
            params.push(logo_url || null);
        }
        if (foto_prensa_url !== undefined) {
            actualizaciones.push('foto_prensa_url = ?');
            params.push(foto_prensa_url || null);
        }
        if (contacto_nombre !== undefined) {
            actualizaciones.push('contacto_nombre = ?');
            params.push(contacto_nombre || null);
        }
        if (contacto_email !== undefined) {
            actualizaciones.push('contacto_email = ?');
            params.push(contacto_email || null);
        }
        if (contacto_telefono !== undefined) {
            actualizaciones.push('contacto_telefono = ?');
            params.push(contacto_telefono || null);
        }
        if (contacto_rol !== undefined) {
            actualizaciones.push('contacto_rol = ?');
            params.push(contacto_rol || null);
        }
        if (verificada !== undefined) {
            actualizaciones.push('verificada = ?');
            params.push(verificada ? 1 : 0);
        }
        if (activa !== undefined) {
            actualizaciones.push('activa = ?');
            params.push(activa ? 1 : 0);
        }

        if (actualizaciones.length > 0) {
            actualizaciones.push('actualizado_en = NOW()');
            params.push(idNum);

            const sqlUpdate = `UPDATE bandas_artistas SET ${actualizaciones.join(', ')} WHERE id_banda = ?`;

            const result = await conn.query(sqlUpdate, params);
            logVerbose(`[BANDA] ✓ Banda actualizada: ${result.affectedRows} fila(s)`);
        }

        // 3. Manejar integrantes si viene la operación
        if (integrantes_operacion) {
            const { action, data } = integrantes_operacion;

            if (action === 'add' && data.instrumento) {
                // Buscar el id_instrumento basado en el nombre
                let id_instrumento = null;
                const [instResult] = await conn.query(
                    'SELECT id_instrumento FROM catalogo_instrumentos WHERE nombre = ? LIMIT 1',
                    [data.instrumento]
                );
                id_instrumento = instResult?.id_instrumento || null;

                const sqlAdd = `
                    INSERT INTO bandas_formacion (id_banda, nombre_integrante, id_instrumento, es_lider, notas)
                    VALUES (?, ?, ?, ?, ?)
                `;
                await conn.query(sqlAdd, [
                    idNum,
                    data.nombre_integrante || null,
                    id_instrumento,
                    data.es_lider ? 1 : 0,
                    data.notas || null
                ]);
                logVerbose(`[BANDA] ✓ Integrante agregado`);
            } else if (action === 'delete' && data.id_integrante) {
                const sqlDel = 'DELETE FROM bandas_formacion WHERE id = ? AND id_banda = ?';
                await conn.query(sqlDel, [data.id_integrante, idNum]);
                logVerbose(`[BANDA] ✓ Integrante eliminado`);
            }
        }

        // 4. Manejar formación completa si viene (reemplaza toda la formación)
        if (req.body.formacion !== undefined) {
            // Primero eliminar toda la formación existente
            await conn.query('DELETE FROM bandas_formacion WHERE id_banda = ?', [idNum]);

            // Insertar la nueva formación si hay datos
            if (Array.isArray(req.body.formacion) && req.body.formacion.length > 0) {
                const sqlInsertFormacion = `
                    INSERT INTO bandas_formacion (id_banda, nombre_integrante, id_instrumento, es_lider, notas)
                    VALUES (?, ?, ?, ?, ?)
                `;

                for (const integrante of req.body.formacion) {
                    // Buscar el id_instrumento basado en el nombre
                    let id_instrumento = null;
                    if (integrante.instrumento) {
                        const [instResult] = await conn.query(
                            'SELECT id_instrumento FROM catalogo_instrumentos WHERE nombre = ? LIMIT 1',
                            [integrante.instrumento]
                        );
                        id_instrumento = instResult?.id_instrumento || null;
                    }

                    await conn.query(sqlInsertFormacion, [
                        idNum,
                        integrante.nombre_integrante || null,
                        id_instrumento,
                        integrante.es_lider ? 1 : 0,
                        integrante.notas || null
                    ]);
                }

                logVerbose(`[BANDA] ✓ Formación actualizada: ${req.body.formacion.length} integrante(s)`);
            } else {
                logVerbose(`[BANDA] ✓ Formación eliminada (array vacío)`);
            }
        }

        await conn.commit();

        logVerbose(`[BANDA] ✓ Banda ID ${idNum} actualizada exitosamente`);

        return res.status(200).json({
            bandaId: idNum,
            message: 'Banda actualizada exitosamente.'
        });

    } catch (err) {
        if (conn) await conn.rollback();
        logError('[BANDA] Error al actualizar banda:', err.message);
        return res.status(500).json({ error: 'Error al actualizar banda.' });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * DELETE /api/bandas/:id
 * Eliminar una banda (soft delete: marcar como inactiva)
 */
const eliminarBanda = async (req, res) => {
    const { id } = req.params;
    const { soft_delete } = req.query; // soft_delete=true (por defecto) o soft_delete=false (hard delete)

    logVerbose(`[BANDA] DELETE - Eliminar banda ID: ${id}, soft_delete=${soft_delete !== 'false'}`);

    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) {
        return res.status(400).json({ error: 'ID de banda inválido.' });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        // Verificar que la banda existe
        const [bandaExistente] = await conn.query(
            'SELECT id_banda, nombre FROM bandas_artistas WHERE id_banda = ?',
            [idNum]
        );

        if (!bandaExistente) {
            return res.status(404).json({ error: 'Banda no encontrada.' });
        }

        // Verificar si hay solicitudes vinculadas
        const [solicitudesVinculadas] = await conn.query(
            'SELECT COUNT(*) as total FROM solicitudes_fechas_bandas WHERE id_banda = ?',
            [idNum]
        );

        if (solicitudesVinculadas.total > 0) {
            logWarning(`[BANDA] Banda ${idNum} tiene ${solicitudesVinculadas.total} solicitudes vinculadas. Solo se permitirá soft delete.`);
        }

        if (soft_delete !== 'false') {
            // Soft delete: marcar como inactiva
            const sqlSoftDel = 'UPDATE bandas_artistas SET activa = 0, actualizado_en = NOW() WHERE id_banda = ?';
            const result = await conn.query(sqlSoftDel, [idNum]);
            logVerbose(`[BANDA] ✓ Banda marcada como inactiva`);
        } else {
            // Hard delete: solo si no hay solicitudes vinculadas
            if (solicitudesVinculadas.total > 0) {
                throw new Error(`No se puede eliminar: la banda tiene ${solicitudesVinculadas.total} solicitudes vinculadas.`);
            }

            // Eliminar formación
            await conn.query('DELETE FROM bandas_formacion WHERE id_banda = ?', [idNum]);
            // Eliminar banda
            const sqlHardDel = 'DELETE FROM bandas_artistas WHERE id_banda = ?';
            await conn.query(sqlHardDel, [idNum]);
            logVerbose(`[BANDA] ✓ Banda eliminada permanentemente`);
        }

        await conn.commit();

        logVerbose(`[BANDA] ✓ Banda ID ${idNum} eliminada exitosamente`);

        return res.status(200).json({
            bandaId: idNum,
            method: soft_delete !== 'false' ? 'soft_delete' : 'hard_delete',
            message: 'Banda eliminada exitosamente.'
        });

    } catch (err) {
        if (conn) await conn.rollback();
        logError('[BANDA] Error al eliminar banda:', err.message);
        return res.status(500).json({ error: err.message || 'Error al eliminar banda.' });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * GET /api/bandas/instrumentos
 * Obtener catálogo de instrumentos
 */
const obtenerInstrumentos = async (req, res) => {
    logVerbose('[BANDA] GET - Obtener instrumentos');

    let conn;
    try {
        conn = await pool.getConnection();

        const instrumentos = await conn.query(
            `SELECT 
                id_instrumento as id,
                nombre,
                categoria,
                icono
            FROM catalogo_instrumentos
            ORDER BY categoria ASC, nombre ASC`
        );

        res.json(instrumentos);
    } catch (err) {
        logError('[BANDA] Error al obtener instrumentos:', err.message);
        return res.status(500).json({ error: err.message || 'Error al obtener instrumentos.' });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * GET /api/bandas/buscar?q=...
 * Buscar bandas por nombre
 */
const buscarBandas = async (req, res) => {
    const { q } = req.query;
    logVerbose(`[BANDA-BUSCAR] req.query: ${JSON.stringify(req.query)}`);
    logVerbose(`[BANDA-BUSCAR] Parámetro "q" recibido: "${q}" | Type: ${typeof q}`);

    if (!q || String(q).trim().length < 2) {
        logWarning(`[BANDA-BUSCAR] ⚠️ Query inválida (< 2 chars): "${q}"`);
        return res.status(400).json({ error: 'Query debe tener al menos 2 caracteres' });
    }

    let conn;
    try {
        conn = await pool.getConnection();

        const searchTerm = `%${String(q).trim()}%`;
        logVerbose(`[BANDA-BUSCAR] 🔍 SQL searchTerm: "${searchTerm}"`);

        // Debug: Contar total de bandas
        const [countResult] = await conn.query(`SELECT COUNT(*) as total FROM bandas_artistas`);
        logVerbose(`[BANDA-BUSCAR] 📊 Total bandas en DB: ${countResult?.total || 0}`);

        // Debug: Obtener primeras 5 bandas para ver qué hay
        const sampleBandas = await conn.query(`SELECT id_banda, nombre FROM bandas_artistas LIMIT 5`);
        logVerbose(`[BANDA-BUSCAR] 📋 Sample (primeras 5): ${JSON.stringify(sampleBandas)}`);

        // Búsqueda principal (case-insensitive + LOWER)
        const bandas = await conn.query(
            `SELECT 
                id_banda as id,
                nombre,
                genero_musical,
                logo_url,
                contacto_nombre,
                contacto_email,
                verificada,
                activa
            FROM bandas_artistas
            WHERE (LOWER(nombre) LIKE LOWER(?) OR LOWER(genero_musical) LIKE LOWER(?))
            ORDER BY nombre ASC
            LIMIT 10`,
            [searchTerm, searchTerm]
        );

        logVerbose(`[BANDA-BUSCAR] ✓ Query ejecutada, resultados: ${bandas ? bandas.length : 'NULL'} bandas`);

        if (bandas && bandas.length > 0) {
            bandas.forEach((b, i) => {
                logVerbose(`[BANDA-BUSCAR] Banda ${i + 1}: "${b.nombre}" (id: ${b.id}, activa: ${b.activa})`);
            });
        } else {
            logWarning(`[BANDA-BUSCAR] ⚠️ No se encontraron bandas para query: "${q}"`);
        }

        res.json(bandas || []);

    } catch (err) {
        logError(`[BANDA-BUSCAR] Error al buscar bandas: ${err.message}`);
        logError(`[BANDA-BUSCAR] Stack: ${err.stack}`);
        return res.status(500).json({ error: err.message || 'Error al buscar bandas.' });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * GET /api/bandas/sync-logos
 * Busca logos en filesystem para bandas sin logo_url y actualiza la BD
 * Ejecutado automáticamente al cargar la página
 */
const syncLogos = async (req, res) => {
    const fs = require('fs');
    const path = require('path');
    const uploadsDir = path.join(__dirname, '..', 'uploads', 'bandas');

    let conn;
    try {
        conn = await pool.getConnection();

        // Obtener todas las bandas sin logo_url
        const bandas = await conn.query(
            `SELECT id_banda, nombre FROM bandas_artistas WHERE logo_url IS NULL OR logo_url = ''`
        );

        logVerbose(`[BANDA-SYNC] Buscando logos para ${bandas.length} bandas sin logo_url`);

        let actualizadas = 0;

        for (const banda of bandas) {
            // Sanitizar nombre: lowercase, sin acentos, reemplazar espacios por _
            const sanitized = banda.nombre
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-zA-Z0-9 ]/g, '')
                .trim()
                .replace(/\s+/g, '_')
                .toLowerCase();

            // Buscar archivos que comiencen con logo_<sanitized>
            let logoEncontrado = null;
            try {
                if (fs.existsSync(uploadsDir)) {
                    const archivos = fs.readdirSync(uploadsDir);
                    const logoMatch = archivos.find(f => 
                        f.toLowerCase().startsWith(`logo_${sanitized}`) &&
                        (f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png'))
                    );

                    if (logoMatch) {
                        logoEncontrado = `/uploads/bandas/${logoMatch}`;
                        logVerbose(`[BANDA-SYNC] ✓ Logo encontrado para "${banda.nombre}": ${logoMatch}`);
                    }
                }
            } catch (err) {
                logWarning(`[BANDA-SYNC] Error al leer directorio para "${banda.nombre}":`, err.message);
            }

            // Actualizar BD si se encontró logo
            if (logoEncontrado) {
                await conn.query(
                    `UPDATE bandas_artistas SET logo_url = ? WHERE id_banda = ?`,
                    [logoEncontrado, banda.id_banda]
                );
                actualizadas++;
                logVerbose(`[BANDA-SYNC] BD actualizada: ${banda.nombre} → ${logoEncontrado}`);
            }
        }

        logVerbose(`[BANDA-SYNC] ✓ Sincronización completada: ${actualizadas}/${bandas.length} logos actualizados`);

        return res.status(200).json({
            message: `Sincronización de logos completada`,
            total: bandas.length,
            actualizadas: actualizadas
        });

    } catch (err) {
        logError('[BANDA-SYNC] Error en sincronización:', err.message);
        return res.status(500).json({ error: 'Error al sincronizar logos' });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * POST /api/bandas/upload
 * Subir logo de banda (público, sin autenticación)
 */
const uploadLogo = async (req, res) => {
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
                logWarning('No se pudo renombrar archivo a nombre limpio, usando nombre temporal', e.message || e);
                // en caso de error, mantenemos el archivo temporal
            }
        }

        const url = `/uploads/bandas/${finalFilename}`;
        res.status(201).json({ url });
    } catch (err) {
        logError('[BANDA] Error al subir logo:', err);
        res.status(500).json({ error: 'Error al subir archivo' });
    }
};

module.exports = {
    obtenerBandas,
    obtenerBandaPorId,
    crearBanda,
    actualizarBanda,
    eliminarBanda,
    obtenerInstrumentos,
    buscarBandas,
    syncLogos,
    uploadLogo
};
