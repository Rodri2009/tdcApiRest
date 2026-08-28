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
- acumulación de snapshots HTML de diagnóstico si no se purgan

## Snapshots HTML de diagnóstico

El módulo de WhatsApp y scraping de navegador puede guardar capturas del HTML visible de la página para facilitar la depuración de sesiones, pantallas bloqueadas, chats no abiertos o cambios en la estructura de DOM.

Esto se implementa a través de `backend/utils/htmlSaver.js` y se usa desde `backend/services/whatsappService.js`.

### Comportamiento

- se crea la carpeta `backend/pages-downloaded` si hace falta
- cada vez que se detecta un estado crítico se guarda una instantánea con timestamp
- los archivos con más de 24 horas se eliminan automáticamente para evitar residuos

### Ejemplo de uso

- autenticación de WhatsApp no detectada
- carga de chats fallida
- apertura de un chat sin mensajes
- análisis de una pantalla bloqueada o con estructura distinta

### Importancia

Estas capturas no forman parte del negocio ni del flujo productivo. Sirven como evidencia técnica para resolver problemas de integración y nunca deberían considerarse datos operativos críticos.

## Próximos pasos

- centralizar el estado de las integrations externas.
- estandarizar la reconciliación de pagos.
- encapsular logs y monitorización del módulo.
- mantener el entorno de snapshots con purga automática para evitar acumulación.
