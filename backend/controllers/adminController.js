const pool = require('../db');

// Función para generar ID único para asignaciones
function generateAssignmentId() {
    return `ASG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

const getSolicitudes = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        // Unión de solicitudes de alquiler, solicitudes de bandas y fechas de bandas
        const sql = `
            SELECT
                CONCAT('alq_', s.id) as id,
                s.fecha_evento as fechaSolicitud,
                s.nombre_completo as nombreCliente,
                s.tipo_de_evento as tipoEventoId,
                CASE
                    WHEN s.tipo_de_evento IN ('ALQUILER_SALON', 'TALLERES', 'SERVICIO') THEN
                        CASE s.tipo_de_evento
                            WHEN 'TALLERES' THEN 'TALLER'
                            WHEN 'SERVICIO' THEN 'SERVICIO'
                            ELSE 'ALQUILER_SALON'
                        END
                    ELSE s.tipo_de_evento
                END as tipoEvento,
                NULL as subtipo,
                DATE_FORMAT(s.fecha_evento, '%Y-%m-%d') as fechaEvento,
                s.estado,
                s.tipo_servicio as tipoServicioId,
                0 AS tienePersonalAsignado,
                'solicitud' as origen,
                s.hora_evento as horaInicio,
                NULL as nombreBanda,
                s.cantidad_de_personas as cantidadAforo,
                s.es_publico as es_publico
            FROM solicitudes_alquiler s
            UNION ALL
            SELECT
                CONCAT('bnd_', s.id_solicitud) as id,
                s.fecha_hora as fechaSolicitud,
                s.nombre_completo as nombreCliente,
                s.tipo_de_evento as tipoEventoId,
                'BANDA' as tipoEvento,
                NULL as subtipo,
                DATE_FORMAT(s.fecha_evento, '%Y-%m-%d') as fechaEvento,
                s.estado,
                NULL as tipoServicioId,
                0 AS tienePersonalAsignado,
                'solicitud' as origen,
                s.hora_evento as horaInicio,
                NULL as nombreBanda,
                s.cantidad_de_personas as cantidadAforo,
                s.es_publico as es_publico
            FROM solicitudes_bandas s
            UNION ALL
            SELECT
                CONCAT('ev_', e.id) as id,
                e.creado_en as fechaSolicitud,
                e.nombre_contacto as nombreCliente,
                e.tipo_evento as tipoEventoId,
                'BANDA' as tipoEvento,
                e.genero_musical as subtipo,
                DATE_FORMAT(e.fecha, '%Y-%m-%d') as fechaEvento,
                e.estado,
                NULL as tipoServicioId,
                0 AS tienePersonalAsignado,
                'evento' as origen,
                TIME_FORMAT(e.hora_inicio, '%H:%i') as horaInicio,
                e.nombre_banda as nombreBanda,
                e.aforo_maximo as cantidadAforo,
                e.es_publico as es_publico
            FROM fechas_bandas_confirmadas e
            ORDER BY fechaEvento DESC, fechaSolicitud DESC;
        `;

        const solicitudes = await conn.query(sql);
        res.status(200).json(solicitudes);
    } catch (err) {
        console.error("Error al obtener solicitudes de admin:", err);
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

        let solicitud;
        let tabla;
        let realId;

        if (String(id).startsWith('alq_')) {
            realId = id.replace('alq_', '');
            [solicitud] = await conn.query("SELECT * FROM solicitudes_alquiler WHERE id_solicitud = ?", [realId]);
            tabla = 'solicitudes_alquiler';
        } else if (String(id).startsWith('bnd_')) {
            realId = id.replace('bnd_', '');
            [solicitud] = await conn.query("SELECT * FROM solicitudes_bandas WHERE id_solicitud = ?", [realId]);
            tabla = 'solicitudes_bandas';
        } else {
            // Fallback para IDs antiguos sin prefijo
            realId = id;
            [solicitud] = await conn.query("SELECT *, 'solicitudes_alquiler' as tabla_name FROM solicitudes_alquiler WHERE id_solicitud = ?", [id]);
            if (solicitud) {
                tabla = 'solicitudes_alquiler';
            } else {
                [solicitud] = await conn.query("SELECT *, 'solicitudes_bandas' as tabla_name FROM solicitudes_bandas WHERE id_solicitud = ?", [id]);
                if (solicitud) tabla = 'solicitudes_bandas';
            }
        }

        if (!solicitud) {
            return res.status(404).json({ message: 'Solicitud no encontrada.' });
        }

        // Actualizar estado de la solicitud
        const result = await conn.query(`UPDATE ${tabla} SET estado = ? WHERE id_solicitud = ?`, [estado, realId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Solicitud no encontrada.' });
        }

        // Si es FECHA_BANDAS, manejar fechas_bandas_confirmadas
        if (solicitud.tipo_de_evento === 'FECHA_BANDAS') {
            if (estado === 'Confirmado') {
                // Insertar en fechas_bandas_confirmadas si no existe
                const [existe] = await conn.query("SELECT id FROM fechas_bandas_confirmadas WHERE nombre_banda = ? AND fecha = ?", [solicitud.nombre_completo, solicitud.fecha_evento]);
                if (!existe) {
                    await conn.query(`
                        INSERT INTO fechas_bandas_confirmadas (
                            tipo_evento, nombre_banda, genero_musical, descripcion,
                            fecha, hora_inicio, precio_base, aforo_maximo, estado, es_publico, activo
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Confirmado', 1, 1)
                    `, [
                        'BANDA',
                        solicitud.nombre_completo,
                        solicitud.tipo_servicio || null,
                        solicitud.descripcion || null,
                        solicitud.fecha_evento,
                        solicitud.hora_evento || '21:00:00',
                        solicitud.precio_basico || 0,
                        solicitud.cantidad_de_personas || 120
                    ]);
                }
            } else if (estado === 'Cancelado' || estado === 'Solicitado') {
                // Eliminar de fechas_bandas_confirmadas
                await conn.query("DELETE FROM fechas_bandas_confirmadas WHERE nombre_banda = ? AND fecha = ?", [solicitud.nombre_completo, solicitud.fecha_evento]);
            }
        }

        res.status(200).json({ success: true, message: `Estado de la solicitud ${id} actualizado a ${estado}.` });
    } catch (err) {
        console.error('Error al actualizar estado:', err);
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

        let tabla;
        let realId;

        if (String(id).startsWith('alq_')) {
            realId = id.replace('alq_', '');
            tabla = 'solicitudes_alquiler';
        } else if (String(id).startsWith('bnd_')) {
            realId = id.replace('bnd_', '');
            tabla = 'solicitudes_bandas';
        } else {
            realId = id;
            let [solicitud] = await conn.query("SELECT 'solicitudes_alquiler' as tabla_name FROM solicitudes_alquiler WHERE id_solicitud = ?", [id]);
            if (solicitud) {
                tabla = 'solicitudes_alquiler';
            } else {
                [solicitud] = await conn.query("SELECT 'solicitudes_bandas' as tabla_name FROM solicitudes_bandas WHERE id_solicitud = ?", [id]);
                if (solicitud) tabla = 'solicitudes_bandas';
            }
        }

        if (!tabla) {
            return res.status(404).json({ message: 'Solicitud no encontrada.' });
        }

        // Por seguridad, borramos en cascada (primero los hijos, luego el padre)
        await conn.query("DELETE FROM solicitudes_adicionales WHERE id_solicitud = ?", [realId]);
        await conn.query("DELETE FROM solicitudes_personal WHERE id_solicitud = ?", [realId]);
        await conn.query("DELETE FROM bandas_solicitudes WHERE id_solicitud = ?", [realId]);
        const result = await conn.query(`DELETE FROM ${tabla} WHERE id_solicitud = ?`, [realId]);

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
        const result = await conn.query("DELETE FROM fechas_bandas_confirmadas WHERE id = ?", [eventId]);
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

            // eventos_personal usa: rol, id_personal
            asignacionesGuardadas = await conn.query(
                "SELECT rol, id_personal as personalId FROM eventos_personal WHERE id_evento = ?",
                [eventId]
            );
        } else {
            // solicitudes_personal usa: rol_requerido, id_personal
            asignacionesGuardadas = await conn.query(
                "SELECT rol_requerido as rol, id_personal as personalId FROM solicitudes_personal WHERE id_solicitud = ?",
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

    if (!Array.isArray(assignments)) {
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

            // Obtener la fecha del evento para guardarla junto con el personal
            const [evento] = await conn.query("SELECT fecha FROM fechas_bandas_confirmadas WHERE id = ?", [eventId]);
            if (!evento) {
                return res.status(404).json({ message: 'Evento no encontrado.' });
            }

            await conn.query("DELETE FROM eventos_personal WHERE id_evento = ?", [eventId]);

            if (assignments.length > 0) {
                for (const assignment of assignments) {
                    const personalId = String(assignment.personalId).trim();
                    if (!personalId || personalId === '') {
                        throw new Error(`ID de personal vacío o inválido: ${assignment.personalId}`);
                    }
                    // eventos_personal usa: id_evento, id_personal, rol, fecha
                    await conn.query(
                        "INSERT INTO eventos_personal (id_evento, id_personal, rol, fecha) VALUES (?, ?, ?, ?)",
                        [eventId, personalId, assignment.rol, evento.fecha]
                    );
                }
            }

        } else {
            // Asignaciones para solicitud existente (comportamiento previo)
            const solicitudId = parseInt(id, 10);
            if (isNaN(solicitudId)) {
                return res.status(400).json({ message: 'ID de solicitud inválido.' });
            }

            await conn.query("DELETE FROM solicitudes_personal WHERE id_solicitud = ?", [solicitudId]);

            if (assignments.length > 0) {
                for (const assignment of assignments) {
                    const personalId = String(assignment.personalId).trim();
                    if (!personalId || personalId === '') {
                        throw new Error(`ID de personal vacío o inválido: ${assignment.personalId}`);
                    }
                    const idAsignacion = generateAssignmentId();
                    // solicitudes_personal usa: id (PK), id_solicitud, id_personal, rol_requerido, estado
                    await conn.query(
                        "INSERT INTO solicitudes_personal (id, id_solicitud, id_personal, rol_requerido, estado) VALUES (?, ?, ?, ?, ?)",
                        [idAsignacion, solicitudId, personalId, assignment.rol, 'asignado']
                    );
                }
            }
        }

        await conn.commit();
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
                SELECT e.id, e.nombre_banda as nombre_completo, e.fecha as fecha_evento, TIME_FORMAT(e.hora_inicio,'%H:%i') as hora_evento, '' as duracion, e.descripcion, e.tipo_evento
                FROM fechas_bandas_confirmadas e
                WHERE e.id = ?
            `;
            const [evento] = await conn.query(sqlEvento, [eventId]);
            if (!evento) return res.status(404).json({ message: 'Evento no encontrado.' });

            // Obtener personal asignado desde eventos_personal
            const sqlPersonal = `
                SELECT pd.nombre_completo, ep.rol
                FROM eventos_personal ep
                JOIN personal_disponible pd ON ep.id_personal = pd.id_personal
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
                const costoInfo = costosMap[persona.rol] || { costo_por_hora: 0, viaticos: 0 };
                const totalPorPersona = (costoInfo.costo_por_hora * duracionNum) + costoInfo.viaticos;
                costoTotalPersonal += totalPorPersona;
                return {
                    nombre: persona.nombre_completo,
                    rol: persona.rol,
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

        // 1. Obtener los detalles de la solicitud y el tipo de evento, primero en alquiler, luego en bandas
        let sqlSolicitud = `
            SELECT
                s.id_solicitud, s.nombre_completo, s.fecha_evento, s.hora_evento, s.duracion, s.descripcion,
                s.tipo_servicio,
                ot.nombre_para_mostrar as tipo_evento, ot.id_evento as tipo_evento_id
            FROM solicitudes_alquiler s
            LEFT JOIN opciones_tipos ot ON s.tipo_servicio = ot.id_evento
            WHERE s.id_solicitud = ?;
        `;
        let solicitudResult = await conn.query(sqlSolicitud, [solicitudId]);
        let solicitud = solicitudResult[0];
        if (!solicitud) {
            sqlSolicitud = `
                SELECT
                    s.id_solicitud, s.nombre_completo, s.fecha_evento, s.hora_evento, s.duracion, s.descripcion,
                    s.tipo_servicio,
                    ot.nombre_para_mostrar as tipo_evento, ot.id_evento as tipo_evento_id
                FROM solicitudes_bandas s
                LEFT JOIN opciones_tipos ot ON s.tipo_servicio = ot.id_evento
                WHERE s.id_solicitud = ?;
            `;
            solicitudResult = await conn.query(sqlSolicitud, [solicitudId]);
            solicitud = solicitudResult[0];
        }

        if (!solicitud) {
            return res.status(404).json({ message: 'Solicitud no encontrada.' });
        }

        // 2. Obtener el personal asignado a esta solicitud
        const sqlPersonal = `
            SELECT pd.nombre_completo, sp.rol_requerido
            FROM solicitudes_personal sp
            JOIN personal_disponible pd ON sp.id_personal = pd.id_personal
            WHERE sp.id_solicitud = ?;
        `;
        const personalAsignado = await conn.query(sqlPersonal, [solicitudId]);

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
            "SELECT id_evento as id, nombre_para_mostrar as nombreParaMostrar, descripcion, monto_sena as montoSena, deposito as depositoGarantia, es_publico as esPublico, categoria FROM opciones_tipos ORDER BY categoria, nombre_para_mostrar;"
        );
        res.status(200).json(rows);
    } catch (err) {
        console.error("[ADMIN][TIPOS] Error al obtener tipos:", err);
        res.status(500).json({ message: 'Error del servidor.' });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * Crea un nuevo evento.
 */
const crearEvento = async (req, res) => {
    const {
        nombre_banda, genero_musical, descripcion, url_imagen,
        fecha, hora_inicio, hora_fin, aforo_maximo, es_publico,
        precio_base, precio_anticipada, precio_puerta,
        nombre_contacto, email_contacto, telefono_contacto,
        tipo_evento, activo, estado
    } = req.body;

    // Validación básica
    if (!nombre_banda || !fecha) {
        return res.status(400).json({ error: 'nombre_banda y fecha son obligatorios.' });
    }

    let conn;
    try {
        conn = await pool.getConnection();

        const result = await conn.query(`
            INSERT INTO eventos (
                nombre_banda, genero_musical, descripcion, url_imagen,
                fecha, hora_inicio, hora_fin, aforo_maximo, es_publico,
                precio_base, precio_anticipada, precio_puerta,
                nombre_contacto, email_contacto, telefono_contacto,
                tipo_evento, activo, estado
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            nombre_banda,
            genero_musical || null,
            descripcion || null,
            url_imagen || null,
            fecha,
            hora_inicio || '21:00',
            hora_fin || '02:00',
            aforo_maximo || 120,
            es_publico !== undefined ? es_publico : 1,
            precio_base || 0,
            precio_anticipada || null,
            precio_puerta || null,
            nombre_contacto || null,
            email_contacto || null,
            telefono_contacto || null,
            tipo_evento || 'BANDA',
            activo !== undefined ? activo : 1,
            estado || 'Confirmado'
        ]);

        const nuevoId = Number(result.insertId);
        res.status(201).json({
            message: 'Evento creado correctamente.',
            id: nuevoId
        });
    } catch (err) {
        console.error("[ADMIN] Error al crear evento:", err);
        res.status(500).json({ error: 'Error al crear evento.' });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * Actualiza datos básicos de un evento (eventos table).
 */

const actualizarEvento = async (req, res) => {
    const { id } = req.params;
    const {
        nombre_banda, genero_musical, descripcion, url_imagen,
        fecha, hora_inicio, hora_fin, aforo_maximo, es_publico,
        precio_base, precio_anticipada, precio_puerta,
        nombre_contacto, email_contacto, telefono_contacto,
        tipo_evento, activo, estado
    } = req.body;

    const eventId = parseInt(id, 10);
    if (isNaN(eventId)) return res.status(400).json({ message: 'ID de evento inválido.' });

    let conn;
    try {
        conn = await pool.getConnection();
        // Construir actualización dinámica para evitar sobreescribir con nulls
        const updates = [];
        const params = [];
        if (typeof nombre_banda !== 'undefined') { updates.push('nombre_banda = ?'); params.push(nombre_banda); }
        if (typeof genero_musical !== 'undefined') { updates.push('genero_musical = ?'); params.push(genero_musical); }
        if (typeof descripcion !== 'undefined') { updates.push('descripcion = ?'); params.push(descripcion); }
        if (typeof url_imagen !== 'undefined') { updates.push('url_imagen = ?'); params.push(url_imagen); }
        if (typeof fecha !== 'undefined') { updates.push('fecha = ?'); params.push(fecha); }
        if (typeof hora_inicio !== 'undefined') { updates.push('hora_inicio = ?'); params.push(hora_inicio); }
        if (typeof hora_fin !== 'undefined') { updates.push('hora_fin = ?'); params.push(hora_fin); }
        if (typeof aforo_maximo !== 'undefined') { updates.push('aforo_maximo = ?'); params.push(aforo_maximo); }
        if (typeof es_publico !== 'undefined') { updates.push('es_publico = ?'); params.push(es_publico); }
        if (typeof precio_base !== 'undefined') { updates.push('precio_base = ?'); params.push(precio_base); }
        if (typeof precio_anticipada !== 'undefined') { updates.push('precio_anticipada = ?'); params.push(precio_anticipada); }
        if (typeof precio_puerta !== 'undefined') { updates.push('precio_puerta = ?'); params.push(precio_puerta); }
        if (typeof nombre_contacto !== 'undefined') { updates.push('nombre_contacto = ?'); params.push(nombre_contacto); }
        if (typeof email_contacto !== 'undefined') { updates.push('email_contacto = ?'); params.push(email_contacto); }
        if (typeof telefono_contacto !== 'undefined') { updates.push('telefono_contacto = ?'); params.push(telefono_contacto); }
        if (typeof tipo_evento !== 'undefined') { updates.push('tipo_evento = ?'); params.push(tipo_evento); }
        if (typeof activo !== 'undefined') { updates.push('activo = ?'); params.push(activo ? 1 : 0); }
        if (typeof estado !== 'undefined') { updates.push('estado = ?'); params.push(estado); }

        if (updates.length === 0) return res.status(400).json({ message: 'No hay campos para actualizar.' });

        const sql = `UPDATE fechas_bandas_confirmadas SET ${updates.join(', ')} WHERE id = ?`;
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
        // Actualizar tanto el estado como el campo activo
        // La tabla es fechas_bandas_confirmadas, no 'eventos'
        const result = await conn.query(
            "UPDATE fechas_bandas_confirmadas SET activo = 0, estado = 'Cancelado' WHERE id = ?",
            [eventId]
        );
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Evento no encontrado.' });
        res.status(200).json({ success: true, message: 'Evento cancelado correctamente.' });
    } catch (err) {
        console.error('Error al cancelar evento:', err);
        res.status(500).json({ message: 'Error al cancelar evento.' });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * Obtiene un evento por su ID.
 */
const getEventoById = async (req, res) => {
    const { id } = req.params;
    const eventId = parseInt(id, 10);
    if (isNaN(eventId)) return res.status(400).json({ message: 'ID de evento inválido.' });

    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query(`
            SELECT 
                id, tipo_evento, nombre_banda, genero_musical, descripcion, url_imagen,
                nombre_contacto, email_contacto, telefono_contacto,
                DATE_FORMAT(fecha, '%Y-%m-%d') as fecha,
                TIME_FORMAT(hora_inicio, '%H:%i:%s') as hora_inicio,
                TIME_FORMAT(hora_fin, '%H:%i:%s') as hora_fin,
                precio_base, precio_anticipada, precio_puerta, aforo_maximo,
                estado, es_publico, activo, creado_en
            FROM fechas_bandas_confirmadas WHERE id = ?
        `, [eventId]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Evento no encontrado.' });
        }

        res.status(200).json(rows[0]);
    } catch (err) {
        console.error('Error al obtener evento:', err);
        res.status(500).json({ message: 'Error al obtener evento.' });
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
    crearEvento,
    actualizarEvento,
    cancelarEvento,
    eliminarEvento,
    getEventoById,
};
