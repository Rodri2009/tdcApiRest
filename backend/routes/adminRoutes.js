const express = require('express');
const router = express.Router();
const {
    getSolicitudes,
    actualizarEstadoSolicitud,
    eliminarSolicitud,
    getDatosAsignacion,
    guardarAsignaciones,
    getOrdenDeTrabajo,
    getAllTiposDeEvento,
    crearEvento,
    actualizarEvento,
    cancelarEvento,
    eliminarEvento,
    getEventoById
} = require('../controllers/adminController');

const { updateVisibilidad } = require('../controllers/solicitudController');
const eventosAuditController = require('../controllers/eventosAuditController');

const alquilerAdmin = require('../controllers/alquilerAdminController');
const personalTarifas = require('../controllers/personalTarifasController');

const { protect } = require('../middleware/authMiddleware');
const requireAdmin = require('../middleware/requireAdmin');
const { checkPermiso, checkAnyPermiso } = require('../middleware/checkPermiso');

// ¡Aplicamos el middleware 'protect' a todas las rutas de este archivo!
router.use(protect);
// Y además exigimos que el usuario tenga rol admin (o VIEWER para lectura)
router.use(requireAdmin);



// =============================================================================
// SOLICITUDES GENERALES
// =============================================================================
router.get('/solicitudes', getSolicitudes);
router.put('/solicitudes/:id/estado', checkPermiso('solicitudes.cambiar_estado'), actualizarEstadoSolicitud);
router.put('/solicitudes/:id/visibilidad', checkPermiso('solicitudes.cambiar_estado'), updateVisibilidad);
router.delete('/solicitudes/:id', checkPermiso('solicitudes.eliminar'), eliminarSolicitud);
router.get('/asignacion-data', getDatosAsignacion);
router.post('/solicitudes/:id/asignaciones', checkPermiso('personal.gestionar'), guardarAsignaciones);
router.get('/orden-trabajo/:id', getOrdenDeTrabajo);

// =============================================================================
// EVENTOS
// =============================================================================
// Rutas unificadas: /eventos_confirmados
router.get('/eventos_confirmados/:id', getEventoById);
router.post('/eventos_confirmados', checkPermiso('solicitudes.crear'), crearEvento);
router.put('/eventos_confirmados/:id', checkPermiso('solicitudes.editar'), actualizarEvento);
router.patch('/eventos_confirmados/:id/cancel', checkPermiso('solicitudes.cambiar_estado'), cancelarEvento);
router.delete('/eventos_confirmados/:id', checkPermiso('solicitudes.eliminar'), eliminarEvento);

router.get('/tipos-evento/all', getAllTiposDeEvento);

// Auditoría de eventos confirmados
router.get('/eventos_audit', checkPermiso('solicitudes.ver'), eventosAuditController.listAudits);
router.get('/eventos_audit/:id', checkPermiso('solicitudes.ver'), eventosAuditController.getAuditById);

// =============================================================================
// CONFIGURACIÓN DE ALQUILER
// =============================================================================

// Tipos de evento
router.get('/alquiler/tipos', alquilerAdmin.getTipos);
router.post('/alquiler/tipos', checkPermiso('config.alquiler'), alquilerAdmin.createTipo);
router.put('/alquiler/tipos/:id', checkPermiso('config.alquiler'), alquilerAdmin.updateTipo);
router.delete('/alquiler/tipos/:id', checkPermiso('config.alquiler'), alquilerAdmin.deleteTipo);

// Duraciones
router.get('/alquiler/duraciones', alquilerAdmin.getDuraciones);
router.post('/alquiler/duraciones', checkPermiso('config.alquiler'), alquilerAdmin.createDuracion);
router.put('/alquiler/duraciones/:id', checkPermiso('config.alquiler'), alquilerAdmin.updateDuracion);
router.delete('/alquiler/duraciones/:id', checkPermiso('config.alquiler'), alquilerAdmin.deleteDuracion);

// Precios
router.get('/alquiler/precios', alquilerAdmin.getPrecios);
router.post('/alquiler/precios', checkPermiso('config.alquiler'), alquilerAdmin.createPrecio);
router.put('/alquiler/precios/:id', checkPermiso('config.alquiler'), alquilerAdmin.updatePrecio);
router.delete('/alquiler/precios/:id', checkPermiso('config.alquiler'), alquilerAdmin.deletePrecio);

// Adicionales
router.get('/alquiler/adicionales', alquilerAdmin.getAdicionales);
router.post('/alquiler/adicionales', checkPermiso('config.alquiler'), alquilerAdmin.createAdicional);
router.put('/alquiler/adicionales/:nombre', checkPermiso('config.alquiler'), alquilerAdmin.updateAdicional);
router.delete('/alquiler/adicionales/:nombre', checkPermiso('config.alquiler'), alquilerAdmin.deleteAdicional);

// =============================================================================
// PERSONAL (transversal a todos los tipos de eventos)
// =============================================================================
router.get('/personal', alquilerAdmin.getPersonal);
router.post('/personal', checkPermiso('personal.gestionar'), alquilerAdmin.createPersonal);
router.put('/personal/:id', checkPermiso('personal.gestionar'), alquilerAdmin.updatePersonal);
router.delete('/personal/:id', checkPermiso('personal.gestionar'), alquilerAdmin.deletePersonal);

// Roles (catálogo de roles de personal - ej: DJ, Decorador, etc.)
router.get('/roles', alquilerAdmin.getRoles);
router.post('/roles', checkPermiso('personal.gestionar'), alquilerAdmin.createRol);
router.put('/roles/:id', checkPermiso('personal.gestionar'), alquilerAdmin.updateRol);
router.delete('/roles/:id', checkPermiso('personal.gestionar'), alquilerAdmin.deleteRol);

// =============================================================================
// TARIFAS DEL PERSONAL (solo administradores)
// =============================================================================
router.get('/personal/tarifas', personalTarifas.getTarifas);
router.get('/personal/tarifas/vigentes', personalTarifas.getTarifasVigentes);
router.get('/personal/tarifas/:id', personalTarifas.getTarifaById);
router.post('/personal/tarifas', checkPermiso('config.alquiler'), personalTarifas.createTarifa);
router.put('/personal/tarifas/:id', checkPermiso('config.alquiler'), personalTarifas.updateTarifa);
router.delete('/personal/tarifas/:id', checkPermiso('config.alquiler'), personalTarifas.deleteTarifa);

// =============================================================================
// COSTOS DE PERSONAL POR VIGENCIA (solo administradores)
// =============================================================================
router.get('/costos', alquilerAdmin.getCostosPersonal);
router.post('/costos', checkPermiso('config.alquiler'), alquilerAdmin.createCostoPersonal);
router.put('/costos/:id', checkPermiso('config.alquiler'), alquilerAdmin.updateCostoPersonal);
router.delete('/costos/:id', checkPermiso('config.alquiler'), alquilerAdmin.deleteCostoPersonal);

// =============================================================================
// PAGOS DEL PERSONAL (solo administradores)
// =============================================================================
router.get('/personal/pagos', personalTarifas.getPagos);
router.get('/personal/pagos/pendientes', personalTarifas.getPagosPendientes);
router.get('/personal/pagos/resumen', personalTarifas.getResumenPagosPorPersonal);
router.get('/personal/pagos/:id', personalTarifas.getPagoById);
router.post('/personal/pagos', checkPermiso('config.alquiler'), personalTarifas.createPago);
router.put('/personal/pagos/:id', checkPermiso('config.alquiler'), personalTarifas.updatePago);
router.delete('/personal/pagos/:id', checkPermiso('config.alquiler'), personalTarifas.deletePago);

// =============================================================================
// DEBUG
// =============================================================================
router.get('/debug/asignaciones/:id', async (req, res) => {
    const pool = require('../db');
    let conn;
    try {
        conn = await pool.getConnection();
        const result = await conn.query(
            "SELECT id_solicitud, rol_requerido, id_personal_asignado, estado_asignacion FROM solicitudes_personal WHERE id_solicitud = ?",
            [parseInt(req.params.id, 10)]
        );
        res.json({ debug: result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (conn) conn.release();
    }
});

module.exports = router;