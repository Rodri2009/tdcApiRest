// middleware/requireAdmin.js
// Verifica que el usuario autenticado tenga permisos de administración
// Soporta tanto el sistema legacy (role='admin') como el nuevo sistema de roles

module.exports = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'No autorizado.' });
    }

    // Verificar sistema nuevo de roles (prioridad)
    // Cualquier usuario con rol asignado puede acceder a rutas admin (lectura)
    // Los permisos específicos se verifican con checkPermiso en cada endpoint
    if (req.user.roles && Array.isArray(req.user.roles) && req.user.roles.length > 0) {
        // SUPER_ADMIN, ADMIN, OPERADOR y VIEWER pueden acceder
        if (req.user.roles.includes('SUPER_ADMIN') ||
            req.user.roles.includes('ADMIN') ||
            req.user.roles.includes('OPERADOR') ||
            req.user.roles.includes('VIEWER')) {
            return next();
        }
    }

    // Fallback: verificar sistema legacy
    if (req.user.role && (req.user.role === 'admin' || req.user.role === 'staff')) {
        return next();
    }

    // Verificar por nivel (cualquier nivel > 0 puede acceder a lectura)
    if (req.user.nivel && req.user.nivel > 0) {
        return next();
    }

    console.warn(`Acceso denegado para usuario ${req.user.id} - roles: ${JSON.stringify(req.user.roles)}, nivel: ${req.user.nivel}`);
    return res.status(403).json({ message: 'Requiere permisos de administrador.' });
};
