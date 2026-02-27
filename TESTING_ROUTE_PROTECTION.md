# 🧪 Guía de Pruebas - Protección de Rutas

## ✅ Verificación Previa

Antes de hacer pruebas, verifica que:

```bash
✓ Backend está corriendo
✓ Base de datos accesible
✓ Nginx proxy en puerto 80
✓ No hay errores en DevTools console
```

---

## 🔐 Test 1: Acceso sin Autenticación

**Objetivo:** Verificar que usuario no autenticado es redirigido a registro

### Pasos:

1. **Limpiar autenticación:**
   ```javascript
   // En DevTools console (F12):
   localStorage.removeItem('authToken');
   sessionStorage.clear();
   ```

2. **Navegar a página protegida:**
   ```
   http://localhost/solicitud_banda.html
   ```

3. **Resultado esperado:**
   - ✅ Página se carga brevemente
   - ✅ Redirección automática a `http://localhost/registro.html`
   - ✅ En DevTools → Storage → sessionStorage aparece:
     ```
     returnTo: "/solicitud_banda.html"
     ```

### Debugging (si no funciona):

```javascript
// En DevTools console:
console.log('authToken:', localStorage.getItem('authToken'));
console.log('navbarManager:', window.navbarManager);
console.log('isAuthenticated:', window.navbarManager?.isAuthenticated);
console.log('returnTo:', sessionStorage.getItem('returnTo'));
```

---

## 🔑 Test 2: Acceso con Autenticación Válida

**Objetivo:** Verificar que usuario autenticado puede acceder

### Pasos:

1. **Completar login:**
   - Ir a `http://localhost/login.html`
   - Ingresar credenciales válidas
   - O usar OAuth (Google/Facebook)

2. **Verificar token:**
   ```javascript
   // En DevTools console:
   const token = localStorage.getItem('authToken');
   console.log('Token:', token);
   console.log('Token válido:', !!token && token.length > 20);
   ```

3. **Navegar a página protegida:**
   ```
   http://localhost/solicitud_banda.html
   ```

4. **Resultado esperado:**
   - ✅ La página carga sin redireccionamiento
   - ✅ Navbar muestra usuario autenticado (esquina superior derecha)
   - ✅ Formulario de solicitud es visible

### Debugging:

```javascript
console.log('NavbarManager:', window.navbarManager);
console.log('Usuarios:', window.navbarManager?.userEmail);
console.log('Roles:', window.navbarManager?.userRoles);
```

---

## ⏰ Test 3: Token Expirado

**Objetivo:** Verificar que token expirado causa redirección a registro

### Pasos:

1. **Crear token falso expirado:**
   ```javascript
   // En DevTools console:
   const expieredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZF91c3VhcmlvIjoxLCJub21icmUiOiJUZXN0IiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwicm9sZXMiOltdLCJwZXJtaXNvcyI6W10sIm5pdmVsIjowLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MTYwMDAwMDAwMH0.nB3tJ5k2L1m7P9q8R5S2T3u4V6w7X8Y9Z0a1B2c3D4e'; // token con exp: 1600000000 (muy viejo)
   localStorage.setItem('authToken', expieredToken);
   ```

2. **Navegar a página protegida:**
   ```
   http://localhost/solicitud_banda.html
   ```

3. **Resultado esperado:**
   - ✅ Detecta que token está expirado
   - ✅ Limpia localStorage
   - ✅ Redirección a `http://localhost/registro.html`
   - ✅ `sessionStorage.returnTo` guardado

### Debugging:

```javascript
// Verificar decodificación de test token:
const token = localStorage.getItem('authToken');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Token payload:', payload);
console.log('Exp timestamp:', payload.exp);
console.log('Ahora timestamp:', Math.floor(Date.now() / 1000));
console.log('Está expirado:', payload.exp < Math.floor(Date.now() / 1000));
```

---

## 🔄 Test 4: Flujo Completo (Registro → Solicitud)

**Objetivo:** Verificar todo el flujo desde registro hasta acceso a página protegida

### Pasos:

1. **Limpiar autenticación:**
   ```javascript
   localStorage.removeItem('authToken');
   sessionStorage.clear();
   ```

2. **Acceder a página de solicitud:**
   ```
   http://localhost/solicitud_banda.html
   ```
   → Redirecciona a registro

3. **Rellenar formulario de registro:**
   - Email: `test@ejemplo.com`
   - Nombre: `Usuario Test`
   - Password: `password123`
   - Confirmar password: `password123`
   - Click "Registrarse"

4. **Verificar redirección a solicitud:**
   - ✅ Después de registro exitoso, debe redirigir a:
     ```
     http://localhost/solicitud_banda.html
     ```
   - ✅ NOT a /admin.html (porque returnTo fue guardado)

5. **Verificar acceso a formulario:**
   - ✅ Página carga completamente
   - ✅ Puede ver y completar el formulario
   - ✅ Navbar muestra usuario autenticado

### Debugging:

```javascript
// Antes de registro
console.log('returnTo antes:', sessionStorage.getItem('returnTo'));

// Después de registro
console.log('Token después:', localStorage.getItem('authToken'));
console.log('NavbarManager después:', window.navbarManager);
console.log('returnTo después:', sessionStorage.getItem('returnTo'));
```

---

## 🧪 Test 5: Múltiples Rutas Protegidas

**Objetivo:** Verificar que todas las 4 rutas protegidas funcionan

| Ruta | Descripción |
|------|-------------|
| `/solicitud_banda.html` | Solicitud para tocar en bandas |
| `/solicitud_servicio.html` | Solicitud de servicios |
| `/solicitud_taller_actividad.html` | Solicitud de talleres |
| `/solicitud_fecha_bandas.html` | Solicitud de fechas para bandas |

### Pasos:

Para cada ruta, repite:

1. Limpiar autenticación:
   ```javascript
   localStorage.removeItem('authToken');
   sessionStorage.clear();
   ```

2. Navegar a ruta:
   ```
   http://localhost[RUTA]
   ```

3. Verificar:
   - ✅ Redirige a `/registro.html`
   - ✅ `sessionStorage.returnTo` = ruta original

**Ejemplo Test con curl:**

```bash
# Sin autenticación (espera redirección 302/301)
curl -I http://localhost/solicitud_banda.html

# Con token (deberías obtener 200)
COOKIE="authToken=<your_valid_token>"
curl -I -b "$COOKIE" http://localhost/solicitud_banda.html
```

---

## 🐛 Debugging Avanzado

### Verificar PROTECTED_ROUTES en navbar.js:

```javascript
// En DevTools console:
console.log('Rutas protegidas:', [
    '/solicitud_banda.html',
    '/solicitud_servicio.html',
    '/solicitud_taller_actividad.html',
    '/solicitud_fecha_bandas.html'
]);

// Verificar si ruta actual está en lista
const currentPath = window.location.pathname;
const isProtected = [
    '/solicitud_banda.html',
    '/solicitud_servicio.html',
    '/solicitud_taller_actividad.html',
    '/solicitud_fecha_bandas.html'
].some(route => currentPath.includes(route));
console.log('Ruta actual protegida:', isProtected);
```

### Ver logs de protección:

```javascript
// Agregar logs en navbar.js (línea 736) durante debugging:
function protectRoutesAutomatically() {
    console.log('🔐 protectRoutesAutomatically ejecutada');
    console.log('  currentPath:', window.location.pathname);
    console.log('  isProtected:', isProtectedRoute());
    console.log('  isAuthenticated:', navbarManager?.isAuthenticated);
    console.log('  sessionStorage.returnTo:', sessionStorage.getItem('returnTo'));
    
    if (!isProtectedRoute()) {
        console.log('  → No es ruta protegida, continuando');
        return;
    }

    if (!navbarManager || !navbarManager.isAuthenticated) {
        console.log('  → No autenticado, redirigiendo a registro');
        sessionStorage.setItem('returnTo', window.location.pathname);
        window.location.href = '/registro.html';
        return;
    }

    if (navbarManager.isTokenExpired?.()) {
        console.log('  → Token expirado, redirigiendo');
        navbarManager.clearAuth();
        sessionStorage.setItem('returnTo', window.location.pathname);
        window.location.href = '/registro.html';
    }
    
    console.log('  ✓ Autenticado y token válido');
}
```

---

## 📊 Checklist de Prueba

```
[ ] Test 1: Sin autenticación redirige a registro
[ ] Test 2: Con autenticación permite acceso
[ ] Test 3: Token expirado limpia y redirige
[ ] Test 4: Flujo completo registro → solicitud → acceso
[ ] Test 5a: /solicitud_banda.html protegida
[ ] Test 5b: /solicitud_servicio.html protegida
[ ] Test 5c: /solicitud_taller_actividad.html protegida
[ ] Test 5d: /solicitud_fecha_bandas.html protegida
[ ] Navbar se muestra correctamente en páginas protegidas
[ ] sessionStorage.returnTo se guarda correctamente
[ ] Redirección a returnTo después de login funciona
[ ] NavbarManager está disponible globalmente
[ ] No hay errores en console
[ ] No hay redirecciones infinitas
```

---

## 🚨 Posibles Problemas y Soluciones

### Problema: No redirecciona a registro

**Causa posible:** NavbarManager no se instancia

**Solución:**
```javascript
// En DevTools console:
console.log('navbarManager:', window.navbarManager);
// Debería mostrar NavbarManager { isAuthenticated: false, ... }

// Si es null, reinicia la página:
location.reload();
```

---

### Problema: Redirección infinita

**Causa posible:** isProtectedRoute() siempre retorna true

**Solución:**
```javascript
// Verificar rutas protegidas:
console.log('Path actual:', window.location.pathname);
console.log('¿Contiene /solicitud_banda.html?', 
    window.location.pathname.includes('/solicitud_banda.html'));
```

---

### Problema: returnTo no se guarda

**Causa posible:** sessionStorage deshabilitado

**Solución:**
```javascript
// En DevTools console:
try {
    sessionStorage.setItem('test', 'value');
    console.log('sessionStorage disponible');
    console.log('Valor test:', sessionStorage.getItem('test'));
} catch (e) {
    console.error('sessionStorage NO disponible:', e);
}
```

---

### Problema: NavbarManager no decodifica JWT

**Causa posible:** Token JWT inválido

**Solución:**
```javascript
// Verificar estructura del token:
const token = localStorage.getItem('authToken');
if (!token) {
    console.log('No hay token en localStorage');
} else {
    const parts = token.split('.');
    if (parts.length !== 3) {
        console.log('Token inválido (no tiene 3 partes)');
    } else {
        try {
            const payload = JSON.parse(atob(parts[1]));
            console.log('Payload decodificado:', payload);
        } catch (e) {
            console.log('Error decodificando payload:', e);
        }
    }
}
```

---

## 🎯 Criterio de Aceptación

La implementación se considera **EXITOSA** cuando:

✅ Usuario no autenticado **NO PUEDE** acceder a rutas protegidas
✅ Usuario autenticado **PUEDE** acceder a rutas protegidas
✅ Token expirado **CAUSA REDIRECCIÓN** a registro
✅ `sessionStorage.returnTo` se guarda y usa correctamente
✅ Navbar se inyecta en todas las páginas
✅ **CERO** redirecciones infinitas
✅ **CERO** errores en console
✅ Flujo completo funciona: registro → solicitud → acceso

---

## 📞 Soporte / Debugging

Para debugging adicional, puedes:

1. **Activar logs en navbar.js** (línea ~738):
   ```javascript
   console.log('🔐 Route protection check:', { 
       path: window.location.pathname,
       isProtected: isProtectedRoute(),
       auth: navbarManager?.isAuthenticated
   });
   ```

2. **Ver categoría de Errores** en DevTools:
   - F12 → Console
   - Buscar `protectRoutesAutomatically`

3. **Usar Network tab** para ver redirección:
   - F12 → Network
   - Navegar a página protegida
   - Ver redirección en lista de requests

4. **Inspeccionar Storage:**
   - F12 → Application/Storage
   - localStorage → authToken
   - sessionStorage → returnTo
