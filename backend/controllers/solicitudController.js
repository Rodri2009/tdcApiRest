// backend/controllers/solicitudController.js
const pool = require('../db');

const crearSolicitud = async (req, res) => {
    console.log("-> Ejecutando controlador crearSolicitud...");

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
        conn = await pool.getConnection();

        // --- ¡CORRECCIÓN FINAL! ---
        // Cambiamos `fingerprint_id` a `fingerprintid`
        const sql = `
            INSERT INTO solicitudes (
                fecha_hora, tipo_de_evento, cantidad_de_personas, duracion, 
                fecha_evento, hora_evento, precio_basico, estado, fingerprintid
            ) VALUES (NOW(), ?, ?, ?, ?, ?, ?, 'Solicitado', ?);
        `;

        const params = [
            tipoEvento,
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
            console.log(`Nueva solicitud creada con ID: ${newId}`);
            res.status(201).json({ solicitudId: newId });
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
    // Obtenemos el ID de los parámetros de la URL (ej. /api/solicitudes/13)
    const { id } = req.params;
    console.log(`-> Petición para obtener solicitud con ID: ${id}`);

    let conn;
    try {
        conn = await pool.getConnection();

        const sql = `
            SELECT 
                s.*, 
                ot.nombre_para_mostrar 
            FROM solicitudes s
            LEFT JOIN opciones_tipos ot ON s.tipo_de_evento = ot.id_evento
            WHERE s.id_solicitud = ?;
        `;


        // Consulta para obtener los detalles básicos de la solicitud
        const [solicitud] = await conn.query(sql, [id]);

        if (!solicitud) {
            return res.status(404).json({ error: 'Solicitud no encontrada.' });
        }

        // Consulta para obtener los adicionales asociados a esa solicitud
        const adicionales = await conn.query("SELECT * FROM solicitudes_adicionales WHERE id_solicitud = ?", [id]);

        // Combinamos todo en un solo objeto de respuesta
        const respuesta = {
            ...solicitud,
            adicionales: adicionales || []
        };

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
    const { nombreCompleto, celular, email, detallesAdicionales } = req.body;

    console.log(`-> Finalizando solicitud con ID: ${id}`);

    if (!nombreCompleto || !celular || !email) {
        return res.status(400).json({ error: 'Nombre, celular y email son obligatorios.' });
    }

    let conn;
    try {
        conn = await pool.getConnection();

        // En el futuro, aquí también recalcularíamos el precio final
        // por si se añadieron adicionales. Por ahora, solo actualizamos los datos.

        const sql = `
            UPDATE solicitudes 
            SET 
                nombre_completo = ?,
                telefono = ?,
                email = ?,
                descripcion = ?,
                estado = 'Confirmado' 
            WHERE id_solicitud = ?;
        `;

        const params = [nombreCompleto, celular, email, detallesAdicionales, id];
        const result = await conn.query(sql, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'La solicitud a actualizar no fue encontrada.' });
        }

        // Aquí iría la lógica para enviar los emails.
        // Por ahora, solo devolvemos un mensaje de éxito.
        console.log(`Solicitud ${id} actualizada y confirmada.`);
        res.status(200).json({ message: 'Solicitud confirmada exitosamente.' });

    } catch (err) {
        console.error(`Error al finalizar la solicitud ${id}:`, err);
        res.status(500).json({ error: 'Error interno del servidor.' });
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

    console.log(`-> Guardando ${adicionales.length} adicionales para la solicitud ID: ${id}`);

    if (!id || !Array.isArray(adicionales)) {
        return res.status(400).json({ error: 'Se requiere un ID de solicitud y un array de adicionales.' });
    }

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

        console.log(`Adicionales para la solicitud ${id} guardados correctamente.`);
        res.status(200).json({ message: 'Adicionales guardados exitosamente.' });

    } catch (err) {
        if (conn) await conn.rollback();
        console.error(`Error al guardar adicionales para la solicitud ${id}:`, err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    } finally {
        if (conn) conn.release();
    }
};


module.exports = {
    crearSolicitud,
    getSolicitudPorId,
    finalizarSolicitud,
    guardarAdicionales, // <-- Añade esto
};
