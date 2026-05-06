# Wallet Brick - Botón de Pago Deshabilitado

## Problema
El botón de "Pagar" en el Wallet Brick de MercadoPago aparece deshabilitado o gris, sin poder hacer clic.

## Causas Comunes

### 1. **Preference ID Inválido o Falta de Datos**
El `preference_id` debe contener al menos:
- `items`: productos/servicios a pagar
- `payer`: información del comprador (email)
- `amount`: monto a cobrar

**Verificar en el backend:**
```javascript
// En mercadopagoPaymentService.js
const body = {
    items: [{
        id: String(ticketId),
        title: `Entrada: ${nombreEvento}`,
        quantity: 1,
        unit_price: parseFloat(precioFinal), // ✅ DEBE SER NÚMERO
        currency_id: 'ARS',
    }],
    payer: {
        email: email, // ✅ DEBE TENER EMAIL
    },
    external_reference: String(ticketId),
};
```

### 2. **Errores de CORS o Red**
Si el Wallet Brick no puede cargar los datos de la preferencia, deshabilitará el botón.

**Verificar en la consola del navegador:**
```javascript
// Abre DevTools (F12) → Consola
// Busca mensajes de error como:
// - "CORS error"
// - "Failed to fetch preference"
// - "401 Unauthorized"
```

### 3. **Environment Mismatch**
Si usas una Public Key de TEST pero la preferencia fue creada en LIVE (o viceversa).

**Verificar:**
```javascript
const MP_PUBLIC_KEY = 'TEST-7502cd2c-2aea-4ece-befa-7cf059b2b45c'; // ✅ Debe empezar con TEST- o PROD-
```

### 4. **Callbacks Mal Configurados**
Si hay errores en los callbacks, pueden bloquear la inicialización del Brick.

**Verificar:**
```javascript
await bricksBuilder.create('wallet', 'wallet-brick-container', {
    initialization: {
        preferenceId: preferenceId,
    },
    callbacks: {
        onError: (error) => {
            // ✅ Este error mostrará el verdadero problema
            console.error('Error:', error);
            console.error('Error message:', error.message);
            console.error('Error type:', error.type);
        },
        onReady: () => {
            console.log('Brick listo');
        }
    }
});
```

## Pasos para Debugging

### 1. **Abre la Consola del Navegador**
Presiona `F12` → Pestaña **Console**

### 2. **Verifica que el SDK se cargó**
```javascript
// Ejecuta en la consola:
window.MercadoPago
// Debe retornar un objeto, NO undefined
```

### 3. **Verifica el Preference ID**
```javascript
// Ejecuta en la consola:
console.log(document.body.innerHTML)
// Busca "wallet-brick-container"
// Verifica que tenga un preference_id válido
```

### 4. **Revisa los logs del navegador**
```
✅ [Wallet Brick] Listo para pagar
❌ [Wallet Brick] Error: ...
```

### 5. **Revisa la pestaña Network**
1. Abre DevTools → Network
2. Completa el formulario (nombre y email)
3. Busca una solicitud POST a `/api/tickets/checkout/init`
4. Verifica que devuelve `200 OK` y contiene `preference_id`

## Documentación Oficial de MercadoPago

### Wallet Brick
- [Inicialización oficial](https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/integration)
- [Callbacks disponibles](https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/wallet-brick/callbacks)
- [Troubleshooting](https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/common-issues)

### Preferencias de Pago
- [Crear preferencias](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/create-payment-preference)
- [Parámetros de preferencia](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/reference/preferences)
- [Validaciones de datos](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/create-payment-preference#validaciones)

## Checklist de Verificación

```javascript
// ✅ Verificar cada uno de estos puntos:

// 1. SDK cargado
console.log('SDK cargado:', typeof MercadoPago !== 'undefined'); // Debe ser true

// 2. Public Key válida
console.log('Public Key:', 'TEST-7502cd2c-2aea-4ece-befa-7cf059b2b45c'.startsWith('TEST-')); // true

// 3. Preference ID presente
console.log('Preference ID:', document.querySelector('#wallet-brick-container')); // No debe ser null

// 4. Backend retorna datos correctos
fetch('/api/tickets/checkout/init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        evento_id: 4,
        email: 'test@test.com',
        nombre_comprador: 'Test',
        precio_final: 100,
        tipo_venta: 'ANTICIPADA'
    })
}).then(r => r.json()).then(d => {
    console.log('Response:', d);
    console.log('Has preference_id:', !!d.preference_id); // Debe ser true
});

// 5. Bricks Builder creado
const mp = new MercadoPago('TEST-7502cd2c-2aea-4ece-befa-7cf059b2b45c');
console.log('Bricks Builder:', typeof mp.bricks()); // Debe ser 'function'
```

## Posibles Soluciones

### A. Reintentar Creación
```javascript
// Si el Brick falla, limpia y reintenta
walletBrickInitialized = false;
isCreatingPreference = false;
// Presiona tab en el campo email para reintentar
```

### B. Validar Monto
Asegúrate que `unit_price` sea:
- Un número válido (no string)
- Mayor a 0
- Menor a 9999999

### C. Validar Email
El email debe ser:
- Formato válido (ejemplo@dominio.com)
- Presente en `payer.email`

### D. Verificar Logs del Backend
```bash
# En la terminal, verifica los logs
docker logs docker-backend-1 | grep -i "Preferencia\|Error\|wallet"
```

## Ejemplo de Preference Correcta

```json
{
  "items": [{
    "id": "16",
    "title": "Entrada: Evento Test",
    "quantity": 1,
    "unit_price": 100,
    "currency_id": "ARS"
  }],
  "payer": {
    "email": "usuario@example.com"
  },
  "external_reference": "16",
  "auto_return": "approved",
  "back_urls": {
    "success": "https://tudominio.com/comprobante.html",
    "failure": "https://tudominio.com/checkout.html",
    "pending": "https://tudominio.com/comprobante.html"
  }
}
```

## ContactoMP
- [Centro de Ayuda MP](https://www.mercadopago.com.ar/herramientas/foros)
- [Community Forum](https://community.mercadopago.com/)
