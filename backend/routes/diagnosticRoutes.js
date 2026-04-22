const express = require('express');
const router = express.Router();

/**
 * GET /api/diagnostic/whatsapp-page
 * Retorna el HTML actual de la página de WA para análisis
 */
router.get('/whatsapp-page', async (req, res) => {
    try {
        const waPage = req.waPage;
        if (!waPage) {
            return res.status(503).json({ error: 'WhatsApp service not available' });
        }

        const html = await waPage.content();
        const url = waPage.url();
        
        // Detectar estado de autenticación
        const authStatus = await waPage.evaluate(() => {
            return {
                url: window.location.href,
                title: document.title,
                hasQR: !!document.querySelector('canvas'),
                hasChatList: !!document.querySelector('#pane-side'),
                hasConversation: !!document.querySelector('[role="main"]'),
                bodyClasses: document.body.className,
                htmlSnippets: {
                    qrArea: document.querySelector('canvas')?.parentElement?.outerHTML?.substring(0, 200),
                    chatList: document.querySelector('#pane-side')?.outerHTML?.substring(0, 200),
                    mainContent: document.querySelector('[role="main"]')?.outerHTML?.substring(0, 200)
                }
            };
        });

        res.json({
            url,
            authStatus,
            htmlLength: html.length,
            html: html.substring(0, 5000) // primeros 5000 caracteres
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/diagnostic/whatsapp-status-simple
 * Retorna solo el estado de autenticación sin HTML completo
 */
router.get('/whatsapp-status-simple', async (req, res) => {
    try {
        const waPage = req.waPage;
        if (!waPage) {
            return res.status(503).json({ 
                available: false,
                message: 'WhatsApp service not initialized'
            });
        }

        const status = await waPage.evaluate(() => {
            const hasQR = !!document.querySelector('canvas');
            const hasChatList = !!document.querySelector('#pane-side');
            const hasConversation = !!document.querySelector('[role="main"]');
            
            // Lógica de estado
            if (hasQR) return { state: 'needs_authentication', hasQR: true, authenticated: false };
            if (hasChatList || hasConversation) return { state: 'authenticated', hasQR: false, authenticated: true };
            return { state: 'unknown', hasQR, hasChatList, hasConversation, authenticated: false };
        });

        res.json({
            available: true,
            url: waPage.url(),
            ...status
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
