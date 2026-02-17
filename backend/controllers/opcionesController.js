const pool = require('../db');

// --- LOG DE DEPURACIÓN (NUEVO) ---
//console.log("Controlador de 'opciones' cargado.");

// Obtener todos los tipos de eventos disponibles para solicitudes
// NOTA: es_publico indica si aparece en la agenda pública de index.html,
//       NO si está disponible para crear solicitudes.
//       El filtrado por categoría se hace en el frontend (categoriaFiltro).
const getTiposDeEvento = async (req, res) => {
    //console.log("\n-> Ejecutando controlador getTiposDeEvento...");
    let conn;
    try {
        conn = await pool.getConnection();
        // Permitimos filtrar por categoría: ?categoria=ALQUILER_SALON
        const categoria = req.query.categoria;
        let sql = `SELECT 
            id_tipo_evento as id, 
            nombre_para_mostrar as nombreParaMostrar, 
            descripcion, 
            es_publico as esPublico, 
            IFNULL(categoria, 'OTRO') as categoria,
            IFNULL(monto_sena, 0) as montoSena,
            IFNULL(deposito, 0) as depositoGarantia
        FROM opciones_tipos`;
        let rows;
        if (categoria) {
            sql += " WHERE categoria = ?";
            rows = await conn.query(sql, [categoria]);
        } else {
            rows = await conn.query(sql);
        }
        res.status(200).json(rows);
    } catch (err) {
        console.error("Error al obtener tipos de evento:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

// Obtener todas las opciones de adicionales
const getAdicionales = async (req, res) => {
    //console.log("\n-> Ejecutando controlador getAdicionales...");
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query("SELECT `nombre`, `precio`, `descripcion`, `url_imagen` as imageUrl FROM `opciones_adicionales`;");
        res.status(200).json(rows);
    } catch (err) {
        console.error("Error al obtener adicionales:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

const getConfig = async (req, res) => {
    //console.log("\n-> Ejecutando controlador getConfig...");
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query("SELECT * FROM `configuracion`;");
        // Convertimos el array de objetos a un solo objeto clave-valor
        const configObject = rows.reduce((acc, row) => {
            acc[row.Clave] = row.Valor;
            return acc;
        }, {});
        res.status(200).json(configObject);
    } catch (err) {
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

const getTarifas = async (req, res) => {
    //console.log("\n-> Ejecutando controlador getTarifas...");
    let conn;
    try {
        conn = await pool.getConnection();
        // Nueva estructura: precio por tipo + rango de cantidad
        // El precio final = precio_por_hora × duracion_horas
        const rows = await conn.query(`
            SELECT 
                pv.id_tipo_evento as tipo, 
                pv.cantidad_min as cantidadMin,
                pv.cantidad_max as cantidadMax,
                pv.precio_por_hora as precioPorHora,
                pv.vigente_desde as vigenciaDesde,
                pv.vigente_hasta as vigenciaHasta
            FROM precios_vigencia pv
            WHERE (pv.vigente_hasta IS NULL OR pv.vigente_hasta >= CURDATE())
              AND pv.vigente_desde <= CURDATE()
            ORDER BY pv.id_tipo_evento, pv.cantidad_min
        `);
        res.status(200).json(rows);
    } catch (err) {
        console.error("Error en getTarifas:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

// Obtener opciones de cantidad (rangos) por tipo de evento
const getOpcionesCantidad = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query(`
            SELECT DISTINCT
                id_tipo_evento as id_tipo_evento,
                cantidad_min,
                cantidad_max
            FROM precios_vigencia
            WHERE (vigente_hasta IS NULL OR vigente_hasta >= CURDATE())
              AND vigente_desde <= CURDATE()
            ORDER BY id_tipo_evento, cantidad_min
        `);
        // Agrupar por tipo de evento
        const cantidadesObject = rows.reduce((acc, row) => {
            if (!acc[row.id_tipo_evento]) {
                acc[row.id_tipo_evento] = [];
            }
            acc[row.id_tipo_evento].push({
                min: row.cantidad_min,
                max: row.cantidad_max,
                label: `${row.cantidad_min} a ${row.cantidad_max} personas`
            });
            return acc;
        }, {});
        res.status(200).json(cantidadesObject);
    } catch (err) {
        console.error("Error en getOpcionesCantidad:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

const getOpcionesDuracion = async (req, res) => {
    //console.log("\n-> Ejecutando controlador getOpcionesDuracion...");
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query("SELECT * FROM `opciones_duracion`;");
        // El código original esperaba un objeto anidado, lo reconstruimos
        const duracionesObject = rows.reduce((acc, row) => {
            if (!acc[row.id_tipo_evento]) {
                acc[row.id_tipo_evento] = [];
            }
            acc[row.id_tipo_evento].push(row.duracion_horas);
            return acc;
        }, {});
        res.status(200).json(duracionesObject);
    } catch (err) {
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

const getOpcionesHorarios = async (req, res) => {
    //console.log("\n-> Ejecutando controlador getOpcionesHorarios...");
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query(`
            SELECT id_tipo_evento as tipo, dia_semana as tipoDia, hora_inicio as hora, hora_fin
            FROM configuracion_horarios
                `);
        // Reconstruimos el objeto anidado que esperaba el frontend
        const horariosObject = rows.reduce((acc, row) => {
            if (!acc[row.tipo]) {
                acc[row.tipo] = [];
            }
            acc[row.tipo].push({
                hora: row.hora,
                tipoDia: row.tipoDia.toLowerCase(),
                horaFin: row.hora_fin
            });
            return acc;
        }, {});
        res.status(200).json(horariosObject);
    } catch (err) {
        console.error("Error en getOpcionesHorarios:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

const getFechasOcupadas = async (req, res) => {
    //console.log("\n-> Ejecutando controlador getFechasOcupadas...");
    let conn;
    try {
        conn = await pool.getConnection();
        // Soporte para detalle: ?detalle=1 -> devolver {fecha,hora} para cada ocupación
        const detalle = req.query && (req.query.detalle === '1' || String(req.query.detalle).toLowerCase() === 'true');
        if (detalle) {
            const sql = `
                SELECT DISTINCT fecha, hora FROM(
                    SELECT DATE_FORMAT(fecha_evento, '%Y-%m-%d') AS fecha, REPLACE(TRIM(hora_evento), 'hs', '') AS hora FROM solicitudes_alquiler WHERE estado = 'Confirmado'
                    UNION
                    SELECT DATE_FORMAT(fecha_evento, '%Y-%m-%d') AS fecha, REPLACE(TRIM(hora_evento), 'hs', '') AS hora FROM solicitudes_fechas_bandas WHERE estado = 'Confirmado'
                    UNION
                    SELECT DATE_FORMAT(fecha_evento, '%Y-%m-%d') AS fecha, TIME_FORMAT(hora_inicio, '%H:%i') AS hora FROM eventos_confirmados WHERE activo = 1
                ) AS todas
                WHERE fecha IS NOT NULL
                ORDER BY fecha, hora;
            `;
            const rows = await conn.query(sql);
            // Normalizar hora: devolver en formato HH:MM cuando sea posible
            const mapped = rows.map(r => {
                let hora = r.hora || null;
                if (hora) {
                    hora = String(hora).trim();
                    // quitar sufijos comunes
                    hora = hora.replace(/hs\.?$/i, '').trim();
                    // intentar extraer HH:MM
                    const m = hora.match(/(\d{1,2}:\d{2})/);
                    if (m) hora = m[1];
                    else {
                        const m2 = hora.match(/(\d{1,2})/);
                        if (m2) hora = String(m2[1]).padStart(2, '0') + ':00';
                        else hora = null;
                    }
                }
                return { fecha: r.fecha, hora };
            });
            return res.status(200).json(mapped);
        }

        // Unificamos fechas ocupadas desde solicitudes confirmadas y desde la tabla `eventos_confirmados`.
        // Esto evita discrepancias cuando hay entradas en `eventos_confirmados` pero no en `solicitudes_alquiler` o `solicitudes_bandas`.
        const sql = `
            SELECT DISTINCT fecha FROM(
                SELECT DATE_FORMAT(fecha_evento, '%Y-%m-%d') AS fecha FROM solicitudes_alquiler WHERE estado = 'Confirmado'
                UNION
                SELECT DATE_FORMAT(fecha_evento, '%Y-%m-%d') AS fecha FROM solicitudes_fechas_bandas WHERE estado = 'Confirmado'
                UNION
                SELECT DATE_FORMAT(fecha_evento, '%Y-%m-%d') AS fecha FROM eventos_confirmados WHERE activo = 1
            ) AS todas
            WHERE fecha IS NOT NULL
            ORDER BY fecha;
            `;
        const rows = await conn.query(sql);
        const fechas = rows.map(r => r.fecha);
        res.status(200).json(fechas);
    } catch (err) {
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

module.exports = {
    getTiposDeEvento,
    getAdicionales,
    getConfig,
    getTarifas,
    getOpcionesDuracion,
    getOpcionesHorarios,
    getOpcionesCantidad,
    getFechasOcupadas
};
