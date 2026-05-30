# 📋 COMENTARIOS Y PLAN DETALLADO: FASE 1 - BASE

**Fecha:** 28/05/2026  
**Estado:** Plan comentado antes de implementar  
**Fase:** 1 / 4 - Base de datos y endpoints iniciales

---

## 🎯 OBJETIVO FASE 1

Implementar la base de datos y endpoints para **Lista de Clientes y Estadísticas por Evento**.

**Tiempo estimado:** 2 horas  
**Prioridad:** 🔴 CRÍTICA

---

## 📊 CONTEXTO GENERAL DEL PROYECTO

### Flujo Completo de Entradas (4 Fases):

```
FASE 1: BASE (ESTA)           FASE 2: PUERTA            FASE 3: DEVOLUCIONES      FASE 4: COMPLEMENTARIAS
├─ BD: campos nuevos          ├─ BD: escaneo_codigo     ├─ Reembolsos MP           ├─ Reportes
├─ Clientes/evento            ├─ Validar en puerta      ├─ Historial cambios       ├─ Gestión de entradas
├─ Estadísticas evento        ├─ Scanner app            ├─ Admin panel             ├─ Integración caja
└─ Resumen de venta           └─ QR generation          └─ Política de reembolso   └─ Notificaciones email
  (2h)                          (4h)                       (6h)                       (7h)
```

---

## 🔍 ESTADO ACTUAL (Antes de Fase 1)

### ✅ YA EXISTE:
- Tabla `tickets` con campos: id, id_evento, nombre_comprador, email, cantidad, tipo_precio, total, estado, comprado_en
- Estados: pendiente, pagado, utilizado, cancelado
- Endpoints: compra, pago, webhook
- Model functions: getEventosActivos(), getEventoById(), checkCupon(), createPendingTicket(), updateTicketStatus()

### ❌ NO EXISTE:
- Campo `mp_payment_id` (necesario para reembolsos)
- Campo `escaneo_codigo` (para validación en puerta)
- Campo `cantidad_utilizada` (para saber cuántas se usaron)
- Campo `fecha_escaneo` (auditoría de cuándo se escaneó)
- Campos de devolución: razon_cancelacion, monto_reembolsado, autorizado_por
- Tabla `tickets_historial` (auditoría completa)
- Endpoints de lista de clientes
- Endpoints de estadísticas

---

## 📝 CAMBIOS A REALIZAR EN FASE 1

### 1. CAMBIOS EN BASE DE DATOS

#### A) Agregar campos a tabla `tickets`

**¿Por qué?** Para preparar la tabla para todas las fases (no solo fase 1)

```sql
ALTER TABLE tickets ADD COLUMN (
    -- Para MercadoPago y auditoría
    mp_payment_id VARCHAR(255) COMMENT 'ID de pago de MP (para reembolsos)',
    
    -- Para control en puerta (Fase 2)
    escaneo_codigo VARCHAR(100) UNIQUE COMMENT 'Código QR único para escanear en puerta',
    cantidad_utilizada INT DEFAULT 0 COMMENT 'Cuántas entradas se usaron en puerta',
    fecha_utilizacion TIMESTAMP NULL COMMENT 'Cuándo se usó la entrada en puerta',
    fecha_escaneo TIMESTAMP NULL COMMENT 'Cuándo se escaneó (auditoría)',
    
    -- Para devoluciones (Fase 3)
    razon_cancelacion VARCHAR(255) COMMENT 'Motivo de la cancelación',
    monto_reembolsado DECIMAL(10,2) DEFAULT 0 COMMENT 'Monto que se reembolsó',
    fecha_cancelacion TIMESTAMP NULL COMMENT 'Cuándo se canceló',
    autorizado_por INT COMMENT 'ID de usuario que autorizó (FK a usuarios.id_usuario)',
    notas_puerta TEXT COMMENT 'Observaciones en puerta',
    
    -- Foreign key para auditoría
    FOREIGN KEY (autorizado_por) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
);
```

#### B) Crear tabla `tickets_historial` para auditoría completa

**¿Por qué?** Registrar todo cambio de estado, para cumplir con auditoría de devoluciones y validaciones.

```sql
CREATE TABLE IF NOT EXISTS tickets_historial (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_ticket INT NOT NULL COMMENT 'FK a tickets.id',
    estado_anterior VARCHAR(50) COMMENT 'Estado anterior (pendiente, pagado, etc.)',
    estado_nuevo VARCHAR(50) COMMENT 'Nuevo estado',
    usuario_id INT COMMENT 'Usuario que hizo el cambio',
    motivo TEXT COMMENT 'Razón del cambio',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (id_ticket) REFERENCES tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    INDEX idx_ticket (id_ticket),
    INDEX idx_fecha (creado_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
COMMENT='Auditoría completa de cambios de estado de tickets';
```

---

### 2. CAMBIOS EN BACKEND - MODEL

#### A) Nueva función: `getClientesPorEvento(eventoId)`

**Ubicación:** `backend/models/ticketsModel.js`

**¿Para qué?** Obtener lista de TODOS los compradores de un evento específico con sus detalles.

**Query:**
```sql
SELECT 
    t.id,
    t.nombre_comprador,
    t.email,
    t.cantidad,
    t.tipo_precio,
    t.total,
    t.codigo_confirmacion,
    t.estado,
    t.cantidad_utilizada,
    t.fecha_utilizacion,
    t.comprado_en,
    c.telefono,
    c.id_cliente
FROM tickets t
LEFT JOIN clientes c ON c.email = t.email
WHERE t.id_evento = ?
ORDER BY t.comprado_en DESC;
```

**Retorna:**
```javascript
[
    {
        id: 1,
        nombre_comprador: "Juan González",
        email: "juan@email.com",
        cantidad: 2,
        tipo_precio: "ANTICIPADA",
        total: 6500,
        codigo_confirmacion: "TKTMPPNCSAI69T",
        estado: "pagado",
        cantidad_utilizada: 0,
        fecha_utilizacion: null,
        comprado_en: "2026-05-28 15:27:30",
        telefono: "1234567890",
        id_cliente: 5
    }
]
```

#### B) Nueva función: `getResumenEvento(eventoId)`

**Ubicación:** `backend/models/ticketsModel.js`

**¿Para qué?** Obtener estadísticas agregadas del evento (totales, cantidades, estados).

**Query:**
```sql
SELECT 
    COUNT(DISTINCT id) as total_entradas_vendidas,
    COUNT(DISTINCT CASE WHEN estado = 'pagado' THEN id END) as entradas_pagadas,
    COUNT(DISTINCT CASE WHEN estado = 'pendiente' THEN id END) as entradas_pendientes,
    COUNT(DISTINCT CASE WHEN estado = 'utilizado' THEN id END) as entradas_utilizadas,
    COUNT(DISTINCT CASE WHEN estado = 'cancelado' THEN id END) as entradas_canceladas,
    COUNT(DISTINCT CASE WHEN tipo_precio = 'ANTICIPADA' THEN id END) as anticipadas,
    COUNT(DISTINCT CASE WHEN tipo_precio = 'PUERTA' THEN id END) as puerta,
    SUM(total) as ingresos_totales,
    SUM(CASE WHEN estado = 'pagado' THEN total ELSE 0 END) as ingresos_pagados,
    SUM(CASE WHEN estado = 'cancelado' THEN monto_reembolsado ELSE 0 END) as reembolsos_totales
FROM tickets
WHERE id_evento = ?;
```

**Retorna:**
```javascript
{
    total_entradas_vendidas: 45,
    entradas_pagadas: 40,
    entradas_pendientes: 2,
    entradas_utilizadas: 30,
    entradas_canceladas: 3,
    anticipadas: 40,
    puerta: 5,
    ingresos_totales: 292500,
    ingresos_pagados: 260000,
    reembolsos_totales: 15000
}
```

---

### 3. CAMBIOS EN BACKEND - CONTROLLER

**Archivo:** `backend/controllers/ticketsController.js`

#### A) Nueva función: `getClientesPorEvento(req, res)`

**Endpoint:** `GET /api/tickets/evento/:eventoId/clientes`

**Lógica:**
```javascript
1. Recibe: eventoId como parámetro
2. Valida que el evento exista y sea público o usuario sea admin
3. Llama al model: ticketsModel.getClientesPorEvento(eventoId)
4. Retorna: array de clientes con detalles
5. Manejo de errores: 404 si no existe, 500 si hay error DB
```

**Respuesta exitosa:**
```json
{
    "evento": {
        "id": 10,
        "nombre": "CONURTRASH",
        "fecha": "2026-06-15",
        "hora": "21:00"
    },
    "clientes": [
        {
            "id": 1,
            "nombre_comprador": "Juan González",
            "email": "juan@email.com",
            "cantidad": 2,
            ...
        }
    ]
}
```

#### B) Nueva función: `getResumenEvento(req, res)`

**Endpoint:** `GET /api/tickets/evento/:eventoId/resumen`

**Lógica:**
```javascript
1. Recibe: eventoId como parámetro
2. Valida que el evento exista
3. Llama al model: ticketsModel.getResumenEvento(eventoId)
4. Retorna: objeto con estadísticas agregadas
5. Manejo de errores: 404, 500
```

**Respuesta exitosa:**
```json
{
    "evento": {
        "id": 10,
        "nombre": "CONURTRASH",
        "fecha": "2026-06-15"
    },
    "estadisticas": {
        "total_entradas_vendidas": 45,
        "entradas_pagadas": 40,
        "entradas_utilizadas": 30,
        "ingresos_totales": 292500,
        "reembolsos_totales": 15000
    }
}
```

---

### 4. CAMBIOS EN BACKEND - ROUTES

**Archivo:** `backend/routes/ticketsRoutes.js`

```javascript
// Agregar estas rutas:

// Fase 1: Lista de clientes y estadísticas
router.get('/evento/:eventoId/clientes', ticketsController.getClientesPorEvento);
router.get('/evento/:eventoId/resumen', ticketsController.getResumenEvento);
```

---

## 🗂️ ARCHIVOS A MODIFICAR

```
backend/
├── models/
│   └── ticketsModel.js              (agregar 2 funciones)
├── controllers/
│   └── ticketsController.js         (agregar 2 funciones)
└── routes/
    └── ticketsRoutes.js             (agregar 2 rutas)

database/
└── 01_schema.sql                    (agregar campos y tabla)
```

---

## 📋 CHECKLIST FASE 1

**Base de Datos:**
- [ ] Crear archivo `ALTER` con nuevos campos para `tickets`
- [ ] Crear archivo `CREATE TABLE` para `tickets_historial`
- [ ] Ejecutar en DB: `docker-compose exec mariadb mysql < nuevos-campos.sql`
- [ ] Verificar: columnas agregadas correctamente

**Backend - Model:**
- [ ] Agregar `getClientesPorEvento(eventoId)` a ticketsModel.js
- [ ] Agregar `getResumenEvento(eventoId)` a ticketsModel.js
- [ ] Testing: llamar funciones con ID de evento real

**Backend - Controller:**
- [ ] Agregar `getClientesPorEvento(req, res)` a ticketsController.js
- [ ] Agregar `getResumenEvento(req, res)` a ticketsController.js
- [ ] Testing: verificar respuestas JSON

**Backend - Routes:**
- [ ] Agregar rutas en ticketsRoutes.js
- [ ] Testing: curl a endpoints

**Frontend (Opcional para Fase 1):**
- [ ] [ ] Crear admin panel simple para ver datos
- [ ] [ ] Mostrar tabla de clientes
- [ ] [ ] Mostrar estadísticas

**Testing:**
- [ ] [ ] Verificar que endpoints respondan
- [ ] [ ] Validar datos de clientes
- [ ] [ ] Validar estadísticas
- [ ] [ ] Verificar errores 404 en evento no existente

---

## ⏱️ TIMELINE FASE 1

```
0:00 - 0:15  Actualizar Base de Datos
0:15 - 0:45  Implementar funciones Model
0:45 - 1:15  Implementar Controller + Routes
1:15 - 1:45  Testing
1:45 - 2:00  Documentación + Cleanup
─────────────
TOTAL: 2 horas
```

---

## 🔗 RELACIÓN CON FASES POSTERIORES

### Fase 2 (Control en Puerta) usará:
- Campo `mp_payment_id` (para validar que MP procesó el pago)
- Campo `escaneo_codigo` (para generar QR)
- Campo `cantidad_utilizada` (para registrar en puerta)
- Campo `fecha_escaneo` (para auditoría)

### Fase 3 (Devoluciones) usará:
- Campos: `razon_cancelacion`, `monto_reembolsado`, `autorizado_por`, `fecha_cancelacion`
- Tabla: `tickets_historial` (para auditar reembolsos)

### Fase 4 (Complementarias) usará:
- Tabla: `tickets_historial` (para reportes)
- Todos los campos anteriores

---

## 📌 NOTAS IMPORTANTES

1. **Compatibilidad hacia atrás:** Todos los campos nuevos tienen DEFAULT o NULL, así no rompen código existente.

2. **Auditoría:** La tabla `tickets_historial` es importante para:
   - Saber quién canceló un ticket (Fase 3)
   - Reportes de cambios (Fase 4)
   - Debugging de problemas
   - Cumplimiento normativo

3. **Campos opcionales en Fase 1:** Si el tiempo es corto, puedes omitir:
   - Campos de Fase 2 (escaneo_codigo, cantidad_utilizada, etc.)
   - Pero DEBE incluir: tabla historial y endpoints básicos

4. **Testing en Producción:** 
   - Fase 1 no afecta flujo de compra existente
   - Endpoints nuevos son de lectura (SELECT), no actualizan nada
   - Seguro para deploy

---

**Documento listo para implementación.**  
**Siguiente paso:** Ir a Fase 1 - Implementación

