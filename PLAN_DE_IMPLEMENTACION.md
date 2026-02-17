# Plan de implementación — Refactor Solicitudes y Eventos Confirmados ✅

## Resumen ejecutivo
Breve plan por fases para normalizar solicitudes y unificar eventos confirmados. Prioridad: corregir `config_alquiler` y arreglar 404 en bandas, luego completar vistas confirmadas, talleres y servicios. Objetivo: PRs pequeños, testables y despliegues a staging antes de producción.

---

## Objetivos
- Unificar la captura y visualización de eventos confirmados en `eventos_confirmados`.
- Corregir validaciones críticas (precios, duraciones, códigos de tipos).
- Minimizar riesgo: migraciones idempotentes, pruebas y despliegues por PRs.

---

## Entregables principales
- Endpoints y migraciones para `eventos_confirmados`.
- Corrección de `config_alquiler` (backend+frontend).
- Vistas/Endpoints uniformes para confirmados (ALQUILERES, BANDAS, TALLERES, SERVICIOS).
- CRUD instrumentos, búsqueda de talleristas/profesionales y asociación con `clientes`.
- Checklist de QA y migraciones con backup.

---

## Fases y tareas (por prioridad)

### Fase 0 — Preparación (rápido, ~1h) ⚙️
- Realizar comprobaciones de humo manuales para endpoints críticos (precios, duraciones, tipos, eventos_confirmados, instrumentos, talleres, servicios, personal).
- Crear rama: `feat/admin-cleanups` y abrir PRs incrementales.

### Fase 1 — Corregir Config Alquiler (alta, 3–5h) 🔧
Backend
- `alquilerAdminController.createPrecio/updatePrecio`: aceptar `id_tipo_evento` y/o `id_evento` (compatibilidad).
- Requerir solo: `cantidad_min`, `cantidad_max`, `precio_por_hora`.
- Si `vigente_desde` no viene, usar `CURDATE()`.
- Validar `cantidad_min <= cantidad_max` y devolver errores JSON claros.
Frontend
- `config_alquiler.html`: ajustar payload y validaciones (no exigir `vigente_desde` ni `id_evento`).
QA (manual)
- Verificar POST/PUT `/api/admin/alquiler/precios` manualmente.

### Fase 2 — Tipos de Alquiler / Validación de Código (medio, 2–3h) ✅
Backend
- Validar `codigo` con regex: solo `[A-Z0-9_]+` (opcional: `^[A-Z_][A-Z0-9_]*$`). Rechazar con 400 y mensaje claro.
Frontend
- Validación en UI en el formulario nuevo (helper y bloqueo de submit).
QA (manual)
- Verificar validación para `createTipo` manualmente.

### Fase 3 — Vistas Confirmadas (alta, 4–6h) 📋
Objetivo: uniformizar columnas y shape de datos para confirmados.
Backend
- Añadir campo `url_flyer` a `eventos_confirmados` (migración y script), exponer en endpoints públicos y admin, y permitir setear/preview desde la UI de administración.
- Verificar/ajustar endpoints que alimentan vistas: `/api/admin/solicitudes`, y crear endpoints específicos si conviene (`/api/admin/*/confirmados`).
- Responder con objetos: `fecha, hora, tipo, clienteNombre, descripcionCorta, id`.
Frontend
- Renderizar columnas estándar por tipo (ALQ: FECHA,HORA,TIPO,CLIENTE,DESCRIPCION_CORTA,ACCIONES; BANDAS: FECHA,HORA,GENERO,CLIENTE,DESCRIPCION_CORTA,ACCIONES).
QA (manual)
- Verificación manual de listados confirmados.

### Fase 4 — Instrumentos (medio, 2–4h) 🎸
- Implementar o habilitar CRUD `/api/admin/bandas/instrumentos`.
- Ajustar formulario/UX y verificar manualmente.

### Fase 5 — Talleres / Talleristas (med-alto, 6–8h) 🛠️
Backend/UI
- Tipos: forzar prefijos (`TALLER_` / `ACTIVIDAD_`) y validaciones.
- Implementar búsqueda/autocomplete de `clientes` para talleristas; crear `cliente` si no existe.
- Endpoint de confirmados para talleres: incluir `TALLERISTA`.
QA (manual)
- Verificación manual para creación de taller con tallerista nuevo/existente.

### Fase 6 — Servicios / Profesionales (medio, 4–6h) 🧑‍⚕️
- Igual patrón que Talleres: búsqueda/creación de `cliente` para profesional.
- Endpoint/lista de confirmados con `PROFESIONAL`.

### Fase 7 — Personal / Clientes (low-med, 3–5h) 👥
- Propuesta: usar `cliente_id` opcional en tabla `personal_*`.
- Si se añade FK: planificar migración, backfills y verificaciones manuales; endpoints para asociar.

---

## QA, despliegue y documentación ✅
- Verificaciones manuales para cada cambio.
- PRs pequeños por módulo, revisión obligatoria.
- Documentar en `README.md` y `REFACTORIZACION.md` (archivo principal de refactor).
- Desplegar a `staging` y validar checklist UX (formularios, listados, acciones) antes de producción.

---

## Estimación y prioridad
- MVP (Fase 1 + arreglar 404 en bandas + endpoints confirmados básicos): **~1–2 días**.
- Refactor completo (Fase 2–7): **3–5 días** adicionales (depende QA y bloqueos).

**Recomendación inicial (prioridad):** Opción A — empezar por **Config Alquiler + arreglar 404 en bandas**.

---

## Riesgos y rollback ⚠️
- Cambios en esquema deben ser idempotentes y con backups previos.
- Cambios en nombres de campos requieren sincronización FE/BE para evitar 400/500.
- Plan de rollback: migraciones reversibles o script de restauración desde backups.

---

## Siguientes pasos (acción inmediata) ▶️
1. Si confirmas, hago commit en `cleanup/fechas-bandas` y abro PR con descripción y checklist. 
2. Crear issues por fase (opcional): tareas y subtareas para asignación. 
3. Ejecutar comprobaciones de humo manuales en staging y proceder con Fase 1.

---

¿Confirmas que proceda a commitear este cambio y abrir el PR en tu rama? 🎯
