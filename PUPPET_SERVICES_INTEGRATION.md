# Integración de Servicios Puppeteer - Mercado Pago y WhatsApp

## 📋 Overview

Este documento describe la integración de **serverMP** (Mercado Pago) y **serverWhatsApp** (WhatsApp Web) con tdcApiRest.

En **Fase 1** (actual), los servicios son independientes y se ejecutan en servidores separados.
En **Fase 2** (futuro), se integrarán en un único docker-compose.yml.

---

## 🏗️ Arquitectura - Fase 1 (AHORA)

```
┌─────────────────────────────────────┐
│         tdcApiRest Backend          │
│         (puerto 3000)               │
├─────────────────────────────────────┤
│                                     │
│  ├─ GET  /api/mercadopago/balance  │
│  ├─ GET  /api/mercadopago/activity │
│  ├─ POST /api/mercadopago/refresh  │
│  │                                  │
│  ├─ POST /api/whatsapp/send-message│
│  ├─ GET  /api/whatsapp/chats       │
│  ├─ GET  /api/whatsapp/messages    │
│  └─ POST /api/whatsapp/refresh     │
└──────┬──────────────────────────┬───┘
       │                          │
       │ http://localhost:9001    │ http://localhost:9002
       │                          │
   ┌───▼──────────────────┐  ┌────▼──────────────────┐
   │     serverMP         │  │  serverWhatsApp      │
   │ (Mercado Pago)       │  │ (WhatsApp Web)       │
   │ - Puppeteer          │  │ - Puppeteer          │
   │ - Xvfb               │  │ - Xvfb               │
   │ - x11vnc (5901)      │  │ - x11vnc (5902)      │
   └──────────────────────┘  └──────────────────────┘
```

---

## 🔌 Endpoints Disponibles

### Mercado Pago (`/api/mercadopago`)

#### GET `/api/mercadopago/balance`
Obtiene el saldo disponible en la cuenta Mercado Pago.

**Query Parameters:**
- `fresh` (boolean, default: false) - Si es true, fuerza scrape en vivo; si false, usa caché (TTL 30–60s)

**Example:**
```bash
curl "http://localhost:3000/api/mercadopago/balance?fresh=false"
```

**Response:**
```json
{
  "available": 1234.56,
  "currency": "ARS",
  "lastUpdated": "2026-02-17T10:30:00Z"
}
```

---

#### GET `/api/mercadopago/activity`
Obtiene el historial de transacciones.

**Query Parameters:**
- `fresh` (boolean, default: false)
- `limit` (number, default: 20) - Cantidad de transacciones a retornar
- `since` (string, optional) - Fecha inicial filtrado (formato: YYYY-MM-DD)

**Example:**
```bash
curl "http://localhost:3000/api/mercadopago/activity?fresh=true&limit=50&since=2026-02-01"
```

**Response:**
```json
{
  "transactions": [
    {
      "id": "TRX001",
      "date": "2026-02-17",
      "amount": -100.0,
      "description": "Pago a Cliente X"
    },
    {
      "id": "TRX002",
      "date": "2026-02-16",
      "amount": 500.0,
      "description": "Cobro Evento"
    }
  ],
  "count": 42
}
```

---

#### POST `/api/mercadopago/refresh`
Fuerza un refresh inmediato de datos en serverMP.

**Request Body:**
```json
{
  "page": "activity" | "balance" | "all"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/mercadopago/refresh \
  -H "Content-Type: application/json" \
  -d '{"page":"all"}'
```

**Response:**
```json
{
  "success": true,
  "refreshedAt": "2026-02-17T10:35:00Z"
}
```

---

### WhatsApp (`/api/whatsapp`)

#### POST `/api/whatsapp/send-message`
Envía un mensaje por WhatsApp Web.

**Request Body:**
```json
{
  "phone": "+549123456789",
  "message": "Hola, esto es una prueba"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/whatsapp/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+549123456789",
    "message": "Hola, esto es una prueba"
  }'
```

**Response:**
```json
{
  "success": true,
  "timestamp": "2026-02-17T10:40:00Z",
  "messageId": "MSG123456"
}
```

---

#### GET `/api/whatsapp/chats`
Obtiene la lista de chats/conversaciones activas.

**Query Parameters:**
- `fresh` (boolean, default: false) - Fuerza scrape en vivo

**Example:**
```bash
curl "http://localhost:3000/api/whatsapp/chats?fresh=false"
```

**Response:**
```json
{
  "chats": [
    {
      "id": "CHAT001",
      "name": "Juan Pérez",
      "lastMessage": "Dale, hasta mañana",
      "date": "2026-02-17T10:35:00Z"
    },
    {
      "id": "CHAT002",
      "name": "Grupo Eventos",
      "lastMessage": "Confirmado para el viernes",
      "date": "2026-02-17T09:15:00Z"
    }
  ]
}
```

---

#### GET `/api/whatsapp/messages/:chatId`
Obtiene los mensajes de una conversación específica.

**URL Parameters:**
- `chatId` (string, required) - ID del chat

**Query Parameters:**
- `limit` (number, default: 20) - Cantidad de mensajes a retornar

**Example:**
```bash
curl "http://localhost:3000/api/whatsapp/messages/CHAT001?limit=50"
```

**Response:**
```json
{
  "messages": [
    {
      "id": "MSG001",
      "from": "Juan Pérez",
      "text": "Hola, ¿cómo estás?",
      "timestamp": "2026-02-17T10:30:00Z"
    },
    {
      "id": "MSG002",
      "from": "Yo",
      "text": "Bien, ¿y vos?",
      "timestamp": "2026-02-17T10:32:00Z"
    }
  ]
}
```

---

#### POST `/api/whatsapp/refresh`
Fuerza un refresh inmediato de chats y mensajes.

**Request Body:**
```json
{
  "page": "chats" | "all"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/whatsapp/refresh \
  -H "Content-Type: application/json" \
  -d '{"page":"all"}'
```

**Response:**
```json
{
  "success": true,
  "refreshedAt": "2026-02-17T10:40:00Z"
}
```

---

## 🚀 Flujo de Trabajo - Fase 1

### 1. Instalar Dependencias
```bash
cd /home/almacen/tdcApiRest/backend
npm install axios  # Asegúrate de que axios esté instalado
```

### 2. Configurar Variables de Entorno
Copia `.env.example` a `.env` y configura:
```bash
cp backend/.env.example backend/.env
```

Edita `backend/.env`:
```env
MP_API_URL=http://localhost:9001
WA_API_URL=http://localhost:9002
```

### 3. Ejecutar serverMP (Terminal 1)
```bash
cd /home/almacen/serverMP
docker-compose up -d
# Disponible en http://localhost:9001/api/*
```

### 4. Ejecutar serverWhatsApp (Terminal 2)
```bash
cd /home/almacen/serverWhatsApp
docker-compose up -d
# Disponible en http://localhost:9002/api/*
```

### 5. Ejecutar tdcApiRest (Terminal 3)
```bash
cd /home/almacen/tdcApiRest
docker-compose up -d
# Backend escuchando en http://localhost:3000
```

### 6. Probar Endpoints
```bash
# Mercado Pago
curl "http://localhost:3000/api/mercadopago/balance?fresh=true"

# WhatsApp
curl -X POST http://localhost:3000/api/whatsapp/send-message \
  -H "Content-Type: application/json" \
  -d '{"phone":"+549123456789","message":"Hola"}'
```

---

## 🔒 Manejo de Errores

### Servicio MP/WA No Disponible
Si el servidor externo (serverMP o serverWhatsapp) no está disponible, el backend retorna **503 Service Unavailable**:

```json
{
  "error": "Mercado Pago service unavailable: connect ECONNREFUSED 127.0.0.1:9001"
}
```

**Solución:**
1. Verifica que el servicio esté ejecutando: `docker ps | grep serverMP`
2. Revisa los logs: `docker logs <container_id>`
3. Asegúrate de que las variables de entorno apunten al host correcto

---

## ⏱️ Timeouts

- **GET requests (balance, activity, chats, messages):** 30 segundos
- **POST requests (send-message, refresh):** 60 segundos

Si el servidor externo tarda más, la solicitud se abortará.

---

## 💾 Caché

- **Implementado en:** serverMP y serverWhatsApp
- **TTL (Time-To-Live):** 30–60 segundos por defecto
- **Bypass caché:** Pasar `fresh=true` en query params

El backend NO implementa caché adicional; confía en el caché de los servidores externos.

---

## 📊 Logging

Todos los errores de conexión se loguean en el backend:

```
[MercadopagoClient] getBalance error: connect ECONNREFUSED 127.0.0.1:9001
[WhatsappClient] sendMessage error: Request timeout
```

Para debugging visual:
- **serverMP:** Accede via VNC a `localhost:5901`
- **serverWhatsApp:** Accede via VNC a `localhost:5902`

---

## 🔄 Transición a Fase 2 (Futuro)

Cuando tdcApiRest esté terminado y se requiera unificar servicios:

### Cambios Requeridos (Mínimos):

1. **Mover código:**
   ```
   serverMP/browser-service/ → tdcApiRest/backend/src/services/mercadopago/
   serverWhatsApp/browser-service/ → tdcApiRest/backend/src/services/whatsapp/
   ```

2. **Actualizar docker-compose.yml de tdcApiRest:**
   Agregar servicios `mp-browser` y `wa-browser` con puertos internos 9001 y 9002.

3. **Actualizar .env:**
   ```env
   MP_API_URL=http://mp-browser:9001
   WA_API_URL=http://wa-browser:9002
   ```

4. **Cambios en código backend:** NINGUNO ✅
   Los HTTP clients seguirán funcionando igual.

---

## 📌 Notas Importantes

- ✅ HTTP Clients abstractos: El backend no sabe (ni le interesa) si MP/WA están en localhost o en docker-compose
- ✅ Implementación agnóstica: Cambiar `MP_API_URL` es suficiente para cambiar ubicación
- ⚠️ Desarrollo local: Usa localhost:9001 y localhost:9002
- ⚠️ Producción: Usa nombres DNS internas de docker-compose

---

## 🧪 Testing (Mocking)

Para tests unitarios sin conexión a servidores externos:

```javascript
const mockMercadopagoClient = {
  getBalance: jest.fn().mockResolvedValue({
    available: 1000,
    currency: 'ARS',
    lastUpdated: new Date().toISOString()
  })
};
```

---

## 📚 Referencias

- **serverMP Repository:** (Por documentar)
- **serverWhatsApp Repository:** (Por documentar)
- **Puppeteer Docs:** https://pptr.dev
- **Express.js Docs:** https://expressjs.com
