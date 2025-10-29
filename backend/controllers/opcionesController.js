const pool = require('../db');

// --- LOG DE DEPURACIÓN (NUEVO) ---
console.log("Controlador de 'opciones' cargado.");

// Obtener todos los tipos de eventos públicos
const getTiposDeEvento = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        // ¡ESTA ES LA LÍNEA A CORREGIR!
        const rows = await conn.query("SELECT `id_evento` as id, `nombre_para_mostrar` as nombreParaMostrar, `descripcion` as descripcion, `monto_sena` as montoSena, `deposito` as depositoGarantia, `es_publico` as esPublico FROM `opciones_tipos` WHERE `es_publico` = 1;");
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
        const rows = await conn.query("SELECT `tipo_de_Evento` as tipo, `cantidad_minima` as min, `cantidad_maxima` as max, `fecha_de_vigencia` as fechaVigencia, `precio_por_hora` as precioPorHora FROM `precios_vigencia`;");
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
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query("SELECT DATE_FORMAT(`fecha_evento`, '%Y-%m-%d') as fecha FROM `solicitudes` WHERE `estado` = 'Confirmado';");
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
    console.log(`-> Buscando sesión para Fingerprint ID: ${fingerprintId}`);

    if (!fingerprintId) {
        return res.status(400).json({ error: 'fingerprintId es requerido' });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        
        // --- ¡CONSULTA SQL CORREGIDA! ---
        // Usamos los nombres de columna snake_case y los alias correctos que el frontend espera.
        const sql = `
            SELECT 
                id_solicitud as solicitudId, 
                tipo_de_evento as tipoEvento, 
                cantidad_de_personas as cantidadPersonas, 
                duracion as duracionEvento, 
                DATE_FORMAT(fecha_evento, '%Y-%m-%d') as fechaEvento, 
                hora_evento as horaInicio 
            FROM solicitudes 
            WHERE fingerprintid = ? 
              AND estado = 'Solicitado' 
              AND fecha_hora > (NOW() - INTERVAL 24 HOUR) 
            ORDER BY fecha_hora DESC 
            LIMIT 1;
        `;

        const [sesion] = await conn.query(sql, [fingerprintId]);

        if (sesion) {
            console.log(`Sesión encontrada:`, sesion);
            res.status(200).json(sesion);
        } else {
            console.log("No se encontró ninguna sesión reciente.");
            // Es importante devolver null para que el frontend sepa que no hay nada que rellenar.
            res.status(200).json(null); 
        }
    } catch (err) {
        console.error("Error al buscar sesión existente:", err);
        res.status(500).json({ error: 'Error interno del servidor.' });
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
