#!/bin/bash
# GUÍA DE LOGS DIFERENCIADOS - TDC API REST
# ==========================================

cat << 'EOF'

╔════════════════════════════════════════════════════════════════════════════╗
║         SISTEMA DE LOGS DIFERENCIADOS POR SERVICIO (v2.0)                 ║
║                      TDC | Mercado Pago | WhatsApp                        ║
╚════════════════════════════════════════════════════════════════════════════╝

📝 DESCRIPCIÓN
==============
Ahora puedes filtrar logs en tiempo real separando:
  • [TDC]  - Endpoints principales de la API (bandas, solicitudes, etc.)
  • [MP]   - Logs de Mercado Pago (balance, activity, transactions)
  • [WA]   - Logs de WhatsApp (mensajes, webhooks)

⚙️ COMANDO BASE
===============
./scripts/backend-logs.sh [FILTRO]

🎯 FILTROS DISPONIBLES
======================

1. Ver SOLO logs de TDC (debug de tu API):
   └─ ./scripts/backend-logs.sh --tdc
   
   Muestra:
   • [TDC] GET /api/bandas
   • [TDC] POST /api/solicitudes
   • [ROUTES], [entrypoint], [SessionMonitor], etc.

2. Ver SOLO logs de Mercado Pago (debug MP):
   └─ ./scripts/backend-logs.sh --mp
   
   Muestra:
   • [MP] GET /api/mercadopago/balance
   • [ActivityService] Extracted 145 transactions
   • [BalanceService] Balance updated
   • [TransactionWatch] New subscriber

3. Ver SOLO logs de WhatsApp (debug WA):
   └─ ./scripts/backend-logs.sh --wa
   
   Muestra:
   • [WA] POST /api/whatsapp/send
   • [WA] webhook_received
   • WhatsApp-related logs

4. Ver TODOS los logs (sin filtro):
   └─ ./scripts/backend-logs.sh --all
   └─ ./scripts/backend-logs.sh (sin parámetro)
   
   Muestra todo.

📊 CASOS DE USO
===============

Caso 1: Debug de TDC - No quiero ruido de MP/WA
────────────────────────────────────────────
Terminal 1: ./scripts/backend-logs.sh --tdc

Ahora solo ves:
  [2026-03-06T18:31:20Z] [TDC] → GET /api/bandas
  [2026-03-06T18:31:21Z] [TDC] ← ✓ 200 /api/bandas
  [INIT] Sincronizando bandas...

Caso 2: Debug de MP - MP se consulta constantemente
──────────────────────────────────────────────────
Terminal 1: ./scripts/backend-logs.sh --mp

Ahora solo ves:
  [2026-03-06T18:31:18Z] [MP] → GET /api/mercadopago/balance
  [ActivityService] Filtering out small fragment: -19
  [TransactionWatch] No new transactions (same signature)

Caso 3: Dos terminales - Debug simultáneo
──────────────────────────────────────────
Terminal 1: ./scripts/backend-logs.sh --tdc
Terminal 2: ./scripts/backend-logs.sh --mp

Así ves exactamente qué está haciendo cada servicio en tiempo real.

🔧 IMPLEMENTACIÓN TÉCNICA
=========================

Componentes:
  1. backend/lib/debugFlags.js
     ├─ logTDC(message)       → Logs con prefijo [TDC]
     ├─ logMP(message)        → Logs con prefijo [MP]
     ├─ logWA(message)        → Logs con prefijo [WA]
     └─ ...

  2. backend/middleware/logMiddleware.js
     └─ Detecta la ruta y agrega prefijos automáticamente
        /api/mercadopago/* → [MP]
        /api/whatsapp/*    → [WA]
        /api/*             → [TDC]

  3. scripts/backend-logs.sh
     └─ Filtros mejorados que usan grep -E para patrones complejos

⚠️  NOTA IMPORTANTE
===================
• Los filtros incluyen patrones complejos para capturar servicios que 
  aún no tienen prefijos explícitos [TDC]/[MP]/[WA].
  
• Si agregaste un log manualmente en el código, considera usar:
  - logTDC('mensaje') para logs TDC
  - logMP('mensaje')  para logs Mercado Pago  
  - logWA('mensaje')  para logs WhatsApp

👁️  EJEMPLO REAL
================
Abres dos terminales:

Terminal 1 (Debug TDC):
$ ./scripts/backend-logs.sh --tdc
[*] Filtrando logs por: TDC (endpoints principales)
[2026-03-06T18:31:20.123Z] [TDC] → GET /api/bandas
[2026-03-06T18:31:20.456Z] [TDC] ← ✓ 200 /api/bandas
[INIT] ✓ Sincronizando bandas...

Terminal 2 (Debug MP):
$ ./scripts/backend-logs.sh --mp
[*] Filtrando logs por: Mercado Pago (MP, activity, balance)
[2026-03-06T18:31:18.867Z] [MP] → GET /api/mercadopago/watch
[ActivityService] Extracted 145 transactions from DOM (fallback)
[TransactionWatch] Starting polling (3-7s random intervals)

✨ Resultado: ¡Ves exactamente lo que necesitas sin ruido!

═════════════════════════════════════════════════════════════════════════════

EOF
