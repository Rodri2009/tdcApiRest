const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email y contraseña son requeridos.' });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        const [user] = await conn.query("SELECT * FROM usuarios WHERE email = ?", [email]);

        if (!user) {
            return res.status(401).json({ message: 'Credenciales inválidas.' }); // 401 Unauthorized
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

    // --- Creación del Token JWT ---
    // Normalizamos los campos: 'id' y 'role' para que otros middlewares los consuman fácilmente
    const payload = { id: user.id, role: user.rol };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

        // --- Envío del Token en una Cookie HttpOnly ---
        res.cookie('token', token, {
            httpOnly: true, // El token no es accesible por JavaScript en el navegador
            secure: process.env.NODE_ENV === 'production', // En producción, solo enviar por HTTPS
            maxAge: 8 * 60 * 60 * 1000 // 8 horas en milisegundos
        });
        
        res.status(200).json({ message: 'Login exitoso.', user: { nombre: user.nombre, email: user.email } });

    } catch (err) {
        res.status(500).json({ message: 'Error del servidor.' });
    } finally {
        if (conn) conn.release();
    }
};

const logout = (req, res) => {
    res.cookie('token', '', { httpOnly: true, expires: new Date(0) });
    res.status(200).json({ message: 'Logout exitoso.' });
};

module.exports = { login, logout };