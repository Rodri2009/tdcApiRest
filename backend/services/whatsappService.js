const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const HtmlSaver = require('../utils/htmlSaver');

/**
 * WhatsAppService - Controla WhatsApp Web vía Puppeteer
 * Proporciona métodos para:
 * - Navegación a WhatsApp Web
 * - Scraping de chats y mensajes
 * - Envío de mensajes
 * - Guardado automático de HTML para análisis
 */
class WhatsAppService {
    constructor() {
        this.browser = null;
        this.page = null;
        this.isSessionValid = false;
        this.lastCheckTime = null;
        this.htmlSaver = new HtmlSaver('./pages-downloaded');
        this.visitedChatsFile = path.join(process.cwd(), '.chats-visited.json');
        this.loadVisitedChats();
    }

    /**
     * Cargar lista de chats visitados desde archivo
     */
    loadVisitedChats() {
        try {
            if (fs.existsSync(this.visitedChatsFile)) {
                const data = fs.readFileSync(this.visitedChatsFile, 'utf-8');
                this.visitedChats = new Set(JSON.parse(data));
            } else {
                this.visitedChats = new Set();
            }
        } catch (error) {
            console.warn('[WhatsAppService] Error cargando chats visitados:', error.message);
            this.visitedChats = new Set();
        }
    }

    /**
     * Guardar lista de chats visitados
     */
    saveVisitedChats() {
        try {
            fs.writeFileSync(
                this.visitedChatsFile,
                JSON.stringify(Array.from(this.visitedChats), null, 2),
                'utf-8'
            );
        } catch (error) {
            console.error('[WhatsAppService] Error guardando chats visitados:', error.message);
        }
    }

    /**
     * Marcar un chat como visitado
     * @param {string} chatId - ID del chat
     */
    markChatAsVisited(chatId) {
        this.visitedChats.add(chatId);
        this.saveVisitedChats();
        console.log(`[WhatsAppService] ✅ Chat marcado como visitado: ${chatId}`);
    }

    /**
     * Verificar si un chat fue visitado
     * @param {string} chatId - ID del chat
     * @returns {boolean}
     */
    isVisited(chatId) {
        return this.visitedChats.has(chatId);
    }

    /**
     * Normalizar texto para comparaciones de búsqueda robustas
     */
    _normalizeForSearch(text) {
        if (!text) return "";
        return text
            .toString()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^0-9a-zA-Z\s]/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
    }

    /**
     * Restaurar sesión de WhatsApp desde cookies en archivo
     */
    async _restoreSession() {
        const cookieFile = process.env.WA_COOKIES_FILE || "/home/pptruser/wa-session.json";
        try {
            const session = JSON.parse(fs.readFileSync(cookieFile, "utf-8"));
            if (session.cookies && session.cookies.length > 0) {
                await this.page.setCookie(...session.cookies);
                console.log(`[WhatsAppService] 🍪 Sesión restaurada desde archivo (${session.cookies.length} cookies)`);
            }
        } catch (e) {
            console.warn('[WhatsAppService] No se pudo restaurar sesión desde archivo:', e.message);
        }
    }
    async _saveSession() {
        const cookieFile = process.env.WA_COOKIES_FILE || '/home/pptruser/wa-session.json';
        try {
            const cookies = await this.page.cookies();
            fs.writeFileSync(cookieFile, JSON.stringify({ cookies, savedAt: new Date().toISOString() }, null, 2));
            console.log(`[WhatsAppService] 💾 Sesión guardada (${cookies.length} cookies)`);
        } catch (e) {
            console.warn('[WhatsAppService] No se pudo guardar sesión:', e.message);
        }
    }

    /**
     * Inicializar: abrir navegador y navegar a WhatsApp Web
     * @param {Object|null} sharedBrowser - Browser de Puppeteer compartido (ej. el de MP).
     *   Si se pasa, WA abre un contexto aislado (incógnito) dentro de ese browser
     *   en lugar de lanzar su propio Chromium. La sesión se persiste via cookies en archivo.
     *   Si es null/undefined, WA lanza su propio Chromium con userDataDir propio.
     */
    async initialize(sharedBrowser = null) {
        try {
            console.log('[WhatsAppService] Inicializando servicio...');

            if (sharedBrowser) {
                // ── MODO COMPARTIDO ──────────────────────────────────────────
                // Abrir nueva pestaña en el MISMO contexto del browser de MP.
                // Al ser dominios distintos (mercadopago.com vs web.whatsapp.com)
                // no hay conflicto de cookies. La sesión de WA persiste en el
                // userDataDir del browser compartido (mp-profile), igual que la de MP.
                console.log('[WhatsAppService] 🔀 Usando browser compartido — abriendo nueva pestaña');
                this.page = await sharedBrowser.newPage();
                await this.page.setViewport({ width: 1920, height: 1080 });
                await this.page.setUserAgent(
                    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
                );
            } else {
                // ── MODO PROPIO ──────────────────────────────────────────────
                // Limpiar lock files del perfil para evitar "profile in use"
                const userDataDir = process.env.WA_USER_DATA_DIR || '/home/pptruser/wa-profile';
                ['SingletonLock', 'SingletonCookie', 'SingletonSocket'].forEach(f => {
                    const fp = path.join(userDataDir, f);
                    try { fs.unlinkSync(fp); console.log(`[WhatsAppService] 🔓 Lock eliminado: ${fp}`); } catch (e) { /* ignorar — no existe o ya fue eliminado */ }
                });

                const chromiumArgs = [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--disable-extensions',
                    '--start-maximized',
                    '--window-size=1920,1080',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    '--force-device-scale-factor=1',
                    '--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                    '--disable-blink-features=AutomationControlled'
                ];

                this.browser = await puppeteer.launch({
                    headless: this.headlessMode !== undefined ? this.headlessMode : (process.env.HEADLESS === 'true'),
                    userDataDir: userDataDir,
                    env: { ...process.env, DISPLAY: process.env.DISPLAY || ':1' },
                    args: chromiumArgs,
                    defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1, isMobile: false, hasTouch: false, isLandscape: true }
                });

                console.log('✅ [WhatsAppService] Navegador propio iniciado');

                const pages = await this.browser.pages();
                this.page = pages.length > 0 ? pages[0] : await this.browser.newPage();
            }

            // Navegar a WhatsApp Web
            console.log('[WhatsAppService] Navegando a https://web.whatsapp.com...');
            await this.page.goto('https://web.whatsapp.com', {
                waitUntil: 'networkidle2',
                timeout: 60000
            });

            console.log('✅ [WhatsAppService] Página de WhatsApp Web cargada');

            // Detectar si ya está autenticado antes de esperar QR
            const isAlreadyAuthenticated = await this.page.evaluate(() => {
                const hasChatList = !!document.querySelector('#pane-side');
                const hasConversation = !!document.querySelector('[role="main"]');
                return hasChatList || hasConversation;
            });

            if (isAlreadyAuthenticated) {
                console.log('[WhatsAppService] ✅ Sesión previa detectada - ya autenticado');
                this.isSessionValid = true;
                await this._logPageStructure();
                return;
            }

            console.log('[WhatsAppService] ⏳ Esperando a que escanees el QR con tu teléfono...');
            console.log('[WhatsAppService] 📱 Abre VNC en localhost:5901 para ver la pantalla del navegador');

            // Esperar autenticación
            await this._waitForAuthentication();

            this.isSessionValid = true;
            console.log('✅ [WhatsAppService] Sesión autenticada correctamente');

        } catch (error) {
            console.error('[WhatsAppService] Error en inicialización:', error.message);
            throw error;
        }
    }

    /**
     * Esperar a que WhatsApp Web se autentique
     * Intenta múltiples selectores para detectar autenticación
     */
    async _waitForAuthentication() {
        try {
            // Lista de selectores que indican autenticación exitosa
            const authSelectors = [
                '[data-testid="chat-list"]',           // Selector principal
                '.two',                                  // Clase de contenedor principal
                '[role="main"]',                         // Zona principal
                'canvas',                               // Canvas de QR desaparece
                '#pane-side',                           // Panel lateral
            ];

            console.log('[WhatsAppService] Esperando autenticación (intentando múltiples selectores)...');

            let authenticated = false;
            let foundSelectors = [];

            // Esperar máximo 2 minutos
            const startTime = Date.now();
            const timeout = 120000;

            while (!authenticated && (Date.now() - startTime) < timeout) {
                // Verificar cada selector
                for (const selector of authSelectors) {
                    try {
                        const element = await this.page.$(selector);
                        if (element) {
                            foundSelectors.push(selector);
                            console.log(`   ✅ Encontrado: ${selector}`);
                        }
                    } catch (e) {
                        // Selector no encontrado, continuar
                    }
                }

                // Si encontramos múltiples selectores, probablemente estamos autenticados
                if (foundSelectors.length >= 2) {
                    authenticated = true;
                    break;
                }

                // Esperar un poco antes de reintentar
                await this.page.waitForTimeout(1000);
            }

            if (!authenticated) {
                // Guardar página para inspección
                console.log('[WhatsAppService] ⚠️  No se detectó autenticación, guardando HTML para análisis...');
                await this.htmlSaver.savePage(this.page, 'timeout-espera-auth');

                throw new Error('Timeout esperando autenticación de WhatsApp. ¿Escaneaste el QR?');
            }

            console.log(`[WhatsAppService] ✅ Autenticación detectada`);
            console.log(`   Selectores encontrados: ${foundSelectors.join(', ')}`);

            // Guardar página después de autenticación exitosa
            await this.htmlSaver.savePage(this.page, 'post-auth');

            // Pequeño delay para que WhatsApp termine de cargar chats
            await this.page.waitForTimeout(3000);

            // Guardar página con chats cargados
            await this.htmlSaver.savePage(this.page, 'chats-loaded');

            // Verificar estructura disponible
            await this._logPageStructure();

            console.log('[WhatsAppService] QR escaneado - Autenticación completada');
        } catch (error) {
            throw error;
        }
    }

    /**
     * Registrar estructura disponible en la página para debugging
     */
    async _logPageStructure() {
        try {
            const structure = await this.page.evaluate(() => {
                return {
                    hasChatsContainer: !!document.querySelector('[data-testid="chat-list"]'),
                    hasPaneSide: !!document.querySelector('#pane-side'),
                    hasChatListItems: document.querySelectorAll('[data-testid="chat-list-item"]').length,
                    hasMainRole: !!document.querySelector('[role="main"]'),
                    bodyClasses: document.body.className,
                    hasConversationSnippet: !!document.querySelector('[data-testid="conversation-snippet"]'),
                    documentTitle: document.title,
                    visibleChatElements: Array.from(
                        document.querySelectorAll('[data-testid="chat-list-item"]')
                    ).slice(0, 3).map(el => ({
                        text: el.textContent.slice(0, 50),
                        dataId: el.getAttribute('data-id')
                    }))
                };
            });

            console.log('[WhatsAppService] Estructura de página:');
            console.log(`   Chat container: ${structure.hasChatsContainer}`);
            console.log(`   Panel lateral: ${structure.hasPaneSide}`);
            console.log(`   Chat items: ${structure.hasChatListItems}`);
            console.log(`   Zona principal: ${structure.hasMainRole}`);
            console.log(`   Título: ${structure.documentTitle}`);
            if (structure.visibleChatElements.length > 0) {
                console.log(`   Primeros chats: ${structure.visibleChatElements.map(c => c.text).join(' | ')}`);
            }

        } catch (error) {
            console.log('[WhatsAppService] No se pudo obtener estructura:', error.message);
        }
    }

    /**
     * Obtener estado del servicio
     */
    async getStatus() {
        return {
            isReady: this.isSessionValid,
            lastCheckTime: this.lastCheckTime,
            browser: !!this.browser,
            page: !!this.page
        };
    }

    /**
     * Verificar si el servicio está listo
     * Soporta tanto browser propio (this.browser) como contexto compartido (this.context)
     */
    isReady() {
        return this.isSessionValid && !!this.page;
    }

    /**
     * Obtener lista de chats
     * @param {number} limit - Número máximo de chats a retornar
     */
    async getChats(limit = 20) {
        if (!this.isReady()) {
            throw new Error('Servicio de WhatsApp no está listo');
        }

        try {            // Recargar lista de visitados por si cambió externamente
            this.loadVisitedChats();
            const chats = await this.page.evaluate((chatLimit) => {
                const chatList = [];

                // Selectores para WhatsApp Business (actualizado 2026-02-19)
                // Estructura: #pane-side contiene div[role="grid"] con div[role="row"] como chats
                const paneSide = document.querySelector('#pane-side');
                if (!paneSide) {
                    console.warn('[WhatsApp] pane-side no encontrado');
                    return chatList;
                }

                const chatElements = paneSide.querySelectorAll('div[role="row"]');

                for (let i = 0; i < Math.min(chatElements.length, chatLimit); i++) {
                    const element = chatElements[i];

                    // Obtener nombre del chat desde span[dir="auto"][title]
                    const nameElement = element.querySelector('span[dir="auto"][title]');
                    const name = nameElement ? nameElement.getAttribute('title') : 'Unknown';

                    // Obtener ID/número del chat (desde atributos únicos o fallback con índice)
                    const rawId = element.getAttribute('data-id') || element.getAttribute('data-chat') || element.getAttribute('data-testid');
                    const fallbackId = `${name.replace(/\s+/g, '_')}__row_${i}`;
                    const chatId = rawId || fallbackId;

                    // Obtener último mensaje (último span con texto dentro del row)
                    const messageSpans = Array.from(element.querySelectorAll('span[dir="ltr"]'));
                    const lastMessage = messageSpans.length > 0 ? messageSpans[messageSpans.length - 1].textContent : '';

                    // Obtener timestamp (buscar span que contenga números de fecha/hora)
                    const timeSpans = Array.from(element.querySelectorAll('span'));
                    const timestamp = timeSpans.length > 2 ? timeSpans[timeSpans.length - 2].textContent : '';

                    chatList.push({
                        id: chatId,
                        name: name.trim(),
                        lastMessage: lastMessage.trim(),
                        timestamp: timestamp.trim()
                    });
                }

                return chatList;
            }, limit);

            // Agregar estado de visitado a cada chat
            const chatsWithStatus = chats.map(chat => ({
                ...chat,
                visited: this.isVisited(chat.id),
                status: this.isVisited(chat.id) ? 'visitado' : 'nuevo'
            }));

            return chatsWithStatus;
        } catch (error) {
            console.error('[WhatsAppService] Error obteniendo chats:', error.message);
            throw error;
        }
    }

    /**
     * Obtener contactos (alias de chats)
     */
    async getContacts(limit = 50) {
        return this.getChats(limit);
    }

    /**
     * Obtener mensajes de un chat específico
     * @param {string} chatId - ID del chat
     * @param {number} limit - Número máximo de mensajes
     */
    async getMessages(chatId, limit = 50) {
        if (!this.isReady()) {
            throw new Error('Servicio de WhatsApp no está listo');
        }

        const GLOBAL_TIMEOUT = 18000; // 18 segundos máximo total
        let elapsedOpen = 0;
        let elapsedWait = 0;

        try {
            const t0 = Date.now();
            
            // Ejecutar toda la lógica dentro de un Promise.race con timeout global
            const result = await Promise.race([
                (async () => {
                    // Intentar abrir el chat y sólo marcar como visitado si realmente se abrió
                    const t1 = Date.now();
                    const opened = await this._openChat(chatId);
                    elapsedOpen = Date.now() - t1;
                    console.log(`[WhatsAppService] _openChat took ${elapsedOpen}ms`);
                    
                    if (opened) {
                        this.markChatAsVisited(chatId);
                    } else {
                        console.warn(`[WhatsAppService] No se pudo confirmar apertura del chat: ${chatId} — no marcaré como visitado`);
                    }

                    // Esperar a que se carguen los mensajes usando múltiples heurísticas (más robusto que sólo span[dir="ltr"]).
                    // Ahora acepta chatId para heurística basada en header.
                    const t2 = Date.now();
                    await this.page.waitForFunction((chatId) => {
                        // Preferir texto dentro del panel principal del chat (ignorar #pane-side)
                        const main = document.querySelector('[role="main"]') || document.getElementById('main') || document.querySelector('[data-testid="conversation-panel-wrapper"]') || document.querySelector('[data-testid="conversation-panel"]');
                        if (main) {
                            // Buscar múltiples nodos con texto significativo (indicador de conversación cargada)
                            const candidates = Array.from(main.querySelectorAll('div, span, p'))
                                .map(n => (n.textContent || '').trim())
                                .filter(t => t.length > 15 && !/^\d{1,2}[:\.]\d{2}$/.test(t) && t.length < 500);

                            // Requerir al menos 3 candidatos para considerar que hay contenido
                            if (candidates.length >= 3) return true;
                        }

                        // Indicador: al menos un elemento con data-pre-plain-text (mensaje real)
                        const preElements = document.querySelectorAll('[data-pre-plain-text]');
                        if (preElements.length >= 1) return true;

                        return false;
                    }, { timeout: 8000 }, chatId).catch(() => {
                        console.log('[WhatsAppService] Timeout o chat sin muchos mensajes (timeout de 8s)');
                    });
                    elapsedWait = Date.now() - t2;
                    console.log(`[WhatsAppService] waitForFunction took ${elapsedWait}ms`);
                    
                    return { success: true };
                })(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('GLOBAL_TIMEOUT')), GLOBAL_TIMEOUT))
            ]);
            
            
            // Si llegamos aquí, fue exitoso o con timeout controlado

            // Guardar HTML para diagnóstico (etiqueta por chat)
            await this.htmlSaver.savePage(this.page, `mensaje-abierto-${chatId}`);

            // Extracción robusta: intentar varias estrategias en orden de fiabilidad (incluye header-based y escaneo amplio)
            const messages = await this.page.evaluate((chatId, msgLimit) => {
                const result = [];
                const isTimestamp = (t = '') => (/^\d{1,2}[:\.]\d{2}(\s?(AM|PM|am|pm))?$/.test(t) || /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(t));
                const isSystemText = (txt = '') => {
                    if (!txt) return true;
                    const normalized = txt.toString().trim().toLowerCase();
                    if (normalized.length < 2) return true;
                    if (/^(hoy|ayer|lunes|martes|miércoles|jueves|viernes|sábado|domingo)$/i.test(normalized)) return true;
                    if (/^tu empresa usa un servicio seguro de meta/i.test(normalized)) return true;
                    if (/^leer más$/i.test(normalized)) return true;
                    return false;
                };
                const cleanMessageText = (txt) => {
                    if (!txt) return '';
                    return txt.toString()
                        .replace(/\s+/g, ' ')
                        .replace(/\b(tail-out|tail-in|forward-refreshed|msg-dblcheck|msg-video|video-pip|media-play|ic-play-arrow-filled|msg-container|msg-meta|addon-bubble-container)\b/gi, '')
                        .replace(/\b(Reenviad[ao]|forwarded|forward)\b/gi, '')
                        .replace(/\s*\d{1,2}[:.]\d{2}\s?(a\.m\.|p\.m\.|AM|PM)?$/i, '')
                        .replace(/\s+/g, ' ')
                        .trim();
                };
                const messageTextFromNode = (node) => {
                    const textNodes = Array.from(node.querySelectorAll('span[data-testid="selectable-text"], span[dir="ltr"], span[dir="auto"]'));
                    if (textNodes.length > 0) {
                        return textNodes.map(el => (el.textContent || '').trim()).filter(Boolean).join(' ');
                    }
                    return (node.textContent || '').trim();
                };
                const addMessage = (text, isFromMe = false) => {
                    const cleaned = cleanMessageText(text);
                    if (!cleaned || isSystemText(cleaned) || isTimestamp(cleaned)) return;
                    if (!result.find(m => m.text === cleaned)) {
                        result.push({ text: cleaned, sender: '', isFromMe });
                    }
                };

                const main = document.querySelector('[role="main"]') || document.getElementById('main') || document.querySelector('[data-testid="conversation-panel-wrapper"]') || document.querySelector('[data-testid="conversation-panel"]') || document.body;
                const conversationRoot = document.querySelector('#main [data-testid="conversation-panel-body"]')
                    || document.querySelector('[data-testid="conversation-panel-body"]')
                    || document.querySelector('[data-testid="conversation-panel-messages"]')
                    || document.querySelector('div.x3psx0u.x12xbjc7.x1c1uobl.xrmvbpv.xh8yej3.xquzyny.xvc5jky.x11t971q')
                    || main;

                const groupBlocks = Array.from(conversationRoot.querySelectorAll('div[data-testid^="conv-msg-"], div[data-testid="msg-container"], div.message-out, div.message-in'));
                if (groupBlocks.length > 0) {
                    groupBlocks.forEach((block) => {
                        const isFromMe = !!(block.className || '').toString().toLowerCase().includes('message-out')
                            || !!block.querySelector('[data-testid="tail-out"]')
                            || !!block.querySelector('[data-testid="msg-dblcheck"]');
                        const textElements = Array.from(block.querySelectorAll('div.copyable-text, span[data-testid="selectable-text"], span[dir="ltr"], span[dir="auto"]'));
                        if (textElements.length > 0) {
                            textElements.forEach((el) => addMessage(messageTextFromNode(el), isFromMe));
                        } else {
                            addMessage(messageTextFromNode(block), isFromMe);
                        }
                    });
                    if (result.length > 0) return result.slice(-msgLimit);
                }

                const copyableNodes = Array.from(conversationRoot.querySelectorAll('div.copyable-text[data-pre-plain-text], div.copyable-text'));
                if (copyableNodes.length > 0) {
                    copyableNodes.forEach(node => {
                        const text = messageTextFromNode(node);
                        const isFromMe = !!node.closest('[data-testid="tail-out"], .message-out, [data-testid="msg-check"], [data-testid="msg-dblcheck"]');
                        addMessage(text, isFromMe);
                    });
                    if (result.length > 0) return result.slice(-msgLimit);
                }

                const selectableNodes = Array.from(conversationRoot.querySelectorAll('span[data-testid="selectable-text"], span[dir="ltr"], span[dir="auto"]'));
                if (selectableNodes.length > 0) {
                    selectableNodes.forEach(node => addMessage(messageTextFromNode(node), false));
                    if (result.length > 0) return result.slice(-msgLimit);
                }

                const ariaNodes = Array.from(document.querySelectorAll('[aria-label*="message"], [aria-label*="mensaje"], [aria-label*="Message"]'));
                if (ariaNodes.length > 0) {
                    ariaNodes.forEach(n => addMessage((n.textContent || '').trim(), !!(n.getAttribute('data-testid') && n.getAttribute('data-testid').includes('out'))));
                    if (result.length > 0) return result.slice(-msgLimit);
                }

                const candidates = [];
                const walker = document.createTreeWalker(main, NodeFilter.SHOW_ELEMENT, null, false);
                let node;
                while (node = walker.nextNode()) {
                    try {
                        const tag = node.tagName || '';
                        if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'HEADER', 'FOOTER', 'INPUT', 'TEXTAREA'].includes(tag)) continue;
                        const txt = (node.textContent || '').trim();
                        if (!txt || txt.length < 3) continue;
                        if (/^\d{1,2}[:\.]\d{2}$/.test(txt)) continue;
                        const style = window.getComputedStyle(node);
                        if (!style || style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) continue;
                        const container = node.closest('div[role="row"], div[class*="message"], div[class*="bubble"], [data-testid*="message"]') || node.parentElement;
                        const fullText = container ? container.textContent.trim() : txt;
                        if (!fullText || fullText.length < 3) continue;
                        const isFromMe = !!(container && (container.className || '').toString().toLowerCase().match(/out|message-out|_message_out/));
                        candidates.push({ text: fullText, sender: '', isFromMe });
                    } catch (e) { }
                }
                const seen = new Set(); const deduped = [];
                candidates.forEach(m => {
                    const key = m.text.replace(/\s+/g, ' ').slice(0, 200);
                    if (!seen.has(key)) { seen.add(key); deduped.push(m); }
                });
                if (deduped.length > 0) return deduped.slice(-msgLimit);

                try {
                    const paneSide = document.querySelector('#pane-side');
                    let paneRight = null;
                    if (paneSide) {
                        const r = paneSide.getBoundingClientRect();
                        paneRight = r.right;
                    }

                    const rightCandidates = [];
                    const allElements = Array.from((main || document.body).querySelectorAll('div, span, p'));
                    for (const el of allElements) {
                        try {
                            const rect = el.getBoundingClientRect && el.getBoundingClientRect();
                            if (!rect || rect.width === 0 || rect.height === 0) continue;
                            if (paneRight && rect.left <= paneRight - 1) continue;
                            if (el.closest('header') || el.closest('footer')) continue;
                            const text = (el.textContent || '').trim();
                            if (!text || text.length < 2) continue;
                            if (text.length > 2000) continue;
                            if (el.closest('#pane-side')) continue;
                            if (/^\d{1,2}[:\.]\d{2}(\s?(AM|PM|am|pm))?$/.test(text)) continue;
                            const container = el.closest('div[role="row"], div[class*="message"], [data-testid*="message"]') || el.parentElement;
                            const fullText = container ? container.textContent.trim() : text;
                            if (!fullText || fullText.length < 3) continue;
                            const isFromMe = !!(container && (container.className || '').toString().toLowerCase().match(/out|message-out|_message_out/));
                            rightCandidates.push({ text: fullText, sender: '', isFromMe, source: 'geometry' });
                        } catch (e) { }
                    }
                    const seenR = new Set(); const dedupR = [];
                    rightCandidates.forEach(m => {
                        const k = m.text.replace(/\s+/g, ' ').slice(0, 200);
                        if (!seenR.has(k)) { seenR.add(k); dedupR.push(m); }
                    });
                    if (dedupR.length > 0) return dedupR.slice(-msgLimit);
                } catch (e) { }

                try {
                    const paneSide = document.querySelector('#pane-side');
                    if (paneSide && chatId) {
                        const rows = Array.from(paneSide.querySelectorAll('div[role="row"]'));
                        const q = (chatId || '').toLowerCase().replace(/[_\-]/g, '').replace(/\s+/g, '');
                        for (const row of rows) {
                            const nameEl = row.querySelector('span[dir="auto"][title]');
                            const candidateName = (nameEl && nameEl.getAttribute('title')) || '';
                            const normalized = (candidateName || '').toLowerCase().replace(/[_\-]/g, '').replace(/\s+/g, '');
                            if (!candidateName) continue;
                            if (normalized.includes(q) || q.includes(normalized)) {
                                const previewSpan = row.querySelector('span[dir="ltr"], span[dir="auto"]');
                                const preview = previewSpan ? previewSpan.textContent.trim() : '';
                                if (preview) return [{ text: preview, sender: '', isFromMe: false, preview: true, source: 'preview' }];
                            }
                        }
                    }
                } catch (e) { }

                return [];
            }, chatId, limit);
            // Node-side diagnostic log: report how many messages DOM extraction returned and show first message excerpt
            if (messages && messages.length > 0) {
                const firstExcerpt = (messages[0].text || '').toString().slice(0, 200).replace(/\n/g, ' ');
                console.log(`[WhatsAppService] getMessages: DOM extraction returned ${messages.length} message(s). firstExcerpt="${firstExcerpt}"`);
            } else {
                console.log('[WhatsAppService] getMessages: DOM extraction returned 0 messages.');
            }

            const totalElapsed = Date.now() - t0;
            console.log(`[WhatsAppService] getMessages TOTAL: ${totalElapsed}ms (open=${elapsedOpen}ms, wait=${elapsedWait}ms)`);
            
            return messages || [];
        } catch (error) {
            if (error.message === 'GLOBAL_TIMEOUT') {
                console.warn(`[WhatsAppService] GLOBAL_TIMEOUT alcanzado para chat ${chatId} — intentando extracción rápida del DOM`);
                // Hacer extracción rápida pero completa de todo lo visible en el DOM
                try {
                    const quickMessages = await this.page.evaluate((chatId, msgLimit) => {
                        const result = [];
                        const isTimestamp = (t = '') => (/^\d{1,2}[:\.]\d{2}(\s?(AM|PM|am|pm))?$/.test(t) || /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(t));

                        // Buscar main panel (may not be fully loaded, but try what we can get)
                        let main = document.querySelector('[role="main"]') || document.querySelector('[data-testid="conversation-panel-wrapper"]') || document.querySelector('[data-testid="conversation-panel"]') || document.body;
                        
                        // STRATEGY A: data-pre-plain-text (best quality messages)
                        const nodesA = Array.from(main.querySelectorAll('[data-pre-plain-text]'));
                        if (nodesA.length > 0) {
                            nodesA.forEach((node) => {
                                const textEl = node.querySelector('span.selectable-text, div.copyable-text, span[dir="ltr"], span[dir="auto"]');
                                const text = textEl ? textEl.textContent.trim() : node.textContent.replace(node.getAttribute('data-pre-plain-text') || '', '').trim();
                                if (text) result.push({ text, sender: '', isFromMe: false });
                            });
                            return result.slice(-msgLimit);
                        }

                        // STRATEGY B: copyable-text (fallback)
                        const nodesB = Array.from(main.querySelectorAll('div.copyable-text, span[data-testid="selectable-text"], span[dir="ltr"], span[dir="auto"]'));
                        const candidates = [];
                        nodesB.forEach((el) => {
                            const text = (el.textContent || '').trim();
                            if (text && text.length > 2 && !isTimestamp(text) && text.length < 1000) {
                                candidates.push({ text, sender: '', isFromMe: false });
                            }
                        });
                        if (candidates.length >= 3) {
                            const unique = []; candidates.forEach(m => { if (!unique.find(u => u.text === m.text)) unique.push(m); });
                            return unique.slice(-msgLimit);
                        }

                        // STRATEGY C: Fallback a preview del sidebar
                        try {
                            const paneSide = document.querySelector('#pane-side');
                            if (paneSide && chatId) {
                                const rows = Array.from(paneSide.querySelectorAll('div[role="row"]'));
                                const q = (chatId || '').toLowerCase().replace(/[_\-]/g, '').replace(/\s+/g, '');
                                for (const row of rows) {
                                    const nameEl = row.querySelector('span[dir="auto"][title]');
                                    const candidateName = (nameEl && nameEl.getAttribute('title')) || '';
                                    const normalized = (candidateName || '').toLowerCase().replace(/[_\-]/g, '').replace(/\s+/g, '');
                                    if (!candidateName) continue;
                                    if (normalized.includes(q) || q.includes(normalized)) {
                                        const previewSpan = row.querySelector('span[dir="ltr"], span[dir="auto"]');
                                        const preview = previewSpan ? previewSpan.textContent.trim() : '';
                                        if (preview) return [{ text: preview, sender: '', isFromMe: false, preview: true }];
                                    }
                                }
                            }
                        } catch (e) {}
                        
                        return [];
                    }, chatId, limit);
                    
                    if (quickMessages && quickMessages.length > 0) {
                        console.log(`[WhatsAppService] Extracción rápida retornó ${quickMessages.length} mensaje(s) en timeout`);
                        return quickMessages;
                    }
                } catch (e) {
                    console.error('[WhatsAppService] Error en extracción rápida:', e.message);
                }
                // Si falla la extracción rápida, retornar vacío
                return [];
            }
            
            console.error('[WhatsAppService] Error obteniendo mensajes:', error.message);
            throw error;
        }
    }

    /**
     * Abrir un chat específico
     * @param {string} chatId - ID del chat
     */
    async _openChat(chatId) {
        try {
            // Extraer índice de fila del ID generado localmente o del ID de lista de chats
            const indexMatch = chatId.match(/__(?:row|idx)_(\d+)$/);
            const listItemMatch = chatId.match(/^list-item-(\d+)$/i);
            const rowIndex = listItemMatch ? parseInt(listItemMatch[1], 10) : indexMatch ? parseInt(indexMatch[1], 10) : null;
            const chatNameForSearch = rowIndex !== null
                ? ''
                : (indexMatch ? chatId.slice(0, indexMatch.index) : chatId.replace(/[_-]/g, ' '));
            const searchName = chatNameForSearch ? this._normalizeForSearch(chatNameForSearch) : '';

            console.log(`[WhatsAppService] Abriendo chat: ${chatId} (buscando: ${searchName} rowIndex=${rowIndex})`);

            // Buscar y hacer clic en el chat — máximo 2 intentos (timelimited)
            let found = false;
            const openChatStart = Date.now();
            const openChatTimeout = 3000; // 3 segundos máximo para abrir el chat

            for (let attempt = 0; attempt < 2; attempt++) {
                if (Date.now() - openChatStart > openChatTimeout) {
                    console.warn(`[WhatsAppService] Timeout para abrir chat ${chatId} (${Date.now() - openChatStart}ms)`);
                    break;
                }
                
                // Intentar localizar y hacer clic en el elemento del chat (desde la página)
                found = await this.page.evaluate((search, rowIndex) => {
                    const normalize = (value) => (value || '').toString()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .replace(/[^0-9a-zA-Z\s]/g, ' ')
                        .replace(/\s+/g, ' ')
                        .trim()
                        .toLowerCase();

                    const paneSide = document.querySelector('#pane-side');
                    if (!paneSide) return false;

                    const rows = Array.from(paneSide.querySelectorAll('div[role="row"]'));
                    let targetRow = null;

                    if (typeof rowIndex === 'number' && rowIndex >= 0) {
                        targetRow = paneSide.querySelector(`div[data-testid="list-item-${rowIndex}"]`) || rows[rowIndex] || null;
                    }

                    if (targetRow) {
                        const clickTarget = targetRow.querySelector('div[role="gridcell"][tabindex="0"], div[data-testid="cell-frame-container"], div._ak72, div._ak8o, div._ak8q, span[dir="auto"][title], span[dir="auto"]') || targetRow;
                        clickTarget.scrollIntoView({ block: 'center', inline: 'center' });
                        clickTarget.click();
                        return true;
                    }

                    const query = normalize(search);
                    for (const row of rows) {
                        const nameEl = row.querySelector('span[dir="auto"][title]');
                        const candidateName = (nameEl && nameEl.getAttribute('title')) || row.textContent || '';
                        const normalizedName = normalize(candidateName);
                        if (!normalizedName) continue;
                        if (normalizedName === query || normalizedName.includes(query) || query.includes(normalizedName)) {
                            const clickTarget = row.querySelector('div[role="gridcell"][tabindex="0"], div[data-testid="cell-frame-container"], div._ak72, div._ak8o, div._ak8q, span[dir="auto"][title], span[dir="auto"]') || row;
                            clickTarget.scrollIntoView({ block: 'center', inline: 'center' });
                            clickTarget.click();
                            return true;
                        }
                    }

                    // No encontrado => hacer scroll para cargar más elementos
                    paneSide.scrollBy(0, 300);
                    return false;
                }, searchName, rowIndex);

                if (found) {
                    console.log(`[WhatsAppService] ✅ Click realizado en la lista de chats (intento ${attempt + 1})`);

                    // Confirmación adicional: esperar que el panel principal muestre el header, el panel de mensajes o el contenedor principal esperado
                    const confirmed = await this.page.waitForFunction(({ search, rowIndex }) => {
                        const header = document.querySelector('header');
                        if (search && search.length > 0 && header) {
                            const txt = (header.textContent || '').toLowerCase();
                            if (txt.includes(search.toLowerCase())) return true;
                        }

                        if (document.querySelector('footer [data-testid="msgInput"]')) return true;
                        if (document.querySelector('[data-pre-plain-text]')) return true;
                        if (document.querySelector('[data-testid="conversation-panel-wrapper"]')) return true;
                        if (document.querySelector('[data-testid="conversation-panel-body"]')) return true;
                        if (document.querySelector('[data-testid="conversation-panel-messages"]')) return true;
                        if (document.querySelector('[data-testid="conversation-panel"]')) return true;
                        if (document.querySelector('#main > div.x1n2onr6.x1vjfegm.x1cqoux5.x14yy4lh')) return true;
                        if (document.querySelector('#main > div:nth-child(2)')) return true;

                        if (typeof rowIndex === 'number' && rowIndex >= 0) {
                            const paneSide = document.querySelector('#pane-side');
                            if (paneSide) {
                                const targetRow = paneSide.querySelector(`div[data-testid="list-item-${rowIndex}"]`);
                                if (targetRow && targetRow.querySelector('[aria-selected="true"]')) return true;
                                if (paneSide.querySelector('[aria-selected="true"]')) return true;
                            }
                        }

                        return false;
                    }, { timeout: 1000 }, { search: searchName, rowIndex }).catch(() => false);

                    if (confirmed) {
                        // Chat realmente abierto y renderizado
                        await this.page.waitForTimeout(300); // pequeño margen
                        return true;
                    }

                    // Si no se confirmó, intentamos distintos tipos de clic (DOM click + Puppeteer mouse click)
                    try {
                        // 1) Intento DOM: click en el row completo
                        const clicked = await this.page.evaluate((search, rowIndex) => {
                            const normalize = (value) => (value || '').toString()
                                .normalize('NFD')
                                .replace(/[\u0300-\u036f]/g, '')
                                .replace(/[^0-9a-zA-Z\s]/g, ' ')
                                .replace(/\s+/g, ' ')
                                .trim()
                                .toLowerCase();

                            const paneSide = document.querySelector('#pane-side');
                            if (!paneSide) return false;
                            const rows = Array.from(paneSide.querySelectorAll('div[role="row"]'));
                            let targetRow = null;
                            if (typeof rowIndex === 'number' && rowIndex >= 0) {
                                targetRow = paneSide.querySelector(`div[data-testid="list-item-${rowIndex}"]`) || rows[rowIndex] || null;
                            }
                            if (targetRow) {
                                targetRow.scrollIntoView({ block: 'center' });
                                targetRow.click();
                                return true;
                            }
                            for (const row of rows) {
                                const nameEl = row.querySelector('span[dir="auto"][title]');
                                const candidateName = (nameEl && nameEl.getAttribute('title')) || row.textContent || '';
                                const normalizedName = normalize(candidateName);
                                const query = normalize(search);
                                if (!normalizedName) continue;
                                if (normalizedName === query || normalizedName.includes(query) || query.includes(normalizedName)) {
                                    row.scrollIntoView({ block: 'center' });
                                    row.click();
                                    return true;
                                }
                            }
                            return false;
                        }, searchName, rowIndex);

                        if (clicked) {
                            const ok = await this.page.waitForFunction(({ search, rowIndex }) => {
                                const header = document.querySelector('header');
                                if (search && search.length > 0 && header) {
                                    const txt = (header.textContent || '').toLowerCase();
                                    if (txt.includes(search.toLowerCase())) return true;
                                }
                                if (document.querySelector('[data-pre-plain-text]')) return true;
                                if (document.querySelector('footer [data-testid="msgInput"]')) return true;
                                if (document.querySelector('[data-testid="conversation-panel-wrapper"]')) return true;
                                if (document.querySelector('[data-testid="conversation-panel-body"]')) return true;
                                if (document.querySelector('[data-testid="conversation-panel-messages"]')) return true;
                                if (document.querySelector('[data-testid="conversation-panel"]')) return true;
                                if (document.querySelector('#main > div.x1n2onr6.x1vjfegm.x1cqoux5.x14yy4lh')) return true;
                                if (document.querySelector('#main > div:nth-child(2)')) return true;

                                if (typeof rowIndex === 'number' && rowIndex >= 0) {
                                    const paneSide = document.querySelector('#pane-side');
                                    if (paneSide) {
                                        const targetRow = paneSide.querySelector(`div[data-testid="list-item-${rowIndex}"]`);
                                        if (targetRow && targetRow.querySelector('[aria-selected="true"]')) return true;
                                        if (paneSide.querySelector('[aria-selected="true"]')) return true;
                                    }
                                }

                                return false;
                            }, { timeout: 1000 }, { search: searchName, rowIndex }).catch(() => false);

                            if (ok) return true;
                        }

                        // 2) Intento con mouse sobre el row identificado por data-testid
                        if (typeof rowIndex === 'number' && rowIndex >= 0) {
                            const rowRect = await this.page.evaluate((targetIndex) => {
                                const row = document.querySelector(`#pane-side div[data-testid="list-item-${targetIndex}"]`);
                                if (!row) return null;
                                row.scrollIntoView({ block: 'center' });
                                const rect = row.getBoundingClientRect();
                                return rect && rect.width > 0 && rect.height > 0 ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null;
                            }, rowIndex);
                            if (rowRect) {
                                await this.page.mouse.move(rowRect.x + rowRect.width / 2, rowRect.y + rowRect.height / 2);
                                await this.page.mouse.click(rowRect.x + rowRect.width / 2, rowRect.y + rowRect.height / 2, { delay: 50 });
                                const okMouse = await this.page.waitForFunction(({ search, rowIndex }) => {
                                    const header = document.querySelector('header');
                                    if (search && search.length > 0 && header) {
                                        const txt = (header.textContent || '').toLowerCase();
                                        if (txt.includes(search.toLowerCase())) return true;
                                    }
                                    if (document.querySelector('[data-pre-plain-text]')) return true;
                                    if (document.querySelector('footer [data-testid="msgInput"]')) return true;
                                    if (document.querySelector('[data-testid="conversation-panel-wrapper"]')) return true;
                                    if (document.querySelector('[data-testid="conversation-panel-body"]')) return true;
                                    if (document.querySelector('[data-testid="conversation-panel-messages"]')) return true;
                                    if (document.querySelector('[data-testid="conversation-panel"]')) return true;
                                    if (document.querySelector('#main > div.x1n2onr6.x1vjfegm.x1cqoux5.x14yy4lh')) return true;
                                    if (document.querySelector('#main > div:nth-child(2)')) return true;

                                    if (typeof rowIndex === 'number' && rowIndex >= 0) {
                                        const paneSide = document.querySelector('#pane-side');
                                        if (paneSide) {
                                            const targetRow = paneSide.querySelector(`div[data-testid="list-item-${rowIndex}"]`);
                                            if (targetRow && targetRow.querySelector('[aria-selected="true"]')) return true;
                                            if (paneSide.querySelector('[aria-selected="true"]')) return true;
                                        }
                                    }

                                    return false;
                                }, { timeout: 1000 }, { search: searchName, rowIndex }).catch(() => false);
                                if (okMouse) return true;
                            }
                        }

                        // 3) Intento Puppeteer: localizar el span por título y clickar con mouse (simula usuario)
                        const handles = await this.page.$x('//span[@dir="auto"]');
                        if (handles && handles.length > 0) {
                            for (const el of handles) {
                                const matches = await this.page.evaluate((node, search) => {
                                    const normalize = (value) => (value || '').toString()
                                        .normalize('NFD')
                                        .replace(/[\u0300-\u036f]/g, '')
                                        .replace(/[^0-9a-zA-Z\s]/g, ' ')
                                        .replace(/\s+/g, ' ')
                                        .trim()
                                        .toLowerCase();
                                    const title = node.getAttribute('title') || node.textContent || '';
                                    const normalizedTitle = normalize(title);
                                    const normalizedSearch = normalize(search);
                                    return normalizedTitle === normalizedSearch || normalizedTitle.includes(normalizedSearch) || normalizedSearch.includes(normalizedTitle);
                                }, el, searchName);

                                if (!matches) continue;

                                const box = await this.page.evaluate((node) => {
                                    let p = node;
                                    while (p && p !== document.body) {
                                        if (p.getAttribute && p.getAttribute('role') === 'row') return p.getBoundingClientRect();
                                        p = p.parentElement;
                                    }
                                    return node.getBoundingClientRect();
                                }, el);

                                if (box && box.width && box.height) {
                                    await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
                                    await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { delay: 50 });

                                    const ok2 = await this.page.waitForFunction(({ search, rowIndex }) => {
                                        const header = document.querySelector('header');
                                        if (search && search.length > 0 && header) {
                                            const txt = (header.textContent || '').toLowerCase();
                                            if (txt.includes(search.toLowerCase())) return true;
                                        }
                                        if (document.querySelector('[data-pre-plain-text]')) return true;
                                        if (document.querySelector('footer [data-testid="msgInput"]')) return true;
                                        if (document.querySelector('[data-testid="conversation-panel-wrapper"]')) return true;
                                        if (document.querySelector('[data-testid="conversation-panel-body"]')) return true;
                                        if (document.querySelector('[data-testid="conversation-panel-messages"]')) return true;
                                        if (document.querySelector('[data-testid="conversation-panel"]')) return true;
                                        if (document.querySelector('#main > div.x1n2onr6.x1vjfegm.x1cqoux5.x14yy4lh')) return true;
                                        if (document.querySelector('#main > div:nth-child(2)')) return true;

                                        if (typeof rowIndex === 'number' && rowIndex >= 0) {
                                            const paneSide = document.querySelector('#pane-side');
                                            if (paneSide) {
                                                const targetRow = paneSide.querySelector(`div[data-testid="list-item-${rowIndex}"]`);
                                                if (targetRow && targetRow.querySelector('[aria-selected="true"]')) return true;
                                                if (paneSide.querySelector('[aria-selected="true"]')) return true;
                                            }
                                        }

                                        return false;
                                    }, { timeout: 1000 }, { search: searchName, rowIndex }).catch(() => false);

                                    if (ok2) return true;
                                }
                            }
                        }
                    } catch (e) {
                        // ignorar y seguir con reintentos
                    }
                }

                // Pequeña espera entre intentos
                await this.page.waitForTimeout(500);
            }

            console.warn(`[WhatsAppService] ⚠️ No se pudo abrir/confirmar el chat: ${chatId}`);

            // Intentar abrir usando el cuadro de búsqueda (fallback más fiable en Business UI)
            try {
                const openedViaSearch = await this.page.evaluate(async (search) => {
                    const searchBox = document.querySelector('[aria-placeholder="Buscar un chat o iniciar uno nuevo"], [data-tab="3"][role="textbox"], .lexical-rich-text-input');
                    if (!searchBox) return false;

                    // Focus y setear texto
                    const setText = (el, text) => {
                        el.focus();
                        // Si es contenteditable
                        if (el.isContentEditable) {
                            el.innerText = text;
                            const ev = new InputEvent('input', { bubbles: true });
                            el.dispatchEvent(ev);
                            return true;
                        }
                        // Si es un input normal
                        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                            el.value = text;
                            el.dispatchEvent(new Event('input', { bubbles: true }));
                            return true;
                        }
                        return false;
                    };

                    setText(searchBox, search);

                    // Esperar resultados y clickar el primer resultado coincidente
                    await new Promise(r => setTimeout(r, 350));
                    const paneSide = document.querySelector('#pane-side');
                    if (!paneSide) return false;
                    const normalize = (value) => (value || '').toString()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .replace(/[^0-9a-zA-Z\s]/g, ' ')
                        .replace(/\s+/g, ' ')
                        .trim()
                        .toLowerCase();

                    const rows = Array.from(paneSide.querySelectorAll('div[role="row"]'));
                    for (const row of rows) {
                        const nameEl = row.querySelector('span[dir="auto"][title]');
                        const candidateName = (nameEl && nameEl.getAttribute('title')) || row.textContent || '';
                        const normalizedName = normalize(candidateName);
                        const query = normalize(search);
                        if (!normalizedName) continue;
                        if (normalizedName === query || normalizedName.includes(query) || query.includes(normalizedName)) {
                            const clickTarget = row.querySelector('div[role="gridcell"][tabindex="0"], div[data-testid="cell-frame-container"], div._ak72, div._ak8o, div._ak8q, span[dir="auto"][title], span[dir="auto"]') || row;
                            clickTarget.scrollIntoView({ block: 'center' });
                            clickTarget.click();
                            return true;
                        }
                    }

                    return false;
                }, searchName);

                if (openedViaSearch) {
                    // esperar confirmación
                    const ok = await this.page.waitForFunction(({ search, rowIndex }) => {
                        const header = document.querySelector('header');
                        if (search && search.length > 0 && header) {
                            const txt = (header.textContent || '').toLowerCase();
                            if (txt.includes(search.toLowerCase())) return true;
                        }
                        if (document.querySelector('[data-pre-plain-text]')) return true;
                        if (document.querySelector('footer [data-testid="msgInput"]')) return true;
                        if (document.querySelector('[data-testid="conversation-panel-wrapper"]')) return true;
                        if (document.querySelector('[data-testid="conversation-panel-body"]')) return true;
                        if (document.querySelector('[data-testid="conversation-panel-messages"]')) return true;
                        if (document.querySelector('[data-testid="conversation-panel"]')) return true;
                        if (document.querySelector('#main > div.x1n2onr6.x1vjfegm.x1cqoux5.x14yy4lh')) return true;
                        if (document.querySelector('#main > div:nth-child(2)')) return true;

                        if (typeof rowIndex === 'number' && rowIndex >= 0) {
                            const paneSide = document.querySelector('#pane-side');
                            if (paneSide) {
                                const targetRow = paneSide.querySelector(`div[data-testid="list-item-${rowIndex}"]`);
                                if (targetRow && targetRow.querySelector('[aria-selected="true"]')) return true;
                                if (paneSide.querySelector('[aria-selected="true"]')) return true;
                            }
                        }

                        return false;
                    }, { timeout: 4000 }, { search: searchName, rowIndex }).catch(() => false);

                    if (ok) return true;
                }
            } catch (e) {
                // noop
            }

            // Guardar snapshot para diagnóstico si no se pudo abrir
            await this.htmlSaver.savePage(this.page, `open-chat-failed-${chatId}`);

            return false;
        } catch (error) {
            console.error(`[WhatsAppService] Error abriendo chat ${chatId}:`, error.message);
            throw error;
        }
    }

    /**
     * Enviar un mensaje a un chat
     * @param {string} chatId - ID del chat
     * @param {string} message - Texto del mensaje
     */
    async sendMessage(chatId, message) {
        if (!this.isReady()) {
            throw new Error('Servicio de WhatsApp no está listo');
        }

        try {
            await this._openChat(chatId);

            const typed = await this.page.evaluate((text) => {
                const selectors = [
                    'footer div[role="textbox"][testid="conversation-compose-box-input"]',
                    'footer div[role="textbox"][aria-label^="Escribir un mensaje"]',
                    '#main footer div.lexical-rich-text-input div[role="textbox"]',
                    '#main footer div.lexical-rich-text-input div.x1hx0egp',
                    '#main footer div.lexical-rich-text-input p',
                    '#main footer div.lexical-rich-text-input p span',
                    'footer [contenteditable="true"]',
                    'footer [data-testid="msgInput"]',
                    'footer input',
                    'footer textarea'
                ];
                let input = null;
                for (const sel of selectors) {
                    input = document.querySelector(sel);
                    if (input) break;
                }
                if (!input) return false;

                input.focus();
                if (input.isContentEditable) {
                    input.innerText = text;
                    input.dispatchEvent(new InputEvent('input', { bubbles: true }));
                    return true;
                }
                if (input.tagName === 'INPUT' || input.tagName === 'TEXTAREA') {
                    input.value = text;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    return true;
                }
                input.textContent = text;
                input.dispatchEvent(new InputEvent('input', { bubbles: true }));
                return true;
            }, message);

            if (!typed) {
                throw new Error('No se pudo escribir el mensaje en el input de WhatsApp');
            }

            await this.page.waitForTimeout(250);

            const clickedSend = await this.page.evaluate(() => {
                const sendSelectors = [
                    'footer button[aria-label*="Enviar"]',
                    'footer button[title*="Enviar"]',
                    'footer [data-icon*="send"]',
                    'footer button[data-testid="send"]',
                    'footer [role="button"][aria-label*="Enviar"]'
                ];
                for (const sel of sendSelectors) {
                    const button = document.querySelector(sel);
                    if (button) {
                        button.click();
                        return true;
                    }
                }
                return false;
            });

            if (!clickedSend) {
                await this.page.keyboard.press('Enter');
            }

            await this.page.waitForTimeout(1000);

            return {
                success: true,
                chatId,
                message,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('[WhatsAppService] Error enviando mensaje:', error.message);
            throw error;
        }
    }

    /**
     * Cerrar el navegador y limpiar
     */
    async close() {
        try {
            if (this.page) {
                await this.page.close();
            }
            if (this.browser) {
                await this.browser.close();
            }
            console.log('[WhatsAppService] Navegador cerrado correctamente');
        } catch (error) {
            console.error('[WhatsAppService] Error al cerrar:', error.message);
        }
    }
}

module.exports = WhatsAppService;
