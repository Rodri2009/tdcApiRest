// middleware/requireAdmin.js
// Verifica que el usuario autenticado tenga rol 'admin'
module.exports = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'No autorizado.' });
    }
    // Asumimos que el JWT incluye un campo 'role' o similar
    if (req.user.role && req.user.role === 'admin') {
        return next();
    }
    console.warn(`Acceso denegado para usuario ${req.user && req.user.id}`);
    return res.status(403).json({ message: 'Requiere permisos de administrador.' });
};
