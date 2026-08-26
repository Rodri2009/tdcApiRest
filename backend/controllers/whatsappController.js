/**
 * WhatsApp Controller
 * Maneja solicitudes HTTP relacionadas con WhatsApp
 */

const { logRequest, logVerbose, logError, logSuccess } = require('../lib/debugFlags');
const WhatsAppService = require('../services/whatsappService');
const whatsappService = new WhatsAppService();

function ensureWhatsAppService(req) {
    const page = req.waPage;
    const browser = req.waBrowser;
    if (!page || !browser) {
        return false;
    }
    whatsappService.page = page;
    whatsappService.browser = browser;
    whatsappService.isSessionValid = true;
    return true;
}

/**
 * GET /api/whatsapp/status
 * Obtiene el estado de la sesión de WhatsApp
 */
async function getStatusHandler(req, res) {
    try {
        logRequest('GET', '/api/whatsapp/status');

        if (!ensureWhatsAppService(req)) {
            return res.status(503).json({
                success: false,
                message: 'WhatsApp no está inicializado',
                status: 'not_ready',
                authenticated: false
            });
        }

        // Verificar si está autenticado
        const isAuthenticated = await whatsappService.page.evaluate(() => {
            return !!(document.querySelector('#pane-side') || document.querySelector('[role="main"]'));
        });

        if (!isAuthenticated) {
            return res.status(200).json({
                success: true,
                status: 'requires_authentication',
                authenticated: false,
                message: 'Sesión de WhatsApp expirada. Abre VNC (localhost:5901) y escanea el QR en la pantalla.',
                action: 'Abre vncviewer localhost:5901 y escanea el código QR con tu teléfono'
            });
        }

        const status = await whatsappService.getStatus();

        return res.status(200).json({
            success: true,
            status: status,
            authenticated: true,
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
async function getChatsHandler(req, res) {
    try {
        logRequest('GET', '/api/whatsapp/chats');

        if (!ensureWhatsAppService(req)) {
            return res.status(503).json({
                success: false,
                message: 'WhatsApp no está inicializado',
                authenticated: false
            });
        }

        // Verificar si está autenticado
        const isAuthenticated = await whatsappService.page.evaluate(() => {
            return !!(document.querySelector('#pane-side') || document.querySelector('[role="main"]'));
        });

        if (!isAuthenticated) {
            return res.status(401).json({
                success: false,
                authenticated: false,
                chats: [],
                message: 'No autenticado. Abre vncviewer localhost:5901 y escanea el QR'
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
async function getMessagesHandler(req, res) {
    try {
        logRequest('GET', '/api/whatsapp/messages');

        const { chatId } = req.params;
        if (!chatId) {
            return res.status(400).json({
                success: false,
                error: 'chatId es requerido'
            });
        }

        if (!ensureWhatsAppService(req)) {
            return res.status(503).json({
                success: false,
                message: 'WhatsApp no está inicializado'
            });
        }

        const limit = parseInt(req.query.limit) || 50;
        console.log(`[WhatsAppController] 📨 getMessages: chatId="${chatId}"`);

        const t0 = Date.now();
        const messages = await whatsappService.getMessages(chatId, limit);
        const elapsed = Date.now() - t0;

        console.log(`[WhatsAppController] ✅ getMessages completado en ${elapsed}ms — ${messages ? messages.length : 0} mensajes`);

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
async function sendMessageHandler(req, res) {
    try {
        logRequest('POST', '/api/whatsapp/send');

        const { chatId, message } = req.body;

        if (!chatId || !message) {
            return res.status(400).json({
                success: false,
                error: 'chatId y message son requeridos'
            });
        }

        if (!ensureWhatsAppService(req)) {
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
async function getContactsHandler(req, res) {
    try {
        logRequest('GET', '/api/whatsapp/contacts');

        if (!ensureWhatsAppService(req)) {
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
