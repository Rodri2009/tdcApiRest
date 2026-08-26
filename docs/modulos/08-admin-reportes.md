# Módulo 08: Administración y reportes

## Objetivo

Centralizar la operación administrativa del sistema: dashboards, reportes, balances y actividades internas.

## Alcance

- panel administrador
- reportes exportables
- balances
- actividad del sistema
- métricas operativas

## Entidades principales

- actividad
- balance
- reportes
- sesiones admin

## Ruta principal

- `GET /api/admin/*`
- `GET /api/balance`
- `GET /api/activity`
- reportes y dashboards diversos

## Lógica esperada

- Los usuarios con permisos de administración visualizan métricas y acciones operativas.
- El backend consolida información desde varios módulos para presentarla.
- El frontend administra tablas, filtros y exportación.

## Reglas de negocio

- Los reportes deben respetar permisos del usuario.
- No deben exponerse datos sensibles sin autorizacion.
- Los resultados deben reflejar el estado real del sistema.

## Componentes del módulo

### Routes
- rutas de administración y balance

### Controllers
- `backend/controllers/adminController.js`
- `backend/controllers/balanceController.js`
- `backend/controllers/activityController.js`

### Services
- servicios de resumen, balance y actividad

## Dependencias

- usuarios
- caja
- eventos
- pagos externos
- reportes de negocio

## Riesgos

- lógica de reportes mezclada en distintos controladores
- falta de auditoría sobre reportes y consultas
- dependencias anidadas que dificultan análisis

## Próximos pasos

- definir un conjunto único de métricas y KPIs
- consolidar servicios de reportes bajo un módulo específico
- documentar exportaciones y filtros por cada dashboard
