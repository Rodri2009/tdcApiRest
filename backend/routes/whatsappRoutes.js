const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');

/**
 * Rutas para integración con serverWhatsApp (WhatsApp Web)
 * Servidor externo esperado en http://localhost:9002 (Fase 1)
 * o http://wa-browser:9002 (Fase 2)
 */

// ✅ Middleware para acompañar waPage (desde global si ENABLE_PUPPETEER_WA=true)
router.use((req, res, next) => {
    if (global.waPage) {
        req.waPage = global.waPage;
    }
    next();
});

// POST /api/whatsapp/send-message - Envía un mensaje
router.post('/send-message', whatsappController.sendMessageHandler);

// GET /api/whatsapp/chats - Obtiene lista de chats
router.get('/chats', whatsappController.getChatsHandler);

// GET /api/whatsapp/messages/:chatId - Obtiene mensajes de un chat
router.get('/messages/:chatId', whatsappController.getMessagesHandler);

// GET /api/whatsapp/status - Estado de sesión WA
router.get('/status', whatsappController.getStatusHandler);

module.exports = router;
