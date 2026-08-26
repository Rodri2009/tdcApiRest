# Módulo 06: Mercado Pago y WhatsApp

## Objetivo

Integrar canales externos de pago y comunicación para la operación del negocio.

## Alcance

- pagos con Mercado Pago
- importación automática de movimientos
- monitorización de sesiones
- notificaciones por WhatsApp
- testing y salud de servicios

## Entidades principales

- transacciones MP
- sesiones de navegador
- notificaciones
- movimientos asociados a pagos

## Ruta principal

- `GET /api/mercadopago/health`
- `POST /api/mercadopago/auth/login`
- `POST /api/cajas/:id/importar-mp`
- `GET /api/cajas/importar-auto-stream`
- endpoints de WhatsApp y monitorización

## Lógica esperada

- Mercado Pago se integra como una capa externa de cobro.
- El sistema puede importar movimientos y reconciliar pagos con la caja activa.
- WhatsApp se usa para notificaciones operativas o seguimiento del negocio.

## Reglas de negocio

- Los pagos externos deben registrarse como movimientos de caja o transacciones relacionadas.
- Toda reconciliación debe dejar evidencia del origen del movimiento.
- Los servicios externos no deben bloquear la operación del backend.

## Componentes del módulo

### Routes
- `backend/routes/mercadopagoRoutes.js`
- `backend/routes/whatsappRoutes.js`

### Controllers
- `backend/controllers/mercadopagoController.js`
- `backend/controllers/whatsappController.js`

### Core / services
- `backend/core/browserManager.js`
- `backend/services/balanceService.js`
- `backend/services/activityService.js`
- `backend/services/whatsappService.js`

## Dependencias

- navegador/Puppeteer
- MySQL
- caja
- frontend de administración

## Riesgos

- fallos de sesiones externas
- importación duplicada de pagos
- latencia en sincronización con el backend

## Próximos pasos

- centralizar el estado de las integrations externas.
- estandarizar la reconciliación de pagos.
- encapsular logs y monitorización del módulo.
