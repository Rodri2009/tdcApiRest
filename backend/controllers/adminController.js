const pool = require('../db');

const getSolicitudes = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const sql = `
            SELECT 
                s.id_solicitud as id, 
                s.fecha_hora as fechaSolicitud, 
                s.nombre_completo as nombreCliente, 
                -- ¡CAMBIO CLAVE AQUÍ!
                COALESCE(ot.nombre_para_mostrar, s.tipo_de_evento) as tipoEvento, 
                DATE_FORMAT(s.fecha_evento, '%Y-%m-%d') as fechaEvento, 
                s.estado, 
                s.tipo_de_evento as tipoEventoId,
                (SELECT COUNT(*) FROM solicitudes_personal sp WHERE sp.id_solicitud = s.id_solicitud) > 0 AS tienePersonalAsignado
            FROM solicitudes s
            LEFT JOIN opciones_tipos ot ON s.tipo_de_evento = ot.id_evento
            ORDER BY s.fecha_hora DESC;
        `;

        const solicitudes = await conn.query(sql);
        res.status(200).json(solicitudes);
    } catch (err) {
        console.error("Error al obtener solicitudes de admin:", err); // Log de error mejorado
        res.status(500).json({ message: 'Error del servidor al obtener solicitudes.' });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * Actualiza el estado de una solicitud.
 */
const actualizarEstadoSolicitud = async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;

    // Lista de estados válidos para seguridad
    const estadosValidos = ['Solicitado', 'Contactado', 'Confirmado', 'Cancelado'];
    if (!estado || !estadosValidos.includes(estado)) {
        return res.status(400).json({ message: 'Estado no válido.' });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        const result = await conn.query("UPDATE solicitudes SET estado = ? WHERE id_solicitud = ?", [estado, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Solicitud no encontrada.' });
        }

        res.status(200).json({ success: true, message: `Estado de la solicitud ${id} actualizado a ${estado}.` });
    } catch (err) {
        res.status(500).json({ message: 'Error del servidor.' });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * Elimina una solicitud de forma permanente.
 */
const eliminarSolicitud = async (req, res) => {
    const { id } = req.params;

    let conn;
    try {
        conn = await pool.getConnection();
        // Por seguridad, borramos en cascada (primero los hijos, luego el padre)
        await conn.query("DELETE FROM solicitudes_adicionales WHERE id_solicitud = ?", [id]);
        await conn.query("DELETE FROM solicitudes_personal WHERE id_solicitud = ?", [id]);
        const result = await conn.query("DELETE FROM solicitudes WHERE id_solicitud = ?", [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Solicitud no encontrada.' });
        }

        res.status(200).json({ success: true, message: `Solicitud ${id} eliminada permanentemente.` });
    } catch (err) {
        res.status(500).json({ message: 'Error del servidor.' });
    } finally {
        if (conn) conn.release();
    }
};


const getDatosAsignacion = async (req, res) => {
    const { solicitudId, tipoEventoId } = req.query;
    if (!solicitudId || !tipoEventoId) {
        return res.status(400).json({ message: 'solicitudId y tipoEventoId son requeridos.' });
    }

    let conn;
    try {
        conn = await pool.getConnection();

        // Obtenemos los datos en paralelo
        const [rolesRequeridos, personalDisponible, asignacionesGuardadas] = await Promise.all([
            conn.query("SELECT rol_requerido as rol, cantidad FROM roles_por_evento WHERE id_evento = ?", [tipoEventoId]),
            conn.query("SELECT id_personal as id, nombre_completo as nombre, rol FROM personal_disponible WHERE activo = 1"),
            conn.query("SELECT rol_requerido as rol, id_personal_asignado as personalId FROM solicitudes_personal WHERE id_solicitud = ?", [solicitudId])
        ]);

        // Reorganizamos el personal por rol para que sea fácil de usar en el frontend
        const personalPorRol = personalDisponible.reduce((acc, persona) => {
            const roles = persona.rol.split(',').map(r => r.trim());
            roles.forEach(r => {
                if (!acc[r]) acc[r] = [];
                acc[r].push({ id: persona.id, nombre: persona.nombre });
            });
            return acc;
        }, {});

        res.status(200).json({
            rolesRequeridos,
            personalDisponible: personalPorRol,
            asignacionesGuardadas
        });

    } catch (err) {
        res.status(500).json({ message: 'Error del servidor al obtener datos de asignación.' });
    } finally {
        if (conn) conn.release();
    }
};

// --- NUEVA FUNCIÓN ---
/**
 * Guarda las asignaciones de personal para una solicitud.
 */
const guardarAsignaciones = async (req, res) => {
    const { id } = req.params; // ID de la solicitud
    const assignments = req.body; // Array de { rol, personalId }

    if (!Array.isArray(assignments)) {
        return res.status(400).json({ message: 'Se espera un array de asignaciones.' });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        // Borramos las asignaciones anteriores
        await conn.query("DELETE FROM solicitudes_personal WHERE id_solicitud = ?", [id]);

        if (assignments.length > 0) {
            // Insertamos las nuevas
            const sql = "INSERT INTO solicitudes_personal (id_solicitud, rol_requerido, id_personal_asignado, estado_asignacion) VALUES ?";
            const values = assignments.map(a => [id, a.rol, a.personalId, 'Asignado']);
            await conn.query(sql, [values]);
        }

        await conn.commit();
        res.status(200).json({ success: true, message: 'Asignaciones guardadas con éxito.' });

    } catch (err) {
        if (conn) await conn.rollback();
        res.status(500).json({ message: 'Error del servidor al guardar asignaciones.' });
    } finally {
        if (conn) conn.release();
    }
};


/**
 * Obtiene todos los datos consolidados para generar una Orden de Trabajo.
 */
const getOrdenDeTrabajo = async (req, res) => {
    const { id } = req.params; // ID de la solicitud

    let conn;
    try {
        conn = await pool.getConnection();

        // 1. Obtener los detalles de la solicitud y el tipo de evento
        const sqlSolicitud = `
            SELECT 
                s.id_solicitud, s.nombre_completo, s.fecha_evento, s.hora_evento, s.duracion, s.descripcion,
                ot.nombre_para_mostrar as tipo_evento, ot.id_evento as tipo_evento_id
            FROM solicitudes s
            LEFT JOIN opciones_tipos ot ON s.tipo_de_evento = ot.id_evento
            WHERE s.id_solicitud = ?;
        `;
        const [solicitud] = await conn.query(sqlSolicitud, [id]);

        if (!solicitud) {
            return res.status(404).json({ message: 'Solicitud no encontrada.' });
        }

        // 2. Obtener el personal asignado a esta solicitud
        const sqlPersonal = `
            SELECT pd.nombre_completo, sp.rol_requerido
            FROM solicitudes_personal sp
            JOIN personal_disponible pd ON sp.id_personal_asignado = pd.id_personal
            WHERE sp.id_solicitud = ?;
        `;
        const personalAsignado = await conn.query(sqlPersonal, [id]);

        if (personalAsignado.length === 0) {
            return res.status(404).json({ message: 'No hay personal asignado a esta solicitud.' });
        }

        // 3. Obtener las reglas de costos de personal vigentes
        // (Asumimos que usamos la regla más reciente para cada rol)
        const sqlCostos = `
            SELECT rol, costo_por_hora, viaticos
            FROM (
                SELECT *, ROW_NUMBER() OVER(PARTITION BY rol ORDER BY fecha_de_vigencia DESC) as rn
                FROM costos_personal_vigencia
                WHERE fecha_de_vigencia <= ?
            ) t
            WHERE rn = 1;
        `;
        const costosVigentes = await conn.query(sqlCostos, [solicitud.fecha_evento]);

        // Convertimos el array de costos a un objeto para fácil acceso: { "Encargada": { costo: 5000, viaticos: 1200 }, ... }
        const costosMap = costosVigentes.reduce((acc, costo) => {
            acc[costo.rol] = { costo_por_hora: parseFloat(costo.costo_por_hora), viaticos: parseFloat(costo.viaticos) };
            return acc;
        }, {});

        // 4. Calcular los costos y construir la respuesta final
        let costoTotalPersonal = 0;
        const duracionNum = parseInt(solicitud.duracion.match(/\d+/)[0] || '0');

        const staffDetails = personalAsignado.map(persona => {
            const costoInfo = costosMap[persona.rol_requerido] || { costo_por_hora: 0, viaticos: 0 };
            const totalPorPersona = (costoInfo.costo_por_hora * duracionNum) + costoInfo.viaticos;
            costoTotalPersonal += totalPorPersona;
            return {
                nombre: persona.nombre_completo,
                rol: persona.rol_requerido,
                costoPorHora: costoInfo.costo_por_hora,
                viaticos: costoInfo.viaticos,
                totalPorPersona: totalPorPersona
            };
        });

        const respuesta = {
            solicitudId: solicitud.id_solicitud,
            clienteNombre: solicitud.nombre_completo,
            fechaEvento: new Date(solicitud.fecha_evento).toLocaleDateString('es-AR', { timeZone: 'UTC' }),
            tipoEvento: solicitud.tipo_evento,
            tipoEventoIdForNav: solicitud.tipo_evento_id, // Para el botón "Volver"
            horaInicio: solicitud.hora_evento,
            duracionTotalPersonalEnHoras: duracionNum, // Simplificado
            detallesAdicionales: solicitud.descripcion || 'Sin detalles.',
            assignedStaff: staffDetails,
            costoTotalPersonal: costoTotalPersonal,
        };

        res.status(200).json(respuesta);

    } catch (err) {
        console.error("Error al generar la orden de trabajo:", err);
        res.status(500).json({ message: 'Error del servidor al generar la orden.' });
    } finally {
        if (conn) conn.release();
    }
};


// No olvides exportar las nuevas funciones
module.exports = {
    getSolicitudes,
    actualizarEstadoSolicitud,
    eliminarSolicitud,
    getDatosAsignacion,
    guardarAsignaciones,
    getOrdenDeTrabajo,
};
