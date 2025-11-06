const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ message: 'No autorizado, no hay token.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Añadimos los datos del usuario (id, rol) a la petición
        next();
    } catch (error) {
        return res.status(401).json({ message: 'No autorizado, token inválido.' });
    }
};

module.exports = { protect };