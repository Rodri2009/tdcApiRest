# 🚪 FASE 2: Control de Puerta - Scanner QR

**Fecha completada:** 28 de mayo de 2026  
**Status:** ✅ COMPLETADA Y LISTA PARA TESTING  
**Tiempo invertido:** ~2 horas

---

## 📋 Resumen

Implementación de sistema de escaneo de QR para validación de entradas en la puerta de eventos.

### Objetivos Logrados
- ✅ Interfaz de scanner con captura de video en vivo
- ✅ Escaneo automático de QR codes
- ✅ Validación de tickets contra base de datos
- ✅ Panel de estado en tiempo real
- ✅ Historial de escaneos (últimos 50)
- ✅ Auditoría completa en tickets_historial

---

## 📦 Componentes Implementados

### 1️⃣ Frontend
- **`frontend/scanner-puerta.html`** (22 KB)
  - Header degradado con título
  - Selector de evento (dropdown)
  - Captura de video en vivo con overlay QR
  - Marco QR animado con pulso
  - Botones: Iniciar Cámara | Detener
  - Panel derecho con:
    - Status card actual
    - 2 KPI stats (total escaneos, entradas válidas)
    - Historial con últimos 50 escaneos
    - Botón: Limpiar Historial
  - UI responsiva

### 2️⃣ Backend - Model
- **`backend/models/ticketsModel.js`** (+100 líneas)
  - `getTicketById(ticketId)` 
    - Consulta SQL con LEFT JOIN a eventos_confirmados
    - Retorna detalles completos del ticket
  
  - `validateTicketForEntry(ticketId, eventoId)`
    - Validaciones: existe, evento coincide, estado=pagado, no cancelado
    - Marca como "utilizado"
    - Incrementa cantidad_utilizada
    - Registra fecha_escaneo
    - Inserta en tickets_historial

### 3️⃣ Backend - Controller
- **`backend/controllers/ticketsController.js`** (+50 líneas)
  - `validarEntrada(req, res)`
    - Valida parámetros (ticketId, evento_id)
    - Llama a validateTicketForEntry()
    - Manejo completo de errores
    - Respuesta JSON con resultado

### 4️⃣ Backend - Routes
- **`backend/routes/ticketsRoutes.js`** (+2 líneas)
  - `PUT /api/tickets/:ticketId/validar`
    - Requiere autenticación (protect middleware)
    - Handler: ticketsController.validarEntrada

### 5️⃣ Integración Frontend
- **`frontend/admin.html`** (ACTUALIZADO)
  - Nuevo card en sección "⚙️ General"
  - Card: "🚪 Scanner Puerta"
  - Descripción: "Control de entrada y validación de tickets"

---

## 🎯 Características

### Captura de Video
- getUserMedia() con facingMode: 'environment'
- Resolución ideal: 1280x720
- Stream en elemento <video>
- Canvas para procesamiento de frames

### Escaneo de QR
- Librería jsQR (v1.4.0 vía CDN)
- Procesa cada frame del video
- Decodifica JSON: `{ticketId, eventoId, codigo}`
- Retraso de 2 segundos entre escaneos (anti-duplicados)

### Validación
- Ticket existe
- Evento coincide
- Estado = "pagado"
- No cancelado
- No completamente utilizado

### UI/UX
- Status card: resultado actual (✓ éxito | ✗ error)
- KPI stats: contador de escaneos
- Historial en tiempo real con timestamps
- Colores por tipo: verde=éxito, rojo=error, azul=info
- Marco QR animado con pulso
- Loader durante peticiones
- Responsive (desktop, tablet, móvil)

---

## 🔌 Endpoint Nuevo

### PUT /api/tickets/:ticketId/validar

**Autenticación:** JWT requerido (protect middleware)

**Request:**
```json
{
  "evento_id": 7,
  "codigo": "TKT3{timestamp}"
}
```

**Response 200 OK:**
```json
{
  "id": 3,
  "cliente_nombre": "Rodrigo Villalba",
  "email": "villalbarodrigo2009@gmail.com",
  "evento": "Nombre del Evento",
  "estado": "utilizado",
  "cantidad_utilizada": 1
}
```

**Response 400 BAD REQUEST:**
```json
{
  "error": "TICKET_NOT_PAID",
  "message": "El ticket está en estado pendiente, debe estar pagado"
}
```

**Response 404 NOT FOUND:**
```json
{
  "error": "TICKET_NOT_FOUND",
  "message": "El ticket no existe"
}
```

---

## 🔄 Cambios en Base de Datos

### Tabla: tickets
Campos actualizados al validar:
- `estado`: "pagado" → "utilizado"
- `cantidad_utilizada`: 0 → 1 (incrementado)
- `fecha_escaneo`: NULL → NOW()
- `fecha_utilizacion`: NULL → NOW()

### Tabla: tickets_historial
Nueva entrada:
```sql
INSERT INTO tickets_historial (id_ticket, evento_id, estado_anterior, estado_nuevo, nota)
VALUES (3, 7, 'pagado', 'utilizado', 'Entrada utilizada - Escaneado en puerta');
```

---

## 🧪 Testing Listo

### Ticket de Prueba
- **ID:** 3
- **Evento:** 7
- **Cliente:** Rodrigo Villalba
- **Email:** villalbarodrigo2009@gmail.com
- **Estado:** pagado ✓

### QR Data
```json
{
  "ticketId": 3,
  "eventoId": 7,
  "codigo": "TKT3{timestamp}"
}
```

### CURL Test
```bash
curl -X PUT http://localhost:3000/api/tickets/3/validar \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{
    "evento_id": 7,
    "codigo": "TKT3'$(date +%s)'"
  }'
```

---

## 🎨 Diseño

### Paleta de Colores
- Primario: #581c87 (púrpura oscuro)
- Secundario: #f0abfc (rosa neón)
- Fondo: #0c0a09 (negro profundo)
- Textos: #e6e6e6 (blanco grisáceo)

### Componentes
- ✅ Header degradado
- ✅ Marco QR animado (pulso 2s)
- ✅ Status cards coloridas
- ✅ KPI stats boxes
- ✅ Log entry styling
- ✅ Botones con hover effects
- ✅ Responsive grid

---

## 📊 Casos de Uso

### ✅ Caso 1: Entrada Normal
1. Staff abre scanner
2. Selecciona evento
3. Cliente presenta QR
4. Se escanea automáticamente
5. ✓ Status: "Entrada válida"
6. Log: "✓ Entrada #3: Rodrigo Villalba - ENTRÓ"
7. Contador incrementa

### ✅ Caso 2: Entrada Ya Utilizada
1. Escanea mismo ticket 2 veces
2. 1ª vez: ✓ Éxito
3. 2ª vez: ✗ Error "Ya fue utilizado completamente"
4. Log: "✗ Ticket 3: Cantidad utilizada ya cumplida"

### ✅ Caso 3: Ticket de Otro Evento
1. Selecciona evento 7
2. Escanea QR de evento 8
3. ✗ Error "Este ticket es para otro evento (8)"
4. Log: "✗ QR de evento distinto: 8 vs 7"

### ✅ Caso 4: Historial de la Noche
1. Ver últimos 50 escaneos
2. Nombres, estados, timestamps
3. Botón: Limpiar historial al terminar

---

## 📁 Archivos Modificados

### Creados
- ✅ `frontend/scanner-puerta.html` (22 KB)

### Modificados
- ✅ `backend/models/ticketsModel.js` (+100 líneas)
- ✅ `backend/controllers/ticketsController.js` (+50 líneas)
- ✅ `backend/routes/ticketsRoutes.js` (+2 líneas)
- ✅ `frontend/admin.html` (+3 líneas)

---

## 🚀 Cómo Usar

### Abrir Scanner
```
http://localhost/scanner-puerta.html
```

### Desde Admin Panel
1. Ir a: http://localhost/admin.html
2. Sección: "⚙️ General"
3. Card: "🚪 Scanner Puerta"

### Usar
1. Seleccionar evento del dropdown
2. Click: "Iniciar Cámara"
3. Permitir acceso a cámara
4. Apuntar a QR del cliente
5. Se escanea automáticamente
6. Ver resultado en status card

---

## 💾 Validaciones Implementadas

✓ Autenticación JWT requerida  
✓ Parámetros obligatorios validados  
✓ Evento existe en BD  
✓ Ticket existe en BD  
✓ Evento coincide  
✓ Estado es "pagado"  
✓ No está cancelado  
✓ No completamente utilizado  
✓ Auditoría registrada  
✓ Manejo de errores (400, 404, 500)  

---

## ⏭️ Siguiente Paso

→ FASE 3: Devoluciones/Reembolsos (próximas semanas)
