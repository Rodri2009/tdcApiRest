# 🔐 Arquitectura Backend - Flujo OAuth y Autenticación

## 📌 Resumen de Endpoints

### 1. **Autenticación Manual (Email/Password)**

#### POST `/api/auth/register`
Crear nuevo usuario con email y contraseña.

**Request Body:**
```json
{
  "nombre": "Juan",
  "apellido": "Pérez",
  "email": "juan@example.com",
  "telefono": "+541234567890",
  "password": "miPassword123"
}
```

**Response (201 - Success):**
```json
{
  "message": "Registro exitoso.",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id_usuario": 1,
    "nombre": "Juan",
    "apellido": "Pérez",
    "email": "juan@example.com",
    "rol": "cliente",
    "roles": ["cliente"],
    "permisos": ["solicitudes.ver_propias", "solicitudes.crear"],
    "nivel": 10
  }
}
```

**Response (409 - Email ya existe):**
```json
{
  "message": "El email ya está registrado."
}
```

---

#### POST `/api/auth/login`
Iniciar sesión con email y contraseña.

**Request Body:**
```json
{
  "email": "juan@example.com",
  "password": "miPassword123"
}
```

**Response (200 - Success):**
```json
{
  "message": "Login exitoso.",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id_usuario": 1,
    "nombre": "Juan",
    "apellido": "Pérez",
    "email": "juan@example.com",
    "rol": "cliente",
    "roles": ["cliente"],
    "permisos": ["solicitudes.ver_propias", "solicitudes.crear"],
    "nivel": 10
  }
}
```

**Response (401 - Credenciales inválidas):**
```json
{
  "message": "Credenciales inválidas."
}
```

---

### 2. **Autenticación OAuth**

#### POST `/api/auth/oauth-callback`
Crear/encontrar usuario OAuth (Google, Facebook, Instagram).

Este es el endpoint principal para TODOS los proveedores OAuth. El frontend valida el token en la SDK y luego envía los datos extraídos al backend.

**Request Body:**
```json
{
  "proveedor_oauth": "google",
  "id_oauth": "110169865799075953093",
  "email": "user@example.com",
  "nombre": "Juan",
  "apellido": "Pérez",
  "foto_url": "https://lh3.googleusercontent.com/...",
  "telefono": "+541234567890"
}
```

**Validaciones:**
- `proveedor_oauth` REQUIRED: 'google' | 'facebook' | 'instagram'
- `id_oauth` REQUIRED: String único del proveedor
- `email` REQUIRED: Email del usuario
- `nombre` OPTIONAL: Nombre del usuario
- `apellido` OPTIONAL: Apellido del usuario
- `foto_url` OPTIONAL: URL de la foto de perfil
- `telefono` OPTIONAL: Teléfono del usuario

**Lógica:**
1. Busca usuario existente por `(proveedor_oauth, id_oauth)`
2. Si existe → Retorna JWT + datos del usuario (LOGIN)
3. Si NO existe → Crea nuevo usuario + cliente en transacción → Retorna JWT (SIGNUP)

**Response (200/201 - Success):**
```json
{
  "message": "Login exitoso (OAuth).",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id_usuario": 2,
    "nombre": "Juan",
    "apellido": "Pérez",
    "email": "user@example.com",
    "rol": "cliente",
    "roles": ["cliente"],
    "permisos": ["solicitudes.ver_propias", "solicitudes.crear"],
    "nivel": 10
  }
}
```

**Response (409 - Email ya registrado con otro proveedor):**
```json
{
  "message": "Email ya registrado con otro proveedor."
}
```

**Response (400 - Validación falla):**
```json
{
  "message": "Campos requeridos faltantes: proveedor_oauth, id_oauth, email."
}
```

---

### 3. **Información del Usuario Actual**

#### GET `/api/auth/me`
Obtener datos del usuario autenticado.

**Headers:**
```
Cookie: token=<jwt_token>
OR
Authorization: Bearer <jwt_token>
```

**Response (200 - Success):**
```json
{
  "id_usuario": 1,
  "nombre": "Juan",
  "apellido": "Pérez",
  "email": "juan@example.com",
  "rol": "cliente",
  "activo": 1,
  "roles": ["cliente"],
  "permisos": ["solicitudes.ver_propias", "solicitudes.crear"],
  "nivel": 10
}
```

**Response (401 - No autorizado):**
```json
{
  "message": "No autorizado"
}
```

---

### 4. **Logout**

#### POST `/api/auth/logout`
Cerrar sesión (limpia la cookie del token).

**Response (200):**
```json
{
  "message": "Logout exitoso."
}
```

---

## 🔄 Flujos Completos

### **Flujo 1: Registro Manual**

```
Frontend: Cliente hace clic en "Registrarse"
   ↓
   Completa: nombre, apellido, email, telefono, password
   ↓
   Envía: POST /api/auth/register
   ↓
Backend: Valida datos → Hash password con bcryptjs
   ↓
   Crea transacción:
   - INSERT usuarios (email, password_hash, nombre, apellido, rol='cliente')
   - INSERT clientes (id_usuario, nombre, apellido, telefono, email)
   ↓
   Retorna: JWT + datos del usuario
   ↓
Frontend: Guarda token en cookie (automáticamente)
   ↓
   Guarda user data en localStorage
   ↓
   Redirecciona a /index.html
```

---

### **Flujo 2: Login Manual**

```
Frontend: Cliente ingresa email + password
   ↓
   Envía: POST /api/auth/login
   ↓
Backend: Busca usuario por email
   ↓
   Compara password con bcrypt.compare()
   ↓
   Si válido → Retorna JWT + datos del usuario
   Si inválido → Retorna 401
   ↓
Frontend: Guarda token + user data
   ↓
   Redirecciona a /index.html
```

---

### **Flujo 3: OAuth (Google/Facebook)**

```
Frontend: Cliente hace clic en botón OAuth
   ↓
   SDKs OAuth devuelven: id_token o access_token
   ↓
   Frontend decodifica el token → Obtiene: id, email, nombre, apellido, foto
   ↓
   Envía: POST /api/auth/oauth-callback
   {
     proveedor_oauth: 'google',
     id_oauth: '110169865799075953093',
     email: 'user@example.com',
     ...
   }
   ↓
Backend: Busca usuario por (proveedor_oauth, id_oauth)
   ↓
   Si existe → Retorna JWT + datos (LOGIN)
   Si NO existe → Crea usuario + cliente → Retorna JWT (SIGNUP)
   ↓
Frontend: Almacena token + user data
   ↓
   Redirecciona a /index.html
```

---

### **Flujo 4: OAuth con Formulario Manual (contacto_oauth.html)**

Especial para solicitudes de ALQUILER que NO requieren autenticación completa.

```
Frontend: Cliente en solicitud de alquiler
   ↓
   Hace clic en botón OAuth (Google/Facebook)
   ↓
   SDKs OAuth devuelven token
   ↓
   Frontend llama: POST /api/auth/oauth-callback (silenciosamente)
   ↓
Backend: Crea/encuentra usuario (como en Flujo 3)
   ↓
Frontend: Recibe respuesta y rellena formulario con datos del usuario
   ↓
   Cliente completa: telefono, detalles de alquiler
   ↓
   Envía formulario de alquiler a solicitud_alquiler.html
```

---

## 🔐 Manejo de Tokens y Cookies

### **Cookie de Token**
```javascript
res.cookie('token', token, {
  httpOnly: true,              // No accesible desde JavaScript
  secure: true,                 // HTTPS solo (en producción)
  maxAge: 8 * 60 * 60 * 1000   // 8 horas
});
```

### **Authorization Header (alternativa a cookie)**
```javascript
// Cliente puede enviar:
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

// Backend lee desde:
const token = req.headers.authorization?.substring(7); // Quita "Bearer "
```

### **JWT Payload (lo que está dentro del token)**
```javascript
{
  id_usuario: 1,
  email: 'user@example.com',
  role: 'cliente'
  // Expira en 8 horas
}
```

---

## 🗄️ Transacciones en Base de Datos

### **Registro OAuth - Transacción ACID**

```sql
BEGIN TRANSACTION;

-- 1. Crear usuario
INSERT INTO usuarios (
  email, nombre, apellido, 
  proveedor_oauth, id_oauth, foto_url, 
  rol, activo, creado_en
) VALUES (
  'user@example.com', 'Juan', 'Pérez',
  'google', '110169865799075953093', 'https://...',
  'cliente', 1, NOW()
);
-- Retorna: id_usuario = 123

-- 2. Crear cliente asociado
INSERT INTO clientes (
  id_usuario, nombre, apellido, telefono, email, 
  creado_por_id_usuario, activo
) VALUES (
  123, 'Juan', 'Pérez', '', 'user@example.com',
  123, 1
);

COMMIT;
```

Si alguno falla → ROLLBACK automático (no quedó usuario sin cliente)

---

## 🛡️ Validaciones y Error Handling

### **Validaciones en Backend**

| Campo | Regla |
|-------|-------|
| `email` | UNIQUE en usuarios |
| `password` | Mínimo 6 caracteres |
| `nombre` | No vacío |
| `apellido` | No vacío |
| `proveedor_oauth` | 'google' \| 'facebook' \| 'instagram' |
| `id_oauth` | UNIQUE por proveedor |

### **Códigos HTTP Retornados**

| Código | Significado |
|--------|------------|
| 200 | Login exitoso |
| 201 | Registro/signup exitoso |
| 400 | Validación falla (campos faltantes/inválidos) |
| 401 | No autorizado (credenciales inválidas, token expirado) |
| 404 | Usuario no encontrado |
| 409 | Conflicto (email ya existe, (proveedor, id_oauth) duplicado) |
| 500 | Error del servidor |

---

## 🚀 Flujo en Docker

### **Variables de Entorno Necesarias**

```bash
# JWT
JWT_SECRET=your-super-secret-key-change-in-production

# Base de Datos
DB_HOST=database
DB_USER=root
DB_PASSWORD=root
DB_NAME=tdc_db
DB_PORT=3306

# Google OAuth (opcional)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# Facebook OAuth (opcional)
FACEBOOK_APP_ID=your-app-id
FACEBOOK_APP_SECRET=your-app-secret

# Instagram OAuth (opcional)
INSTAGRAM_APP_ID=your-app-id
INSTAGRAM_APP_SECRET=your-app-secret

# Node
NODE_ENV=development
```

---

## 📄 Middleware de Autenticación

### **Protect Middleware**

Usado en rutas que requieren autenticación:

```javascript
const protect = (req, res, next) => {
    // Lee token desde:
    // 1. Cookie (req.cookies.token)
    // 2. Header Authorization (Bearer token)
    
    if (!token) return res.status(401).json({...});
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Ahora disponible para usar
        next();
    } catch {
        return res.status(401).json({...});
    }
};
```

**Uso:**
```javascript
router.get('/me', protect, me); // Solo usuarios autenticados
```

---

## 📊 Datos Almacenados

### **En Base de Datos**

```sql
-- Usuarios con OAuth
INSERT INTO usuarios 
(email, password_hash, nombre, apellido, proveedor_oauth, id_oauth, foto_url, rol, activo)
VALUES (
  'user@gmail.com', NULL, 'Juan', 'Pérez',
  'google', '110169865799075953093', 'https://...',
  'cliente', 1
);

-- Clientes vinculados 1:1
INSERT INTO clientes 
(id_usuario, nombre, apellido, telefono, email, creado_por_id_usuario, activo)
VALUES (123, 'Juan', 'Pérez', '+541234567890', 'user@gmail.com', 123, 1);
```

### **En Cliente (localStorage)**

```javascript
localStorage.setItem('user_data', JSON.stringify({
  id_usuario: 123,
  nombre: 'Juan',
  apellido: 'Pérez',
  email: 'user@gmail.com',
  rol: 'cliente',
  roles: ['cliente'],
  permisos: ['solicitudes.ver_propias', 'solicitudes.crear'],
  nivel: 10
}));
```

### **En Cookies (HTTP-only)**

```
Cookie: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZF91c3VhcmlvIjoxMjMsImVtYWlsIjoiand0QGV4YW1wbGUuY29tIiwicm9sZSI6ImNsaWVudGUiLCJpYXQiOjE2OTk1MDAwMDAsImV4cCI6MTY5OTUyODAwMH0.xxx
```

---

## 🔍 Debugging

### **Logs Disponibles**

El backend usa sistema de debug flags:

```javascript
logSuccess('Usuario registrado: usuario@email.com');
logError('Error en login:', errorMsg);
logVerbose('OAuth login existente: google / 110169865...');
logWarning('Intento fallido de login para:', email);
```

### **Testing de Endpoints**

Con curl:
```bash
# Registro
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Juan",
    "apellido": "Pérez",
    "email": "juan@test.com",
    "telefono": "1234567890",
    "password": "password123"
  }'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "juan@test.com",
    "password": "password123"
  }'

# OAuth Callback
curl -X POST http://localhost:3000/api/auth/oauth-callback \
  -H "Content-Type: application/json" \
  -d '{
    "proveedor_oauth": "google",
    "id_oauth": "110169865799075953093",
    "email": "user@gmail.com",
    "nombre": "Juan",
    "apellido": "Pérez"
  }'

# Obtener usuario actual (requiere token)
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <token_jwt>"
```

---

## ✅ Checklist de Implementación

- [x] Tabla `usuarios` con soporte OAuth
- [x] Tabla `clientes` con FK a usuarios (1:1)
- [x] authController con: register(), login(), oauthCallback(), me()
- [x] authRoutes con todos los endpoints
- [x] authMiddleware.protect() para rutas privadas
- [x] Frontend registro.html con OAuth integrado
- [x] Frontend contacto_oauth.html para solicitudes de alquiler
- [x] Transacciones ACID en usuario + cliente
- [x] Manejo de errores y validaciones
- [ ] Tests automatizados
- [ ] Documentación OpenAPI/Swagger
- [ ] Rate limiting en endpoints auth
- [ ] Refresh tokens (opcional para futuro)

---

## 🔮 Mejoras Futuras

1. **Refresh Tokens**: Token corto (15min) + refresh token largo (7 días)
2. **2FA**: Two-factor authentication vía email/SMS
3. **Social Link**: Permitir a usuarios vincular múltiples OAuth a una cuenta
4. **Password Reset**: Endpoint para recuperar contraseña
5. **Email Verification**: Validar email antes de permitir acceso
6. **Rate Limiting**: Limitar intentos de login fallidos
7. **Swagger Docs**: Documentación interactiva del API

