/**
 * middleware/checkPermiso.js
 * Middleware para verificar permisos específicos del usuario
 * Sistema simplificado: roles = admin (tiene todos), staff (limitados), cliente (solo propias)
 * 
 * Uso:
 *   const { checkPermiso, checkAnyPermiso } = require('./middleware/checkPermiso');
 *   router.get('/usuarios', protect, checkPermiso('usuarios.ver'), getUsuarios);
 *   router.post('/config', protect, checkAnyPermiso(['config.alquiler', 'config.talleres']), updateConfig);
 */

/**
 * Verifica que el usuario tenga un permiso específico
 * @param {string} permisoRequerido - Código del permiso (ej: 'usuarios.ver')
 */
const checkPermiso = (permisoRequerido) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'No autorizado.' });
        }

        // Admin siempre tiene acceso total
        const rol = req.user.role || (req.user.roles && req.user.roles[0]);
        if (rol === 'admin') {
            return next();
        }

        // Verificar si tiene el permiso en su lista
        if (req.user.permisos && req.user.permisos.includes(permisoRequerido)) {
            return next();
        }

        console.warn(`Acceso denegado: Usuario ${req.user.id} no tiene permiso '${permisoRequerido}'`);
        return res.status(403).json({
            message: 'No tienes permisos para realizar esta acción.',
            permiso_requerido: permisoRequerido
        });
    };
};

/**
 * Verifica que el usuario tenga AL MENOS UNO de los permisos especificados
 * @param {string[]} permisosRequeridos - Array de códigos de permisos
 */
const checkAnyPermiso = (permisosRequeridos) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'No autorizado.' });
        }

        // Admin siempre tiene acceso total
        const rol = req.user.role || (req.user.roles && req.user.roles[0]);
        if (rol === 'admin') {
            return next();
        }

        // Verificar si tiene al menos uno de los permisos
        const tienePermiso = permisosRequeridos.some(p =>
            req.user.permisos && req.user.permisos.includes(p)
        );

        if (tienePermiso) {
            return next();
        }

        console.warn(`Acceso denegado: Usuario ${req.user.id} no tiene ninguno de los permisos: ${permisosRequeridos.join(', ')}`);
        return res.status(403).json({
            message: 'No tienes permisos para realizar esta acción.',
            permisos_requeridos: permisosRequeridos
        });
    };
};

/**
 * Verifica que el usuario tenga TODOS los permisos especificados
 * @param {string[]} permisosRequeridos - Array de códigos de permisos
 */
const checkAllPermisos = (permisosRequeridos) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'No autorizado.' });
        }

        // Admin siempre tiene acceso total
        const rol = req.user.role || (req.user.roles && req.user.roles[0]);
        if (rol === 'admin') {
            return next();
        }

        // Verificar si tiene todos los permisos
        const tieneTodos = permisosRequeridos.every(p =>
            req.user.permisos && req.user.permisos.includes(p)
        );

        if (tieneTodos) {
            return next();
        }

        console.warn(`Acceso denegado: Usuario ${req.user.id} no tiene todos los permisos requeridos`);
        return res.status(403).json({
            message: 'No tienes todos los permisos necesarios para esta acción.',
            permisos_requeridos: permisosRequeridos
        });
    };
};

/**
 * Verifica que el usuario tenga un rol específico
 * @param {string} rolRequerido - Código del rol (ej: 'ADMIN')
 */
const checkRol = (rolRequerido) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'No autorizado.' });
        }

        const rolActual = req.user.role || (req.user.roles && req.user.roles[0]);

        // Admin siempre tiene acceso a todo
        if (rolActual === 'admin') {
            return next();
        }

        if (rolActual === rolRequerido) {
            return next();
        }

        console.warn(`Acceso denegado: Usuario ${req.user.id} no tiene rol '${rolRequerido}'`);
        return res.status(403).json({
            message: 'No tienes el rol necesario para esta acción.',
            rol_requerido: rolRequerido
        });
    };
};

/**
 * Verifica que el usuario tenga nivel de rol igual o superior al especificado
 * @param {number} nivelMinimo - Nivel mínimo requerido (10=cliente, 50=staff, 100=admin)
 */
const checkNivel = (nivelMinimo) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'No autorizado.' });
        }

        if (req.user.nivel >= nivelMinimo) {
            return next();
        }

        console.warn(`Acceso denegado: Usuario ${req.user.id} tiene nivel ${req.user.nivel}, requiere ${nivelMinimo}`);
        return res.status(403).json({
            message: 'No tienes el nivel de acceso necesario.',
            nivel_requerido: nivelMinimo
        });
    };
};

module.exports = {
    checkPermiso,
    checkAnyPermiso,
    checkAllPermisos,
    checkRol,
    checkNivel
};
