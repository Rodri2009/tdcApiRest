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
    actualizarEvento,
    cancelarEvento,
    eliminarEvento
} = require('../controllers/adminController');

const { protect } = require('../middleware/authMiddleware');
const requireAdmin = require('../middleware/requireAdmin');

// ¡Aplicamos el middleware 'protect' a todas las rutas de este archivo!
router.use(protect);
// Y además exigimos que el usuario tenga rol admin
router.use(requireAdmin);

router.get('/solicitudes', getSolicitudes);
router.put('/solicitudes/:id/estado', actualizarEstadoSolicitud);
router.delete('/solicitudes/:id', eliminarSolicitud);
router.get('/asignacion-data', getDatosAsignacion);
router.post('/solicitudes/:id/asignaciones', guardarAsignaciones);
router.get('/orden-trabajo/:id', getOrdenDeTrabajo);
// Rutas para gestionar eventos desde admin
router.put('/eventos/:id', requireAdmin, (req, res, next) => next(), (req, res) => actualizarEvento(req, res));
router.patch('/eventos/:id/cancel', requireAdmin, (req, res, next) => next(), (req, res) => cancelarEvento(req, res));
router.delete('/eventos/:id', (req, res) => eliminarEvento(req, res));
router.get('/tipos-evento/all', getAllTiposDeEvento);

// DEBUG: Endpoint para verificar asignaciones guardadas
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