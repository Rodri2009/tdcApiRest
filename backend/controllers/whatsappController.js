/**
 * WhatsApp Controller
 * Maneja solicitudes HTTP relacionadas con WhatsApp
 */

const { logRequest, logVerbose, logError, logSuccess } = require('../lib/debugFlags');

/**
 * GET /api/whatsapp/status
 * Obtiene el estado de la sesión de WhatsApp
 */
async function getStatusHandler(req, res, whatsappService) {
    try {
        logRequest('GET', '/api/whatsapp/status');

        if (!whatsappService || !whatsappService.isSessionValid) {
            return res.status(503).json({
                success: false,
                message: 'WhatsApp no está inicializado',
                status: 'not_ready'
            });
        }

        const status = await whatsappService.getStatus();

        return res.status(200).json({
            success: true,
            status: status,
            ready: true
        });
    } catch (error) {
        logError('[WhatsAppController] getStatus error:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

/**
 * GET /api/whatsapp/chats?limit=20
 * Obtiene la lista de chats
 */
async function getChatsHandler(req, res, whatsappService) {
    try {
        logRequest('GET', '/api/whatsapp/chats');

        if (!whatsappService || !whatsappService.isSessionValid) {
            return res.status(503).json({
                success: false,
                message: 'WhatsApp no está inicializado'
            });
        }

        const limit = parseInt(req.query.limit) || 20;
        const chats = await whatsappService.getChats(limit);

        return res.status(200).json({
            success: true,
            chats: chats,
            count: chats ? chats.length : 0
        });
    } catch (error) {
        logError('[WhatsAppController] getChats error:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

/**
 * GET /api/whatsapp/messages?chatId=...&limit=50
 * Obtiene mensajes de un chat específico
 */
async function getMessagesHandler(req, res, whatsappService) {
    try {
        logRequest('GET', '/api/whatsapp/messages');

        const { chatId } = req.query;
        if (!chatId) {
            return res.status(400).json({
                success: false,
                error: 'chatId es requerido'
            });
        }

        if (!whatsappService || !whatsappService.isSessionValid) {
            return res.status(503).json({
                success: false,
                message: 'WhatsApp no está inicializado'
            });
        }

        const limit = parseInt(req.query.limit) || 50;
        const messages = await whatsappService.getMessages(chatId, limit);

        return res.status(200).json({
            success: true,
            chatId: chatId,
            messages: messages,
            count: messages ? messages.length : 0
        });
    } catch (error) {
        logError('[WhatsAppController] getMessages error:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

/**
 * POST /api/whatsapp/send
 * Envía un mensaje a un chat
 * Body: { chatId, message }
 */
async function sendMessageHandler(req, res, whatsappService) {
    try {
        logRequest('POST', '/api/whatsapp/send');

        const { chatId, message } = req.body;

        if (!chatId || !message) {
            return res.status(400).json({
                success: false,
                error: 'chatId y message son requeridos'
            });
        }

        if (!whatsappService || !whatsappService.isSessionValid) {
            return res.status(503).json({
                success: false,
                message: 'WhatsApp no está inicializado'
            });
        }

        const result = await whatsappService.sendMessage(chatId, message);

        return res.status(200).json({
            success: true,
            message: 'Mensaje enviado',
            result: result
        });
    } catch (error) {
        logError('[WhatsAppController] sendMessage error:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

/**
 * GET /api/whatsapp/contacts
 * Obtiene la lista de contactos
 */
async function getContactsHandler(req, res, whatsappService) {
    try {
        logRequest('GET', '/api/whatsapp/contacts');

        if (!whatsappService || !whatsappService.isSessionValid) {
            return res.status(503).json({
                success: false,
                message: 'WhatsApp no está inicializado'
            });
        }

        const contacts = await whatsappService.getContacts();

        return res.status(200).json({
            success: true,
            contacts: contacts,
            count: contacts ? contacts.length : 0
        });
    } catch (error) {
        logError('[WhatsAppController] getContacts error:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

module.exports = {
    getStatusHandler,
    getChatsHandler,
    getMessagesHandler,
    sendMessageHandler,
    getContactsHandler
};
