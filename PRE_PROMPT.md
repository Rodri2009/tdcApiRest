# PRE_PROMPT.md - Arquitectura Modular de TDC API Rest

## 1. Descripción general del proyecto

TDC API Rest es una aplicación para la gestión operativa de un espacio cultural y de eventos. El sistema combina:

- Backend en Node.js + Express
- Frontend en HTML + JavaScript + CSS
- Base de datos MySQL
- Integraciones con Mercado Pago, WhatsApp, uploads y gestión de caja
- Roles y permisos diferenciados por usuario

El proyecto no debe pensarse como una sola app monolítica sin estructura, sino como una plataforma modular donde cada dominio funcional tiene:

- rutas API propias
- controladores dedicados
- servicios de negocio
- modelos de acceso a datos
- validaciones y utilidades específicas

La idea principal es separar el negocio por módulos funcionales para facilitar mantenimiento, pruebas y escalabilidad.

---

## 2. Objetivo de la modularización

La organización modular tiene estos objetivos:

1. Reducir acoplamiento entre dominios.
2. Hacer más claro dónde vive cada funcionalidad.
3. Permitir actualizar un módulo sin afectar otros.
4. Facilitar la incorporación de nuevas features.
5. Mantener una estructura consistente con la realidad del proyecto.

---

## 3. Principios de arquitectura

### 3.1. Dominio antes que tecnología
Cada módulo representa un dominio del negocio y no una carpeta técnica aislada.

Ejemplos:
- auth / usuarios / clientes
- solicitudes / eventos / bandas / talleres
- cajas / movimientos / transacciones
- mercadopago / whatsapp / uploads

### 3.2. Capas por responsabilidad
Cada módulo debe tener una separación clara:

- routes/: exponer endpoints
- controllers/: orquestar entrada/salida
- services/: lógica de negocio
- models/: consultas SQL / acceso a persistencia
- middleware/: validaciones y seguridad de ese dominio
- utils/: helpers específicos

### 3.3. Dependencias unidireccionales
La regla recomendada es:

routes -> controllers -> services -> models

Nunca se recomienda que una capa inferior conozca a la capa de presentación.

### 3.4. Un módulo por responsabilidad funcional
Un módulo no debe mezclar:
- autenticación
- gestión de cajas
- venta de entradas
- solicitudes
- integraciones externas

---

## 4. Estructura del proyecto según modularización

```text
tdcApiRest/
├── PRO_PROMPT.md                    # Documento principal de arquitectura
├── README.md                       # Documento principal del proyecto
├── backend/
│   ├── server.js                   # Entrada principal de la API
│   ├── db.js                       # Conexión a MySQL
│   ├── controllers/                # Controladores por módulo
│   ├── routes/                     # Endpoints por módulo
│   ├── services/                   # Lógica de negocio por módulo
│   ├── models/                     # Queries SQL por módulo
│   ├── middleware/                 # Auth, validación, logs
│   ├── utils/                     # Utilidades generales
│   ├── core/                      # Infraestructura / integraciones / runners
│   ├── lib/                       # Helpers y utilitarios
│   ├── __tests__/                 # Pruebas unitarias/integración
│   └── uploads/                   # Archivos generados por usuarios
├── frontend/
│   ├── *.html                     # Páginas por vista funcional
│   ├── *.js                       # Scripts de front por módulo/vista
│   └── assets/                    # CSS, imágenes y recursos
├── database/
│   ├── 01_schema.sql
│   ├── 02_seed.sql
│   └── 03_test_data.sql
├── docker/
│   ├── docker-compose.yml
│   ├── Dockerfile.backend
│   └── Dockerfile.nginx
├── docs/
│   ├── DOCUMENTACION_INDEX.md
│   ├── LOGICA_NEGOCIO.md
│   └── modulos/
│       ├── README.md
│       ├── 01-autenticacion.md
│       ├── 02-usuarios-clientes.md
│       ├── 03-solicitudes-servicios.md
│       ├── 04-eventos-bandas-talleres.md
│       ├── 05-caja-transacciones.md
│       ├── 06-mercadopago-whatsapp.md
│       ├── 07-uploads-galeria.md
│       └── 08-admin-reportes.md
└── scripts/
```

---

## 4. Docker Compose y scripts de arranque

### Cómo funciona con este proyecto

El `docker/docker-compose.yml` define tres servicios principales:

- `nginx`: sirve el frontend desde la carpeta `frontend/` y usa `docker/nginx.conf`.
- `backend`: construye la app Node.js desde `docker/Dockerfile.backend`, expone el puerto `3000`, monta el código fuente local `../backend` y monta un volumen persistente para `node_modules`.
- `mariadb`: usa la imagen oficial `mariadb:10.6`, expone el puerto `3306`, persiste datos en `mariadb_data` y binlogs en `mariadb_binlogs`.

### Qué hace cada servicio

- `nginx`:
  - monta `../frontend` en `/usr/share/nginx/html`
  - usa `../docker/nginx.conf`
  - expone puertos `80` y `443`
  - depende de `backend`

- `backend`:
  - monta el backend local `../backend` en `/app`
  - monta `../scripts` en `/app/scripts`
  - usa un volumen nombrado `tdc_backend_node_modules` para preservar dependencias
  - monta las carpetas de perfil de Puppeteer desde `backend/profile/mp-profile` y `backend/profile/wa-profile`
  - monta `../scripts/infraestructura/docker_entrypoint.sh` como `/usr/local/bin/docker-entrypoint.sh`
  - pasa variables de entorno desde `../.env`

- `mariadb`:
  - levanta MariaDB con binlog habilitado y parámetros personalizados
  - ejecuta los archivos SQL montados en `/docker-entrypoint-initdb.d` al inicializar la DB por primera vez
  - usa un healthcheck con `mysqladmin ping` para que `backend` espere hasta que la DB esté disponible

### Cómo se usan los scripts shell

- `scripts/up.sh`: es el principal helper para levantar todo el stack.
  - verifica `docker` y `docker compose`
  - valida `node` y `npm`
  - sincroniza `.env` en `docker/.env`
  - aplica overrides para `--mp`, `--wa` y `--rebuild`
  - limpia contenedores viejos y levanta el stack con `docker compose up -d`
  - puede ejecutar migraciones SQL si se pide `--migrate`

- `scripts/reset.sh`: reinicia contenedores y/o la base de datos.
  - puede destruir solo la DB, el backend, el frontend o todo el stack
  - controla qué scripts SQL se cargan (`01_schema.sql`, `02_seed.sql`, `03_test_data.sql`)
  - permite preservar sesiones de Puppeteer con `--save-mp` y `--save-wa`

- `scripts/restart.sh`: reinicia partes específicas del stack.
  - útil para recargar backend o frontend sin derribar todo
  - puede reconstruir imágenes con `--rebuild`
  - mantiene la posibilidad de habilitar `--mp` y `--wa`

### Qué hace el entrypoint del backend

El `scripts/infraestructura/docker_entrypoint.sh` se ejecuta dentro del contenedor backend antes de arrancar Node:

- comprueba si `node_modules` existe y, si falta, ejecuta `npm install`
- cuando `ENABLE_VNC=true`, inicia `Xvfb`, configura el teclado español, ejecuta `openbox` y arranca `x11vnc` en el puerto `5901`
- arranca `node server.js` con `DEBUG_FLAGS` si están definidos

### Recomendación de uso

- usar `./scripts/up.sh` para levantar el entorno completo
- usar `./scripts/reset.sh --all` para reiniciar la DB y el stack
- usar `./scripts/restart.sh --backend` para redeploy rápido del backend
- mantener `backend/profile/*-profile` como perfiles persistentes de Puppeteer

---

## 5. Organización modular propuesta

### Módulo 1: Autenticación y permisos
Responsable de:
- login
- JWT
- validación de roles
- middleware de autorización
- control de sesión

### Módulo 2: Usuarios y clientes
Responsable de:
- usuarios internos
- clientes
- perfiles
- roles y niveles

### Módulo 3: Solicitudes y servicios
Responsable de:
- alquileres
- solicitudes de bandas, talleres y servicios
- estados y aprobaciones

### Módulo 4: Eventos, bandas y talleres
Responsable de:
- eventos confirmados
- bandas
- talleres
- agenda y calendario

### Módulo 5: Caja y transacciones
Responsable de:
- apertura/cierre de caja
- movimientos
- totales
- reconciliación

### Módulo 6: Mercado Pago y WhatsApp
Responsable de:
- pagos
- notificaciones
- integraciones
- live monitoring

### Módulo 7: Uploads y contenido visual
Responsable de:
- logos
- flyers
- galerías
- imágenes y contenidos multimedia

### Módulo 8: Admin y reportes
Responsable de:
- panel de administración
- dashboards
- reportes y estadísticas

---

## 6. Regla de trabajo por módulo

Cada módulo debe documentarse con este formato mínimo:

1. Objetivo
2. Alcance
3. Entidades principales
4. Rutas API
5. Controladores
6. Servicios

---

## 7. Recomendaciones para trabajar con agentes IA

Para mantener el contexto limpio y evitar enviar información innecesaria a las ventanas de IA, usá este patrón:

- `PRE_PROMPT.md`: siempre como contexto general del proyecto.
- `docs/modulos/README.md`: como índice para ubicar rápidamente el módulo correcto.
- `docs/modulos/0X-*.md`: como detalle específico del módulo relevante.

### Flujo recomendado

1. Buscar en `docs/modulos/README.md` el módulo que corresponde al problema.
2. Abrir el `docs/modulos/0X-*.md` correspondiente y usarlo como referencia principal.
3. En la consulta al agente, enviar primero un resumen corto de `PRE_PROMPT.md` y luego solo el módulo relevante.
4. No enviar todos los módulos al mismo tiempo, salvo que sea estrictamente necesario.

### Ejemplo de uso

- Problema de caja: `PRE_PROMPT.md` + `docs/modulos/05-caja-transacciones.md`
- Problema de autenticación: `PRE_PROMPT.md` + `docs/modulos/01-autenticacion.md`
- Problema de Mercado Pago: `PRE_PROMPT.md` + `docs/modulos/06-mercadopago-whatsapp.md`

### Beneficio

Esto mantiene los prompts más pequeños, reduce ruido y permite que el agente se concentre en el dominio correcto sin perder el contexto general del proyecto.

7. Modelos/consultas
8. Reglas de negocio
9. Dependencias
10. Puntos de extensión

---

## 7. Convención recomendada para archivos md de módulo

Cada módulo tendrá un resumen ejecutivo y luego una sección técnica.

Ejemplo:

```text
docs/modulos/05-caja-transacciones.md

# Módulo 05: Caja y transacciones

## Objetivo
## Alcance
## Entidades
## Endpoints
## Cambios de estado
## Reglas de negocio
## Dependencias
## Riesgos
## Próximos pasos
```

---

## 8. Cómo organizar el backend según esta estrategia

El backend debe evolucionar hacia una estructura más clara:

```text
backend/
  controllers/
    authController.js
    usuariosController.js
    clientesController.js
    solicitudesController.js
    eventosController.js
    cajasController.js
    mercadopagoController.js
    uploadsController.js

  routes/
    authRoutes.js
    usuariosRoutes.js
    clientesRoutes.js
    solicitudesRoutes.js
    eventosRoutes.js
    cajasRoutes.js
    mercadopagoRoutes.js
    uploadsRoutes.js

  services/
    authService.js
    usuariosService.js
    solicitudesService.js
    eventosService.js
    cajasService.js
    mercadopagoService.js
    uploadsService.js

  models/
    usuariosModel.js
    clientesModel.js
    solicitudesModel.js
    eventosModel.js
    cajasModel.js
    mercadopagoModel.js
```

Esto evita que todo quede mezclado en controllers gigantes o rutas con cientos de endpoints.

---

## 9. Cómo organizar el frontend por vista funcional

El frontend debería dividirse según el dominio visible para el usuario.

Ejemplo:

```text
frontend/
  auth/
    login.html
    logout.js
  admin/
    admin.html
    admin_caja.html
    admin_transacciones.html
    admin_eventos.html
  clientes/
    mi_perfil.html
    mis_entradas.html
  solicitudes/
    solicitud_alquiler.html
    solicitud_banda.html
  eventos/
    agenda.html
    detalle_evento.html
```

La idea no es crear un frontend demasiado fragmentado, pero sí separar la lógica por flujo funcional para hacer más simple el mantenimiento.

---

## 10. Recomendación de trabajo para este proyecto

Se recomienda seguir este orden:

1. Documentar cada módulo en docs/modulos/
2. Mapear rutas reales existentes
3. Separar lógica por servicios
4. Consolidar modelos en cada dominio
5. Reducir controladores monolíticos
6. Definir un estándar de pruebas por módulo

---

## 11. Criterio de éxito

El proyecto estará bien modularizado cuando:

- cada dominio funcional tenga su propio conjunto de rutas, servicios y modelos
- los archivos no mezclen responsabilidades
- añadir una feature nueva no requiera tocar grandes bloques de código no relacionados
- la documentación de cada módulo refleje el estado real del sistema

---

## 12. Resumen ejecutivo

La arquitectura más saludable para TDC API Rest es una estructura modular por dominio, con una separación clara entre:

- autenticación
- usuarios/clientes
- solicitudes y servicios
- eventos/bandas/talleres
- caja y transacciones
- integraciones externas
- uploads y contenido
- administración y reportes

Este enfoque permite convertir el proyecto en un sistema más mantenible, testable y escalable, sin perder compatibilidad con el estado actual del desarrollo.

---

## 13. Siguiente paso recomendado

Crear la documentación de módulos en `docs/modulos/` y mantener `PRO_PROMPT.md` como la guía central del proyecto.
