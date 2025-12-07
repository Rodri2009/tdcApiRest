// backend/routes/opcionesRoutes.js
const express = require('express');
const router = express.Router();
const {
    getTiposDeEvento,
    getAdicionales,
    getConfig,
    getTarifas,
    getOpcionesDuracion,
    getOpcionesHorarios,
    getOpcionesCantidad,
    getFechasOcupadas
} = require('../controllers/opcionesController');

router.get('/tipos-evento', getTiposDeEvento);
router.get('/adicionales', getAdicionales);
router.get('/config', getConfig);
router.get('/tarifas', getTarifas);
router.get('/duraciones', getOpcionesDuracion);
router.get('/horarios', getOpcionesHorarios);
router.get('/cantidades', getOpcionesCantidad);
router.get('/fechas-ocupadas', getFechasOcupadas);

module.exports = router;