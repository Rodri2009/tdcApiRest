const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');

/**
 * Rutas para integración con serverWhatsApp (WhatsApp Web)
 * Servidor externo esperado en http://localhost:9002 (Fase 1)
 * o http://wa-browser:9002 (Fase 2)
 */

// POST /api/whatsapp/send-message - Envía un mensaje
router.post('/send-message', whatsappController.sendMessage);

// GET /api/whatsapp/chats - Obtiene lista de chats
router.get('/chats', whatsappController.getChats);

// GET /api/whatsapp/messages/:chatId - Obtiene mensajes de un chat
router.get('/messages/:chatId', whatsappController.getMessages);

// POST /api/whatsapp/refresh - Fuerza refresh
router.post('/refresh', whatsappController.refresh);

module.exports = router;
