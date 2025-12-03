const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
    // Buscar token en cookies O en el header Authorization
    let token = req.cookies.token;
    
    // Si no hay token en cookies, buscar en header Authorization
    if (!token && req.headers.authorization) {
        const authHeader = req.headers.authorization;
        if (authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7); // Eliminar "Bearer "
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'No autorizado, no hay token.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Añadimos los datos del usuario (id, email, rol) a la petición
        next();
    } catch (error) {
        return res.status(401).json({ message: 'No autorizado, token inválido.' });
    }
};

module.exports = { protect };