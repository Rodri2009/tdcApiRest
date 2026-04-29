# 🔐 Guía: Configurar Google OAuth 2.0

## 🎯 Objetivo
Obtener un **Google Client ID** válido para que funcione el login/registro en TDC.

---

## 📋 Requisitos Previos

- ✅ Cuenta de Google (Gmail)
- ✅ Acceso a [Google Cloud Console](https://console.cloud.google.com)
- ✅ Navegador actualizado

---

## 🚀 Paso 1: Crear un Proyecto en Google Cloud

### 1.1 Abre Google Cloud Console
Ve a: https://console.cloud.google.com

### 1.2 Selecciona o crea un proyecto
- **Si ya tienes un proyecto:** Selecciónalo del dropdown en la parte superior
- **Si es nuevo:**
  1. Haz clic en el botón "Nuevo proyecto"
  2. Nombre: `TDC` (o el que prefieras)
  3. Haz clic en "Crear"
  4. Espera a que se cree (puede tomar 1-2 minutos)
  5. Selecciona el proyecto cuando aparezca

### 1.3 Habilita Google+ API
1. En el menú izquierdo, ve a **APIs y servicios** → **Biblioteca**
2. Busca: `Google+ API`
3. Haz clic en el resultado
4. Haz clic en el botón azul **"Habilitar"**
5. Espera a que termine

---

## 🔑 Paso 2: Crear Credenciales OAuth 2.0

### 2.1 Ve a Credenciales
1. En el menú izquierdo: **APIs y servicios** → **Credenciales**
2. Haz clic en el botón **"+ Crear credenciales"** (arriba)
3. Selecciona **"ID de cliente OAuth"**

Si ves un aviso "Debes crear una pantalla de consentimiento primero":
- Haz clic en **"Configurar pantalla de consentimiento"**
- Ve al Paso 2.2

### 2.2 [SI ES NECESARIO] Configura la Pantalla de Consentimiento

1. Tipo de usuario: Selecciona **"Externo"** (para testing)
2. Haz clic en **"Crear"**

Llena el formulario:
- **Nombre de la app:** `TDC`
- **Email de soporte:** tu email
- **Emails de contacto del desarrollador:** tu email
- Haz clic en **"Guardar y continuar"**

Permisos (Paso 2):
- No agregues permisos de momento (no los necesitas)
- Haz clic en **"Guardar y continuar"**

Usuarios de prueba (Paso 3):
- Haz clic en **"Añadir usuarios"**
- Agrega tu email: `villalbarodrigo2009@gmail.com`
- Haz clic en **"Guardar y continuar"**

Revisa y envía:
- Haz clic en **"Volver a inicio"** o **"GUARDAR"**

### 2.3 Vuelve a Credenciales
1. Ve nuevamente a **APIs y servicios** → **Credenciales**
2. Haz clic en **"+ Crear credenciales"** → **"ID de cliente OAuth"**

---

## 🌐 Paso 3: Configura los Orígenes Autorizados

En la ventana "Crear ID de cliente OAuth":

### 3.1 Tipo de Aplicación
**Selecciona: "Aplicación web"**

### 3.2 Nombre
Nombre: `TDC Web App` (opcional)

### 3.3 Orígenes Autorizados (CRÍTICO)
Haz clic en **"+ Añadir URI"** y agrega:

```
http://localhost:3000
http://127.0.0.1:3000
```

Si también tienes un dominio real (e.g., example.com):
```
https://example.com
https://www.example.com
```

### 3.4 URLs de redirección autorizadas
Haz clic en **"+ Añadir URI"** bajo esta sección y agrega:

```
http://localhost:3000/registro.html
http://localhost:3000/contacto_oauth.html
http://localhost:3000/index.html
http://127.0.0.1:3000/registro.html
```

En producción agregar:
```
https://example.com/registro.html
https://example.com/contacto_oauth.html
```

### 3.5 Crea las Credenciales
Haz clic en **"Crear"**

---

## 📋 Paso 4: Copia el Client ID

Deberías ver una ventana con:
- ✅ **Client ID** (esto es lo que necesitas)
- Secret ID (NO compartir)

**Copia el Client ID** (se parece a esto):
```
123456789-abc123def456ghi789jkl012mno.apps.googleusercontent.com
```

---

## 💾 Paso 5: Configura tu Aplicación TDC

### 5.1 Abre el archivo config.js

Ruta: `/home/rodrigo/tdcApiRest/frontend/config.js`

```javascript
const CONFIG = {
    GOOGLE_CLIENT_ID: 'REEMPLAZA_CON_TU_CLIENT_ID_AQUI.apps.googleusercontent.com',
    // ↑ Reemplaza esto con tu Client ID
    
    FACEBOOK_APP_ID: 'REEMPLAZA_CON_APP_ID',
    ...
};
```

### 5.2 Reemplaza el placeholder

Cambia:
```javascript
GOOGLE_CLIENT_ID: 'REEMPLAZA_CON_TU_CLIENT_ID_AQUI.apps.googleusercontent.com',
```

Por tu Client ID real (el que copiaste):
```javascript
GOOGLE_CLIENT_ID: '123456789-abc123def456ghi789jkl012mno.apps.googleusercontent.com',
```

**GUARDA EL ARCHIVO**

---

## 🧪 Prueba que Funcionó

### 6.1 Recarga el navegador
1. Ve a `http://localhost:3000/registro.html`
2. Haz clic en el botón **"Google"** (en la sección OAuth)

### 6.2 Verifica que aparezca el popup de Google
- Si appears el popup de Google ✅ → ¡FUNCIONA!
- Si ves el error "invalid_client" ❌ → Revisa los pasos anteriores

### Errores Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `The OAuth client was not found` | Client ID no existe o es inválido | Revisa que copiaste correctamente del Console |
| `invalid_client` | Client ID inválido | Asegúrate que termina con `.apps.googleusercontent.com` |
| Popup no aparece | Origin no autorizado | Agrega `http://localhost:3000` a los **Orígenes Autorizados** |
| `Origin mismatch` | Dominio no está autorizado | Verifica que los Orígenes exactamente coincidan (http vs https) |

---

## 🔒 Seguridad: Protege tu Client ID

### ⚠️ IMPORTANTE:
- El **Client ID** es PÚBLICO (está bien si se ve en el código frontend)
- El **Client Secret** es PRIVADO (nunca en frontend, solo en backend)
- El archivo `config.js` con tu Client ID **NO debe commitearse** a git
- (Ya está protegido en .gitignore)

---

## ✅ Checklist Final

- [ ] Proyecto creado en Google Cloud Console
- [ ] Google+ API habilitada
- [ ] Pantalla de consentimiento configurada
- [ ] OAuth 2.0 Client ID creado
- [ ] Orígenes autorizados incluyen `http://localhost:3000`
- [ ] URLs de redirección incluyen `/registro.html` y `/contacto_oauth.html`
- [ ] Client ID copiado al archivo `config.js`
- [ ] Popup de Google aparece en `registro.html`
- [ ] Login con Google funciona

---

## 🆘 Soporte Rápido

### Si algo falla:

**Opción 1: Revisa console de navegador**
```javascript
// F12 → Console (presiona F12 en navegador)
// Deberías ver:
// ✓ Configuración cargada (desarrollo)
// Y NO deberías ver:
// ⚠️ GOOGLE_CLIENT_ID no está configurado
```

**Opción 2: Verifica Google Cloud Console**
- Ve a: https://console.cloud.google.com/apis/credentials
- Verifica que tu proyecto está seleccionado
- Verifica que OAuth 2.0 Client ID existe
- Verifica que Orígenes incluyen `http://localhost:3000`

**Opción 3: Limpia cache**
```
1. Abre DevTools (F12)
2. Settings → Network conditions
3. Marca "Disable cache"
4. Recarga (Ctrl+Shift+R)
```

---

## 📞 Próximos Pasos

Una vez que Google OAuth funciona:

1. ¿Deseas configurar **Facebook Login** también?
   → Ver: `FACEBOOK_SETUP.md`

2. ¿Deseas configurar **Instagram OAuth**?
   → Ver: `INSTAGRAM_SETUP.md`

3. ¿Necesitas más ayuda?
   → Revisa: `BACKEND_OAUTH_FLOW.md`

