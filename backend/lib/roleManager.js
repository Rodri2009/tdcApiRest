/**
 * Sistema de Roles y Permisos
 * Define qué acciones puede hacer cada rol
 */

const ROLES = {
    ADMIN: 'admin',           // Acceso completo a todo
    USER: 'user',             // Acceso a sus propios datos
    READONLY: 'readonly',     // Solo lectura (balance, activity)
    API_CONSUMER: 'api'       // Cliente API externo, acceso limitado
};

const PERMISSIONS = {
    // Lectura
    READ_BALANCE: 'read:balance',
    READ_ACTIVITY: 'read:activity',
    READ_DEBUG: 'read:debug',

    // Escritura
    WRITE_REFRESH: 'write:refresh',
    WRITE_LOGOUT: 'write:logout',

    // Admin
    ADMIN_TOKENS: 'admin:tokens',
    ADMIN_USERS: 'admin:users',
    ADMIN_LOGS: 'admin:logs'
};

/**
 * Define qué permisos tiene cada rol
 */
const ROLE_PERMISSIONS = {
    [ROLES.ADMIN]: [
        PERMISSIONS.READ_BALANCE,
        PERMISSIONS.READ_ACTIVITY,
        PERMISSIONS.READ_DEBUG,
        PERMISSIONS.WRITE_REFRESH,
        PERMISSIONS.WRITE_LOGOUT,
        PERMISSIONS.ADMIN_TOKENS,
        PERMISSIONS.ADMIN_USERS,
        PERMISSIONS.ADMIN_LOGS
    ],

    [ROLES.USER]: [
        PERMISSIONS.READ_BALANCE,
        PERMISSIONS.READ_ACTIVITY,
        PERMISSIONS.WRITE_REFRESH,
        PERMISSIONS.WRITE_LOGOUT
    ],

    [ROLES.READONLY]: [
        PERMISSIONS.READ_BALANCE,
        PERMISSIONS.READ_ACTIVITY
    ],

    [ROLES.API_CONSUMER]: [
        PERMISSIONS.READ_BALANCE,
        PERMISSIONS.READ_ACTIVITY
    ]
};

/**
 * Obtiene los permisos de un rol
 * @param {string} role - Nombre del rol
 * @returns {Array} Array de permisos
 */
function getPermissions(role) {
    return ROLE_PERMISSIONS[role] || [];
}

/**
 * Verifica si un rol tiene un permiso específico
 * @param {string} role - Nombre del rol
 * @param {string} permission - Permiso a verificar
 * @returns {boolean}
 */
function hasPermission(role, permission) {
    const permissions = getPermissions(role);
    return permissions.includes(permission);
}

/**
 * Verifica si un usuario (con su payload de JWT) tiene un permiso
 * @param {Object} userPayload - Payload del JWT (contiene role)
 * @param {string} permission - Permiso a verificar
 * @returns {boolean}
 */
function userHasPermission(userPayload, permission) {
    if (!userPayload || !userPayload.role) {
        return false;
    }
    return hasPermission(userPayload.role, permission);
}

/**
 * Crea un payload de usuario con rol y permisos
 * @param {Object} userData - {id, email, nombrePersona, etc}
 * @param {string} role - Rol del usuario (default: 'user')
 * @returns {Object} Payload con permisos incluidos
 */
function createUserPayload(userData, role = ROLES.USER) {
    return {
        ...userData,
        role,
        permisos: getPermissions(role)
    };
}

/**
 * Middleware factory para verificar permisos
 * @param {string|Array} requiredPermissions - Un permiso o array de permisos
 * @returns {Function} Middleware Express
 */
function requirePermission(requiredPermissions) {
    const permissions = Array.isArray(requiredPermissions)
        ? requiredPermissions
        : [requiredPermissions];

    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'No autenticado',
                message: 'Se requiere autenticación'
            });
        }

        const hasRequiredPermission = permissions.some(perm =>
            userHasPermission(req.user, perm)
        );

        if (!hasRequiredPermission) {
            return res.status(403).json({
                error: 'Acceso denegado',
                message: `Requiere permisos: ${permissions.join(', ')}`,
                userRole: req.user.role,
                userPermissions: req.user.permisos
            });
        }

        next();
    };
}

/**
 * Retorna el nivel de acceso de un rol (para comparaciones)
 * @param {string} role
 * @returns {number}
 */
function getAccessLevel(role) {
    const levels = {
        [ROLES.ADMIN]: 100,
        [ROLES.USER]: 50,
        [ROLES.API_CONSUMER]: 30,
        [ROLES.READONLY]: 10
    };
    return levels[role] || 0;
}

module.exports = {
    ROLES,
    PERMISSIONS,
    ROLE_PERMISSIONS,
    getPermissions,
    hasPermission,
    userHasPermission,
    createUserPayload,
    requirePermission,
    getAccessLevel
};
