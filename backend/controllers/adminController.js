const pool = require('../db');

// Función para generar ID único para asignaciones
function generateAssignmentId() {
    return `ASG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

const getSolicitudes = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        // Unión de solicitudes de alquiler, solicitudes de bandas, fechas de bandas, servicios y talleres
        const sql = `
            SELECT
                CONCAT('alq_', s.id_solicitud) as id,
                COALESCE(sol.fecha_creacion, s.fecha_evento) as fechaSolicitud,
                COALESCE(c.nombre, '') as nombreCliente,
                COALESCE(ot.categoria, CASE WHEN s.tipo_de_evento IN ('TALLERES','SERVICIO') THEN s.tipo_de_evento ELSE 'ALQUILER' END) as categoria,
                COALESCE(ot.nombre_para_mostrar, s.tipo_de_evento) as tipoNombre,
                s.tipo_de_evento as tipoEventoId,
                NULL as subtipo,
                DATE_FORMAT(s.fecha_evento, '%Y-%m-%d') as fechaEvento,
                s.estado,
                s.tipo_servicio as tipoServicioId,
                0 AS tienePersonalAsignado,
                'solicitud' as origen,
                s.hora_evento as horaInicio,
                COALESCE(sol.es_publico, 0) as es_publico,
                COALESCE(sol.descripcion_corta, '') as descripcionCorta
            FROM solicitudes_alquiler s
            LEFT JOIN solicitudes sol ON sol.id = s.id_solicitud
            LEFT JOIN clientes c ON sol.cliente_id = c.id
            LEFT JOIN opciones_tipos ot ON (s.tipo_de_evento = ot.id_tipo_evento OR s.tipo_servicio = ot.id_tipo_evento)
            UNION ALL
            SELECT
                CONCAT('bnd_', s.id_solicitud) as id,
                COALESCE(sol2.fecha_creacion, s.fecha_hora) as fechaSolicitud,
                COALESCE(c2.nombre, '') as nombreCliente,
                COALESCE(ot2.categoria, 'BANDA') as categoria,
                COALESCE(ot2.nombre_para_mostrar, s.tipo_de_evento) as tipoNombre,
                s.tipo_de_evento as tipoEventoId,
                NULL as subtipo,
                DATE_FORMAT(s.fecha_evento, '%Y-%m-%d') as fechaEvento,
                s.estado,
                NULL as tipoServicioId,
                0 AS tienePersonalAsignado,
                'solicitud' as origen,
                s.hora_evento as horaInicio,
                COALESCE(sol2.es_publico, 0) as es_publico,
                COALESCE(sol2.descripcion_corta, '') as descripcionCorta
            FROM solicitudes_bandas s
            LEFT JOIN solicitudes sol2 ON sol2.id = s.id_solicitud
            LEFT JOIN clientes c2 ON sol2.cliente_id = c2.id
            LEFT JOIN opciones_tipos ot2 ON s.tipo_de_evento = ot2.id_tipo_evento
            UNION ALL
            SELECT
                CONCAT('ev_', e.id) as id,
                e.confirmado_en as fechaSolicitud,
                e.nombre_cliente as nombreCliente,
                COALESCE(ote.categoria, e.tipo_evento) as categoria,
                COALESCE(ote.nombre_para_mostrar, e.tipo_evento) as tipoNombre,
                e.tipo_evento as tipoEventoId,
                e.genero_musical as subtipo,
                DATE_FORMAT(e.fecha_evento, '%Y-%m-%d') as fechaEvento,
                CASE WHEN e.activo = 1 THEN 'Confirmado' ELSE 'Cancelado' END as estado,
                NULL as tipoServicioId,
                0 AS tienePersonalAsignado,
                'evento' as origen,
                TIME_FORMAT(e.hora_inicio, '%H:%i') as horaInicio,
                e.es_publico as es_publico,
                SUBSTRING(e.descripcion,1,200) as descripcionCorta
            FROM eventos_confirmados e
            LEFT JOIN opciones_tipos ote ON e.tipo_evento = ote.id_tipo_evento
            UNION ALL
            SELECT
                CONCAT('srv_', ss.id_solicitud) as id,
                COALESCE(sol3.fecha_creacion, ss.fecha_evento) as fechaSolicitud,
                COALESCE(c3.nombre, '') as nombreCliente,
                COALESCE(ot3.categoria, 'SERVICIO') as categoria,
                COALESCE(ot3.nombre_para_mostrar, ss.tipo_servicio) as tipoNombre,
                'SERVICIO' as tipoEventoId,
                NULL as subtipo,
                DATE_FORMAT(ss.fecha_evento, '%Y-%m-%d') as fechaEvento,
                sol3.estado,
                ss.tipo_servicio as tipoServicioId,
                0 AS tienePersonalAsignado,
                'solicitud' as origen,
                ss.hora_evento as horaInicio,
                COALESCE(sol3.es_publico, 0) as es_publico,
                COALESCE(sol3.descripcion_corta, '') as descripcionCorta
            FROM solicitudes_servicios ss
            JOIN solicitudes sol3 ON ss.id_solicitud = sol3.id
            LEFT JOIN clientes c3 ON sol3.cliente_id = c3.id
            LEFT JOIN opciones_tipos ot3 ON ss.tipo_servicio = ot3.id_tipo_evento
            UNION ALL
            SELECT
                CONCAT('tll_', st.id_solicitud) as id,
                COALESCE(sol4.fecha_creacion, st.fecha_evento) as fechaSolicitud,
                COALESCE(c4.nombre, '') as nombreCliente,
                COALESCE(ot4.categoria, 'TALLER') as categoria,
                COALESCE(ot4.nombre_para_mostrar, st.nombre_taller) as tipoNombre,
                'TALLERES' as tipoEventoId,
                NULL as subtipo,
                DATE_FORMAT(st.fecha_evento, '%Y-%m-%d') as fechaEvento,
                sol4.estado,
                NULL as tipoServicioId,
                0 AS tienePersonalAsignado,
                'solicitud' as origen,
                st.hora_evento as horaInicio,
                COALESCE(sol4.es_publico, 0) as es_publico,
                COALESCE(sol4.descripcion_corta, '') as descripcionCorta
            FROM solicitudes_talleres st
            JOIN solicitudes sol4 ON st.id_solicitud = sol4.id
            LEFT JOIN clientes c4 ON sol4.cliente_id = c4.id
            LEFT JOIN opciones_tipos ot4 ON st.nombre_taller = ot4.nombre_para_mostrar
            ORDER BY fechaEvento DESC, fechaSolicitud DESC;
        `;

        console.log('DEBUG SQL getSolicitudes:', sql);
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
        await conn.beginTransaction();

        let solicitud;
        let tabla;
        let tablaOrigen;
        let realId;
        let tipoEvento;

        // Determinar tabla y tipo según prefijo
        if (String(id).startsWith('alq_')) {
            realId = id.substring(4);
            tablaOrigen = 'solicitudes_alquiler';
            [solicitud] = await conn.query("SELECT sa.*, COALESCE(c.nombre, '') as nombre_solicitante, c.email as email_solicitante, c.telefono as telefono_solicitante FROM solicitudes_alquiler sa JOIN solicitudes sol ON sa.id_solicitud = sol.id LEFT JOIN clientes c ON sol.cliente_id = c.id WHERE sa.id_solicitud = ?", [realId]);
            tipoEvento = 'ALQUILER_SALON';
        } else if (String(id).startsWith('bnd_')) {
            realId = id.substring(4);
            tablaOrigen = 'solicitudes_bandas';
            [solicitud] = await conn.query("SELECT * FROM solicitudes_bandas WHERE id_solicitud = ?", [realId]);
            tipoEvento = 'BANDA';
        } else if (String(id).startsWith('srv_')) {
            realId = id.substring(4);
            tablaOrigen = 'solicitudes_servicios';
            [solicitud] = await conn.query("SELECT ss.*, COALESCE(c.nombre, '') as nombre_solicitante, c.email as email_solicitante, c.telefono as telefono_solicitante FROM solicitudes_servicios ss JOIN solicitudes sol ON ss.id_solicitud = sol.id LEFT JOIN clientes c ON sol.cliente_id = c.id WHERE ss.id_solicitud = ?", [realId]);
            tipoEvento = 'SERVICIO';
        } else if (String(id).startsWith('tll_')) {
            realId = id.substring(4);
            tablaOrigen = 'solicitudes_talleres';
            [solicitud] = await conn.query("SELECT st.*, COALESCE(c.nombre, '') as nombre_solicitante, c.email as email_solicitante, c.telefono as telefono_solicitante FROM solicitudes_talleres st JOIN solicitudes sol ON st.id_solicitud = sol.id LEFT JOIN clientes c ON sol.cliente_id = c.id WHERE st.id_solicitud = ?", [realId]);
            tipoEvento = 'TALLER';
        } else {
            // Fallback para IDs antiguos sin prefijo
            realId = id;
            [solicitud] = await conn.query("SELECT * FROM solicitudes_alquiler WHERE id = ?", [id]);
            if (solicitud) {
                tablaOrigen = 'solicitudes_alquiler';
                tipoEvento = 'ALQUILER_SALON';
            } else {
                [solicitud] = await conn.query("SELECT sb.*, COALESCE(c.nombre,'') as nombre_solicitante, c.email as email_solicitante, c.telefono as telefono_solicitante FROM solicitudes_bandas sb JOIN solicitudes sol ON sb.id_solicitud = sol.id LEFT JOIN clientes c ON sol.cliente_id = c.id WHERE sb.id_solicitud = ?", [id]);
                if (solicitud) {
                    tablaOrigen = 'solicitudes_bandas';
                    tipoEvento = 'BANDA';
                }
            }
        }

        if (!solicitud) {
            await conn.rollback();
            return res.status(404).json({ message: 'Solicitud no encontrada.' });
        }

        // Actualizar estado en la tabla de solicitudes específica
        // Todas las tablas hijas usan ahora `id_solicitud` como PK
        const fieldName = 'id_solicitud';
        let result;
        // En servicios y talleres el estado se guarda en la tabla padre `solicitudes`
        if (tablaOrigen === 'solicitudes_servicios' || tablaOrigen === 'solicitudes_talleres') {
            result = await conn.query(`UPDATE solicitudes SET estado = ? WHERE id = ?`, [estado, realId]);
        } else {
            result = await conn.query(`UPDATE ${tablaOrigen} SET estado = ? WHERE ${fieldName} = ?`, [estado, realId]);
        }

        if (result.affectedRows === 0) {
            await conn.rollback();
            return res.status(404).json({ message: 'Solicitud no encontrada.' });
        }

        // Manejar eventos_confirmados para TODOS los tipos
        if (estado === 'Confirmado') {
            // Determinar si debe ser público (según la tabla padre `solicitudes`)
            const [parent] = await conn.query('SELECT es_publico FROM solicitudes WHERE id = ?', [realId]);
            const esPublico = parent && parent.es_publico ? 1 : 0;

            // Buscar evento existente (incluyendo su estado 'activo')
            const [eventoExistente] = await conn.query(
                "SELECT id, activo FROM eventos_confirmados WHERE id_solicitud = ? AND tipo_evento = ?",
                [realId, tipoEvento]
            );

            // Preparar datos según tipo
            let nombreEvento, nombreCliente, emailCliente, telefonoCliente, generoMusical, cantidadPersonas, tipoServicio, nombreTaller;

            if (tablaOrigen === 'solicitudes_bandas') {
                nombreEvento = solicitud.nombre_completo || 'Banda';
                nombreCliente = solicitud.nombre_completo;
                emailCliente = solicitud.email;
                telefonoCliente = solicitud.telefono;
                generoMusical = solicitud.genero_musical;
                cantidadPersonas = solicitud.cantidad_de_personas;
            } else if (tablaOrigen === 'solicitudes_alquiler') {
                nombreEvento = solicitud.tipo_de_evento || 'Alquiler';
                nombreCliente = solicitud.nombre_completo;
                emailCliente = solicitud.email;
                telefonoCliente = solicitud.telefono;
                cantidadPersonas = solicitud.cantidad_de_personas;
            } else if (tablaOrigen === 'solicitudes_servicios') {
                nombreEvento = solicitud.tipo_servicio || 'Servicio';
                nombreCliente = solicitud.nombre_solicitante;
                emailCliente = solicitud.email_solicitante;
                telefonoCliente = solicitud.telefono_solicitante;
                tipoServicio = solicitud.tipo_servicio;
            } else if (tablaOrigen === 'solicitudes_talleres') {
                nombreEvento = solicitud.nombre_taller || 'Taller';
                nombreCliente = solicitud.nombre_solicitante;
                emailCliente = solicitud.email_solicitante;
                telefonoCliente = solicitud.telefono_solicitante;
                nombreTaller = solicitud.nombre_taller;
            }

            if (!eventoExistente) {
                await conn.query(`
                    INSERT INTO eventos_confirmados (
                        id_solicitud, tipo_evento, tabla_origen,
                        nombre_evento, descripcion, fecha_evento, hora_inicio, duracion_estimada,
                        nombre_cliente, email_cliente, telefono_cliente,
                        precio_base, precio_final, es_publico, activo,
                        genero_musical, cantidad_personas, tipo_servicio, nombre_taller
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
                `, [
                    realId,
                    tipoEvento,
                    tablaOrigen,
                    nombreEvento,
                    solicitud.descripcion || null,
                    solicitud.fecha_evento,
                    solicitud.hora_evento || '21:00:00',
                    solicitud.duracion || null,
                    nombreCliente,
                    emailCliente,
                    telefonoCliente,
                    solicitud.precio_basico || null,
                    solicitud.precio_final || null,
                    esPublico,
                    generoMusical || null,
                    cantidadPersonas || null,
                    tipoServicio || null,
                    nombreTaller || null
                ]);
            } else if (eventoExistente.activo === 0) {
                // Reactivar y actualizar campos del evento existente
                await conn.query(`UPDATE eventos_confirmados SET activo = 1, cancelado_en = NULL, es_publico = ?, nombre_evento = ?, descripcion = ?, fecha_evento = ?, hora_inicio = ?, duracion_estimada = ?, nombre_cliente = ?, email_cliente = ?, telefono_cliente = ?, precio_base = ?, precio_final = ?, genero_musical = ?, cantidad_personas = ?, tipo_servicio = ?, nombre_taller = ? WHERE id = ?`, [
                    esPublico,
                    nombreEvento,
                    solicitud.descripcion || null,
                    solicitud.fecha_evento,
                    solicitud.hora_evento || '21:00:00',
                    solicitud.duracion || null,
                    nombreCliente,
                    emailCliente,
                    telefonoCliente,
                    solicitud.precio_basico || null,
                    solicitud.precio_final || null,
                    generoMusical || null,
                    cantidadPersonas || null,
                    tipoServicio || null,
                    nombreTaller || null,
                    eventoExistente.id
                ]);
            }
        } else if (estado === 'Solicitado') {
            // Si la solicitud es degradada a 'Solicitado', auditar y eliminar cualquier evento confirmado asociado
            try {
                const [evento] = await conn.query('SELECT * FROM eventos_confirmados WHERE id_solicitud = ? AND tipo_evento = ?', [realId, tipoEvento]);
                if (evento) {
                    const deletedBy = req.user ? req.user.id : null;
                    const reason = 'Solicitud downgraded to Solicitado';
                    await conn.query('INSERT INTO eventos_confirmados_audit (evento_id, id_solicitud, tipo_evento, tabla_origen, original_row, deleted_by, reason) VALUES (?, ?, ?, ?, ?, ?, ?)', [
                        evento.id,
                        evento.id_solicitud,
                        evento.tipo_evento,
                        evento.tabla_origen,
                        JSON.stringify(evento),
                        deletedBy,
                        reason
                    ]);
                    await conn.query('DELETE FROM eventos_confirmados WHERE id = ?', [evento.id]);
                }
            } catch (err) {
                console.warn('No se pudo auditar/eliminar eventos_confirmados:', err.message);
            }
        } else if (estado === 'Cancelado') {
            // Marcar como inactivo en eventos_confirmados
            await conn.query(
                "UPDATE eventos_confirmados SET activo = 0, cancelado_en = NOW() WHERE id_solicitud = ? AND tipo_evento = ?",
                [realId, tipoEvento]
            );
        }

        // Uso exclusivo de `eventos_confirmados`: la tabla legacy fue migrada y retirada.
        // Todas las operaciones de confirmación/consulta escriben y leen desde `eventos_confirmados`.

        await conn.commit();
        res.status(200).json({
            success: true,
            message: `Estado de la solicitud ${id} actualizado a ${estado}.`
        });
    } catch (err) {
        if (conn) await conn.rollback();
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
            if (solicitud && solicitud.length) {
                tabla = 'solicitudes_alquiler';
            } else {
                [solicitud] = await conn.query("SELECT 'solicitudes_bandas' as tabla_name FROM solicitudes_bandas WHERE id_solicitud = ?", [id]);
                if (solicitud && solicitud.length) tabla = 'solicitudes_bandas';
            }
        }

        if (!tabla) {
            return res.status(404).json({ message: 'Solicitud no encontrada.' });
        }

        // Por seguridad, intentamos borrar en cascada (primero los hijos, luego el padre)
        // Ignorar errores específicos de tablas inexistentes (legacy) pero loguearlos.
        const safeDelete = async (query, params) => {
            try {
                await conn.query(query, params);
            } catch (e) {
                // ER_NO_SUCH_TABLE = 1146
                if (e && (e.errno === 1146 || e.code === 'ER_NO_SUCH_TABLE')) {
                    console.warn('Tabla inexistente al intentar borrar (omitido):', query, params, e.message);
                } else {
                    throw e; // relanzar para que el catch externo lo maneje
                }
            }
        };

        await safeDelete("DELETE FROM solicitudes_adicionales WHERE id_solicitud = ?", [realId]);
        await safeDelete("DELETE FROM solicitudes_personal WHERE id_solicitud = ?", [realId]);
        await safeDelete("DELETE FROM bandas_solicitudes WHERE id_solicitud = ?", [realId]);

        const result = await conn.query(`DELETE FROM ${tabla} WHERE id_solicitud = ?`, [realId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Solicitud no encontrada.' });
        }

        res.status(200).json({ success: true, message: `Solicitud ${id} eliminada permanentemente.` });
    } catch (err) {
        console.error('Error al eliminar solicitud:', err);
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
        const result = await conn.query("DELETE FROM eventos_confirmados WHERE id = ?", [eventId]);
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
            const [evento] = await conn.query("SELECT fecha_evento as fecha FROM eventos_confirmados WHERE id = ?", [eventId]);
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
                SELECT e.id, e.nombre_evento as nombre_completo, e.fecha_evento as fecha_evento, TIME_FORMAT(e.hora_inicio,'%H:%i') as hora_evento, '' as duracion, e.descripcion, e.tipo_evento
                FROM eventos_confirmados e
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
                s.id_solicitud, COALESCE(c.nombre, '') as nombre_completo, s.fecha_evento, s.hora_evento, s.duracion, s.descripcion,
                s.tipo_servicio,
                ot.nombre_para_mostrar as tipo_evento, ot.id_tipo_evento as tipo_evento_id
            FROM solicitudes_alquiler s
            LEFT JOIN solicitudes sol ON s.id_solicitud = sol.id
            LEFT JOIN clientes c ON sol.cliente_id = c.id
            LEFT JOIN opciones_tipos ot ON s.tipo_servicio = ot.id_tipo_evento
            WHERE s.id_solicitud = ?;
        `;
        let solicitudResult = await conn.query(sqlSolicitud, [solicitudId]);
        let solicitud = solicitudResult[0];
        if (!solicitud) {
            sqlSolicitud = `
                SELECT
                    s.id_solicitud, COALESCE(c.nombre, '') as nombre_completo, s.fecha_evento, s.hora_evento, s.duracion, s.descripcion,
                    s.tipo_servicio,
                    ot.nombre_para_mostrar as tipo_evento, ot.id_tipo_evento as tipo_evento_id
                FROM solicitudes_bandas s
                LEFT JOIN solicitudes sol ON s.id_solicitud = sol.id
                LEFT JOIN clientes c ON sol.cliente_id = c.id
                LEFT JOIN opciones_tipos ot ON s.tipo_servicio = ot.id_tipo_evento
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
            "SELECT id_tipo_evento as id, nombre_para_mostrar as nombreParaMostrar, descripcion, monto_sena as montoSena, deposito as depositoGarantia, es_publico as esPublico, categoria FROM opciones_tipos ORDER BY categoria, nombre_para_mostrar;"
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

        const insertSql = `
            INSERT INTO eventos_confirmados SET
              id_solicitud = ?,
              tipo_evento = ?,
              tabla_origen = ?,
              nombre_evento = ?,
              descripcion = ?,
              fecha_evento = ?,
              hora_inicio = ?,
              duracion_estimada = ?,
              nombre_cliente = ?,
              email_cliente = ?,
              telefono_cliente = ?,
              precio_base = ?,
              precio_final = ?,
              es_publico = ?,
              activo = ?,
              genero_musical = ?,
              cantidad_personas = ?
        `;

        const params = [
            0,
            tipo_evento || 'BANDA',
            'manual_admin',
            nombre_banda,
            descripcion || null,
            fecha,
            hora_inicio || '21:00',
            null,
            nombre_contacto || null,
            email_contacto || null,
            telefono_contacto || null,
            precio_base || 0,
            precio_puerta || null,
            es_publico !== undefined ? es_publico : 1,
            activo !== undefined ? activo : 1,
            genero_musical || null,
            aforo_maximo || null
        ];

        // Debug: asegurar que placeholders y params coinciden
        console.log('[ADMIN] crearEvento: placeholders=', (insertSql.match(/\?/g)||[]).length, 'params=', params.length);
        console.log('[ADMIN] crearEvento SQL:', insertSql);
        console.log('[ADMIN] crearEvento params sample:', params.slice(0,5));

        const result = await conn.query(insertSql, params);

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

        const sql = `UPDATE eventos_confirmados SET ${updates.join(', ')} WHERE id = ?`;
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
        // La tabla de eventos ahora es `eventos_confirmados` (reemplaza a la definición previa usada para bandas).
        const result = await conn.query(
            "UPDATE eventos_confirmados SET activo = 0, cancelado_en = NOW() WHERE id = ?",
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
                id,
                tipo_evento,
                nombre_evento as nombre_banda,
                genero_musical,
                descripcion,
                NULL as url_imagen,
                nombre_cliente as nombre_contacto,
                email_cliente as email_contacto,
                telefono_cliente as telefono_contacto,
                DATE_FORMAT(fecha_evento, '%Y-%m-%d') as fecha,
                TIME_FORMAT(hora_inicio, '%H:%i:%s') as hora_inicio,
                NULL as hora_fin,
                precio_base,
                NULL as precio_anticipada,
                precio_final as precio_puerta,
                cantidad_personas as aforo_maximo,
                CASE WHEN activo = 1 THEN 'Confirmado' ELSE 'Cancelado' END as estado,
                es_publico,
                activo,
                confirmado_en as creado_en
            FROM eventos_confirmados WHERE id = ?
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

/**
 * GET /api/admin/eventos_confirmados
 * Listado de eventos confirmados (admin)
 */
const getEventosConfirmados = async (req, res) => {
    const { tipo_evento, fecha_desde, fecha_hasta, hora_desde, hora_hasta, limit, offset, order_by, order_dir } = req.query;
    let conn;
    try {
        conn = await pool.getConnection();
        const params = [];
        let conditions = 'WHERE 1=1';

        if (tipo_evento) {
            conditions += ' AND tipo_evento = ?';
            params.push(tipo_evento);
        }
        if (fecha_desde) {
            conditions += ' AND fecha_evento >= ?';
            params.push(fecha_desde);
        }
        if (fecha_hasta) {
            conditions += ' AND fecha_evento <= ?';
            params.push(fecha_hasta);
        }
        if (hora_desde) {
            conditions += ' AND hora_inicio >= ?';
            params.push(hora_desde);
        }
        if (hora_hasta) {
            conditions += ' AND hora_inicio <= ?';
            params.push(hora_hasta);
        }

        const lim = Math.min(parseInt(limit, 10) || 50, 1000);
        const off = Math.max(parseInt(offset, 10) || 0, 0);

        // Whitelist order_by and order_dir to avoid SQL injection
        const allowedOrderBy = new Set(['fecha_evento', 'hora_inicio', 'nombre_evento']);
        const orderBy = allowedOrderBy.has(order_by) ? order_by : 'fecha_evento';
        const orderDir = (order_dir && order_dir.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';

        const sql = `SELECT id, id_solicitud, tipo_evento, tabla_origen, nombre_evento, descripcion as descripcion_corta, fecha_evento, hora_inicio, es_publico, activo, nombre_cliente, precio_final, genero_musical, cantidad_personas, tipo_servicio, nombre_taller FROM eventos_confirmados ${conditions} ORDER BY ${orderBy} ${orderDir} LIMIT ? OFFSET ?`;
        params.push(lim, off);

        const rows = await conn.query(sql, params);
        res.status(200).json(rows);
    } catch (err) {
        console.error('Error al obtener eventos confirmados:', err);
        res.status(500).json({ message: 'Error del servidor.' });
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
    getEventosConfirmados,
    getEventoById,
};
