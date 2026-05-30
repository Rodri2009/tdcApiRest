# 🎯 MercadoPago Wallet Brick - Solución Completa

**Última actualización:** 28/05/2026  
**Estado:** ✅ RESUELTO Y FUNCIONAL

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
