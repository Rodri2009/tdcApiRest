# Soporte MercadoPago - Error Wallet Brick

## Problema

El componente Wallet Brick muestra "Algo salió mal" cuando el usuario intenta finalizar el pago. El error ocurre después de que:
1. ✅ Se crea la preferencia correctamente en el backend
2. ✅ Se obtiene un `preference_id` válido
3. ✅ El Wallet Brick se renderiza sin errores iniciales
4. ❌ El usuario intenta hacer clic en "Pagar" - FALLA CON ERROR GENÉRICO

## Configuración

- **Public Key (TEST):** `TEST-7502cd2c-2aea-4ece-befa-7cf059b2b45c`
- **SDK Version:** v2 (última)
- **Componente:** Wallet Brick
- **Ambiente:** Sandbox
- **Moneda:** ARS (Pesos Argentinos)
- **Monto Test:** $100 ARS
- **URL Test:** `http://localhost/checkout_form.html?event_id=4`

## Stack

- **Frontend:** HTML5, JavaScript vanilla, Tailwind CSS
- **Backend:** Node.js + Express
- **Database:** MariaDB 10.6
- **Infrastructure:** Docker Compose (Nginx, Backend, MariaDB)
- **SSL:** Self-signed certificates for localhost

## Flujo de Implementación

### 1. Frontend - Inicialización SDK

```javascript
// Archivo: /frontend/checkout_form.html (línea ~134)
const MP_PUBLIC_KEY = 'TEST-7502cd2c-2aea-4ece-befa-7cf059b2b45c';
const mp = new MercadoPago(MP_PUBLIC_KEY);
```

### 2. Frontend - Crear Preferencia

Cuando el usuario completa nombre y email:

```javascript
const requestBody = {
    evento_id: 4,
    email: "test@example.com",
    nombre_comprador: "Test User",
    codigo_cupon: null,
    precio_final: 100,
    tipo_venta: "ANTICIPADA"
};

const res = await fetch('/api/tickets/checkout/init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
});
```

### 3. Backend - Response (Funciona Correctamente ✅)

El endpoint `/api/tickets/checkout/init` retorna:

```json
{
    "preference_id": "3896784-07d514bc-7721-46ac-871a-5561ca556ec9",
    "ticket_id": 24,
    "status": "pending_payment"
}
```

### 4. Frontend - Renderizar Wallet Brick

```javascript
async function renderWalletBrick(preferenceId) {
    try {
        const bricksBuilder = mp.bricks();
        await bricksBuilder.create('wallet', 'wallet-brick-container', {
            initialization: {
                preferenceId: preferenceId,
            },
            callbacks: {
                onError: (error) => {
                    console.error('[Wallet Brick] Error:', error);
                    // Aquí es donde falla con: "Algo salió mal"
                },
                onReady: () => {
                    console.log('[Wallet Brick] Listo para pagar');
                }
            }
        });
    } catch (error) {
        console.error('[Wallet Brick] Error al crear:', error);
    }
}
```

### 5. HTML - Contenedor

```html
<div id="wallet-brick-container" class="hidden mt-6"></div>
<script src="https://sdk.mercadopago.com/js/v2"></script>
```

## Verificación Realizada

✅ **SDK carga correctamente**
```bash
window.MercadoPago // Disponible en browser
```

✅ **Public Key es correcta (TEST)**
```
TEST-7502cd2c-2aea-4ece-befa-7cf059b2b45c
```

✅ **Backend API funciona**
```bash
curl -X POST http://localhost:3000/api/tickets/checkout/init \
  -H "Content-Type: application/json" \
  -d '{
    "evento_id": 4,
    "email": "test@example.com",
    "nombre_comprador": "Test User",
    "precio_final": 100,
    "tipo_venta": "ANTICIPADA"
  }'

# Response: 200 OK
# {"preference_id":"3896784-07d514bc-7721-46ac-871a-5561ca556ec9","ticket_id":24,"status":"pending_payment"}
```

✅ **Preference ID es válido**
```
3896784-07d514bc-7721-46ac-871a-5561ca556ec9
```

✅ **Wallet Brick se renderiza**
- El componente aparece en la página
- `onReady()` callback se ejecuta correctamente
- No hay errores de inicialización

❌ **Falla al procesar pago**
- Usuario selecciona método de pago
- Usuario completa datos (tarjeta de prueba: 4111111111111111)
- Usuario hace clic en "Pagar"
- Aparece error genérico: "Algo salió mal"

## Datos de Prueba Usados

```
Nombre: Test User
Email: test@example.com
Evento: event_id=4
Monto: $100 ARS
Tarjeta (4111): 4111111111111111
Vencimiento: 12/25
CVV: 123
```

## Error Capturado

```
Message: "Algo salió mal"
Tipo: Error genérico del Wallet Brick
Ubicación: Al hacer clic en "Pagar"
Console log: [Wallet Brick] ❌ Error: {...}
```

## Preguntas Técnicas

1. ¿Hay validaciones específicas en la estructura de la preferencia que estén faltando?
2. ¿El formato del `preferenceId` que retorna nuestro backend es el correcto para Wallet Brick?
3. ¿Se requiere configuración adicional en la Public Key TEST para que Wallet Brick funcione?
4. ¿Hay restricciones de CORS que podrían estar bloqueando la comunicación?
5. ¿Cómo obtener mensajes de error más detallados del Wallet Brick?

## Reproducción Paso a Paso

1. Abre: `http://localhost/checkout_form.html?event_id=4`
2. Presiona F12 → Console
3. Completa: Nombre: "Test User", Email: "test@example.com"
4. Observa: Se genera `preference_id` correctamente
5. Observa: Wallet Brick se renderiza
6. Intenta pagar con tarjeta de prueba
7. VER ERROR: "Algo salió mal"

## Información Adicional

- **Docker containers:** Todos corriendo (Nginx, Backend, MariaDB)
- **SSL:** Configurado y válido
- **Backend:** Respondiendo correctamente en puerto 3000
- **Frontend:** Accesible en http://localhost/
- **Navegador:** Chrome/Firefox
- **Network:** Sin errores de conexión

## Archivos Relevantes

- Frontend: `/home/almacen/tdcApiRest/frontend/checkout_form.html`
- Backend: `/home/almacen/tdcApiRest/backend/server.js` (port 3000)
- Endpoint: `POST /api/tickets/checkout/init`

---

**Status:** 🔴 CRÍTICO - Bloqueado en producción  
**Fecha:** 5 mayo 2026  
**Acción requerida:** Soporte técnico MercadoPago
