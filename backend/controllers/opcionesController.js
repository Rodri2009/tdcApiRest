const pool = require('../db');

// --- LOG DE DEPURACIÓN (NUEVO) ---
console.log("Controlador de 'opciones' cargado.");

// Obtener todos los tipos de eventos públicos
const getTiposDeEvento = async (req, res) => {
    // --- LOG DE DEPURACIÓN (NUEVO) ---
    console.log("-> Ejecutando controlador getTiposDeEvento...");

    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query("SELECT id_evento, nombreparamostrar, descripcion, montosena FROM opciones_tipos WHERE espublico = 1;");
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

module.exports = {
    getTiposDeEvento,
    getAdicionales,
};