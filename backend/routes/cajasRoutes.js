const express = require('express');
const router = express.Router();
const {
    verificarCajaActiva,
    crearCaja,
    obtenerCaja,
    agregarMovimiento,
    eliminarMovimiento,
    cerrarCaja,
    obtenerHistorialCajas,
    obtenerMovimientosCaja,
    actualizarNombreCaja
} = require('../controllers/cajasController');

const { protect } = require('../middleware/authMiddleware');
const requireAdmin = require('../middleware/requireAdmin');

// Aplicar middleware de autenticación a todas las rutas
router.use(protect);
router.use(requireAdmin);

/**
 * GET /api/cajas/activa
 * Verificar si hay una caja abierta actualmente
 * Retorna: { id, numero_caja, saldo_inicial, movimientos: [...] }
 */
router.get('/activa', verificarCajaActiva);

/**
 * GET /api/cajas/history
 * Obtener historial de todas las cajas cerradas
 */
router.get('/history', obtenerHistorialCajas);

/**
 * POST /api/cajas
 * Crear/abrir una nueva caja
 * Body: { saldoInicial, notas }
 */
router.post('/', crearCaja);

/**
 * GET /api/cajas/:id
 * Obtener detalles de una caja específica con sus movimientos
 */
router.get('/:id', obtenerCaja);

/**
 * GET /api/cajas/:id/movimientos
 * Obtener movimientos de una caja
 */
router.get('/:id/movimientos', obtenerMovimientosCaja);

/**
 * POST /api/cajas/:id/movimientos
 * Agregar un movimiento a la caja
 * Body: { tipo, categoria, subcategoria, descripcion, monto, metodo, comprobante, id_evento_confirmado, id_solicitud }
 */
router.post('/:id/movimientos', agregarMovimiento);

/**
 * DELETE /api/cajas/movimientos/:movimientoId
 * Eliminar un movimiento
 */
router.delete('/movimientos/:movimientoId', eliminarMovimiento);

/**
 * PUT /api/cajas/:id/cerrar
 * Cerrar una caja
 * Body: { saldoFinal, notas }
 */
router.put('/:id/cerrar', cerrarCaja);

/**
 * PUT /api/cajas/:id/nombre
 * Actualizar nombre de una caja
 * Body: { nombre }
 */
router.put('/:id/nombre', actualizarNombreCaja);

module.exports = router;
