const pool = require('../db');

// --- LOG DE DEPURACIÓN (NUEVO) ---
//console.log("Controlador de 'opciones' cargado.");

// Obtener todos los tipos de eventos públicos
const getTiposDeEvento = async (req, res) => {
    //console.log("\n-> Ejecutando controlador getTiposDeEvento...");
    let conn;
    try {
        conn = await pool.getConnection();
        // Permitimos filtrar por categoría: ?categoria=BANDA
        const categoria = req.query.categoria;
        let sql = "SELECT `id_evento` as id, `nombre_para_mostrar` as nombreParaMostrar, `descripcion` as descripcion, `monto_sena` as montoSena, `deposito` as depositoGarantia, `es_publico` as esPublico, IFNULL(`categoria`, 'OTRO') as categoria FROM `opciones_tipos` WHERE `es_publico` = 1";
        let rows;
        if (categoria) {
            sql += " AND categoria = ?";
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
        // Renombramos las columnas para que coincidan con el código JS original
        const rows = await conn.query("SELECT `tipo_de_Evento` as tipo, `cantidad_minima` as min, `cantidad_maxima` as max, `fecha_de_vigencia` as fechaVigencia, `precio_por_hora` as precioPorHora FROM `precios_vigencia`;");
        res.status(200).json(rows);
    } catch (err) {
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
            if (!acc[row.id_evento]) {
                acc[row.id_evento] = [];
            }
            acc[row.id_evento].push(row.duracion);
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
        const rows = await conn.query("SELECT `id_de_evento` as tipo, `hora_de_inicio` as hora, `tipo_de_dia` as tipoDia FROM `configuracion_horarios`;");
        // Reconstruimos el objeto anidado que esperaba el frontend
        const horariosObject = rows.reduce((acc, row) => {
            if (!acc[row.tipo]) {
                acc[row.tipo] = [];
            }
            acc[row.tipo].push({ hora: row.hora, tipoDia: row.tipoDia.toLowerCase() });
            return acc;
        }, {});
        res.status(200).json(horariosObject);
    } catch (err) {
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
                SELECT DISTINCT fecha, hora FROM (
                    SELECT DATE_FORMAT(fecha_evento, '%Y-%m-%d') AS fecha, REPLACE(TRIM(hora_evento), 'hs', '') AS hora FROM solicitudes WHERE estado = 'Confirmado'
                    UNION
                    SELECT DATE_FORMAT(fecha_hora, '%Y-%m-%d') AS fecha, DATE_FORMAT(fecha_hora, '%H:%i') AS hora FROM eventos WHERE activo = 1
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

        // Unificamos fechas ocupadas desde solicitudes confirmadas y desde la tabla `eventos`.
        // Esto evita discrepancias cuando hay entradas en `eventos` pero no en `solicitudes`.
        const sql = `
            SELECT DISTINCT fecha FROM (
                SELECT DATE_FORMAT(fecha_evento, '%Y-%m-%d') AS fecha FROM solicitudes WHERE estado = 'Confirmado'
                UNION
                SELECT DATE_FORMAT(fecha_hora, '%Y-%m-%d') AS fecha FROM eventos WHERE activo = 1
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
    getFechasOcupadas
};
