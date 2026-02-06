const express = require('express');
const router = express.Router();
const eventosController = require('../controllers/eventosController');

// Public endpoints
router.get('/publicos', eventosController.getPublicEvents);

module.exports = router;
