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
     * Inicializar: abrir navegador y navegar a WhatsApp Web
     */
    async initialize() {
        try {
            console.log('[WhatsAppService] Inicializando servicio...');

            // Lanzar Chromium conectado al display :1 de Xvfb
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
                headless: false,
                userDataDir: '/home/pptruser/profile',
                args: chromiumArgs,
                defaultViewport: {
                    width: 1920,
                    height: 1080,
                    deviceScaleFactor: 1,
                    isMobile: false,
                    hasTouch: false,
                    isLandscape: true
                }
            });

            console.log('✅ [WhatsAppService] Navegador iniciado');

            const pages = await this.browser.pages();
            this.page = pages.length > 0 ? pages[0] : await this.browser.newPage();

            // Navegar a WhatsApp Web
            console.log('[WhatsAppService] Navegando a https://web.whatsapp.com...');
            await this.page.goto('https://web.whatsapp.com', {
                waitUntil: 'networkidle2',
                timeout: 60000
            });

            console.log('✅ [WhatsAppService] Página de WhatsApp Web cargada');
            console.log('[WhatsAppService] ⏳ Esperando a que escanees el QR con tu teléfono...');
            console.log('[WhatsAppService] 📱 Abre VNC en localhost:5902 para ver la pantalla del navegador');

            // Esperar a que se autentique
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
     */
    isReady() {
        return this.isSessionValid && !!this.page && !!this.browser;
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

                    // Obtener ID/número del chat (desde el atributo data o nombre)
                    const chatId = element.getAttribute('data-id') ||
                        element.getAttribute('data-chat') ||
                        name.replace(/\s+/g, '_'); // Fallback

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
     * Obtener mensajes de un chat específico
     * @param {string} chatId - ID del chat
     * @param {number} limit - Número máximo de mensajes
     */
    async getMessages(chatId, limit = 50) {
        if (!this.isReady()) {
            throw new Error('Servicio de WhatsApp no está listo');
        }

        try {
            // Intentar abrir el chat y sólo marcar como visitado si realmente se abrió
            const opened = await this._openChat(chatId);
            if (opened) {
                this.markChatAsVisited(chatId);
            } else {
                console.warn(`[WhatsAppService] No se pudo confirmar apertura del chat: ${chatId} — no marcaré como visitado`);
            }

            // Esperar a que se carguen los mensajes usando múltiples heurísticas (más robusto que sólo span[dir="ltr"]).
            // Ahora acepta chatId para heurística basada en header.
            await this.page.waitForFunction((chatId) => {
                // Preferir texto dentro del panel principal del chat (ignorar #pane-side)
                const main = document.querySelector('[role="main"]') || document.getElementById('main') || document.querySelector('[data-testid="conversation-panel"]');
                if (main) {
                    // Buscar nodos con texto significativo dentro del main
                    const candidates = Array.from(main.querySelectorAll('div, span, p'))
                        .map(n => (n.textContent || '').trim())
                        .filter(t => t.length > 20 && !/^\d{1,2}[:\.]\d{2}$/.test(t));

                    if (candidates.length > 0) return true;
                }

                // Indicadores alternativos globales (fallback mínimo)
                if (document.querySelector('[data-pre-plain-text]')) return true;
                if (document.querySelector('div.copyable-text, span.selectable-text, span[dir="ltr"], span[dir="auto"]')) return true;

                // Heurística por header: si el header contiene el nombre del chat y hay contenido adyacente, consideramos que los mensajes están listos
                if (chatId) {
                    const search = chatId.replace(/[_-]/g, ' ').toLowerCase();
                    const header = Array.from(document.querySelectorAll('header')).find(h => (h.textContent || '').toLowerCase().includes(search));
                    if (header) {
                        const sibling = header.nextElementSibling || Array.from(header.parentElement.children).find(e => e !== header && (e.textContent || '').trim().length > 20);
                        if (sibling && (sibling.textContent || '').trim().length > 20) return true;
                    }
                }

                return false;
            }, { timeout: 12000 }, chatId).catch(() => {
                console.warn('[WhatsAppService] Timeout esperando mensajes (heurística extendida)');
            });

            // Guardar HTML para diagnóstico (etiqueta por chat)
            await this.htmlSaver.savePage(this.page, `mensaje-abierto-${chatId}`);

            // Extracción robusta: intentar varias estrategias en orden de fiabilidad (incluye header-based y escaneo amplio)
            const messages = await this.page.evaluate((chatId, msgLimit) => {
                const result = [];
                const isTimestamp = (t = '') => (/^\d{1,2}[:\.]\d{2}(\s?(AM|PM|am|pm))?$/.test(t) || /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(t));

                let main = document.querySelector('[role="main"]') || document.getElementById('main') || document.querySelector('[data-testid="conversation-panel"]');
                const searchName = (chatId || '').replace(/[_-]/g, ' ').toLowerCase();

                if (!main && searchName) {
                    const headers = Array.from(document.querySelectorAll('header'));
                    for (const h of headers) {
                        if ((h.textContent || '').toLowerCase().includes(searchName)) {
                            let candidate = h.nextElementSibling || Array.from(h.parentElement.children).find(e => e !== h && (e.textContent || '').trim().length > 50);
                            if (!candidate) {
                                let p = h.parentElement;
                                while (p && p !== document.body) {
                                    const sib = Array.from((p.parentElement && p.parentElement.children) || []).find(e => e !== p && (e.textContent || '').trim().length > 50);
                                    if (sib) { candidate = sib; break; }
                                    p = p.parentElement;
                                }
                            }
                            if (candidate) { main = candidate; break; }
                        }
                    }
                }
                if (!main) main = document.body;

                // STRATEGY A
                const nodesA = Array.from(main.querySelectorAll('[data-pre-plain-text]'));
                if (nodesA.length > 0) {
                    nodesA.forEach((node) => {
                        const textEl = node.querySelector('span.selectable-text, div.copyable-text, span[dir="ltr"], span[dir="auto"]');
                        const text = textEl ? textEl.textContent.trim() : node.textContent.replace(node.getAttribute('data-pre-plain-text') || '', '').trim();
                        if (text) result.push({ text, sender: (node.getAttribute('data-pre-plain-text') || '').trim(), isFromMe: node.closest('[data-pre-plain-text]')?.classList?.contains('message-out') || false });
                    });
                    return result.slice(-msgLimit);
                }

                // STRATEGY B
                const nodesB = Array.from(main.querySelectorAll('div.copyable-text, span.selectable-text, span[dir="ltr"], span[dir="auto"]'));
                nodesB.forEach((el) => {
                    const text = (el.textContent || '').trim();
                    if (text && text.length > 1 && !isTimestamp(text)) result.push({ text, sender: '', isFromMe: false });
                });
                if (result.length > 0) {
                    const unique = []; result.forEach(m => { if (!unique.find(u => u.text === m.text)) unique.push(m); });
                    return unique.slice(-msgLimit);
                }

                // STRATEGY C — aria-labels
                const ariaNodes = Array.from(document.querySelectorAll('[aria-label*="message"], [aria-label*="mensaje"], [aria-label*="Message"]'));
                if (ariaNodes.length > 0) {
                    ariaNodes.forEach(n => {
                        const t = (n.textContent || '').trim();
                        if (t && t.length > 2 && !isTimestamp(t)) result.push({ text: t, sender: '', isFromMe: !!(n.getAttribute('data-testid') && n.getAttribute('data-testid').includes('out')) });
                    });
                    if (result.length) {
                        const uniq = []; result.forEach(m => { if (!uniq.find(u => u.text === m.text)) uniq.push(m); });
                        return uniq.slice(-msgLimit);
                    }
                }

                // STRATEGY D — escaneo amplio dentro del main (filtrar UI y timestamps)
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

                // STRATEGY E — geometry / right-pane scan (WhatsApp Business variant)
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
                            // if we have pane-side, only consider elements rendered to the right of it
                            if (paneRight && rect.left <= paneRight - 1) continue;
                            // skip header/footer-like elements
                            if (el.closest('header') || el.closest('footer')) continue;
                            const text = (el.textContent || '').trim();
                            if (!text || text.length < 2) continue;
                            if (text.length > 2000) continue;
                            // avoid chat-list snippets (they're usually inside #pane-side)
                            if (el.closest('#pane-side')) continue;
                            // basic timestamp filter
                            if (/^\d{1,2}[:\.]\d{2}(\s?(AM|PM|am|pm))?$/.test(text)) continue;
                            const container = el.closest('div[role="row"], div[class*="message"], [data-testid*="message"]') || el.parentElement;
                            const fullText = container ? container.textContent.trim() : text;
                            if (!fullText || fullText.length < 3) continue;
                            const isFromMe = !!(container && (container.className || '').toString().toLowerCase().match(/out|message-out|_message_out/));
                            rightCandidates.push({ text: fullText, sender: '', isFromMe, source: 'geometry' });
                        } catch (e) { /* ignore element-specific errors */ }
                    }

                    // dedupe and return
                    const seenR = new Set(); const dedupR = [];
                    rightCandidates.forEach(m => {
                        const k = m.text.replace(/\s+/g, ' ').slice(0, 200);
                        if (!seenR.has(k)) { seenR.add(k); dedupR.push(m); }
                    });
                    if (dedupR.length > 0) return dedupR.slice(-msgLimit);
                } catch (e) {
                    // continue to other fallbacks
                }

                // STRATEGY F — fallback: use chat-list preview (best-effort)
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
                } catch (e) { /* noop */ }

                return [];
            }, chatId, limit);
            // Node-side diagnostic log: report how many messages DOM extraction returned and show first message excerpt
            if (messages && messages.length > 0) {
                const firstExcerpt = (messages[0].text || '').toString().slice(0, 200).replace(/\n/g, ' ');
                console.log(`[WhatsAppService] getMessages: DOM extraction returned ${messages.length} message(s). firstExcerpt="${firstExcerpt}"`);
            } else {
                console.log('[WhatsAppService] getMessages: DOM extraction returned 0 messages.');
            }
            if (!messages || messages.length === 0) {
                console.log('[WhatsAppService] Mensajes no encontrados vía DOM — intentando fallback con window.Store');

                const storeMessages = await this.page.evaluate((chatId, msgLimit) => {
                    const out = [];
                    try {
                        const norm = (s = '') => s.toString().toLowerCase().replace(/\s+/g, '');
                        const search = norm(chatId.replace(/_/g, ' ').replace(/-/g, ''));

                        const S = window.Store || window.WAStore || window.Wap?.Store || null;
                        if (!S) return out;

                        // 1) Buscar en Chat models (si existen)
                        const chatModels = (S.Chat && (S.Chat.models || S.Chat._models || [])) || [];
                        for (const c of chatModels) {
                            const title = (c?.name || c?.formattedTitle || c?.contact || '') || '';
                            const ser = (c?.id && (c.id._serialized || c.id.__serialized || c.id)) || '';
                            if ((title && norm(title).includes(search)) || (ser && ser.toString().toLowerCase().includes(search))) {
                                const msgs = (c?.msgs && (c.msgs.models || c.msgs._models)) || [];
                                for (const m of msgs.slice(-msgLimit)) {
                                    const text = m?.body || m?._data?.body || m?.__x_body || '';
                                    const from = m?.from || m?._data?.from || '';
                                    const isFromMe = !!(m?.__x_isSent || m?.isSent || m?.fromMe || m?.__x_isMe);
                                    if (text) out.push({ text: text.toString(), sender: from, isFromMe });
                                }
                                if (out.length) return out.slice(-msgLimit);
                            }
                        }

                        // 2) Buscar en Msg.models global (filtrar por chat id)
                        const msgModels = (S.Msg && (S.Msg.models || [])) || [];
                        for (const m of msgModels) {
                            const chatSer = (m?.chat && (m.chat.id?._serialized || m.chat.id?.__serialized)) || (m?.id && (m.id._serialized || m.id?.__serialized)) || '';
                            if (chatSer && chatSer.toLowerCase().includes(search)) {
                                const text = m?.body || m?._data?.body || m?.__x_body || '';
                                const from = m?.from || '';
                                const isFromMe = !!(m?.__x_isSent || m?.isSent || m?.fromMe || m?.__x_isMe);
                                if (text) out.push({ text: text.toString(), sender: from, isFromMe });
                            }
                        }

                        if (out.length) return out.slice(-msgLimit);
                    } catch (e) {
                        return out;
                    }

                    return out;
                }, chatId, limit);

                if (storeMessages && storeMessages.length > 0) {
                    console.log('[WhatsAppService] ✅ Mensajes obtenidos desde window.Store (fallback)');
                    return storeMessages;
                }

                // Si aún no hay mensajes, guardar snapshot de diagnóstico
                await this.htmlSaver.savePage(this.page, `mensaje-abierto-empty-${chatId}`);
            }

            return messages;
        } catch (error) {
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
            // Convertir chatId a formato de búsqueda (espacios en lugar de guiones bajos)
            const searchName = chatId.replace(/_/g, ' ').replace(/-/g, ' ');

            console.log(`[WhatsAppService] Abriendo chat: ${chatId} (buscando: ${searchName})`);

            // Buscar y hacer clic en el chat — intentos con confirmación explícita
            let found = false;

            for (let attempt = 0; attempt < 6; attempt++) {
                // Intentar localizar y hacer clic en el elemento del chat (desde la página)
                found = await this.page.evaluate((search) => {
                    const paneSide = document.querySelector('#pane-side');
                    if (!paneSide) return false;

                    const rows = Array.from(paneSide.querySelectorAll('div[role="row"]'));
                    for (const row of rows) {
                        const nameEl = row.querySelector('span[dir="auto"][title]');
                        const candidateName = (nameEl && nameEl.getAttribute('title')) || '';
                        if (!candidateName) continue;
                        const s = candidateName.toLowerCase().trim();
                        const q = search.toLowerCase().trim();
                        if (s === q || s.includes(q) || q.includes(s)) {
                            // Asegurarnos de que el elemento esté visible y hacer click en el nombre exacto
                            nameEl.scrollIntoView({ block: 'center', inline: 'center' });
                            nameEl.click();
                            return true;
                        }
                    }

                    // No encontrado => hacer scroll para cargar más elementos
                    paneSide.scrollBy(0, 300);
                    return false;
                }, searchName);

                if (found) {
                    console.log(`[WhatsAppService] ✅ Click realizado en la lista de chats (intento ${attempt + 1})`);

                    // Confirmación adicional: esperar que el panel principal muestre el header con el nombre
                    const confirmed = await this.page.waitForFunction((search) => {
                        const header = document.querySelector('header');
                        if (!header) return false;
                        const txt = (header.textContent || '').toLowerCase();
                        if (txt.includes(search.toLowerCase())) return true;

                        // O bien, que exista el input de mensaje (footer) o cualquier indicador de conversación cargada
                        if (document.querySelector('footer [data-testid="msgInput"]')) return true;
                        if (document.querySelector('[data-pre-plain-text]')) return true;
                        if (document.querySelector('[data-testid="conversation-panel"]')) return true;
                        return false;
                    }, { timeout: 4000 }, searchName).catch(() => false);

                    if (confirmed) {
                        // Chat realmente abierto y renderizado
                        await this.page.waitForTimeout(300); // pequeño margen
                        return true;
                    }

                    // Si no se confirmó, intentamos distintos tipos de clic (DOM click + Puppeteer mouse click)
                    try {
                        // 1) Intento DOM: click en el row completo
                        const clicked = await this.page.evaluate((search) => {
                            const paneSide = document.querySelector('#pane-side');
                            if (!paneSide) return false;
                            const rows = Array.from(paneSide.querySelectorAll('div[role="row"]'));
                            for (const row of rows) {
                                const nameEl = row.querySelector('span[dir="auto"][title]');
                                const candidateName = (nameEl && nameEl.getAttribute('title')) || '';
                                if (!candidateName) continue;
                                const s = candidateName.toLowerCase().trim();
                                const q = search.toLowerCase().trim();
                                if (s === q || s.includes(q) || q.includes(s)) {
                                    row.scrollIntoView({ block: 'center' });
                                    row.click();
                                    return true;
                                }
                            }
                            return false;
                        }, searchName);

                        if (clicked) {
                            const ok = await this.page.waitForFunction((search) => {
                                const header = document.querySelector('header');
                                if (!header) return false;
                                const txt = (header.textContent || '').toLowerCase();
                                if (txt.includes(search.toLowerCase())) return true;
                                if (document.querySelector('[data-pre-plain-text]')) return true;
                                if (document.querySelector('footer [data-testid="msgInput"]')) return true;
                                return false;
                            }, { timeout: 3000 }, searchName).catch(() => false);

                            if (ok) return true;
                        }

                        // 2) Intento Puppeteer: localizar el span por título y clickar con mouse (simula usuario)
                        const xpath = `//span[@dir="auto" and @title=\"${searchName.replace(/"/g, '\\\"')}\"]`;
                        const handles = await this.page.$x(xpath);
                        if (handles && handles.length > 0) {
                            const el = handles[0];
                            // Buscar el ancestro más cercano con role="row" para un click más fiable
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

                                const ok2 = await this.page.waitForFunction((search) => {
                                    const header = document.querySelector('header');
                                    if (!header) return false;
                                    const txt = (header.textContent || '').toLowerCase();
                                    if (txt.includes(search.toLowerCase())) return true;
                                    if (document.querySelector('[data-pre-plain-text]')) return true;
                                    if (document.querySelector('footer [data-testid="msgInput"]')) return true;
                                    return false;
                                }, { timeout: 3000 }, searchName).catch(() => false);

                                if (ok2) return true;
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
                    const rows = Array.from(paneSide.querySelectorAll('div[role="row"]'));
                    for (const row of rows) {
                        const nameEl = row.querySelector('span[dir="auto"][title]');
                        const candidateName = (nameEl && nameEl.getAttribute('title')) || '';
                        if (!candidateName) continue;
                        const s = candidateName.toLowerCase().trim();
                        const q = search.toLowerCase().trim();
                        if (s === q || s.includes(q) || q.includes(s)) {
                            row.scrollIntoView({ block: 'center' });
                            row.click();
                            return true;
                        }
                    }

                    return false;
                }, searchName);

                if (openedViaSearch) {
                    // esperar confirmación
                    const ok = await this.page.waitForFunction((search) => {
                        const header = document.querySelector('header');
                        if (!header) return false;
                        const txt = (header.textContent || '').toLowerCase();
                        if (txt.includes(search.toLowerCase())) return true;
                        if (document.querySelector('[data-pre-plain-text]')) return true;
                        if (document.querySelector('footer [data-testid="msgInput"]')) return true;
                        return false;
                    }, { timeout: 4000 }, searchName).catch(() => false);

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
            // Abrir el chat
            await this._openChat(chatId);

            // Encontrar input de mensaje y escribir
            const inputSelector = 'footer [data-testid="msgInput"]';
            await this.page.click(inputSelector);
            await this.page.type(inputSelector, message);

            // Encontrar y hacer clic en botón de envío
            const sendButtonSelector = 'footer [data-testid="send"]';
            await this.page.click(sendButtonSelector);

            // Esperar a que se envíe
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
