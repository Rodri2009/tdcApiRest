const whatsappClient = require('../services/whatsappClient');

/**
 * POST /api/whatsapp/send-message
 * Envía un mensaje por WhatsApp
 * Body:
 *   - phone (string, required): número con código de país (+549123456789)
 *   - message (string, required): contenido del mensaje
 */
exports.sendMessage = async (req, res) => {
  try {
    const { phone, message } = req.body;
    
    if (!phone || !message) {
      return res.status(400).json({
        error: 'phone and message are required'
      });
    }
    
    const result = await whatsappClient.sendMessage(phone, message);
    res.json(result);
  } catch (error) {
    console.error('[whatsappController] sendMessage error:', error);
    res.status(503).json({ error: error.message });
  }
};

/**
 * GET /api/whatsapp/chats
 * Obtiene la lista de chats/conversaciones
 * Query params:
 *   - fresh (boolean): fuerza scrape en vivo
 */
exports.getChats = async (req, res) => {
  try {
    const fresh = req.query.fresh === 'true';
    const data = await whatsappClient.getChats(fresh);
    res.json(data);
  } catch (error) {
    console.error('[whatsappController] getChats error:', error);
    res.status(503).json({ error: error.message });
  }
};

/**
 * GET /api/whatsapp/messages/:chatId
 * Obtiene los mensajes de un chat específico
 * URL params:
 *   - chatId (string, required): identificador del chat
 * Query params:
 *   - limit (number): cantidad de mensajes a retornar
 */
exports.getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    
    if (!chatId) {
      return res.status(400).json({
        error: 'chatId is required'
      });
    }
    
    const data = await whatsappClient.getMessages(chatId, limit);
    res.json(data);
  } catch (error) {
    console.error('[whatsappController] getMessages error:', error);
    res.status(503).json({ error: error.message });
  }
};

/**
 * POST /api/whatsapp/refresh
 * Fuerza un refresh inmediato
 * Body:
 *   - page (string): 'chats' o 'all'
 */
exports.refresh = async (req, res) => {
  try {
    const page = req.body.page || 'all';
    const result = await whatsappClient.refresh(page);
    res.json(result);
  } catch (error) {
    console.error('[whatsappController] refresh error:', error);
    res.status(503).json({ error: error.message });
  }
};
