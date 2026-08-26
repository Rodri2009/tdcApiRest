/**
 * routes/usuariosRoutes.js
 * Rutas para gestión de usuarios y roles
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { checkPermiso } = require('../middleware/checkPermiso');
const {
    getUsuarios,
    getUsuarioPorId,
    crearUsuario,
    actualizarUsuario,
    eliminarUsuario,
    getRoles,
    getPermisos,
    asignarRoles,
    cambiarPassword
} = require('../controllers/usuariosController');

// ============================================================================
// RUTAS DE USUARIOS
// ============================================================================

// GET /api/usuarios - Listar todos los usuarios
router.get('/', protect, checkPermiso('usuarios.ver'), getUsuarios);

// GET /api/usuarios/roles - Listar roles disponibles
router.get('/roles', protect, checkPermiso('usuarios.ver'), getRoles);

// GET /api/usuarios/permisos - Listar permisos disponibles
router.get('/permisos', protect, checkPermiso('usuarios.ver'), getPermisos);

// GET /api/usuarios/:id - Obtener usuario por ID
router.get('/:id', protect, checkPermiso('usuarios.ver'), getUsuarioPorId);

// POST /api/usuarios - Crear nuevo usuario
router.post('/', protect, checkPermiso('usuarios.crear'), crearUsuario);

// PUT /api/usuarios/:id - Actualizar usuario
router.put('/:id', protect, checkPermiso('usuarios.editar'), actualizarUsuario);

// DELETE /api/usuarios/:id - Eliminar usuario
router.delete('/:id', protect, checkPermiso('usuarios.eliminar'), eliminarUsuario);

// PUT /api/usuarios/:id/roles - Asignar roles a usuario
router.put('/:id/roles', protect, checkPermiso('usuarios.asignar_roles'), asignarRoles);

// ============================================================================
// RUTAS DE PERFIL (usuario actual)
// ============================================================================

// PUT /api/usuarios/me/password - Cambiar contraseña propia
router.put('/me/password', protect, cambiarPassword);

module.exports = router;
