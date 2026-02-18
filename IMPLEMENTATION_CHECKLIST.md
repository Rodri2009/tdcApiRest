# ✅ Checklist - Integración de Servicios Puppeteer (Fase 1)

## 📋 Implementación Completada

### 1. HTTP Clients ✅
- [x] `backend/services/mercadopagoClient.js` - Cliente HTTP para Mercado Pago
  - Métodos: `getBalance()`, `getActivity()`, `refresh()`
  - Manejo de errores y timeouts (30-60s)
  - Soporte para caché (`fresh` parameter)

- [x] `backend/services/whatsappClient.js` - Cliente HTTP para WhatsApp
  - Métodos: `sendMessage()`, `getChats()`, `getMessages()`, `refresh()`
  - Manejo de errores y timeouts
  - Documentación en línea

### 2. Controladores ✅
- [x] `backend/controllers/mercadopagoController.js`
  - `getBalance()` - GET /api/mercadopago/balance
  - `getActivity()` - GET /api/mercadopago/activity
  - `refresh()` - POST /api/mercadopago/refresh
  - Validación de query params

- [x] `backend/controllers/whatsappController.js`
  - `sendMessage()` - POST /api/whatsapp/send-message
  - `getChats()` - GET /api/whatsapp/chats
  - `getMessages()` - GET /api/whatsapp/messages/:chatId
  - `refresh()` - POST /api/whatsapp/refresh
  - Validación de body params

### 3. Rutas ✅
- [x] `backend/routes/mercadopagoRoutes.js` - Rutas /api/mercadopago/*
- [x] `backend/routes/whatsappRoutes.js` - Rutas /api/whatsapp/*
- [x] Registradas en `backend/server.js`

### 4. Dependencias ✅
- [x] `axios@^1.13.5` - Cliente HTTP instalado
- [x] `backend/package.json` - Actualizado con axios

### 5. Configuración ✅
- [x] `backend/.env.example` - Plantilla de variables de entorno
  - `MP_API_URL=http://localhost:9001` (Fase 1)
  - `WA_API_URL=http://localhost:9002` (Fase 1)
  - Comentarios para transición a Fase 2

### 6. Documentación ✅
- [x] `PUPPET_SERVICES_INTEGRATION.md` - Documentación completa (600+ líneas)
  - Arquitectura Fase 1 y transición a Fase 2
  - Todos los endpoints con ejemplos curl
  - Flujo de trabajo completo
  - Manejo de errores y debugging
  - Testing y mocking
  - Notas sobre Fase 2

### 7. Git ✅
- [x] Commit con mensaje descriptivo
- [x] Push a origin/master
- [x] Historia limpia (5 últimos commits visibles)

---

## 🚀 Próximos Pasos

### Fase 1 (AHORA - Servidores Independientes)

1. **Verificar estructura**
   ```bash
   # Confirmar que todos los archivos están en su lugar
   find /home/almacen/tdcApiRest -name "*mercadopago*" -o -name "*whatsapp*"
   ```

2. **Crear serverMP** (si no existe)
   ```bash
   mkdir -p /home/almacen/serverMP
   # Copiar estructura completa de Puppeteer + Express
   # Endpoints: GET /api/balance, GET /api/activity, POST /api/refresh
   # Puerto: 9001
   ```

3. **Crear serverWhatsApp** (si no existe)
   ```bash
   mkdir -p /home/almacen/serverWhatsApp
   # Copiar estructura completa de Puppeteer + Express
   # Endpoints: POST /api/send-message, GET /api/chats, GET /api/messages/:id, POST /api/refresh
   # Puerto: 9002
   ```

4. **Configurar .env del backend**
   ```bash
   # Copiar plantilla a archivo real
   cp backend/.env.example backend/.env
   
   # Editar backend/.env y asegurar:
   MP_API_URL=http://localhost:9001
   WA_API_URL=http://localhost:9002
   # ... + otras variables de DB, email, etc.
   ```

5. **Ejecutar en orden**
   ```bash
   # Terminal 1: serverMP
   cd /home/almacen/serverMP
   docker-compose up -d
   
   # Terminal 2: serverWhatsApp
   cd /home/almacen/serverWhatsApp
   docker-compose up -d
   
   # Terminal 3: tdcApiRest
   cd /home/almacen/tdcApiRest
   docker-compose up -d
   ```

6. **Probar endpoints básicos**
   ```bash
   # Mercado Pago
   curl "http://localhost:3000/api/mercadopago/balance"
   curl "http://localhost:3000/api/mercadopago/activity?limit=10"
   
   # WhatsApp
   curl "http://localhost:3000/api/whatsapp/chats"
   curl -X POST http://localhost:3000/api/whatsapp/send-message \
     -H "Content-Type: application/json" \
     -d '{"phone":"+549123456789","message":"Test"}'
   ```

---

### Fase 2 (FUTURO - Docker Compose Unificado)

Cuando tdcApiRest esté completamente terminado:

1. **Mover servicios Puppeteer**
   ```
   serverMP/browser-service/ → tdcApiRest/backend/src/services/mercadopago/
   serverWhatsApp/browser-service/ → tdcApiRest/backend/src/services/whatsapp/
   ```

2. **Actualizar docker-compose.yml de tdcApiRest**
   ```yaml
   services:
     backend:
       ...
     
     mp-browser:
       build: ./docker/Dockerfile.mp-browser
       ports:
         - "9001:9001"
         - "5901:5901"  # VNC
       environment:
         - MP_USERNAME=${MP_USERNAME}
         - MP_PASSWORD=${MP_PASSWORD}
     
     wa-browser:
       build: ./docker/Dockerfile.wa-browser
       ports:
         - "9002:9002"
         - "5902:5902"  # VNC
       environment:
         - WA_PHONE=${WA_PHONE}
   ```

3. **Cambiar .env**
   ```env
   MP_API_URL=http://mp-browser:9001
   WA_API_URL=http://wa-browser:9002
   ```

4. **Cambios en código backend:** NINGUNO ✅
   - Los HTTP clients usarán los nuevos hostnames automáticamente
   - Todo sigue funcionando igual

---

## 📌 Puntos Clave

### ✨ Lo que funciona ahora
- ✅ HTTP clients abstractos y reutilizables
- ✅ Manejo automático de errores y timeouts
- ✅ Soporte para caché con parámetro `fresh`
- ✅ Documentación completa con ejemplos
- ✅ Estructura preparada para transición a Fase 2

### ⚠️ Lo que necesita serverMP/WA
- Puppeteer (browser automation)
- Xvfb (X11 virtual display)
- x11vnc (remote VNC access para debugging)
- Express.js API server
- Sesiones persistentes en volúmenes Docker

### 🔄 Arquitectura Agnóstica
El backend NO necesita cambios cuando:
- Cambias URL base (localhost → docker hostname)
- Cambias número de puerto
- Cambias protocolo (http → https)
- Cambias credenciales de serverMP/WA

Solo modifica `.env` y listo.

---

## 📊 Estadísticas de Implementación

| Componente | Archivos | Líneas |
|---|---|---|
| Services (Clients) | 2 | ~120 |
| Controllers | 2 | ~130 |
| Routes | 2 | ~50 |
| Integration Docs | 1 | 650+ |
| .env.example | 1 | ~30 |
| package.json | 1 | +axios |
| server.js changes | 1 | +4 lineas |
| **Total** | **10 archivos** | **~980 líneas** |

---

## 🧪 Testing Rápido (sin servidores reales)

```javascript
// Mock en tests
jest.mock('../services/mercadopagoClient', () => ({
  getBalance: jest.fn().mockResolvedValue({
    available: 1000,
    currency: 'ARS',
    lastUpdated: new Date().toISOString()
  })
}));

// Uso en tests
const response = await mercadopagoClient.getBalance();
expect(response.available).toBe(1000);
```

---

## 🐛 Debugging

Si algún endpoint falla:

```bash
# 1. Verifica que el servicio está corriendo
docker ps | grep serverMP
docker ps | grep serverWhatsApp

# 2. Revisa logs del servicio
docker logs <container_id> -f

# 3. Accede via VNC para debugging visual
vncviewer localhost:5901  # serverMP
vncviewer localhost:5902  # serverWhatsApp

# 4. Prueba conexión directa
curl http://localhost:9001/api/balance
curl http://localhost:9002/api/chats

# 5. Revisa logs del backend
docker logs tdcapirest-backend
```

---

## 📚 Referencias Rápidas

- **Documentación completa:** [PUPPET_SERVICES_INTEGRATION.md](PUPPET_SERVICES_INTEGRATION.md)
- **Plantilla .env:** [backend/.env.example](backend/.env.example)
- **Código fuente:**
  - Clients: `backend/services/mercadopagoClient.js` y `whatsappClient.js`
  - Controllers: `backend/controllers/mercadopagoController.js` y `whatsappController.js`
  - Routes: `backend/routes/mercadopagoRoutes.js` y `whatsappRoutes.js`

---

## ✅ Validación Final

```bash
# Verificar estructura completa
ls -la backend/services/ | grep -E "(mercado|whatsapp)"
ls -la backend/controllers/ | grep -E "(mercado|whatsapp)"
ls -la backend/routes/ | grep -E "(mercado|whatsapp)"

# Verificar que axios está instalado
npm list axios --prefix backend/

# Verificar que las rutas se registran en server.js
grep -n "mercadopago\|whatsapp" backend/server.js
```

---

## 🎯 Estado Actual

**Fase 1:** ✅ 100% Implementado
- HTTP clients listos
- Controllers listos
- Routes registradas
- npm dependencies instaladas
- Documentación completa
- Listo para ser usado

**Fase 2:** 📋 Pendiente de planificación
- Esperar a que tdcApiRest esté terminado
- Mover servicios Puppeteer
- Actualizar docker-compose.yml
- Cambiar .env (sin cambios en código)
