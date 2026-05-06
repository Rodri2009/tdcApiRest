# Parámetros que Devuelve MercadoPago

## URLs de Retorno (back_urls)

Después de que el usuario completa el pago en Checkout Pro, **MercadoPago redirige** a las URLs configuradas en `back_urls` con parámetros en la query string.

### Parámetros Devueltos por MP

```
GET /frontend/comprobante.html?collection_id=123456&collection_status=approved&payment_id=123456&status=approved&external_reference=456&payment_type=credit_card&merchant_order_id=29900492508&preference_id=724484980-xxxxx&site_id=MLA&processing_mode=aggregator
```

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `collection_id` | number | ID único del pago en MercadoPago |
| `collection_status` | string | Estado: `approved`, `rejected`, `pending`, `cancelled`, etc. |
| `payment_id` | number | ID de la transacción (mismo que collection_id) |
| `status` | string | Estado duplicado: `approved`, `rejected`, `pending` |
| `external_reference` | string | Nuestra referencia interna (**ticket_id**) |
| `payment_type` | string | Tipo: `credit_card`, `debit_card`, `prepaid_card`, `atm`, `ticket`, etc. |
| `merchant_order_id` | number | ID de la orden generada en MP |
| `preference_id` | string | ID de la preferencia de pago |
| `site_id` | string | País: `MLA` (Argentina), `MLB` (Brasil), etc. |
| `processing_mode` | string | Modo: `aggregator` (MP) o `gateway` |

### Estados Posibles

- **`approved`**: Pago completado y aprobado ✅
  - El webhook se recibe y actualiza el ticket a "pagado"
  - Si `auto_return=approved`, redirige automáticamente ~40 segundos
  
- **`pending`**: Pago en estado pendiente ⏳
  - Típicamente para pagos offline (efectivo, transferencia)
  - Usuario debe completar el pago en un establecimiento
  - El webhook notificará cuando se confirme
  
- **`rejected`**: Pago rechazado ❌
  - Fondos insuficientes, tarjeta rechazada, etc.
  - Usuario puede reintentar

- **`cancelled`**: Pago cancelado por el usuario

## Flujo Completo de Pago

```
1. Usuario completa checkout_form.html
   ↓
2. POST /api/tickets/checkout/init
   → Crea preferencia en MP (sin back_urls en localhost)
   → Devuelve sandbox_init_point
   ↓
3. Usuario redirigido a Checkout Pro de MP
   ↓
4. Usuario completa pago
   ↓
5. MP redirige a back_urls con parámetros
   ↓
6. Simultáneamente: webhook POST /api/tickets/webhook
   → Actualiza BD: ticket.estado = "pagado"
   ↓
7. Frontend muestra comprobante basándose en parámetros de URL
```

## Procesamiento en Frontend

```javascript
const params = new URLSearchParams(window.location.search);
const status = params.get('status');           // "approved", "pending", "rejected"
const ticketId = params.get('external_reference');
const paymentId = params.get('payment_id');
const merchantOrderId = params.get('merchant_order_id');

if (status === 'approved') {
    // Pago exitoso - mostrar comprobante
} else if (status === 'pending') {
    // Pago pendiente - mostrar instrucciones de pago offline
} else {
    // Pago rechazado - permitir reintentar
}
```

## Procesamiento en Backend (Webhook)

El webhook en `POST /api/tickets/webhook` ya maneja esto:

```javascript
const payment = await mercadopagoPaymentService.getPayment(paymentId);
const ticketId = parseInt(payment.external_reference, 10);
const mpStatus = payment.status;  // approved, pending, rejected

if (mpStatus === 'approved') {
    nuevoEstado = 'pagado';
} else if (mpStatus === 'pending' || mpStatus === 'in_process') {
    nuevoEstado = 'pendiente';
} else {
    nuevoEstado = 'cancelado';
}

await ticketsModel.updateTicketStatus(ticketId, nuevoEstado, String(paymentId));
```

## Atributos Adicionales Configurados

### `auto_return: "approved"`

Cuando está configurado, **MercadoPago redirige automáticamente** al usuario a la URL `back_urls.success` ~40 segundos después de un pago aprobado, sin necesidad de que el usuario haga clic en "Volver".

- Se muestra un botón "Volver al sitio" durante la espera
- El usuario puede hacer clic antes de los 40 segundos
- No se puede personalizar el tiempo

### `notification_url`

MercadoPago envía **POST requests** a este endpoint con cambios de estado de pago:

```javascript
POST /api/tickets/webhook

{
  "type": "payment",
  "data": {
    "id": 123456
  }
}
```

## Referencias

- [Documentación oficial MP - back_urls](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/integration-configuration/customization/auto-return)
- [Parámetros devueltos](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/integration-configuration/customization/auto-return)
- [Webhooks](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/notifications)
