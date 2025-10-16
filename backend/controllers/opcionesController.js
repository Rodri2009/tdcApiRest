const pool = require('../db');

// --- LOG DE DEPURACIÓN (NUEVO) ---
console.log("Controlador de 'opciones' cargado.");

// Obtener todos los tipos de eventos públicos
const getTiposDeEvento = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        // ¡ESTA ES LA LÍNEA A CORREGIR!
        const rows = await conn.query("SELECT `ID_Evento` as id, `NombreParaMostrar` as nombreParaMostrar, `Descripcion` as descripcion, `MontoSena` as montoSena, `Deposito` as depositoGarantia, `EsPublico` as esPublico FROM `opciones_tipos` WHERE `EsPublico` = 1;");
        // El error estaba en mi copia anterior, la consulta correcta ya estaba, pero vamos a asegurarnos.
        // La consulta debe tener `AS id`
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
    // --- LOG DE DEPURACIÓN (NUEVO) ---
    console.log("-> Ejecutando controlador getAdicionales...");

    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query("SELECT nombre, precio, descripcion, `URL de la Imagen` as url_imagen FROM opciones_adicionales;");
        res.status(200).json(rows);
    } catch (err) {
        console.error("Error al obtener adicionales:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

const getConfig = async (req, res) => {
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
    let conn;
    try {
        conn = await pool.getConnection();
        // Renombramos las columnas para que coincidan con el código JS original
        const rows = await conn.query("SELECT `Tipo de Evento` as tipo, `Cantidad Minima` as min, `Cantidad Maxima` as max, `Fecha de Vigencia` as fechaVigencia, `Precio por Hora` as precioPorHora FROM `precios_vigencia`;");
        res.status(200).json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

const getOpcionesDuracion = async (req, res) => {
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
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query("SELECT `ID de Evento` as tipo, `Hora de Inicio` as hora, `Tipo de Dia` as tipoDia FROM `configuracion_horarios`;");
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
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query("SELECT DATE_FORMAT(`Fecha Evento`, '%Y-%m-%d') as fecha FROM `solicitudes` WHERE `Estado` = 'Confirmado';");
        // Devolvemos un array simple de strings de fecha
        const fechas = rows.map(r => r.fecha);
        res.status(200).json(fechas);
    } catch (err) {
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

// ... (al final del archivo, antes de module.exports)
const getSesionExistente = async (req, res) => {
    const { fingerprintId } = req.query;
    if (!fingerprintId) {
        return res.status(400).json({ error: 'fingerprintId es requerido' });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        // Busca una solicitud reciente (últimas 24h) y no completada
        const rows = await conn.query(
            "SELECT `ID_Solicitud` as solicitudId, `Tipo de Evento` as tipoEvento, `Cantidad de Personas` as cantidadPersonas, `Duracion` as duracionEvento, DATE_FORMAT(`Fecha Evento`, '%Y-%m-%d') as fechaEvento, `Hora Evento` as horaInicio FROM `solicitudes` WHERE `FingerprintID` = ? AND `Estado` = 'Solicitado' AND `Fecha Hora` > (NOW() - INTERVAL 24 HOUR) ORDER BY `Fecha Hora` DESC LIMIT 1;",
            [fingerprintId]
        );

        if (rows.length > 0) {
            res.status(200).json(rows[0]);
        } else {
            res.status(200).json(null); // Devuelve null si no se encuentra, igual que el original
        }
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
    getFechasOcupadas,
    getSesionExistente
};
