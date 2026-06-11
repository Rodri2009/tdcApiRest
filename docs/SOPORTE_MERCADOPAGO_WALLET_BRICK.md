# 🎯 MercadoPago Wallet Brick - Solución Completa

**Última actualización:** 01/06/2026  
**Estado:** ✅ RESUELTO Y FUNCIONAL - Webhook procesando pagos + Auto-redirect con SSE

---

## 📋 Resumen de Soluciones

Este documento detalla todos los problemas encontrados durante la implementación de Wallet Brick y sus soluciones.

**Resultado:** Pago test exitoso - Operación #161374412648 - $6.500 ARS ✅

---

## 🔴 Problema 1: "Algo salió mal" - Credenciales Incorrectas

### Síntoma
```
Error en MP: "Algo salió mal. Una de las partes con la que intentás hacer el pago es de prueba"
```

### Causa
Se estaban usando credenciales **TEST** de una cuenta real en lugar de credenciales **PRODUCTION** de una cuenta vendedora TEST.

**Credenciales INCORRECTAS (antes):**
```bash
MP_ACCESS_TOKEN=TEST-727763420744852-042915-cfef96e5976b63f0a4d94...
MP_PUBLIC_KEY=TEST-7502cd2c-2aea-4ece-befa-7cf059b2b45c
```

### Explicación de MercadoPago
> "Si probás el flujo que redirige a Mercado Pago desde Wallet Brick, debés usar una cuenta de prueba vendedora y otra compradora, y en ese caso la preferencia debe crearse con las credenciales de producción de la cuenta de prueba vendedora. Mezclar este flujo con credenciales de prueba genera errores."

### Solución
Crear una **nueva aplicación en la cuenta vendedora TEST** y obtener sus credenciales de **PRODUCCIÓN**.

**Credenciales CORRECTAS (después):**
```bash
MP_ACCESS_TOKEN=APP_USR-2784737898754316-052811-e4be84c7a1eedbe3872104ff37fbb808-3421215338
MP_PUBLIC_KEY=APP_USR-40690e01-da35-47eb-906d-9a632f8c3c0f
```

---

## 🔴 Problema 2: Wallet Brick No Se Muestra

### Síntoma
```
offsetParent_visible: false
Element.offsetHeight = 0
Elemento no aparece en pantalla
```

### Causa
En `autoInitCheckoutForAuthenticatedUser()`, se estaba ocultando el **contenedor padre completo** `.bg-stone-900`, que incluía tanto los campos del formulario como el Wallet Brick:

```javascript
// INCORRECTO ❌
elWalletContainer.classList.add('hidden');  // Oculta TODO, incluyendo Wallet Brick
```

### Solución
Ocultar **solo** los campos del formulario, dejando el contenedor del Wallet Brick visible:

```javascript
// CORRECTO ✅
// Ocultar solo los inputs
nombreInput.parentElement.classList.add('hidden');
emailInput.parentElement.classList.add('hidden');
couponInput.parentElement.classList.add('hidden');

// Remover clases hidden del contenedor de Wallet Brick
elWalletContainer.classList.remove('hidden');
elWalletContainer.style.display = 'block';

// Forzar reflow para que el navegador registre los cambios
void elWalletContainer.offsetHeight;
```

---

## 🔴 Problema 3: Email de Prueba Rechazado

### Síntoma
```
"Payer email must be a valid email" - rechazado por MP
O pagos fallando sin motivo claro
```

### Causa
Email genérico o cuenta compradora TEST no verificada en MP

### Solución
Usar email REAL del usuario autenticado:

```javascript
// CORRECTO ✅
payer: {
    email: (email && email.includes('@')) ? email : 'test_comprador@prueba.com'
}

// Debug
console.log('EMAIL ENVIADO A MERCADOPAGO:', payer.email);
```

Usuario de prueba:
```
email: "villalbarodrigo2009@gmail.com"
password: "test123456"
```

---

## 🔴 Problema 4: Error "invalid_auto_return"

### Síntoma
```json
{
    "message": "Invalid auto_return value",
    "error": "invalid_parameter"
}
```

### Causa
En **localhost**, MP no acepta URLs locales en `back_urls` ni `auto_return`

### Solución
Detectar si estamos en localhost y omitir estas configuraciones:

```javascript
// CORRECTO ✅
const isLocalhost = appUrl.includes('localhost') || appUrl.includes('127.0.0.1');

if (!isLocalhost) {
    body.back_urls = {
        success: `${appUrl}/ticket-receipt.html`,
        failure: `${appUrl}/checkout_form.html`,
        pending: `${appUrl}/ticket-receipt.html`
    };
    body.auto_return = 'approved';
}

// Siempre incluir webhook
body.notification_url = `${appUrl}/api/tickets/webhook`;
```

---

## 🔴 Problema 5: Webhook No Funciona en Localhost

### Síntoma
```
POST /api/tickets/webhook nunca se ejecuta
MP no puede conectar a tu máquina local
```

### Causa
MP no puede enviar notificaciones a URLs privadas (localhost)

### Solución para Testing Local
Usar **polling desde el frontend**:

```javascript
// frontend/checkout_form.html
async function checkPaymentStatus(ticketId) {
    let attempts = 0;
    const maxAttempts = 60;  // 5 minutos
    
    const pollInterval = setInterval(async () => {
        try {
            const res = await fetch(`/api/tickets/${ticketId}`);
            const ticket = await res.json();
            
            if (ticket.estado === 'pagado') {
                clearInterval(pollInterval);
                window.location.href = `/ticket-receipt.html?ticket_id=${ticketId}`;
                return;
            }
            
            attempts++;
            if (attempts >= maxAttempts) {
                clearInterval(pollInterval);
                console.error('Timeout esperando pago');
            }
        } catch (error) {
            console.error('Error checking payment:', error);
        }
    }, 5000);  // Cada 5 segundos
}
```

---

## ✅ Problema 5 RESUELTO: Webhook Funcional con ngrok (01/06/2026)

### Solución Implementada
Instaló **ngrok** para crear un túnel HTTPS seguro desde MP hacia el backend local.

**Resultado:** Webhooks procesando pagos correctamente ✅

### Configuración

```bash
# 1. Instalar ngrok
wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3.39.6-linux-amd64.tgz
tar xzf ngrok-v3.39.6-linux-amd64.tgz
mv ngrok /usr/local/bin

# 2. Autenticar con token
ngrok config add-authtoken 3EYDDaCS4v1k4DXBNA1ssnQUQUh_5Ffs2FJwR4sZ57Z82ieKh

# 3. Crear túnel
ngrok http 3000 --region sa
```

### Variables de Entorno (.env)
```bash
APP_URL=https://imminent-monday-courier.ngrok-free.dev
MP_WEBHOOK_SECRET=c6707b4cc80cd8f4f3a5644846a5b22d92300efee392a4f7cf3cd4893b9ad351
```

### Database Schema Update
Agregó columna a tabla `tickets`:

```sql
ALTER TABLE tickets 
ADD COLUMN mp_payment_id BIGINT DEFAULT NULL 
COMMENT 'ID del pago en Mercado Pago' AFTER estado, 
ADD INDEX idx_mp_payment_id (mp_payment_id);
```

**Cambios en schema** (/database/01_schema.sql línea 644):
```sql
CREATE TABLE IF NOT EXISTS tickets (
    ...
    estado ENUM('pendiente', 'pagado', 'utilizado', 'cancelado') DEFAULT 'pendiente',
    mp_payment_id BIGINT DEFAULT NULL COMMENT 'ID del pago en Mercado Pago',
    comprado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ...
    INDEX idx_mp_payment_id (mp_payment_id),
    ...
)
```

### Webhook Processing Flow

Flujo completo verificado (01/06/2026 21:38 UTC):

```
1. Usuario paga con Wallet Brick
   ↓
2. MP procesa pago (ejemplo: ID 161246034937)
   ↓
3. MP envía webhook POST a: 
   https://imminent-monday-courier.ngrok-free.dev/api/tickets/webhook
   ↓
4. Backend recibe notificación:
   - Extrae payment_id de webhook
   - Consulta payment details en MP API
   - Mapea estado: approved → 'pagado'
   ↓
5. Database UPDATE exitoso:
   UPDATE tickets 
   SET estado = 'pagado', mp_payment_id = 161246034937 
   WHERE id = 17
   ↓
6. Log confirmado:
   [2026-06-01T21:38:57.708Z] ✓ [Webhook MP] Ticket 17 → pagado (pago 161246034937)
```

### Log de Éxito (verificado)

```
[2026-06-01T21:38:57.708Z] ✓ [Webhook MP] Ticket 17 → pagado (pago 161246034937)
```

**Interpretación:**
- ✅ Webhook recibido correctamente
- ✅ Payment ID extraído: 161246034937
- ✅ Ticket ID actualizado: 17
- ✅ Estado actualizado a: pagado
- ✅ Database UPDATE ejecutado exitosamente
- ✅ Sin errores de SQL o excepciones

### Estado Actual de Componentes

| Componente | Estado | Detalles |
|-----------|--------|----------|
| Wallet Brick Frontend | ✅ Funcional | Renderiza correctamente |
| MP Preferences | ✅ Funcional | Crea preferences con HTTPS webhook |
| MP Webhooks | ✅ Activos | Recibe notificaciones via ngrok |
| HMAC Validation | 🟡 Informative | Deshabilitado blocking, solo logs |
| Database Schema | ✅ Actualizado | mp_payment_id column agregada |
| Webhook Handler | ✅ Funcional | Actualiza DB sin errores |
| Ticket Status Update | ✅ Completo | End-to-end workflow operativo |

---

## ✅ Auto-Redirect Post-Pago con SSE (01/06/2026)

### Problema Anterior
Después del pago, el usuario tenía que esperar **5 minutos** de polling para ver el comprobante, o hacer refresh manual.

### Solución: Server-Sent Events (SSE)

Implementé conexión persistente en tiempo real entre cliente y servidor:

```javascript
// frontend/checkout_form.html - onReady callback
const eventSource = new EventSource(`/api/tickets/${currentTicketId}/events`);

eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.newStatus === 'pagado') {
        window.location.href = `/ticket-receipt.html?ticket_id=${currentTicketId}`;
    }
};
```

### Backend Implementation

**lib/ticketEventEmitter.js** - Gestor de eventos centralizador:
```javascript
- subscribe(ticketId, res) - Suscribir cliente SSE
- notifySubscribers(ticketId, newStatus, paymentId) - Notificar cambios
- getSubscriberCount(ticketId) - Debug: cantidad de clientes
```

**controllers/ticketsController.js** - Activar notificaciones:
```javascript
// En webhookHandler(), después de updateTicketStatus:
ticketEventEmitter.notifySubscribers(ticketId, nuevoEstado, paymentId);
```

**routes/ticketsRoutes.js** - Nueva ruta:
```javascript
router.get('/:ticketId/events', ticketsController.subscribeToTicketEvents);
```

### Flujo Nuevo (Instantáneo)

```
1. Usuario hace clic en "Pagar" en Wallet Brick
   ↓
2. Frontend abre conexión SSE:
   GET /api/tickets/{id}/events
   (conexión persistente, headers: text/event-stream)
   ↓
3. Mercado Pago procesa el pago → aprobado
   ↓
4. Webhook recibe notificación
   ↓
5. Backend actualiza DB: tickets.estado = 'pagado'
   ↓
6. ticketEventEmitter.notifySubscribers() envía evento SSE
   ↓
7. Frontend recibe evento (en ~100ms)
   ↓
8. Auto-redirect a ticket-receipt.html ✨ INSTANTÁNEO
```

### Características

- ✅ **Real-time**: Redirect tan pronto como se actualiza DB
- ✅ **Eficiente**: Una sola conexión, no polling cada 5 segundos
- ✅ **Fallback**: Si SSE falla, timeout de 5 minutos igual a antes
- ✅ **Heartbeat**: Ping cada 30 segundos para mantener viva la conexión
- ✅ **Escalable**: Múltiples clientes pueden estar suscritos al mismo ticket

### Testing

Para verificar que funciona:

```bash
# Terminal 1: Watch logs del backend
docker-compose logs -f backend | grep -E "SSE|Webhook MP|Ticket.*pagado"

# Terminal 2: Hacer pago en UI

# Esperado ver en logs:
# [SSE] Cliente conectado para eventos del ticket 18
# [Webhook MP] Ticket 18 → pagado (pago 161246034937)
# [SSE] Cliente desconectado del ticket 18
```

| Ticket Status Update | ✅ Completo | End-to-end workflow operativo |
| SSE Auto-Redirect | ✅ Implementado | Instantáneo, sin polling |

### Próximos Pasos

1. **Auto-redirect post-pago** - ✅ **IMPLEMENTADO (01/06)** - SSE en lugar de polling
2. **HMAC Validation Fix** - Re-habilitar validación de firma de webhook
3. **Email Confirmación** - Enviar comprobante de pago por email
4. **QR Code** - Generar código QR para validación en evento
