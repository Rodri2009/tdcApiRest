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
    actualizarNombreCaja,
    importarMovimientosMPCaja,
    importarMovimientosRetroactivos,
    importarRetroactivosStream,
    importarAutoStream,
    pausarRefreshMP
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
 * GET /api/cajas/importar-auto-stream?fechaDesde=&fechaHasta=&maxPaginas=&token=
 * SSE — Crea una caja automáticamente, importa movimientos de MP, y cierra la caja
 * No requiere caja preexistente
 * IMPORTANTE: Debe estar ANTES de /:id para que Express lo matchee primero
 */
router.get('/importar-auto-stream', importarAutoStream);

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

/**
 * POST /api/cajas/:id/importar-mp
 * Importar movimientos de Mercado Pago a la caja
 * Se abre Puppeteer, pagina por todas las transacciones y las importa
 */
router.post('/:id/importar-mp', importarMovimientosMPCaja);

/**
 * POST /api/cajas/:id/importar-retroactivos
 * Importar movimientos de MP para un período específico (para debugging visual)
 * Body: { fechaDesde, fechaHasta, maxPaginas }
 */
router.post('/:id/importar-retroactivos', importarMovimientosRetroactivos);

/**
 * GET /api/cajas/:id/importar-retroactivos-stream?fechaDesde=&fechaHasta=&maxPaginas=
 * SSE endpoint — streaming en tiempo real de scraping
 */
router.get('/:id/importar-retroactivos-stream', importarRetroactivosStream);

/**
 * POST /api/cajas/pausar-refresh
 * Pausar el refresh automático de MP en Puppeteer
 * Ejecuta congelamiento agresivo de timers y listeners
 */
router.post('/pausar-refresh', pausarRefreshMP);

module.exports = router;
