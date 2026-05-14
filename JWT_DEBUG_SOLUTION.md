# 🔧 Solución: JWT con id_cliente=null

## Diagnóstico Final

### ✅ Backend: Funcionando correctamente
- El servidor devuelve `id_cliente: 4` en el login
- El JWT contiene correctamente `"id_cliente": 4` en el payload
- Database query está retornando el dato correcto
- **Código confirmado en producción** 

### ❌ Frontend: JWT antiguo en caché
- Tu navegador tiene almacenado un JWT antiguo (antes de los cambios)
- Aunque el backend devuelve el JWT nuevo, tu localStorage sigue con el viejo
- Por eso ves `id_cliente: null` en la consola

## SOLUCIÓN: Limpiar caché y hacer login nuevo

### Opción 1: Automática (Recomendada)

1. **Abre tu navegador en**: `http://localhost/clear-auth.html`
2. **Haz click** en "Limpiar y Logout"
3. Se limpiarán automáticamente:
   - localStorage
   - sessionStorage
   - cookies
   - cache
   - IndexedDB
4. Te redirigirá a login automáticamente

### Opción 2: Manual desde la Consola

1. Abre el navegador en cualquier página del sitio
2. Presiona **F12** para abrir DevTools
3. Abre la pestaña **Console**
4. Copia y pega esto:

```javascript
(function(){console.log('Limpiando...');localStorage.clear();sessionStorage.clear();document.cookie.split(";").forEach(c=>{document.cookie=c.split("=")[0].trim()+`=;expires=${new Date(0).toUTCString()};path=/;`});console.log('✓ Limpiado');window.location.href='/login.html';})();
```

5. Presiona **Enter**
6. Se limpiarará todo y te enviará a login

### Opción 3: Nuclear (Borrar todo desde navegador)

**Chrome/Edge:**
1. Presiona **Ctrl + Shift + Delete** (o Cmd + Shift + Delete en Mac)
2. Elige **Cookies y otros datos de sitios** 
3. Rango: **Todo**
4. Haz click **Borrar datos**
5. Recarga la página

---

## Después de Limpiar: Haz Login Nuevo

1. Ve a `http://localhost/login.html`
2. **Ingresa:**
   - **Email**: `villalbarodrigo2009@gmail.com`
   - **Contraseña**: `rodrigo`
3. Haz click **Login**

---

## Verificar que funciona

### En la Consola (F12 → Console):

Deberías ver logs como:

```
[JWT_DECODE] ===== DECODIFICACION JWT =====
[JWT_DECODE] id_cliente (del JWT): 4 ✅✅✅
[JWT_DECODE] id_cliente (asignado this.clientId): 4
```

### En config_bandas.html → Modal Eventos

Cuando abras la modal para crear nuevo evento, deberías ver:

```
✓ Cliente auto-seleccionado: "Rodrigo" (id: 4)
```

---

## Debugging Adicional

Si **aún ves `id_cliente: null`** después de:
1. Limpiar localStorage
2. Hacer logout completamente
3. Cerrar navegador (opcional)
4. Hacer login nuevo

**Prueba esto desde consola:**

```javascript
// Ver qué hay en localStorage
console.log('authToken:', localStorage.getItem('authToken'));

// Decodificar y ver el JWT actual
function decodeJWT(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
        atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    );
    return JSON.parse(jsonPayload);
}

const token = localStorage.getItem('authToken');
if (token) {
    const payload = decodeJWT(token);
    console.log('JWT Payload:', payload);
    console.log('id_cliente en JWT:', payload.id_cliente);
} else {
    console.log('NO HAY TOKEN EN LOCALSTORAGE');
}
```

---

## Archivos Generados

- `/frontend/clear-auth.html` - Página de limpieza automática
- `/frontend/cleanup-jwt.js` - Script para copiar a consola
- `/backend/controllers/authController.js` - Con logging mejorado (líneas 57-67, 218-223)

---

## Próximos pasos si aún falla

Si después de todo esto sigue siendo `null`, el problema sería:
- El backend no está siendo usado (caché de contenedor)
- La query del usuario no está devolviendo id_cliente
- Valores cacheados en el navegador

En ese caso, contactame con:
1. Captura de pantalla de consola mostrando el JWT payload
2. Resultado de ejecutar: `curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"villalbarodrigo2009@gmail.com","password":"rodrigo"}' | python3 -m json.tool`
