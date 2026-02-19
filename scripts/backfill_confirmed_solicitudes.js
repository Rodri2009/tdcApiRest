/* Backfill: crear eventos_confirmados para solicitudes_fechas_bandas
   que están en estado 'Confirmado' pero no tienen id_evento_generado.
   Uso: ejecutar dentro del contenedor backend: node /app/scripts/backfill_confirmed_solicitudes.js
*/

const pool = require('../db');

async function createEventoFromSolicitud(conn, idNum) {
    // Verificar idempotencia
    const [existing] = await conn.query("SELECT id FROM eventos_confirmados WHERE id_solicitud = ? AND tipo_evento = 'BANDA'", [idNum]);
    if (existing && existing.id) {
        console.log(`skip: ya existe evento_confirmado id=${existing.id} para solicitud ${idNum}`);
        return { skipped: true, eventoId: existing.id };
    }

    // Obtener datos de la solicitud
    const [row] = await conn.query(`
        SELECT
            sfb.id_solicitud,
            sfb.id_banda,
            sfb.fecha_evento,
            sfb.hora_evento,
            sfb.duracion,
            sfb.descripcion,
            sfb.precio_basico,
            sfb.precio_puerta_propuesto,
            sfb.invitadas_json,
            sfb.cantidad_bandas,
            s.descripcion_corta AS nombre_evento,
            s.es_publico AS solicitud_es_publico,
            ba.nombre as banda_nombre,
            ba.genero_musical,
            c.nombre as cliente_nombre,
            c.email as cliente_email,
            c.telefono as cliente_telefono
        FROM solicitudes_fechas_bandas sfb
        JOIN solicitudes s ON sfb.id_solicitud = s.id
        LEFT JOIN bandas_artistas ba ON sfb.id_banda = ba.id
        LEFT JOIN clientes c ON s.cliente_id = c.id
        WHERE sfb.id_solicitud = ?
    `, [idNum]);

    if (!row) {
        throw new Error(`Solicitud ${idNum} no encontrada para backfill`);
    }

    const sqlEventoConfirmado = `
        INSERT INTO eventos_confirmados (
            id_solicitud, tipo_evento, tabla_origen, nombre_evento, descripcion,
            fecha_evento, hora_inicio, duracion_estimada, nombre_cliente, email_cliente,
            telefono_cliente, precio_base, precio_final, genero_musical, cantidad_personas,
            es_publico, activo, confirmado_en
        ) VALUES (?, 'BANDA', 'solicitudes_fechas_bandas', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())
    `;

    const precioFinalParaEvento = row.precio_basico || 0;
    const esPublicoParaEvento = row.solicitud_es_publico ? 1 : 0;

    const resultEvento = await conn.query(sqlEventoConfirmado, [
        idNum,
        row.banda_nombre || row.nombre_evento || 'Sin nombre',
        row.descripcion || '',
        row.fecha_evento,
        row.hora_evento || '21:00',
        row.duracion || null,
        row.cliente_nombre || '',
        row.cliente_email || '',
        row.cliente_telefono || '',
        row.precio_basico || 0,
        precioFinalParaEvento,
        row.genero_musical || row.banda_nombre || '',
        row.cantidad_bandas || 120,
        esPublicoParaEvento
    ]);

    const nuevoEventoId = Number(resultEvento.insertId);

    // Insertar lineup
    await conn.query(
        `INSERT INTO eventos_lineup (id_evento_confirmado, id_banda, nombre_banda, orden_show, es_principal, es_solicitante, estado) VALUES (?, ?, ?, 99, 1, 1, 'confirmada')`,
        [nuevoEventoId, row.id_banda || null, row.banda_nombre || row.nombre_evento || 'Sin nombre']
    );

    if (row.invitadas_json) {
        let invitadas = [];
        try { invitadas = JSON.parse(row.invitadas_json || '[]'); } catch (e) { invitadas = []; }
        let orden = 0;
        for (const inv of invitadas) {
            await conn.query(
                `INSERT INTO eventos_lineup (id_evento_confirmado, id_banda, nombre_banda, orden_show, es_principal, es_solicitante, estado) VALUES (?, ?, ?, ?, 0, 0, 'invitada')`,
                [nuevoEventoId, inv.id_banda || null, inv.nombre || '', orden++]
            );
        }
    }

    // Actualizar id_evento_generado
    await conn.query('UPDATE solicitudes_fechas_bandas SET id_evento_generado = ? WHERE id_solicitud = ?', [nuevoEventoId, idNum]);

    return { skipped: false, eventoId: nuevoEventoId };
}

(async () => {
    const conn = await pool.getConnection();
    try {
        const rows = await conn.query("SELECT id_solicitud FROM solicitudes_fechas_bandas WHERE estado = 'Confirmado' AND (id_evento_generado IS NULL OR id_evento_generado = 0)");
        if (!rows || rows.length === 0) {
            console.log('No hay solicitudes confirmadas pendientes de backfill.');
            return process.exit(0);
        }

        console.log(`Encontradas ${rows.length} solicitudes confirmadas sin evento generado. Ejecutando backfill...`);
        for (const r of rows) {
            const id = r.id_solicitud || r.ID || r.id;
            try {
                const res = await createEventoFromSolicitud(conn, id);
                if (res.skipped) console.log(`Solicitud ${id}: ya tenía evento (skip).`);
                else console.log(`Solicitud ${id}: evento creado id=${res.eventoId}`);
            } catch (err) {
                console.error(`Error creando evento para solicitud ${id}:`, err.message);
            }
        }

        console.log('Backfill finalizado.');
    } catch (err) {
        console.error('Error en backfill:', err.message);
    } finally {
        if (conn) conn.release();
        process.exit(0);
    }
})();