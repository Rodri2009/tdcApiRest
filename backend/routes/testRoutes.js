// backend/routes/testRoutes.js
const express = require('express');
const router = express.Router();
const { testEmail, hola } = require('../controllers/testController');

// POST /api/test/email
router.post('/email', testEmail);
router.get('/hola', hola);

module.exports = router;
