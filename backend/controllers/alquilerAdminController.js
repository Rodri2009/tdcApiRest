// backend/controllers/alquilerAdminController.js
// API para administración de configuración de alquileres

const pool = require('../db');

// Helper para convertir BigInt a Number
const serializeBigInt = (obj) => {
    return JSON.parse(JSON.stringify(obj, (key, value) =>
        typeof value === 'bigint' ? Number(value) : value
    ));
};

// =============================================================================
// TIPOS DE EVENTO
// =============================================================================

/**
 * GET /api/admin/alquiler/tipos
 * Lista todos los tipos de evento (con filtro opcional por categoría)
 */
const getTipos = async (req, res) => {
    try {
        const { categoria } = req.query;

        let query = `
            SELECT 
                id_tipo_evento as id,
                id_tipo_evento as codigo,
                nombre_para_mostrar as nombre,
                descripcion,
                categoria,
                es_publico as activo
            FROM opciones_tipos
        `;
        const params = [];

        if (categoria) {
            query += ' WHERE categoria = ?';
            params.push(categoria);
        }

        query += ' ORDER BY categoria, nombre_para_mostrar';

        const tipos = await pool.query(query, params);
        res.json(serializeBigInt(tipos));
    } catch (err) {
        console.error('Error al obtener tipos:', err);
        res.status(500).json({ error: 'Error al obtener tipos' });
    }
};

/**
 * POST /api/admin/alquiler/tipos
 * Crea un nuevo tipo de evento
 */
const createTipo = async (req, res) => {
    try {
        const { codigo, nombre, descripcion, categoria, activo } = req.body;

        if (!codigo || !nombre || !categoria) {
            return res.status(400).json({ error: 'Código, nombre y categoría son requeridos' });
        }

        // Verificar si ya existe
        const [existente] = await pool.query(
            'SELECT id_tipo_evento FROM opciones_tipos WHERE id_tipo_evento = ?',
            [codigo]
        );

        if (existente) {
            return res.status(409).json({ error: 'Ya existe un tipo con ese código' });
        }

        await pool.query(`
            INSERT INTO opciones_tipos (id_tipo_evento, nombre_para_mostrar, descripcion, categoria, es_publico)
            VALUES (?, ?, ?, ?, ?)
        `, [codigo, nombre, descripcion || null, categoria, activo !== false ? 1 : 0]);

        res.status(201).json({ message: 'Tipo creado exitosamente', id: codigo });
    } catch (err) {
        console.error('Error al crear tipo:', err);
        res.status(500).json({ error: 'Error al crear tipo' });
    }
};

/**
 * PUT /api/admin/alquiler/tipos/:id
 * Actualiza un tipo de evento
 */
const updateTipo = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, descripcion, categoria, activo } = req.body;

        const setClauses = [];
        const params = [];

        if (nombre !== undefined) {
            setClauses.push('nombre_para_mostrar = ?');
            params.push(nombre);
        }
        if (descripcion !== undefined) {
            setClauses.push('descripcion = ?');
            params.push(descripcion);
        }
        if (categoria !== undefined) {
            setClauses.push('categoria = ?');
            params.push(categoria);
        }
        if (activo !== undefined) {
            setClauses.push('es_publico = ?');
            params.push(activo ? 1 : 0);
        }

        if (setClauses.length === 0) {
            return res.status(400).json({ error: 'No hay campos para actualizar' });
        }

        params.push(id);

        const result = await pool.query(
            `UPDATE opciones_tipos SET ${setClauses.join(', ')} WHERE id_tipo_evento = ?`,
            params
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Tipo no encontrado' });
        }

        res.json({ message: 'Tipo actualizado exitosamente' });
    } catch (err) {
        console.error('Error al actualizar tipo:', err);
        res.status(500).json({ error: 'Error al actualizar tipo' });
    }
};

/**
 * DELETE /api/admin/alquiler/tipos/:id
 * Elimina un tipo de evento
 */
const deleteTipo = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM opciones_tipos WHERE id_tipo_evento = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Tipo no encontrado' });
        }

        res.json({ message: 'Tipo eliminado exitosamente' });
    } catch (err) {
        console.error('Error al eliminar tipo:', err);
        res.status(500).json({ error: 'Error al eliminar tipo' });
    }
};

// =============================================================================
// DURACIONES
// =============================================================================

/**
 * GET /api/admin/alquiler/duraciones
 * Lista todas las duraciones
 */
const getDuraciones = async (req, res) => {
    try {
        const { id_evento } = req.query;

        let query = `
            SELECT 
                d.id,
                d.id_tipo_evento as id_evento,
                t.nombre_para_mostrar as tipo_evento,
                d.duracion_horas as horas,
                d.descripcion,
                1 as activo
            FROM opciones_duracion d
            LEFT JOIN opciones_tipos t ON d.id_tipo_evento = t.id_tipo_evento
        `;
        const params = [];

        if (id_evento) {
            query += ' WHERE d.id_tipo_evento = ?';
            params.push(id_evento);
        }

        query += ' ORDER BY d.id_tipo_evento, d.duracion_horas';

        const duraciones = await pool.query(query, params);
        res.json(serializeBigInt(duraciones));
    } catch (err) {
        console.error('Error al obtener duraciones:', err);
        res.status(500).json({ error: 'Error al obtener duraciones' });
    }
};

/**
 * POST /api/admin/alquiler/duraciones
 * Crea una nueva duración
 */
const createDuracion = async (req, res) => {
    try {
        const { id_evento, horas, descripcion } = req.body;

        if (!id_evento || !horas) {
            return res.status(400).json({ error: 'Tipo de evento y horas son requeridos' });
        }

        const result = await pool.query(`
            INSERT INTO opciones_duracion (id_tipo_evento, duracion_horas, descripcion)
            VALUES (?, ?, ?)
        `, [id_evento, horas, descripcion || null]);

        res.status(201).json({
            message: 'Duración creada exitosamente',
            id: Number(result.insertId)
        });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Ya existe esa duración para este tipo de evento' });
        }
        console.error('Error al crear duración:', err);
        res.status(500).json({ error: 'Error al crear duración' });
    }
};

/**
 * PUT /api/admin/alquiler/duraciones/:id
 * Actualiza una duración
 */
const updateDuracion = async (req, res) => {
    try {
        const { id } = req.params;
        const { id_evento, horas, descripcion } = req.body;

        const setClauses = [];
        const params = [];

        if (id_evento !== undefined) {
            setClauses.push('id_evento = ?');
            params.push(id_evento);
        }
        if (horas !== undefined) {
            setClauses.push('duracion_horas = ?');
            params.push(horas);
        }
        if (descripcion !== undefined) {
            setClauses.push('descripcion = ?');
            params.push(descripcion);
        }

        if (setClauses.length === 0) {
            return res.status(400).json({ error: 'No hay campos para actualizar' });
        }

        params.push(id);

        const result = await pool.query(
            `UPDATE opciones_duracion SET ${setClauses.join(', ')} WHERE id = ?`,
            params
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Duración no encontrada' });
        }

        res.json({ message: 'Duración actualizada exitosamente' });
    } catch (err) {
        console.error('Error al actualizar duración:', err);
        res.status(500).json({ error: 'Error al actualizar duración' });
    }
};

/**
 * DELETE /api/admin/alquiler/duraciones/:id
 * Elimina una duración
 */
const deleteDuracion = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM opciones_duracion WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Duración no encontrada' });
        }

        res.json({ message: 'Duración eliminada exitosamente' });
    } catch (err) {
        console.error('Error al eliminar duración:', err);
        res.status(500).json({ error: 'Error al eliminar duración' });
    }
};

// =============================================================================
// PRECIOS
// =============================================================================

/**
 * GET /api/admin/alquiler/precios
 * Lista todos los precios con sus vigencias
 */
const getPrecios = async (req, res) => {
    try {
        const { id_evento, vigentes } = req.query;

        let query = `
            SELECT 
                p.id,
                p.id_tipo_evento as id_evento,
                t.nombre_para_mostrar as tipo_evento,
                p.cantidad_min,
                p.cantidad_max,
                p.precio_por_hora,
                p.vigente_desde,
                p.vigente_hasta,
                CASE 
                    WHEN p.vigente_hasta IS NULL OR p.vigente_hasta >= CURDATE() THEN 1 
                    ELSE 0 
                END as activo
            FROM precios_vigencia p
            LEFT JOIN opciones_tipos t ON p.id_tipo_evento = t.id_tipo_evento
        `;
        const params = [];
        const conditions = [];

        if (id_evento) {
            conditions.push('p.id_tipo_evento = ?');
            params.push(id_evento);
        }

        if (vigentes === 'true' || vigentes === '1') {
            conditions.push('(p.vigente_hasta IS NULL OR p.vigente_hasta >= CURDATE())');
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY p.id_tipo_evento, p.cantidad_min, p.vigente_desde DESC';

        const precios = await pool.query(query, params);
        res.json(serializeBigInt(precios));
    } catch (err) {
        console.error('Error al obtener precios:', err);
        res.status(500).json({ error: 'Error al obtener precios' });
    }
};

/**
 * POST /api/admin/alquiler/precios
 * Crea un nuevo precio
 */
const createPrecio = async (req, res) => {
    try {
        const { id_evento, cantidad_min, cantidad_max, precio_por_hora, vigente_desde, vigente_hasta } = req.body;

        if (!id_evento || cantidad_min === undefined || cantidad_max === undefined || precio_por_hora === undefined || !vigente_desde) {
            return res.status(400).json({
                error: 'Se requieren: id_evento, cantidad_min, cantidad_max, precio_por_hora, vigente_desde'
            });
        }

        const result = await pool.query(`
            INSERT INTO precios_vigencia (id_tipo_evento, cantidad_min, cantidad_max, precio_por_hora, vigente_desde, vigente_hasta)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [id_evento, cantidad_min, cantidad_max, precio_por_hora, vigente_desde, vigente_hasta || null]);

        res.status(201).json({
            message: 'Precio creado exitosamente',
            id: Number(result.insertId)
        });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Ya existe un precio para esa combinación y fecha de vigencia' });
        }
        console.error('Error al crear precio:', err);
        res.status(500).json({ error: 'Error al crear precio' });
    }
};

/**
 * PUT /api/admin/alquiler/precios/:id
 * Actualiza un precio
 */
const updatePrecio = async (req, res) => {
    try {
        const { id } = req.params;
        const { id_evento, cantidad_min, cantidad_max, precio_por_hora, vigente_desde, vigente_hasta } = req.body;

        const setClauses = [];
        const params = [];

        if (id_evento !== undefined) {
            setClauses.push('id_evento = ?');
            params.push(id_evento);
        }
        if (cantidad_min !== undefined) {
            setClauses.push('cantidad_min = ?');
            params.push(cantidad_min);
        }
        if (cantidad_max !== undefined) {
            setClauses.push('cantidad_max = ?');
            params.push(cantidad_max);
        }
        if (precio_por_hora !== undefined) {
            setClauses.push('precio_por_hora = ?');
            params.push(precio_por_hora);
        }
        if (vigente_desde !== undefined) {
            setClauses.push('vigente_desde = ?');
            params.push(vigente_desde);
        }
        if (vigente_hasta !== undefined) {
            setClauses.push('vigente_hasta = ?');
            params.push(vigente_hasta);
        }

        if (setClauses.length === 0) {
            return res.status(400).json({ error: 'No hay campos para actualizar' });
        }

        params.push(id);

        const result = await pool.query(
            `UPDATE precios_vigencia SET ${setClauses.join(', ')} WHERE id = ?`,
            params
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Precio no encontrado' });
        }

        res.json({ message: 'Precio actualizado exitosamente' });
    } catch (err) {
        console.error('Error al actualizar precio:', err);
        res.status(500).json({ error: 'Error al actualizar precio' });
    }
};

/**
 * DELETE /api/admin/alquiler/precios/:id
 * Elimina un precio
 */
const deletePrecio = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM precios_vigencia WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Precio no encontrado' });
        }

        res.json({ message: 'Precio eliminado exitosamente' });
    } catch (err) {
        console.error('Error al eliminar precio:', err);
        res.status(500).json({ error: 'Error al eliminar precio' });
    }
};

// =============================================================================
// ADICIONALES
// =============================================================================

/**
 * GET /api/admin/alquiler/adicionales
 * Lista todos los servicios adicionales
 */
const getAdicionales = async (req, res) => {
    try {
        const adicionales = await pool.query(`
            SELECT 
                nombre as id,
                nombre,
                precio,
                descripcion,
                url_imagen,
                1 as activo
            FROM opciones_adicionales
            ORDER BY nombre
        `);
        res.json(serializeBigInt(adicionales));
    } catch (err) {
        console.error('Error al obtener adicionales:', err);
        res.status(500).json({ error: 'Error al obtener adicionales' });
    }
};

/**
 * POST /api/admin/alquiler/adicionales
 * Crea un nuevo adicional
 */
const createAdicional = async (req, res) => {
    try {
        const { nombre, precio, descripcion, url_imagen } = req.body;

        if (!nombre || precio === undefined) {
            return res.status(400).json({ error: 'Nombre y precio son requeridos' });
        }

        await pool.query(`
            INSERT INTO opciones_adicionales (nombre, precio, descripcion, url_imagen)
            VALUES (?, ?, ?, ?)
        `, [nombre, precio, descripcion || null, url_imagen || null]);

        res.status(201).json({ message: 'Adicional creado exitosamente', id: nombre });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Ya existe un adicional con ese nombre' });
        }
        console.error('Error al crear adicional:', err);
        res.status(500).json({ error: 'Error al crear adicional' });
    }
};

/**
 * PUT /api/admin/alquiler/adicionales/:nombre
 * Actualiza un adicional
 */
const updateAdicional = async (req, res) => {
    try {
        const { nombre } = req.params;
        const { nuevo_nombre, precio, descripcion, url_imagen } = req.body;

        // Si cambia el nombre, necesitamos hacer un proceso especial
        if (nuevo_nombre && nuevo_nombre !== nombre) {
            // Crear nuevo registro
            await pool.query(`
                INSERT INTO opciones_adicionales (nombre, precio, descripcion, url_imagen)
                SELECT ?, 
                    COALESCE(?, precio), 
                    COALESCE(?, descripcion), 
                    COALESCE(?, url_imagen)
                FROM opciones_adicionales WHERE nombre = ?
            `, [nuevo_nombre, precio, descripcion, url_imagen, nombre]);

            // Eliminar viejo
            await pool.query('DELETE FROM opciones_adicionales WHERE nombre = ?', [nombre]);

            return res.json({ message: 'Adicional actualizado exitosamente' });
        }

        const setClauses = [];
        const params = [];

        if (precio !== undefined) {
            setClauses.push('precio = ?');
            params.push(precio);
        }
        if (descripcion !== undefined) {
            setClauses.push('descripcion = ?');
            params.push(descripcion);
        }
        if (url_imagen !== undefined) {
            setClauses.push('url_imagen = ?');
            params.push(url_imagen);
        }

        if (setClauses.length === 0) {
            return res.status(400).json({ error: 'No hay campos para actualizar' });
        }

        params.push(nombre);

        const result = await pool.query(
            `UPDATE opciones_adicionales SET ${setClauses.join(', ')} WHERE nombre = ?`,
            params
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Adicional no encontrado' });
        }

        res.json({ message: 'Adicional actualizado exitosamente' });
    } catch (err) {
        console.error('Error al actualizar adicional:', err);
        res.status(500).json({ error: 'Error al actualizar adicional' });
    }
};

/**
 * DELETE /api/admin/alquiler/adicionales/:nombre
 * Elimina un adicional
 */
const deleteAdicional = async (req, res) => {
    try {
        const { nombre } = req.params;

        const result = await pool.query(
            'DELETE FROM opciones_adicionales WHERE nombre = ?',
            [nombre]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Adicional no encontrado' });
        }

        res.json({ message: 'Adicional eliminado exitosamente' });
    } catch (err) {
        console.error('Error al eliminar adicional:', err);
        res.status(500).json({ error: 'Error al eliminar adicional' });
    }
};

// =============================================================================
// PERSONAL
// =============================================================================

/**
 * GET /api/admin/personal
 * Lista todo el personal
 */
const getPersonal = async (req, res) => {
    try {
        const { activo } = req.query;

        let query = `
            SELECT 
                id_personal as id,
                nombre_completo as nombre,
                rol as roles,
                celular as telefono,
                cvu_alias,
                activo
            FROM personal_disponible
        `;
        const params = [];

        if (activo !== undefined) {
            query += ' WHERE activo = ?';
            params.push(activo === 'true' || activo === '1' ? 1 : 0);
        }

        query += ' ORDER BY nombre_completo';

        const personal = await pool.query(query, params);
        res.json(serializeBigInt(personal));
    } catch (err) {
        console.error('Error al obtener personal:', err);
        res.status(500).json({ error: 'Error al obtener personal' });
    }
};

/**
 * POST /api/admin/personal
 * Crea un nuevo personal
 */
const createPersonal = async (req, res) => {
    try {
        const { id, nombre, roles, telefono, cvu_alias, activo } = req.body;

        if (!nombre || !roles) {
            return res.status(400).json({ error: 'Nombre y roles son requeridos' });
        }

        // Generar ID si no viene
        const personalId = id || `PER_${Date.now()}`;

        await pool.query(`
            INSERT INTO personal_disponible (id_personal, nombre_completo, rol, celular, cvu_alias, activo)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [personalId, nombre, roles, telefono || null, cvu_alias || null, activo !== false ? 1 : 0]);

        res.status(201).json({ message: 'Personal creado exitosamente', id: personalId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Ya existe personal con ese ID' });
        }
        console.error('Error al crear personal:', err);
        res.status(500).json({ error: 'Error al crear personal' });
    }
};

/**
 * PUT /api/admin/personal/:id
 * Actualiza un personal
 */
const updatePersonal = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, roles, telefono, cvu_alias, activo } = req.body;

        const setClauses = [];
        const params = [];

        if (nombre !== undefined) {
            setClauses.push('nombre_completo = ?');
            params.push(nombre);
        }
        if (roles !== undefined) {
            setClauses.push('rol = ?');
            params.push(roles);
        }
        if (telefono !== undefined) {
            setClauses.push('celular = ?');
            params.push(telefono);
        }
        if (cvu_alias !== undefined) {
            setClauses.push('cvu_alias = ?');
            params.push(cvu_alias);
        }
        if (activo !== undefined) {
            setClauses.push('activo = ?');
            params.push(activo ? 1 : 0);
        }

        if (setClauses.length === 0) {
            return res.status(400).json({ error: 'No hay campos para actualizar' });
        }

        params.push(id);

        const result = await pool.query(
            `UPDATE personal_disponible SET ${setClauses.join(', ')} WHERE id_personal = ?`,
            params
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Personal no encontrado' });
        }

        res.json({ message: 'Personal actualizado exitosamente' });
    } catch (err) {
        console.error('Error al actualizar personal:', err);
        res.status(500).json({ error: 'Error al actualizar personal' });
    }
};

/**
 * DELETE /api/admin/personal/:id
 * Elimina (desactiva) un personal
 */
const deletePersonal = async (req, res) => {
    try {
        const { id } = req.params;

        // Soft delete
        const result = await pool.query(
            'UPDATE personal_disponible SET activo = 0 WHERE id_personal = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Personal no encontrado' });
        }

        res.json({ message: 'Personal desactivado exitosamente' });
    } catch (err) {
        console.error('Error al eliminar personal:', err);
        res.status(500).json({ error: 'Error al eliminar personal' });
    }
};

/**
 * GET /api/admin/roles
 * Lista todos los roles del catálogo con sus tarifas vigentes
 */
const getRoles = async (req, res) => {
    try {
        // Primero obtenemos los roles básicos
        const roles = await pool.query(`
            SELECT 
                cr.id, 
                cr.nombre, 
                cr.descripcion, 
                cr.activo
            FROM catalogo_roles cr
            ORDER BY cr.nombre
        `);

        // Luego obtenemos las tarifas vigentes
        const tarifas = await pool.query(`
            SELECT 
                pt.nombre_rol,
                JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'id', pt.id,
                        'monto_por_hora', pt.monto_por_hora,
                        'monto_fijo_evento', pt.monto_fijo_evento,
                        'monto_minimo', pt.monto_minimo,
                        'vigente_desde', pt.vigente_desde,
                        'vigente_hasta', pt.vigente_hasta,
                        'descripcion', pt.descripcion
                    )
                ) as tarifas_array
            FROM personal_tarifas pt
            WHERE pt.activo = 1 
                AND pt.vigente_desde <= CURDATE() 
                AND (pt.vigente_hasta IS NULL OR pt.vigente_hasta >= CURDATE())
            GROUP BY pt.nombre_rol
        `);

        //console.log('Tarifas obtenidas:', tarifas);

        // Combinamos los datos
        const rolesConTarifas = roles.map(rol => {
            const tarifaData = tarifas.find(t => t.nombre_rol === rol.nombre);
            return {
                ...rol,
                tarifas: tarifaData ? tarifaData.tarifas_array : []
            };
        });

        res.json(serializeBigInt(rolesConTarifas));
    } catch (err) {
        console.error('Error al obtener roles:', err);
        res.status(500).json({ error: 'Error al obtener roles' });
    }
};

/**
 * POST /api/admin/roles
 * Crear un nuevo rol
 */
const createRol = async (req, res) => {
    let conn;
    try {
        const { nombre, descripcion, activo, tarifas } = req.body;

        if (!nombre || !nombre.trim()) {
            return res.status(400).json({ error: 'El nombre del rol es requerido' });
        }

        conn = await pool.getConnection();
        await conn.beginTransaction();

        // Verificar si ya existe
        const existing = await conn.query(
            'SELECT id FROM catalogo_roles WHERE nombre = ?',
            [nombre.trim()]
        );
        if (existing && existing.length > 0) {
            await conn.rollback();
            return res.status(400).json({ error: 'Ya existe un rol con ese nombre' });
        }

        const result = await conn.query(
            'INSERT INTO catalogo_roles (nombre, descripcion, activo) VALUES (?, ?, ?)',
            [nombre.trim(), descripcion || null, activo !== false ? 1 : 0]
        );

        const rolId = result.insertId;

        // Insertar tarifas si existen
        if (tarifas && Array.isArray(tarifas) && tarifas.length > 0) {
            for (const tarifa of tarifas) {
                if (tarifa.vigente_desde) {
                    await conn.query(
                        `INSERT INTO personal_tarifas 
                        (nombre_rol, monto_por_hora, monto_fijo_evento, monto_minimo, 
                         vigente_desde, vigente_hasta, descripcion, activo) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
                        [
                            nombre.trim(),
                            tarifa.monto_por_hora || null,
                            tarifa.monto_fijo_evento || null,
                            tarifa.monto_minimo || null,
                            tarifa.vigente_desde,
                            tarifa.vigente_hasta || null,
                            tarifa.descripcion || null
                        ]
                    );
                }
            }
        }

        await conn.commit();

        res.status(201).json({
            message: 'Rol creado exitosamente',
            id: rolId
        });
    } catch (err) {
        if (conn) await conn.rollback();
        console.error('Error al crear rol:', err);
        res.status(500).json({ error: 'Error al crear rol' });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * PUT /api/admin/roles/:id
 * Actualizar un rol existente
 */
const updateRol = async (req, res) => {
    let conn;
    try {
        const { id } = req.params;
        const { nombre, descripcion, activo, tarifas } = req.body;

        conn = await pool.getConnection();
        await conn.beginTransaction();

        // Verificar que existe
        const existing = await conn.query('SELECT id, nombre FROM catalogo_roles WHERE id = ?', [id]);
        if (!existing || existing.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'Rol no encontrado' });
        }

        const nombreActual = existing[0].nombre;

        // Verificar nombre duplicado
        if (nombre) {
            const duplicate = await conn.query(
                'SELECT id FROM catalogo_roles WHERE nombre = ? AND id != ?',
                [nombre.trim(), id]
            );
            if (duplicate && duplicate.length > 0) {
                await conn.rollback();
                return res.status(400).json({ error: 'Ya existe otro rol con ese nombre' });
            }
        }

        // Actualizar el rol
        await conn.query(`
            UPDATE catalogo_roles SET
                nombre = COALESCE(?, nombre),
                descripcion = ?,
                activo = COALESCE(?, activo)
            WHERE id = ?
        `, [nombre?.trim(), descripcion, activo, id]);

        // Si se envían tarifas, actualizar la tabla de tarifas
        if (tarifas && Array.isArray(tarifas)) {
            // Desactivar tarifas existentes para este rol
            await conn.query(
                'UPDATE personal_tarifas SET activo = 0 WHERE nombre_rol = ?',
                [nombre || nombreActual]
            );

            // Insertar nuevas tarifas activas
            for (const tarifa of tarifas) {
                if (tarifa.vigente_desde) {
                    await conn.query(
                        `INSERT INTO personal_tarifas 
                        (nombre_rol, monto_por_hora, monto_fijo_evento, monto_minimo, 
                         vigente_desde, vigente_hasta, descripcion, activo) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
                        [
                            (nombre || nombreActual).trim(),
                            tarifa.monto_por_hora || null,
                            tarifa.monto_fijo_evento || null,
                            tarifa.monto_minimo || null,
                            tarifa.vigente_desde,
                            tarifa.vigente_hasta || null,
                            tarifa.descripcion || null
                        ]
                    );
                }
            }
        }

        await conn.commit();
        res.json({ message: 'Rol actualizado exitosamente' });
    } catch (err) {
        if (conn) await conn.rollback();
        console.error('Error al actualizar rol:', err);
        res.status(500).json({ error: 'Error al actualizar rol' });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * DELETE /api/admin/roles/:id
 * Eliminar un rol (soft delete)
 */
const deleteRol = async (req, res) => {
    try {
        const { id } = req.params;

        const existing = await pool.query('SELECT id FROM catalogo_roles WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Rol no encontrado' });
        }

        // Soft delete
        await pool.query('UPDATE catalogo_roles SET activo = 0 WHERE id = ?', [id]);

        res.json({ message: 'Rol desactivado exitosamente' });
    } catch (err) {
        console.error('Error al eliminar rol:', err);
        res.status(500).json({ error: 'Error al eliminar rol' });
    }
};

// =============================================================================
// COSTOS DE PERSONAL (costos_personal_vigencia)
// =============================================================================

/**
 * GET /api/admin/costos-personal
 * Lista todos los costos por rol
 */
const getCostosPersonal = async (req, res) => {
    try {
        const costos = await pool.query(`
            SELECT id, rol, fecha_de_vigencia, costo_por_hora, viaticos
            FROM costos_personal_vigencia
            ORDER BY rol, fecha_de_vigencia DESC
        `);
        res.json(serializeBigInt(costos));
    } catch (err) {
        console.error('Error al obtener costos:', err);
        res.status(500).json({ error: 'Error al obtener costos de personal' });
    }
};

/**
 * POST /api/admin/costos-personal
 * Crear un nuevo registro de costo
 */
const createCostoPersonal = async (req, res) => {
    try {
        const { rol, fecha_de_vigencia, costo_por_hora, viaticos } = req.body;

        if (!rol || !fecha_de_vigencia || !costo_por_hora) {
            return res.status(400).json({ error: 'Rol, fecha de vigencia y costo por hora son obligatorios' });
        }

        await pool.query(`
            INSERT INTO costos_personal_vigencia (rol, fecha_de_vigencia, costo_por_hora, viaticos)
            VALUES (?, ?, ?, ?)
        `, [rol.trim(), fecha_de_vigencia, costo_por_hora, viaticos || 0]);

        res.status(201).json({ message: 'Costo creado exitosamente' });
    } catch (err) {
        console.error('Error al crear costo:', err);
        res.status(500).json({ error: 'Error al crear costo de personal' });
    }
};

/**
 * PUT /api/admin/costos-personal/:id
 * Actualizar un registro de costo
 */
const updateCostoPersonal = async (req, res) => {
    try {
        const { id } = req.params;
        const { rol, fecha_de_vigencia, costo_por_hora, viaticos } = req.body;

        const existing = await pool.query('SELECT id FROM costos_personal_vigencia WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Registro de costo no encontrado' });
        }

        await pool.query(`
            UPDATE costos_personal_vigencia
            SET rol = ?, fecha_de_vigencia = ?, costo_por_hora = ?, viaticos = ?
            WHERE id = ?
        `, [rol?.trim(), fecha_de_vigencia, costo_por_hora, viaticos || 0, id]);

        res.json({ message: 'Costo actualizado exitosamente' });
    } catch (err) {
        console.error('Error al actualizar costo:', err);
        res.status(500).json({ error: 'Error al actualizar costo de personal' });
    }
};

/**
 * DELETE /api/admin/costos-personal/:id
 * Eliminar un registro de costo
 */
const deleteCostoPersonal = async (req, res) => {
    try {
        const { id } = req.params;

        const existing = await pool.query('SELECT id FROM costos_personal_vigencia WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Registro de costo no encontrado' });
        }

        await pool.query('DELETE FROM costos_personal_vigencia WHERE id = ?', [id]);

        res.json({ message: 'Costo eliminado exitosamente' });
    } catch (err) {
        console.error('Error al eliminar costo:', err);
        res.status(500).json({ error: 'Error al eliminar costo de personal' });
    }
};

module.exports = {
    // Tipos
    getTipos,
    createTipo,
    updateTipo,
    deleteTipo,
    // Duraciones
    getDuraciones,
    createDuracion,
    updateDuracion,
    deleteDuracion,
    // Precios
    getPrecios,
    createPrecio,
    updatePrecio,
    deletePrecio,
    // Adicionales
    getAdicionales,
    createAdicional,
    updateAdicional,
    deleteAdicional,
    // Personal
    getPersonal,
    createPersonal,
    updatePersonal,
    deletePersonal,
    // Roles
    getRoles,
    createRol,
    updateRol,
    deleteRol,
    // Costos de Personal
    getCostosPersonal,
    createCostoPersonal,
    updateCostoPersonal,
    deleteCostoPersonal
};
