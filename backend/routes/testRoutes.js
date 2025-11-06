// backend/routes/testRoutes.js
const express = require('express');
const router = express.Router();
const { testEmail } = require('../controllers/testController');

// POST /api/test/email
router.post('/email', testEmail);

module.exports = router;