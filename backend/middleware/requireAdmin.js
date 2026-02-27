// middleware/requireAdmin.js
// Verifica que el usuario autenticado tenga permisos de administración
// Sistema simplificado: roles = admin, staff, cliente

const { logWarning } = require('../lib/debugFlags');

module.exports = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'No autorizado.' });
    }

    // Admin, staff y staff_readonly pueden acceder a rutas de administración
    // Los permisos específicos se verifican con checkPermiso en cada endpoint
    const rol = req.user.role || (req.user.roles && req.user.roles[0]);

    if (rol === 'admin' || rol === 'staff' || rol === 'staff_readonly') {
        return next();
    }

    // Verificar por nivel (admin=100, staff=50, staff_readonly=50)
    if (req.user.nivel && req.user.nivel >= 50) {
        return next();
    }

    logWarning(`Acceso denegado para usuario ${req.user.id} - rol: ${rol}, nivel: ${req.user.nivel}`);
    return res.status(403).json({ message: 'Requiere permisos de administrador.' });
};
