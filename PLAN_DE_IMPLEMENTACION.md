Plan de implementación (prioridades y pasos) ✅
Fase 0 — Preparación (rápido, ~1h)
Añadir/ejecutar tests de humo (endpoints listados por UI): precios, duraciones, tipos, eventos_confirmados, instrumentos, talleres, servicios, personal.
Crear branch feat/admin-cleanups y abrir PR incremental.
Fase 1 — Corregir Config Alquiler (alta prioridad, ~3-5h)
Backend: alquilerAdminController.createPrecio/updatePrecio
Aceptar tanto id_evento como id_tipo_evento (compatibilidad), o preferir id_tipo_evento.
Requerir únicamente: cantidad_min, cantidad_max, precio_por_hora.
Si vigente_desde no se envía, usar CURDATE() por defecto.
Validar cantidad_min <= cantidad_max. Manejar errores con mensajes útiles en JSON.
Frontend: config_alquiler.html
Cambiar payload al crear/editar precios para enviar id_tipo_evento (o ambos por compatibilidad).
Ajustar validación cliente para no exigir vigente_desde ni id_evento (solo los 3 obligatorios).
Tests: unit/integration tests para POST/PUT /api/admin/alquiler/precios.
Fase 2 — Tipos de Alquiler / Validación de Código (medio, ~2-3h)
Backend: createTipo valida codigo con regex: solo [A-Z0-9_]+ (no espacios), y opcional ^[A-Z_][A-Z0-9_]*$. Rechazar con 400 y mensaje claro.
Frontend: en formulario de Nuevo Tipo, bloquear input o validar antes de submit (mostrar helper con reglas).
Tests: pruebas de validación de createTipo.
Fase 3 — Vistas Confirmadas (ALQUILERES / BANDAS / TALLERES / SERVICIOS) (alta, ~4-6h)
Objetivo: uniformizar columnas en las tablas administrativas por tipo.

Backend:
Revisar endpoints que alimentan vistas (ej. /api/admin/alquiler/precios ya OK; /api/admin/solicitudes ya ajustada pero verificar shape para cada caso).
Crear/ajustar endpoints que devuelven listas confirmadas específicas si conviene (ej. /api/admin/alquiler/confirmados, /api/admin/bandas/confirmados, /api/admin/talleres/confirmados, /api/admin/servicios/confirmados) que devuelvan exactamente:
ALQ / Bandas / Talleres / Servicios confirmados → objeto con: fecha, hora, tipo (nombre legible), clienteNombre (nombre del cliente), descripcionCorta, id (para acciones).
Frontend:
config_alquiler.html#precios (ya corregido), y Alquileres Confirmados: renderizar columnas FECHA, HORA, TIPO, CLIENTE, DESCRIPCION_CORTA, ACCIONES.
config_bandas.html#eventos: cambiar columnas a FECHA, HORA, GENERO, CLIENTE, DESCRIPCION_CORTA, ACCIONES y corregir endpoint (404) a endpoint admin correcto (/api/admin/eventos_confirmados o /api/tickets/eventos_confirmados según uso). Verificar paths en frontend y rutas en backend/routes/*.
Tests: E2E/fixture para listados confirmados.
Fase 4 — Instrumentos (config_bandas) (medio, ~2-4h)
Backend: implementar endpoint CRUD para instrumentos (/api/admin/bandas/instrumentos) o habilitar el existente si está marcado como pendiente.
Frontend: ajustar formulario para mostrar mensajes correctos y UX.
Tests: integración para create/update/delete instrumento.
Fase 5 — Talleres / Talleristas (med-alto, ~6-8h)
UI: en config_talleres.html#tipos añadir control (select o radio) con opciones Taller y Actividad.
Backend: al crear tipo:
Forzar codigo con prefijos TALLER_ o ACTIVIDAD_ según selección; validar caracteres (sin espacios, solo _).
Almacenar categoria acorde.
Listado de confirmados: endpoint que devuelva registros con FECHA,HORA,TIPO,TALLERISTA,DESCRIPCION_CORTA,ACCIONES.
Tallerista como cliente:
Endpoint de búsqueda por nombre (autocomplete) que consulte clientes y devuelva coincidencias.
En creación de tallerista: si no existe, crear cliente y devolver su id para relacionarlo.
Tests: búsqueda de talleristas y creación de taller con tallerista nuevo/existente.
Fase 6 — Servicios / Profesionales (medio, ~4-6h)
Igual patrón que Talleres: Profesional es un cliente. Implementar búsqueda/autocompletar y creación si no existe.
Confirmados de servicios: endpoint/lista con FECHA,HORA,TIPO,PROFESIONAL,DESCRIPCION_CORTA,ACCIONES.
Verificar consultas que alimentan config_servicios.html (arreglar si hay campos erróneos).
Fase 7 — Personal / Clientes (low-med, ~3-5h)
Analizar tabla personal_disponible / personal_* y proponer usar campo opcional cliente_id para vincular a clientes.
Backend: adicionar nullable cliente_id y endpoints para:
Si existe cliente_id usar datos de clientes para mostrar en UI.
Al crear personal nuevo, permitir pasar cliente_id o crear cliente antes y asociarlo.
Tests y migración si se agrega la FK (opcional, hacer ALTER TABLE con precaución).
Calidad, Tests y Despliegue (obligatorio)
Añadir tests unitarios y de integración para cada endpoint modificado.
Revisiones PR por módulos (no hacer un solo PR gigante).
Documentar cambios en README.md y en REFACTORIZACION_SOLICITUDES.md.
Desplegar a staging y verificar con checklist de UX (formularios + listados + acciones).
Estimación total y prioridades
Entrega mínima viable (Fixes config_alquiler + precios + endpoints confirmados + banda 404): ~1–2 días.
Refactor completo (talleres, servicios, personal, instrumentos): 3–5 días adicionales (dependiendo de prioridades y QA).
Riesgos y notas de rollback ⚠️
Cambios en esquemas (FKs o columnas) deben ser migraciones idempotentes y con backups.
Cambios en nombres de campo requieren sincronización FE/BE para evitar 400/500 en producción.
¿Con qué priorizás que empiece ahora?

Opción A: Corregir config_alquiler (precios/duraciones/validaciones) + Arreglar 404 en bandas inmediatamente (recomendado).
Opción B: Empezar por Talleres/Profesionales (si lo preferís).
