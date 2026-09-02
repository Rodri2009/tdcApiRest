const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { login, logout, me, register, verifyEmail, oauthCallback } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Demasiados intentos. Intenta nuevamente en unos minutos.'
    }
});

// Autenticación manual (email/password)
router.post('/register', authLimiter, register);
router.post('/verify-email', authLimiter, verifyEmail);
router.post('/login', authLimiter, login);
router.post('/logout', authLimiter, logout);

// Usuario actual
router.get('/me', protect, me);

// OAuth
router.post('/oauth-callback', oauthCallback);

module.exports = router;