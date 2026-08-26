# Módulos de TDC API Rest

Este directorio agrupa la documentación funcional del proyecto por módulos.

## Objetivo

Organizar el proyecto como una arquitectura modular por dominio, para facilitar:

- mantenimiento
- análisis funcional
- escalabilidad
- onboarding del equipo
- trazabilidad de cambios

## Mapa principal de módulos

1. [01-autenticacion.md](./01-autenticacion.md) — login, JWT, roles y permisos
2. [02-usuarios-clientes.md](./02-usuarios-clientes.md) — usuarios internos y clientes
3. [03-solicitudes-servicios.md](./03-solicitudes-servicios.md) — solicitudes, alquileres y servicios
4. [04-eventos-bandas-talleres.md](./04-eventos-bandas-talleres.md) — agenda, eventos, bandas y talleres
5. [05-caja-transacciones.md](./05-caja-transacciones.md) — caja, movimientos y cierre
6. [06-mercadopago-whatsapp.md](./06-mercadopago-whatsapp.md) — pagos, notificaciones y monitorización
7. [07-uploads-galeria.md](./07-uploads-galeria.md) — archivos, logos, flyers y galerías
8. [08-admin-reportes.md](./08-admin-reportes.md) — administración, dashboards y reportes

## Cómo leer esta documentación

- Empezar por [PRO_PROMPT.md](../../PRO_PROMPT.md) para entender la arquitectura general.
- Luego revisar cada módulo según el flujo funcional que corresponda.
- Mantener esta documentación alineada con la realidad del backend y frontend.

## Regla de diseño

Cada módulo debe responder estas preguntas:

- ¿Qué negocio cubre?
- ¿Qué entidades participa?
- ¿Qué endpoints expone?
- ¿Qué lógica vive en servicios?
- ¿Qué consultas SQL se ejecutan?
- ¿Qué permisos requieren estos endpoints?
- ¿Qué dependencias externas tiene?
