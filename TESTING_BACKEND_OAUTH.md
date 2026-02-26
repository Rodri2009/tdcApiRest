# 🧪 Guía de Prueba - Backend OAuth

Esta guía explica cómo probar los endpoints de autenticación usando `curl`, Postman o herramientas similares.

## 🔧 Requisitos Previos

1. Backend corriendo en `http://localhost:3000`
2. Base de datos MariaDB/MySQL accesible
3. Variables de entorno configuradas (.env o docker-compose)

---

## ✅ Prueba 1: Registro Manual

### Comando cURL

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Juan",
    "apellido": "Pérez",
    "email": "juan.perez@test.com",
    "telefono": "+541234567890",
    "password": "TestPassword123"
  }'
```

### Respuesta Esperada (201)

```json
{
  "message": "Registro exitoso.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id_usuario": 1,
    "nombre": "Juan",
    "apellido": "Pérez",
    "email": "juan.perez@test.com",
    "rol": "cliente",
    "roles": ["cliente"],
    "permisos": ["solicitudes.ver_propias", "solicitudes.crear"],
    "nivel": 10
  }
}
```

### Errores Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `El email ya está registrado` | Email duplicado | Usa otro email |
| `La contraseña debe tener al menos 6 caracteres` | Password corta | Usa >6 caracteres |
| `Todos los campos son requeridos` | Falta un campo | Verifica JSON |

---

## ✅ Prueba 2: Login Manual

### Comando cURL

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "juan.perez@test.com",
    "password": "TestPassword123"
  }'
```

### Respuesta Esperada (200)

```json
{
  "message": "Login exitoso.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id_usuario": 1,
    "nombre": "Juan",
    "apellido": "Pérez",
    "email": "juan.perez@test.com",
    "rol": "cliente",
    "roles": ["cliente"],
    "permisos": ["solicitudes.ver_propias", "solicitudes.crear"],
    "nivel": 10
  }
}
```

**Guarda el `token` para próximas pruebas:**

```bash
# Bash/Linux/Mac
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# PowerShell
$TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## ✅ Prueba 3: OAuth Google Simulate

En la vida real, el token viene de la SDK de Google. Aquí simulamos.

### Obtener Credential (en navegador, developer tools)

1. Abre `http://localhost:3000/registro.html`
2. Haz clic en "Conectar con Google"
3. En el callback, inspecciona el JWT decodificado:

```javascript
// En console del navegador:
const token = response.credential;
const decoded = parseJwt(token);
console.log(decoded);
// Típicamente:
// {
//   iss: 'https://accounts.google.com',
//   sub: '110169865799075953093',  // ← Este es id_oauth
//   email: 'user@gmail.com',
//   email_verified: true,
//   given_name: 'Juan',
//   family_name: 'Pérez',
//   picture: 'https://lh3.googleusercontent.com/...',
//   iat: 1699500000,
//   exp: 1699503600
// }
```

### Comando cURL (Simulación)

```bash
curl -X POST http://localhost:3000/api/auth/oauth-callback \
  -H "Content-Type: application/json" \
  -d '{
    "proveedor_oauth": "google",
    "id_oauth": "110169865799075953093",
    "email": "user@gmail.com",
    "nombre": "Juan",
    "apellido": "Pérez",
    "foto_url": "https://lh3.googleusercontent.com/a/default-user"
  }'
```

### Respuesta Esperada (201 - Nuevo usuario)

```json
{
  "message": "Registro OAuth exitoso.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id_usuario": 2,
    "nombre": "Juan",
    "apellido": "Pérez",
    "email": "user@gmail.com",
    "rol": "cliente",
    "roles": ["cliente"],
    "permisos": ["solicitudes.ver_propias", "solicitudes.crear"],
    "nivel": 10
  }
}
```

### Segunda Prueba del Mismo Google (200 - Login)

Usa el mismo `id_oauth` pero diferente `email` (simulando actualización de datos):

```bash
curl -X POST http://localhost:3000/api/auth/oauth-callback \
  -H "Content-Type: application/json" \
  -d '{
    "proveedor_oauth": "google",
    "id_oauth": "110169865799075953093",
    "email": "newemail@gmail.com",
    "nombre": "Giovanni",
    "apellido": "Pérez"
  }'
```

**Resultado:** HTTP 200 (LOGIN), retorna el usuario existente

---

## ✅ Prueba 4: Obtener Usuario Actual (GET /me)

### Comando cURL con Token

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### O con Cookie (si el navegador la tenía)

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Cookie: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Respuesta Esperada (200)

```json
{
  "id_usuario": 1,
  "nombre": "Juan",
  "apellido": "Pérez",
  "email": "juan.perez@test.com",
  "rol": "cliente",
  "activo": 1,
  "roles": ["cliente"],
  "permisos": ["solicitudes.ver_propias", "solicitudes.crear"],
  "nivel": 10
}
```

---

## ✅ Prueba 5: Logout

### Comando cURL

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Content-Type: application/json"
```

### Respuesta Esperada (200)

```json
{
  "message": "Logout exitoso."
}
```

**Nota:** La cookie del token es limpiada del lado del servidor.

---

## 🚨 Pruebas de Error

### Error 1: Email Duplicado

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Pedro",
    "apellido": "López",
    "email": "juan.perez@test.com",  # ← Ya existe
    "telefono": "+549876543210",
    "password": "AnotherPassword123"
  }'
```

**Respuesta (409):**
```json
{
  "message": "El email ya está registrado."
}
```

---

### Error 2: Proveedor OAuth Inválido

```bash
curl -X POST http://localhost:3000/api/auth/oauth-callback \
  -H "Content-Type: application/json" \
  -d '{
    "proveedor_oauth": "linkedin",  # ← No soportado
    "id_oauth": "12345",
    "email": "test@example.com"
  }'
```

**Respuesta (400):**
```json
{
  "message": "Proveedor OAuth inválido. Use: google, facebook, instagram."
}
```

---

### Error 3: Token Expirado/Inválido (GET /me)

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer invalid.token.here"
```

**Respuesta (401):**
```json
{
  "message": "No autorizado, token inválido."
}
```

---

### Error 4: Sin Token (GET /me)

```bash
curl -X GET http://localhost:3000/api/auth/me
```

**Respuesta (401):**
```json
{
  "message": "No autorizado, no hay token."
}
```

---

## 📊 Verificar en Base de Datos

Después de las pruebas, verifica que los datos se crearon:

```sql
-- Conectar a MariaDB
mysql -h localhost -u root -p tdc_db

-- Ver usuarios creados
SELECT id_usuario, email, nombre, apellido, rol, proveedor_oauth FROM usuarios;

-- Ver clientes vinculados
SELECT c.id_cliente, c.id_usuario, c.nombre, u.email 
FROM clientes c 
LEFT JOIN usuarios u ON c.id_usuario = u.id_usuario;

-- Ver relación 1:1
SELECT COUNT(*) as total_usuarios FROM usuarios;
SELECT COUNT(*) as total_clientes FROM clientes;
-- Deberían ser iguales (si todos son clientes)
```

---

## 🔄 Flujo Completo en Postman

1. **Crear Collection:** "TDC OAuth Testing"

2. **Request 1: Registro Manual**
   - Method: POST
   - URL: `http://localhost:3000/api/auth/register`
   - Body (JSON):
     ```json
     {
       "nombre": "Test",
       "apellido": "User",
       "email": "test@example.com",
       "telefono": "+1234567890",
       "password": "TestPass123"
     }
     ```
   - Save response token en variable: `token`

3. **Request 2: Get Me**
   - Method: GET
   - URL: `http://localhost:3000/api/auth/me`
   - Headers:
     - Authorization: `Bearer {{token}}`
   - Verify response contiene id_usuario, nombre, etc.

4. **Request 3: OAuth Callback**
   - Method: POST
   - URL: `http://localhost:3000/api/auth/oauth-callback`
   - Body (JSON):
     ```json
     {
       "proveedor_oauth": "google",
       "id_oauth": "123456789",
       "email": "oauth@example.com",
       "nombre": "OAuth",
       "apellido": "User"
     }
     ```

5. **Request 4: Logout**
   - Method: POST
   - URL: `http://localhost:3000/api/auth/logout`

---

## ⏱️ Tiempos Esperados

| Endpoint | Tiempo |
|----------|--------|
| POST /register | 100-300ms |
| POST /login | 100-200ms |
| POST /oauth-callback (nuevo) | 150-400ms |
| POST /oauth-callback (existente) | 50-150ms |
| GET /me | 50-100ms |
| POST /logout | 20-50ms |

Si son significativamente más lentos, revisar:
- Conexión a DB
- Índices en usuarios (email UNIQUE)
- Índices en (proveedor_oauth, id_oauth)

---

## 🐛 Debugging

### Logs en Consola del Backend

Si ejecutas con logs activados:

```bash
DEBUG=* node server.js
```

Verás mensajes como:
```
✅ Usuario registrado: juan.perez@test.com (id_usuario: 1)
✅ Usuario OAuth creado: user@gmail.com (google)
🔍 OAuth login existente: google / 110169865799075953093
```

### Verificar Variables de Entorno

```bash
# En contenedor Docker o shell
echo $JWT_SECRET
echo $DB_HOST
echo $DB_NAME
```

Asegúrate de que JWT_SECRET no esté vacía.

---

## ✔️ Checklist Antes de Producción

- [ ] JWT_SECRET es una string larga y aleatoria (no 'secret')
- [ ] Base de datos está ejecutándose y accesible
- [ ] Índices creados en usuarios.email y usuarios.(proveedor_oauth, id_oauth)
- [ ] Tests manuales de todos los endpoints pasan
- [ ] Error handling funciona (400, 401, 409)
- [ ] Password hashing funciona (no se guarda en plain text)
- [ ] Transacciones usuario+cliente no fallan
- [ ] Tokens expiran correctamente (8 horas)
- [ ] CORS configurado correctamente (si frontend en diferente dominio)
- [ ] HTTPS habilitado (al menos en producción)

