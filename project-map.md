# 🏗️ Arquitectura del Proyecto: tdcApiRest
> **Generado:** 3/2/2026, 12:22:41
> **Archivos JavaScript detectados:** 40

## 📂 Estructura de Directorios
```text
.
├── backend
│   ├── controllers
│   │   ├── adminController.js
│   │   ├── alquilerAdminController.js
│   │   ├── authController.js
│   │   ├── bandasController.js
│   │   ├── opcionesController.js
│   │   ├── personalTarifasController.js
│   │   ├── serviciosController.js
│   │   ├── solicitudController.js
│   │   ├── talleresController.js
│   │   ├── testController.js
│   │   ├── ticketsController.js
│   │   └── usuariosController.js
│   ├── db.js
│   ├── docker-entrypoint.sh
│   ├── middleware
│   │   ├── authMiddleware.js
│   │   ├── checkPermiso.js
│   │   └── requireAdmin.js
│   ├── models
│   │   └── ticketsModel.js
│   ├── package.json
│   ├── routes
│   │   ├── adminRoutes.js
│   │   ├── authRoutes.js
│   │   ├── bandasRoutes.js
│   │   ├── opcionesRoutes.js
│   │   ├── serviciosRoutes.js
│   │   ├── solicitudRoutes.js
│   │   ├── talleresRoutes.js
│   │   ├── testRoutes.js
│   │   ├── ticketsRoutes.js
│   │   └── usuariosRoutes.js
│   ├── server.js
│   ├── services
│   │   └── emailService.js
│   └── test
│       ├── README.md
│       └── smoke.spec.js
├── .continue
│   ├── config.json
│   └── rules
│       └── new-rule.md
├── crear_tablas_personal.sql
├── database
│   ├── 01_schema.sql
│   ├── 02_seed.sql
│   ├── 03_test_data.sql
│   ├── 06_migrate_solicitudes.sql
│   ├── 07_create_servicios_tables.sql
│   ├── 08_create_profesionales_servicios.sql
│   ├── 09_fix_turnos_servicios.sql
│   ├── README.md
├── docker
│   ├── docker-compose.yml
│   ├── Dockerfile.backend
│   ├── Dockerfile.nginx
│   └── nginx.conf
├── docs
│   └── LOGICA_NEGOCIO.md
├── down-and-backup.sh
├── frontend
│   ├── adicionales.html
│   ├── admin_agenda.html
│   ├── admin.html
│   ├── admin_personal.html
│   ├── admin_solicitudes.html
│   ├── admin_usuarios.html
│   ├── agenda_de_bandas.html
│   ├── asignar_personal.html
│   ├── calculo_alimentos.html
│   ├── checkout_form.html
│   ├── comprobante.html
│   ├── config_alquiler.html
│   ├── config_bandas.html
│   ├── config_eventos.html
│   ├── config_servicios.html
│   ├── config_talleres.html
│   ├── contacto.html
│   ├── editar_inscripcion_taller.html
│   ├── editar_solicitud_alquiler.html
│   ├── editar_solicitud_fecha_bandas.html
│   ├── editar_solicitud_servicios.html
│   ├── editar_solicitud_talleres.html
│   ├── editar_turno_servicio.html
│   ├── email_confirmacion_cliente.html
│   ├── formLogic.js
│   ├── index.html
│   ├── login.html
│   ├── navbar.js
│   ├── orden_de_trabajo.html
│   ├── seccion_agenda.html
│   ├── seccion_alquiler.html
│   ├── seccion_bandas.html
│   ├── seccion_cuidado_personal.html
│   ├── seccion_salon.html
│   ├── seccion_servicios.html
│   ├── seccion_talleres.html
│   ├── solicitud_alquiler.html
│   ├── solicitud_banda.html
│   ├── solicitud_servicio.html
│   ├── solicitud_taller.html
│   ├── styles
│   │   └── admin.css
│   └── tickets
│       └── checkout_form.html
├── generar-project-map.md.js
├── .gitignore
├── package.json
├── README.md
├── README_MIGRACION.md
├── reset.sh
├── .roo
│   └── rules-code
│       └── rules.md
├── scripts
│   ├── check_bnd5.js
│   ├── crear-admin.js
│   ├── debug_query_solicitudes.js
│   ├── generar-contexto.js
│   ├── package.json
│   ├── restart_backend.sh
│   └── smoke_endpoints.sh
├── test.txt
├── up.sh
└── .vscode
    └── settings.json

22 directories, 165 files

```

---
*Este archivo sirve de contexto para el agente Gemini.*