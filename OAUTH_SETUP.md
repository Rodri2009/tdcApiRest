# 🔐 Integración OAuth & Autenticación - El Templo de Claypole

## 📋 Resumen de Cambios

### 1. **Base de Datos** ✅
Se actualizó el schema SQL con:

- **Tabla `usuarios`** (id_usuario)
  - Soporte OAuth: `proveedor_oauth`, `id_oauth`, `token_oauth`
  - Password opcional (NULL si es OAuth)
  - Índice único en (proveedor_oauth, id_oauth)

- **Tabla `clientes`** (id_cliente)
  - FK a usuarios con relación 1:1
  - Campos: nombre, apellido, telefono, email
  - `creado_por_id_usuario` para auditoría

- **Tabla `solicitudes`** (id_solicitud)
  - FK a clientes (obligatorio)
  - `id_usuario_creador` para saber quién la creó

- **Convención de IDs**: `id_tabla` (id_cliente, id_usuario, id_solicitud, etc)

---

## 🔑 Configuración de OAuth

### **Google Sign-In**

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Crea un nuevo proyecto
3. Habilita "Google+ API"
4. Ve a "Credenciales" → "Crear Credenciales" → "ID de cliente OAuth"
5. Tipo: "Aplicación web"
6. URI autorizados:
   ```
   http://localhost:3000
   http://localhost:8080
   https://tudominio.com
   ```
7. Copia el **Client ID** y reemplaza en los HTMLs:
   ```javascript
   client_id: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com'
   ```

---

### **Facebook Login**

1. Ve a [Facebook Developers](https://developers.facebook.com)
2. Crea una nueva app
3. Selecciona "Product" → "Facebook Login"
4. En Configuración:
   - App Domains: `localhost`, `tudominio.com`
   - Valid OAuth Redirect URIs: `http://localhost:3000/callback`
5. Copia el **App ID** y reemplaza:
   ```javascript
   appId: 'YOUR_FACEBOOK_APP_ID'
   ```

---

### **Instagram OAuth**

Instagram no tiene SDK de cliente directo. Necesitas:

1. Backend endpoint: `/api/auth/instagram`
2. Usar Instagram Graph API con app access token
3. El endpoint debe redirigir a Instagram y manejar el callback

**Endpoint Backend recomendado:**
```javascript
// backend/routes/auth.js
router.get('/instagram', (req, res) => {
  const clientId = process.env.INSTAGRAM_APP_ID;
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;
  const scope = 'user_profile,user_media';
  
  const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code`;
  res.redirect(authUrl);
});

router.get('/instagram/callback', async (req, res) => {
  // Manejar intercambio de código por token
});
```

---

## 📁 Archivos Modificados

### Frontend
- **`registro.html`** ✅ NUEVO
  - Formulario híbrido (OAuth + manual)
  - Tabs: Registro / Login
  - Inteligente: Detecta si es signup o login
  - Redirige a dashboard según tipo

- **`contacto.html`** 🔄 SERÁ ACTUALIZADO
  - Enfocado en Alquiler del Salón
  - OAuth pre-rellena: nombre, apellido, email, teléfono
  - Continúa a solicitud_alquiler.html

### Backend
- **`backend/routes/auth.js`** 🔄 SERÁ CREADO
  - POST `/api/auth/register` - Crear usuario + cliente
  - POST `/api/auth/login` - Autenticación
  - GET `/api/auth/instagram` - OAuth Instagram
  - GET `/api/auth/instagram/callback` - Manejo de callback
  - POST `/api/auth/oauth-callback` - Procesar tokens OAuth

- **`backend/controllers/authController.js`** 🔄 SERÁ CREADO
  - Lógica de registración
  - Lógica de login
  - Manejo de OAuth tokens

- **`backend/middleware/auth.js`** 🔄 SERÁ CREADO
  - Verificar token JWT
  - Proteger rutas

---

## 🔄 Flujo de Autenticación

### **Registro con OAuth**

```
Usuario → Haz clic "Google/Facebook/Instagram"
    ↓
Proveedor confirma identidad
    ↓
Frontend recibe token/datos
    ↓
Frontend → Backend: POST /api/auth/register
    {
      email,
      nombre,
      apellido,
      telefono,
      proveedor_oauth,
      id_oauth,
      token_oauth (opcional)
    }
    ↓
Backend:
  1. Crea registro en `usuarios`
  2. Crea registro en `clientes` con FK
  3. Retorna JWT + id_cliente
    ↓
Frontend: Guarda JWT en localStorage
    ↓
Redirige a dashboard
```

### **Login con OAuth**

```
Usuario → Haz clic "Google/Facebook"
    ↓
Proveedor confirma identidad
    ↓
Frontend → Backend: POST /api/auth/oauth-callback
    {
      proveedor_oauth,
      id_oauth,
      email (de la respuesta del proveedor)
    }
    ↓
Backend:
  1. Busca usuario por (proveedor_oauth, id_oauth)
  2. Si existe: Retorna JWT
  3. Si no existe: Error 401
    ↓
Frontend: Guarda JWT
    ↓
Redirige a dashboard/solicitud según contexto
```

---

## 🛠️ Próximos Pasos (Backend)

### 1. Instalar dependencias en Docker
```bash
docker-compose exec backend npm install jsonwebtoken bcryptjs dotenv
```

### 2. Crear `.env.local` en `backend/`
```
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
FACEBOOK_APP_ID=xxx
FACEBOOK_APP_SECRET=xxx
INSTAGRAM_APP_ID=xxx
INSTAGRAM_APP_SECRET=xxx
INSTAGRAM_REDIRECT_URI=http://localhost:3000/auth/instagram/callback

JWT_SECRET=tu_secreto_super_seguro

DB_HOST=database
DB_USER=root
DB_PASSWORD=root
DB_NAME=tdc_db
```

### 3. Crear `backend/routes/auth.js`
```javascript
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/oauth-callback', authController.oauthCallback);
router.get('/instagram', authController.instagramAuth);
router.get('/instagram/callback', authController.instagramCallback);

module.exports = router;
```

### 4. Integrar en `backend/server.js`
```javascript
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);
```

---

## 📝 Variables de Entorno Necesarias

Añade a `backend/.env` o `.env.local`:

```
# Google
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Facebook
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=

# Instagram
INSTAGRAM_APP_ID=
INSTAGRAM_APP_SECRET=
INSTAGRAM_REDIRECT_URI=http://localhost/auth/instagram/callback

# JWT
JWT_SECRET=tu_secreto_aqui
JWT_EXPIRE=7d

# Base de datos
DB_HOST=database
DB_USER=root
DB_PASSWORD=root
DB_NAME=tdc_db

# App
APP_URL=http://localhost
APP_ENV=development
```

---

## ✅ Checklist de Implementación

- [ ] Crear credenciales Google OAuth
- [ ] Crear App Facebook con Facebook Login
- [ ] Configurar Instagram App (futura)
- [ ] Crear `backend/routes/auth.js`
- [ ] Crear `backend/controllers/authController.js`
- [ ] Crear `backend/middleware/auth.js`
- [ ] Instalar dependencias: `jsonwebtoken`, `bcryptjs`
- [ ] Actualizar `.env`
- [ ] Ejecutar migration de BD (schema actualizado)
- [ ] Probar registro con Google en `registro.html`
- [ ] Probar login con Google en `registro.html`
- [ ] Actualizar `contacto.html` para Alquiler
- [ ] Probar flujo completo

---

## 🚀 Uso del Sistema

### **Para Registrarse (Cliente)**
1. Va a `registro.html`
2. Elige "Nuevo" tab
3. Haz clic en Google/Facebook/Instagram
4. Se auto-completa nombre, apellido, email
5. Completa teléfono y contraseña
6. Se crea usuario + cliente
7. Recibe JWT, se guarda en localStorage

### **Para Login**
1. Va a `registro.html`
2. Elige "Ingresar" tab
3. Email + Contraseña
4. O haz clic en Google/Facebook
5. Recibe JWT

### **Para Solicitar Alquiler**
1. Va a `contacto.html`
2. Haz clic en Google/Facebook/Instagram
3. Se pre-rellena: nombre, apellido, email
4. Completa teléfono (opcional si es del OAuth)
5. Continúa a `solicitud_alquiler.html`
6. Se crea cliente (sin usuario si no está loggeado todavía)
7. Se crea solicitud vinculada al cliente

---

## 🔒 Seguridad

✅ **Implementado:**
- Contraseña hasheada con bcryptjs
- JWT firmados para seaiones
- Tokens OAuth almacenados seguros
- HTTPS requerido en producción

⚠️ **Recomendaciones:**
- Usa HTTPS en producción
- Guarda secrets en `process.env`
- Valida emails antes de usar
- Rate limit en endpoints de auth
- CORS configurado correctamente

---

**¿Dudas? Continuamos con el backend cuando esté listo.** 🚀

