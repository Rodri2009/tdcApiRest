const express = require('express');
const router = express.Router();
const { getTiposDeEvento, getAdicionales } = require('../controllers/opcionesController');

// --- LOG DE DEPURACIÓN (NUEVO) ---
console.log("Router de 'opciones' inicializado.");

// GET /api/opciones/tipos-evento
// Cuando el servidor arranque, este log nos confirmará que la ruta se está registrando.
console.log("Definiendo ruta: GET /tipos-evento");
router.get('/tipos-evento', getTiposDeEvento);

// GET /api/opciones/adicionales
console.log("Definiendo ruta: GET /adicionales");
router.get('/adicionales', getAdicionales);

module.exports = router;