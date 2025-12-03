const pool = require('../db');

// Función para generar ID único para asignaciones
function generateAssignmentId() {
    return `ASG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

const getSolicitudes = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        // Unificamos solicitudes y eventos para que el panel admin muestre ambas fuentes.
        // Las filas provenientes de `eventos` tienen `origen = 'evento'` y un id prefijado 'ev_<id>' para evitar colisión con solicitudes.
        const sql = `
            SELECT * FROM (
                SELECT 
                    s.id_solicitud as id,
                    s.fecha_hora as fechaSolicitud,
                    s.nombre_completo as nombreCliente,
                    COALESCE(ot.nombre_para_mostrar, s.tipo_servicio) as tipoEvento,
                    DATE_FORMAT(s.fecha_evento, '%Y-%m-%d') as fechaEvento,
                    s.estado,
                    s.tipo_servicio as tipoEventoId,
                    (SELECT COUNT(*) FROM solicitudes_personal sp WHERE sp.id_solicitud = s.id_solicitud) > 0 AS tienePersonalAsignado,
                    'solicitud' as origen,
                    s.hora_evento as horaInicio
                FROM solicitudes s
                LEFT JOIN opciones_tipos ot ON s.tipo_servicio = ot.id_evento
                UNION ALL
                SELECT
                    CONCAT('ev_', e.id) as id,
                    e.fecha_creacion as fechaSolicitud,
                    e.nombre_banda as nombreCliente,
                    e.nombre_banda as tipoEvento,
                    DATE_FORMAT(e.fecha_hora, '%Y-%m-%d') as fechaEvento,
                    COALESCE(e.estado, CASE WHEN e.activo = 1 THEN 'Confirmado' ELSE 'Solicitado' END) as estado,
                    e.tipo_evento as tipoEventoId,
                    (SELECT COUNT(*) FROM eventos_personal ep WHERE ep.id_evento = e.id) > 0 AS tienePersonalAsignado,
                    'evento' as origen,
                    DATE_FORMAT(e.fecha_hora, '%H:%i') as horaInicio
                FROM eventos e
            ) t
            ORDER BY COALESCE(t.fechaEvento, t.fechaSolicitud) DESC, t.fechaSolicitud DESC;
        `;

        const solicitudes = await conn.query(sql);
        // DEBUG: registrar resumen para depuración de fechas
        try {
            console.log(`[DEBUG] getSolicitudes - total solicitudes encontradas: ${solicitudes.length}`);
            const matches = solicitudes.filter(s => String(s.fechaEvento) === '2025-12-06');
            console.log(`[DEBUG] getSolicitudes - solicitudes con fecha 2025-12-06: ${matches.length}`, matches.slice(0, 5));
            // También consultar la tabla `eventos` directamente para esa fecha
            // Adaptación: algunos esquemas antiguos usan `id_evento` como PK varchar,
            // el esquema actual usa `id` (INT). Para evitar errores en entornos mixtos
            // aliasamos `id AS id_evento` para mantener la estructura del debug.
            const eventosOnDate = await conn.query("SELECT id AS id_evento, nombre_banda, DATE_FORMAT(fecha_hora,'%Y-%m-%d') as fecha, DATE_FORMAT(fecha_hora,'%H:%i') as hora, activo FROM eventos WHERE DATE(fecha_hora) = ?", ['2025-12-06']);
            console.log('[DEBUG] getSolicitudes - eventos en 2025-12-06 (tabla eventos):', eventosOnDate);
        } catch (dbgErr) {
            console.error('[DEBUG] getSolicitudes - error al obtener datos de depuración:', dbgErr);
        }

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

/**
 * Elimina un evento por id (cascade en subtables)
 */
const eliminarEvento = async (req, res) => {
    const { id } = req.params;
    const eventId = parseInt(id, 10);
    if (isNaN(eventId)) return res.status(400).json({ message: 'ID de evento inválido.' });

    let conn;
    try {
        conn = await pool.getConnection();
        // Borrar asignaciones relacionadas en eventos_personal si existen
        await conn.query("DELETE FROM eventos_personal WHERE id_evento = ?", [eventId]);
        // Borrar subtables que referencien a eventos (si existen) - ON DELETE CASCADE debería encargarse
        const result = await conn.query("DELETE FROM eventos WHERE id = ?", [eventId]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Evento no encontrado.' });
        res.status(200).json({ success: true, message: 'Evento eliminado correctamente.' });
    } catch (err) {
        console.error('Error al eliminar evento:', err);
        res.status(500).json({ message: 'Error del servidor al eliminar evento.' });
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

        // roles y personal disponible son comunes
        const [rolesRequeridos, personalDisponible] = await Promise.all([
            conn.query("SELECT rol_requerido as rol, cantidad FROM roles_por_evento WHERE id_evento = ?", [tipoEventoId]),
            conn.query("SELECT id_personal as id, nombre_completo as nombre, rol FROM personal_disponible WHERE activo = 1")
        ]);

        // Determinar si la solicitudId se refiere a un evento (prefijo 'ev_')
        let asignacionesGuardadas = [];
        if (String(solicitudId).startsWith('ev_')) {
            const eventId = parseInt(String(solicitudId).replace('ev_', ''), 10);
            if (isNaN(eventId)) return res.status(400).json({ message: 'ID de evento inválido.' });

            // Asegurarnos que existe la tabla eventos_personal (si no, la creamos de forma segura)
            await conn.query(`
                CREATE TABLE IF NOT EXISTS eventos_personal (
                    id_asignacion VARCHAR(50) PRIMARY KEY,
                    id_evento INT,
                    rol_requerido VARCHAR(100),
                    id_personal_asignado VARCHAR(50),
                    estado_asignacion VARCHAR(50),
                    INDEX (id_evento)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            `);

            asignacionesGuardadas = await conn.query(
                "SELECT rol_requerido as rol, id_personal_asignado as personalId FROM eventos_personal WHERE id_evento = ?",
                [eventId]
            );
        } else {
            // Asignaciones normales para solicitudes
            asignacionesGuardadas = await conn.query(
                "SELECT rol_requerido as rol, id_personal_asignado as personalId FROM solicitudes_personal WHERE id_solicitud = ?",
                [solicitudId]
            );
        }

        // Reorganizamos el personal por rol para que sea fácil de usar en el frontend
        const personalPorRol = personalDisponible.reduce((acc, persona) => {
            const roles = (persona.rol || '').split(',').map(r => r.trim()).filter(Boolean);
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
        console.error('Error en getDatosAsignacion:', err);
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
    const { id } = req.params; // ID de la solicitud o 'ev_<id>' para evento
    const assignments = req.body; // Array de { rol, personalId }

    console.log("[DEBUG] guardarAsignaciones - Inicio");
    console.log("[DEBUG] ID recibido:", id);
    console.log("[DEBUG] Asignaciones recibidas:", JSON.stringify(assignments));

    if (!Array.isArray(assignments)) {
        console.log("[DEBUG] ERROR: assignments no es un array");
        return res.status(400).json({ message: 'Se espera un array de asignaciones.' });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        if (String(id).startsWith('ev_')) {
            // Asignaciones para un evento
            const eventId = parseInt(String(id).replace('ev_', ''), 10);
            if (isNaN(eventId)) {
                return res.status(400).json({ message: 'ID de evento inválido.' });
            }

            // Crear tabla eventos_personal si no existe
            await conn.query(`
                CREATE TABLE IF NOT EXISTS eventos_personal (
                    id_asignacion VARCHAR(50) PRIMARY KEY,
                    id_evento INT,
                    rol_requerido VARCHAR(100),
                    id_personal_asignado VARCHAR(50),
                    estado_asignacion VARCHAR(50),
                    INDEX (id_evento)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            `);

            console.log("[DEBUG] Eliminando asignaciones anteriores para evento:", eventId);
            await conn.query("DELETE FROM eventos_personal WHERE id_evento = ?", [eventId]);

            if (assignments.length > 0) {
                for (const assignment of assignments) {
                    const personalId = String(assignment.personalId).trim();
                    if (!personalId || personalId === '') {
                        throw new Error(`ID de personal vacío o inválido: ${assignment.personalId}`);
                    }
                    const idAsignacion = generateAssignmentId();
                    console.log(`[DEBUG] Insertando (evento): eventId=${eventId}, rol=${assignment.rol}, personalId=${personalId}, idAsignacion=${idAsignacion}`);
                    await conn.query(
                        "INSERT INTO eventos_personal (id_asignacion, id_evento, rol_requerido, id_personal_asignado, estado_asignacion) VALUES (?, ?, ?, ?, ?)",
                        [idAsignacion, eventId, assignment.rol, personalId, 'Asignado']
                    );
                }
            } else {
                console.log("[DEBUG] No hay asignaciones para insertar (array vacío) para evento");
            }

        } else {
            // Asignaciones para solicitud existente (comportamiento previo)
            const solicitudId = parseInt(id, 10);
            if (isNaN(solicitudId)) {
                return res.status(400).json({ message: 'ID de solicitud inválido.' });
            }

            console.log("[DEBUG] Eliminando asignaciones anteriores para solicitudId:", solicitudId);
            await conn.query("DELETE FROM solicitudes_personal WHERE id_solicitud = ?", [solicitudId]);

            if (assignments.length > 0) {
                for (const assignment of assignments) {
                    const personalId = String(assignment.personalId).trim();
                    if (!personalId || personalId === '') {
                        throw new Error(`ID de personal vacío o inválido: ${assignment.personalId}`);
                    }
                    const idAsignacion = generateAssignmentId();
                    console.log(`[DEBUG] Insertando: solicitudId=${solicitudId}, rol=${assignment.rol}, personalId=${personalId}, idAsignacion=${idAsignacion}`);
                    await conn.query(
                        "INSERT INTO solicitudes_personal (id_asignacion, id_solicitud, rol_requerido, id_personal_asignado, estado_asignacion) VALUES (?, ?, ?, ?, ?)",
                        [idAsignacion, solicitudId, assignment.rol, personalId, 'Asignado']
                    );
                }
            } else {
                console.log("[DEBUG] No hay asignaciones para insertar (array vacío)");
            }
        }

        await conn.commit();
        console.log("[DEBUG] Transacción completada exitosamente");
        res.status(200).json({ success: true, message: 'Asignaciones guardadas con éxito.' });

    } catch (err) {
        if (conn) await conn.rollback();
        console.error("Error al guardar asignaciones:", err);
        res.status(500).json({ message: 'Error del servidor al guardar asignaciones: ' + err.message });
    } finally {
        if (conn) conn.release();
    }
};


/**
 * Obtiene todos los datos consolidados para generar una Orden de Trabajo.
 */
const getOrdenDeTrabajo = async (req, res) => {
    const { id } = req.params; // ID de la solicitud o 'ev_<id>' para evento

    let conn;
    try {
        conn = await pool.getConnection();

        // Si es un evento
        if (String(id).startsWith('ev_')) {
            const eventId = parseInt(String(id).replace('ev_', ''), 10);
            if (isNaN(eventId)) return res.status(400).json({ message: 'ID de evento inválido.' });

            // Obtener detalles del evento
            const sqlEvento = `
                SELECT e.id, e.nombre_banda as nombre_completo, DATE(fecha_hora) as fecha_evento, DATE_FORMAT(fecha_hora,'%H:%i') as hora_evento, '' as duracion, e.descripcion, e.tipo_evento
                FROM eventos e
                WHERE e.id = ?
            `;
            const [evento] = await conn.query(sqlEvento, [eventId]);
            if (!evento) return res.status(404).json({ message: 'Evento no encontrado.' });

            // Obtener personal asignado desde eventos_personal
            await conn.query(`
                CREATE TABLE IF NOT EXISTS eventos_personal (
                    id_asignacion VARCHAR(50) PRIMARY KEY,
                    id_evento INT,
                    rol_requerido VARCHAR(100),
                    id_personal_asignado VARCHAR(50),
                    estado_asignacion VARCHAR(50),
                    INDEX (id_evento)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            `);

            const sqlPersonal = `
                SELECT pd.nombre_completo, ep.rol_requerido
                FROM eventos_personal ep
                JOIN personal_disponible pd ON ep.id_personal_asignado = pd.id_personal
                WHERE ep.id_evento = ?
            `;
            const personalAsignado = await conn.query(sqlPersonal, [eventId]);

            if (personalAsignado.length === 0) {
                return res.status(404).json({ message: 'No hay personal asignado a este evento.' });
            }

            // Obtener costos vigentes basado en la fecha del evento
            const sqlCostos = `
                SELECT rol, costo_por_hora, viaticos
                FROM (
                    SELECT *, ROW_NUMBER() OVER(PARTITION BY rol ORDER BY fecha_de_vigencia DESC) as rn
                    FROM costos_personal_vigencia
                    WHERE fecha_de_vigencia <= ?
                ) t
                WHERE rn = 1;
            `;
            const costosVigentes = await conn.query(sqlCostos, [evento.fecha_evento]);

            const costosMap = costosVigentes.reduce((acc, costo) => {
                acc[costo.rol] = { costo_por_hora: parseFloat(costo.costo_por_hora), viaticos: parseFloat(costo.viaticos) };
                return acc;
            }, {});

            // Para eventos no tenemos duracion en la tabla eventos por defecto; asumimos 3 horas si no viene
            const duracionNum = evento.duracion ? parseInt(String(evento.duracion).match(/\d+/)?.[0] || '0') : 3;

            let costoTotalPersonal = 0;
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
                solicitudId: `ev_${evento.id}`,
                clienteNombre: evento.nombre_completo,
                fechaEvento: new Date(evento.fecha_evento).toLocaleDateString('es-AR', { timeZone: 'UTC' }),
                tipoEvento: evento.tipo_evento,
                tipoEventoIdForNav: evento.tipo_evento,
                horaInicio: evento.hora_evento,
                duracionTotalPersonalEnHoras: duracionNum,
                detallesAdicionales: evento.descripcion || 'Sin detalles.',
                assignedStaff: staffDetails,
                costoTotalPersonal: costoTotalPersonal,
            };

            return res.status(200).json(respuesta);
        }

        // Si no es un evento, tratamos como solicitud (comportamiento previo)
        const solicitudId = parseInt(id, 10);
        if (isNaN(solicitudId)) return res.status(400).json({ message: 'ID inválido.' });

        // 1. Obtener los detalles de la solicitud y el tipo de evento
        const sqlSolicitud = `
            SELECT 
                s.id_solicitud, s.nombre_completo, s.fecha_evento, s.hora_evento, s.duracion, s.descripcion,
                ot.nombre_para_mostrar as tipo_evento, ot.id_evento as tipo_evento_id
            FROM solicitudes s
            LEFT JOIN opciones_tipos ot ON s.tipo_servicio = ot.id_evento
            WHERE s.id_solicitud = ?;
        `;
        const [solicitud] = await conn.query(sqlSolicitud, [solicitudId]);

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
        const personalAsignado = await conn.query(sqlPersonal, [solicitudId]);

        console.log(`[DEBUG] getOrdenDeTrabajo - solicitudId: ${solicitudId}, personalAsignado encontrado: ${personalAsignado.length}`);

        if (personalAsignado.length === 0) {
            return res.status(404).json({ message: 'No hay personal asignado a esta solicitud.' });
        }

        // 3. Obtener las reglas de costos de personal vigentes
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


const getAllTiposDeEvento = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query(
            "SELECT id_evento as id, nombre_para_mostrar as nombreParaMostrar, descripcion, monto_sena as montoSena, deposito as depositoGarantia, es_publico as esPublico FROM opciones_tipos;"
        );
        res.status(200).json(rows);
    } catch (err) {
        console.error("Error al obtener todos los tipos de evento para admin:", err);
        res.status(500).json({ message: 'Error del servidor.' });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * Actualiza datos básicos de un evento (eventos table).
 */

const actualizarEvento = async (req, res) => {
    const { id } = req.params;
    const { nombre_banda, fecha_hora, descripcion, tipo_evento, activo, estado } = req.body;

    const eventId = parseInt(id, 10);
    if (isNaN(eventId)) return res.status(400).json({ message: 'ID de evento inválido.' });

    let conn;
    try {
        conn = await pool.getConnection();
        // Construir actualización dinámica para evitar sobreescribir con nulls
        const updates = [];
        const params = [];
        if (typeof nombre_banda !== 'undefined') { updates.push('nombre_banda = ?'); params.push(nombre_banda); }
        if (typeof fecha_hora !== 'undefined') { updates.push('fecha_hora = ?'); params.push(fecha_hora); }
        if (typeof descripcion !== 'undefined') { updates.push('descripcion = ?'); params.push(descripcion); }
        if (typeof tipo_evento !== 'undefined') { updates.push('tipo_evento = ?'); params.push(tipo_evento); }
        if (typeof activo !== 'undefined') { updates.push('activo = ?'); params.push(activo ? 1 : 0); }
        if (typeof estado !== 'undefined') { updates.push('estado = ?'); params.push(estado); }

        if (updates.length === 0) return res.status(400).json({ message: 'No hay campos para actualizar.' });

        const sql = `UPDATE eventos SET ${updates.join(', ')} WHERE id = ?`;
        params.push(eventId);
        const result = await conn.query(sql, params);

        if (result.affectedRows === 0) return res.status(404).json({ message: 'Evento no encontrado.' });

        res.status(200).json({ success: true, message: 'Evento actualizado correctamente.' });
    } catch (err) {
        console.error('Error al actualizar evento:', err);
        res.status(500).json({ message: 'Error al actualizar evento.' });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * Cancela/desactiva un evento (marca activo = 0).
 */
const cancelarEvento = async (req, res) => {
    const { id } = req.params;
    const eventId = parseInt(id, 10);
    if (isNaN(eventId)) return res.status(400).json({ message: 'ID de evento inválido.' });

    let conn;
    try {
        conn = await pool.getConnection();
        const result = await conn.query("UPDATE eventos SET activo = 0 WHERE id = ?", [eventId]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Evento no encontrado.' });
        res.status(200).json({ success: true, message: 'Evento cancelado/desactivado.' });
    } catch (err) {
        console.error('Error al cancelar evento:', err);
        res.status(500).json({ message: 'Error al cancelar evento.' });
    } finally {
        if (conn) conn.release();
    }
};


module.exports = {
    getSolicitudes,
    actualizarEstadoSolicitud,
    eliminarSolicitud,
    getDatosAsignacion,
    guardarAsignaciones,
    getOrdenDeTrabajo,
    getAllTiposDeEvento,
    actualizarEvento,
    cancelarEvento,
    eliminarEvento,
};
