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
│   └── seeds
│       ├── Configuracion.csv
│       ├── Configuracion_Horarios.csv
│       ├── Costos_Personal_Vigencia.csv
│       ├── datos_sensibles_backup.sql
│       ├── Opciones_Adicionales.csv
│       ├── opciones_duracion.csv
│       ├── Opciones_Tipos.csv
│       ├── Personal_Disponible.csv
│       ├── Precios_Vigencia.csv
│       └── Roles_Por_Evento.csv
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
│   ├── img
│   │   ├── Depilación definitiva 1.jpeg
│   │   ├── foto_actividad_1.jpg
│   │   ├── foto_cancha_2.jpg
│   │   ├── foto_cancha_3.jpg
│   │   ├── foto_cuidado_personal_1.jpg
│   │   ├── foto_cuidado_personal_2.jpg
│   │   ├── foto_cuidado_personal_3.jpg
│   │   ├── foto_frente_1.jpg
│   │   ├── foto_frente_2.jpg
│   │   ├── foto_frente_3.jpg
│   │   ├── foto_frente.jpg
│   │   ├── foto_mural_cancha.jpg
│   │   ├── foto_mural_patio_1.jpg
│   │   ├── foto_salida_de_emergencia_.jpg
│   │   ├── foto_salon_10.jpg
│   │   ├── foto_salon_11.jpg
│   │   ├── foto_salon_12.jpg
│   │   ├── foto_salon_13.jpg
│   │   ├── foto_salon_14.jpg
│   │   ├── foto_salon_15.jpg
│   │   ├── foto_salon_17.jpg
│   │   ├── foto_salon_1.jpg
│   │   ├── foto_salon_2.jpg
│   │   ├── foto_salon_3.jpg
│   │   ├── foto_salon_4.jpg
│   │   ├── foto_salon_5.jpg
│   │   ├── foto_salon_6.jpg
│   │   ├── foto_salon_7.jpg
│   │   ├── foto_salon_8.jpg
│   │   ├── foto_salon_9.jpg
│   │   ├── foto_salon_con_gente_10.jpg
│   │   ├── foto_salon_con_gente_11.jpg
│   │   ├── foto_salon_con_gente_13.jpg
│   │   ├── foto_salon_con_gente_1.jpg
│   │   ├── foto_salon_con_gente_4.jpg
│   │   ├── foto_salon_infantil_1.jpg
│   │   ├── foto_salon_infantil_2.jpg
│   │   ├── foto_salon_infantil_3.jpg
│   │   ├── foto_salon_infantil.jpg
│   │   ├── foto_taller_1.jpg
│   │   ├── foto_taller_2.jpg
│   │   ├── foto_taller_3.jpg
│   │   ├── foto_taller_5.jpg
│   │   ├── hero1.jpg
│   │   ├── hero.jpg
│   │   └── logo_transparente.png
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