# PRE_PROMPT.md - Contexto del Proyecto TDC API Rest

## 📋 Descripción General

**El Templo de Claypole (TDC) API Rest** es una aplicación completa para gestionar un espacio cultural y salón de eventos. Combina:
- **Backend:** API REST en Node.js/Express
- **Frontend:** Páginas HTML/CSS/JavaScript
- **Base de Datos:** MySQL
- **Contenedorización:** Docker Compose

## 🏗️ Stack Tecnológico

| Componente | Tecnología |
|------------|-----------|
| Backend | Node.js + Express.js |
| BD | MySQL 8.0 |
| Frontend | HTML5 + CSS (Tailwind) + JavaScript Vanilla |
| Contenedores | Docker + Docker Compose |
| Servidor Web | Nginx |
| Autenticación | JWT con rol basado (admin, staff, cliente) |

## 📁 Estructura de Carpetas

```
tdcApiRest/
├── backend/                    # API Node.js
│   ├── controllers/           # Controladores de rutas
│   ├── models/                # Modelos de datos (queries SQL)
│   ├── routes/                # Definición de rutas
│   ├── middleware/            # Middleware (auth, validación)
│   ├── services/              # Lógica de negocio
│   ├── utils/                 # Funciones auxiliares
│   ├── db.js                  # Conexión a BD
│   ├── server.js              # Punto de entrada
│   ├── package.json           # Dependencias
│   └── __tests__/             # Tests unitarios
│
├── frontend/                   # Páginas HTML + JS
│   ├── index.html             # Página principal
│   ├── login.html             # Login
│   ├── admin.html             # Panel admin
│   ├── admin_*.html           # Páginas de administración
│   ├── seccion_*.html         # Secciones públicas (bandas, alquiler, etc.)
│   ├── solicitud_*.html       # Formularios de solicitud
│   ├── navbar.js              # Componente navbar reutilizable
│   ├── css/                   # Estilos (Tailwind)
│   └── img/                   # Imágenes
│
├── database/                   # Scripts SQL
│   ├── 01_schema.sql          # Estructura de BD
│   ├── 02_seed.sql            # Datos iniciales
│   └── 03_test_data.sql       # Datos de prueba
│
├── docker/                     # Configuración Docker
│   ├── docker-compose.yml     # Orquestación de servicios
│   ├── Dockerfile.backend     # Imagen Node.js
│   ├── Dockerfile.nginx       # Imagen Nginx
│   ├── nginx.conf             # Configuración Nginx
│   └── certs/                 # Certificados SSL (si aplica)
│
└── docs/                       # Documentación
    ├── LOGICA_NEGOCIO.md      # Reglas de negocio
    └── BINLOG_STRATEGY.md     # Estrategia de logs

```

## 🚀 Cómo Ejecutar el Proyecto

### Prerequisitos
- Docker y Docker Compose instalados
- Puerto 80 y 3306 disponibles (o modificar en docker-compose.yml)

### Pasos

1. **Clonar repositorio**
   ```bash
   git clone https://github.com/Rodri2009/tdcApiRest.git
   cd tdcApiRest
   ```

2. **Verificar configuración Docker Compose**
   ```bash
   cat docker/docker-compose.yml
   # Verificar que servicios estén: mysql, backend (Node), nginx
   ```

3. **Levantar contenedores**
   ```bash
   cd docker
   docker-compose up -d
   # O con build nuevo:
   docker-compose up -d --build
   ```

4. **Verificar que todo está corriendo**
   ```bash
   docker-compose ps
   # Debería mostrar: mysql, backend, nginx como "Up"
   ```

5. **Aplicar cambios en BD** (si es necesario)
   ```bash
   docker exec <mysql-container-id> mysql -u root -p<root-password> < ../database/01_schema.sql
   docker exec <mysql-container-id> mysql -u root -p<root-password> < ../database/02_seed.sql
   ```

## 🧪 Cómo Hacer Pruebas

### Acceso a la Aplicación

- **Frontend:** http://localhost
- **API Base:** http://localhost/api
- **Panel Admin:** http://localhost/admin.html

### Usuarios de Prueba

| Email | Contraseña | Rol |
|-------|-----------|-----|
| villalbarodrigo2009@gmail.com | 1234 | admin |
| temploclaypole@templo.com | rodrigo | staff |

### Pruebas de API (con curl o Postman)

```bash
# 1. Login y obtener JWT
curl -X POST http://localhost/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"villalbarodrigo2009@gmail.com","password":"1234"}'

# Respuesta: { "token": "eyJhbGc...", "user": {...} }

# 2. Usar token en peticiones protegidas
curl -X GET http://localhost/api/solicitudes \
  -H "Authorization: Bearer <TOKEN_AQUI>"

# 3. Ver logs del backend
docker logs <backend-container-id> -f

# 4. Ver logs de MySQL
docker logs <mysql-container-id> -f
```

### Pruebas en Navegador

1. **Abrir http://localhost** → Ver página principal
2. **Hacer login** → Ir a login.html, ingresar credenciales
3. **Verificar rol en navbar** → Debe mostrar nombre del usuario + botón Salir
4. **Admin** → Si es admin, debe ver botón "🔐 Admin" en navbar
5. **Cliente** → Si es cliente, solo ve su nombre y botón Salir

### Estructura de Respuestas de API

**Respuesta exitosa:**
```json
{
  "success": true,
  "data": { /* objeto o array */ },
  "message": "Operación completada"
}
```

**Respuesta con error:**
```json
{
  "success": false,
  "error": "Descripción del error",
  "status": 400
}
```

## 🔐 Sistema de Autenticación

### Flujo

1. Usuario hace login → `/api/login`
2. Backend valida credenciales en BD
3. Si válido, genera JWT con:
   - `id_usuario` (PK)
   - `email`
   - `nombre`
   - `role` (admin, staff, cliente)
   - `roles` (array)
   - `permisos` (array)
   - `nivel` (numérico: 0-100)

4. JWT se guarda en `localStorage` del navegador
5. Peticiones posteriores lo envían en header: `Authorization: Bearer <token>`
6. Backend valida token con middleware `verifyAuth`

### Validación de Roles (Frontend)

En las páginas HTML, hay código que valida rol antes de mostrar botones:

```javascript
const decoded = decodeJWT(token);
const rol = decoded.rol || decoded.role;
const isAdmin = rol === 'admin' || rol === 'staff';

if (isAdmin) {
  // Mostrar botón Admin
} else {
  // Mostrar nombre + botón Salir
}
```

## 📊 Base de Datos - Tablas Principales

| Tabla | Descripción |
|-------|------------|
| `usuarios` | Cuentas de sistema (admin, staff) |
| `clientes` | Usuarios finales (clientes) |
| `solicitudes_*` | Solicitudes de alquiler, bandas, talleres, servicios |
| `bandas` | Bandas registradas |
| `servicios` | Servicios disponibles |
| `talleres` | Talleres/clases |
| `agenda` | Eventos programados |

## 🔄 Flujo Típico de Desarrollo

1. **Modificar código** → Backend (`backend/`) o Frontend (`frontend/`)
2. **Pruebas locales** → `curl` o navegador
3. **Cambios en BD** → Actualizar `database/01_schema.sql` o `02_seed.sql`
4. **Reconstruir contenedores** → `docker-compose up -d --build`
5. **Commit a git** → `git add .` → `git commit -m "..."` → `git push`

## 🛠️ Troubleshooting

### Puertos ocupados
```bash
# Ver qué usa puerto 80
lsof -i :80
# O puerto 3306
lsof -i :3306
# Matar proceso o cambiar puerto en docker-compose.yml
```

### Limpiar contenedores
```bash
cd docker
docker-compose down -v  # Elimina contenedores y volúmenes
docker-compose up -d --build
```

### Errores de conexión a BD
```bash
# Verificar que MySQL está corriendo
docker exec <mysql-id> mysql -u root -p<password> -e "SELECT 1"

# Ver logs
docker logs <mysql-id>
```

### Errores en Backend
```bash
# Ver logs Node.js
docker logs <backend-id> -f

# Ejecutar comando en contenedor
docker exec -it <backend-id> npm test
```

## 📝 Convenciones de Código

- **Variables:** camelCase en JS, snake_case en SQL
- **Funciones:** camelCase en JS, verbos que describan acción
- **Bases de datos:** snake_case, tablas en singular
- **Commits Git:** `type: descripción` (fix, feat, style, docs, refactor)
- **Rutas API:** `/api/recurso/acción` (ej: `/api/solicitudes/crear`)

## 🎯 Puntos Clave a Recordar

✅ **JWT se almacena en localStorage** → Se envía en header `Authorization`

✅ **Roles válidos:** `admin`, `staff`, `cliente`

✅ **Nivel numérico:** admin ≥ 50, staff: 20-49, cliente: 0-19

✅ **Frontend valida roles ANTES de mostrar botones** (no confiar solo en backend)

✅ **Modificar navbar:** editar HTML + `updateAuthMenu()` en páginas custom

✅ **Solicitudes:** clientes crean, staff revisa, admin aprueba/rechaza

✅ **Docker Compose levanta:** MySQL + Backend (Node) + Nginx automáticamente

✅ **BD se inicializa automáticamente** con scripts en `/database` en primer `up`

---

**Última actualización:** 21 de julio de 2026
**Versión del proyecto:** 2.0 (Post-refactor navbar/auth)
