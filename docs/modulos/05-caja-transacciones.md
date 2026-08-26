# Módulo 05: Caja y transacciones

## Objetivo

Administrar el flujo operativo de caja, movimientos, cierres y conciliación financiera.

## Alcance

- apertura de caja
- cierre de caja
- movimientos de ingreso y egreso
- métodos de pago
- totales por tipo y concepto
- conciliación con Mercado Pago

## Entidades principales

- `cajas`
- `movimientos_caja`
- `transacciones`
- `metodos_pago`

## Ruta principal

- `GET /api/cajas/activa`
- `POST /api/cajas`
- `GET /api/cajas/:id`
- `GET /api/cajas/:id/movimientos`
- `POST /api/cajas/:id/movimientos`
- `PUT /api/cajas/:id/cerrar`

## Lógica esperada

- Cada caja tiene un estado abierto/cerrado.
- Los movimientos se cargan con tipo, monto, método de pago y categoría.
- El frontend usa la caja activa para mostrar el período operativo actual.
- La operación se basa en movimientos reales, no en saldo inicial.

## Reglas de negocio

- No deben mezclarse movimientos de cajas distintas.
- Cada movimiento debe estar asociado a una caja válida.
- Los montos deben estar normalizados por tipo y método.
- El cierre de caja debe permitir auditoría exacta de ingresos y egresos.

## Componentes del módulo

### Routes
- `backend/routes/cajasRoutes.js`

### Controllers
- `backend/controllers/cajasController.js`

### Services
- `backend/services/cajaService.js` (o equivalente) para lógica de cierre y suma

### Models
- queries para movimientos y cierre de caja

## Dependencias

- eventos
- pagos externos
- usuarios
- frontend de administración

## Riesgos

- mezclar caja activa con historial general
- duplicación de movimientos por importación externa
- inconsistencias de total por método de pago

## Próximos pasos

- Definir un standard de estado de caja y tipo de movimiento.
- Consolidar importación automática de Mercado Pago y movimientos manuales.
- Añadir auditoría de cambios en movimientos.
