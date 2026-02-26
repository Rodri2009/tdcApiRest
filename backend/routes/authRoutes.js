const express = require('express');
const router = express.Router();
const { login, logout, me, register, oauthCallback } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Autenticación manual (email/password)
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);

// Usuario actual
router.get('/me', protect, me);

// OAuth
router.post('/oauth-callback', oauthCallback);

module.exports = router;