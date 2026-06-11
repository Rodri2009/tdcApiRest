# TDC - Sistema de Gestión Total (Versión Beta)

Sistema de gestión para solicitudes de alquiler, servicios, talleres y fechas de bandas.

## Qué hace
- Permite crear y gestionar solicitudes desde el frontend
- Administra y confirma solicitudes desde el panel de administración
- Publica eventos confirmados en la agenda
- Controla visibilidad de solicitudes públicas

## Requisitos
- Docker y Docker Compose
- Archivo `.env` en la raíz del proyecto

## Puesta en marcha

```bash
git clone <repo-url>
cd tdcApiRest
cp .env.example .env
# Editar .env con tus valores
./scripts/up.sh
```

**URLs:**
- Frontend: http://localhost
- API: http://localhost/api

## Scripts principales

| Script | Descripción |
|--------|-------------|
| `./scripts/up.sh` | Levanta todos los servicios |
| `./scripts/restart.sh` | Reinicia contenedores específicos |
| `./scripts/reset.sh` | Reinstala la BD y carga datos de prueba |
| `./scripts/recuperacion/recuperar_desde_binlog.sh` | Recupera la BD usando binlogs |

## Otros scripts

- `scripts/diagnostico/` — Herramientas para validar el estado del sistema.
  - `README.md` — Descripción de los scripts de diagnóstico.
  - `verify_seed_data.sh` — Verifica integridad de los datos semilla.
  - `test_fase2_scanner.js` — Prueba manual del flujo de escaneo/validación de tickets.
- `scripts/infraestructura/` — Scripts de soporte para infraestructura y mantenimiento.
  - `README.md` — Guía de uso interna para estos scripts.
  - `backup_project.sh` — Copia de seguridad del proyecto.
  - `docker_entrypoint.sh` — Entrada personalizada para Docker.
  - `restart_backend.sh` — Reinicia el backend con opciones avanzadas.
- `scripts/herramientas/` — Utilidades auxiliares.
  - `README.md` — Descripción de las herramientas disponibles.
- `scripts/optimizacion/` — Scripts relacionados con optimización y ajustes.
  - `README.md` — Documentación de optimización.
- `scripts/persistencia_de_perfiles/` — Gestión de perfiles de usuario y configuración.
  - `GUIA_RAPIDA.md` — Guía de uso rápido para perfiles.
  - `share_profile.sh` — Script para compartir perfiles.
- `scripts/recuperacion/` — Recuperación y restauración de bases de datos.
  - `recuperar_desde_binlog.sh` — Recupera datos desde binlogs de MariaDB.

## Arquitectura

- `nginx` sirve el frontend y hace proxy al backend
- `backend` es Node.js/Express en el puerto `3000`
- `mariadb` es la base de datos en el puerto `3306`

## Backup y recovery

La aplicación usa binlogs de MariaDB para recovery. La documentación está en:
- `docs/ESTRATEGIA_BINLOG.md`

## Documentación útil

- `docs/LOGICA_NEGOCIO.md`

## Cambios relevantes

- La tabla principal de eventos es `eventos_confirmados`
- Las referencias a `eventos` fueron actualizadas
- Esta versión está en beta y es funcional

## Reiniciar contenedores

```bash
./scripts/restart.sh --backend
./scripts/restart.sh --frontend
./scripts/restart.sh --db
```

## Estructura general

- `backend/` — API y lógica del servidor
- `frontend/` — interfaces web
- `database/` — esquema y datos de prueba
- `docker/` — orquestación de contenedores
- `docs/` — documentación del proyecto

## Endpoints básicos

- `GET /api/solicitudes`
- `POST /api/solicitudes`
- `GET /api/solicitudes/:id`
- `PUT /api/solicitudes/:id`
- `GET /api/admin/solicitudes`
- `PUT /api/admin/solicitudes/:id/estado`
