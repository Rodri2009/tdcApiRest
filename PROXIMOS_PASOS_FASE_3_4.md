# 📋 PRÓXIMAS FASES: FASE 3 & FASE 4

**Planificado para:** Semanas siguientes (junio-julio 2026)  
**Status:** 🔄 PLANIFICADO - NO INICIADO  

---

## 📊 Roadmap General

```
FASE 1 ✅ (28/05) → FASE 2 ✅ (28/05) → FASE 5 ✅ (28/05) → FASE 3 🔄 → FASE 4 🔄 → PRODUCIÓN
Entradas     Scanner      Cliente       Devoluciones   Reportes
Admin        Puerta       Logueado      Reembolsos     Excel/Charts
2h           2h           1h            3h             2h
```

---

## ✅ FASE 5: CLIENTE LOGUEADO (COMPLETADA 28/05)

**Tiempo invertido:** 1 hora  
**Status:** ✅ COMPLETADA

### 📋 Descripción

Interfaz para que clientes logueados visualicen sus entradas compradas.

### 🎯 Objetivos Logrados

- ✅ Página `/cliente/mis-entradas.html` con tabla responsive
- ✅ Decodificación de JWT en cliente (sin servidor)
- ✅ Endpoint `GET /api/tickets/me` autenticado
- ✅ Modal con detalles de cada entrada
- ✅ Botones: Copiar código, descargar comprobante, solicitar devolución
- ✅ Badges de estado coloridos
- ✅ Logout automático si no hay token

### 📦 Componentes

**Frontend:**
- `frontend/cliente/mis-entradas.html` (6.5 KB)
- `frontend/cliente/mis-entradas.js` (18 KB)

**Backend:**
- `ticketsController.getMyTickets()` - Endpoint handler
- `GET /api/tickets/me` - Ruta protegida

### 📊 Datos Mostrados

Por cada entrada:
- Evento (nombre + fecha)
- Cantidad
- Tipo (ANTICIPADA / PUERTA)
- Monto pagado
- Estado (Pagado / Utilizado / Cancelado)
- Fecha de compra
- Botón: Ver detalles

Modal incluye:
- Código de confirmación (copiable)
- Todos los datos anteriores
- Botones: Descargar, Copiar, Solicitar devolución

### 🔌 Endpoint

```
GET /api/tickets/me

Autenticación: Bearer token (JWT)
Response: Array de tickets del usuario
```

### 🎨 Diseño

- Paleta de colores del admin (#581c87, #f0abfc)
- Responsive (desktop, tablet, móvil)
- Badges coloridos por estado
- Modal con scroll
- Empty state si no hay entradas

### ⏭️ Integración Futura

- **FASE 3:** Botón "Solicitar Devolución" integrará con POST /api/tickets/:id/cancelar
- **FASE 4:** Link a estadísticas y reportes del usuario

### 📝 Referencia

**[FASE_5_CLIENTE_LOGUEADO.md](FASE_5_CLIENTE_LOGUEADO.md)** - Documentación completa

---

**Tiempo estimado:** 3 horas  
**Complejidad:** Media-Alta  
**Prioridad:** Alta  

### 📋 Descripción

Sistema para gestionar cancelaciones de entradas y procesamiento de reembolsos a través de MercadoPago.

### 🎯 Objetivos

- ✅ Interfaz admin para cancelar entradas
- ✅ Procesar refund con MercadoPago API
- ✅ Actualizar estado de tickets
- ✅ Registrar razón de devolución
- ✅ Historial de reembolsos
- ✅ (Futuro) Interfaz de cliente para solicitar devolución

### 📦 Componentes a Implementar

#### 1️⃣ Frontend
- **`frontend/admin_reembolsos.html`**
  - Selector de evento
  - Tabla de entradas pagadas (no utilizadas)
  - Columnas: ID, Cliente, Email, Cantidad, Monto, Acciones
  - Modal/Form para cancelar:
    - Campo: Razón de devolución (select)
    - Opciones: "Solicitud del cliente", "Error de venta", "Otro"
    - Botón: Confirmar cancelación
  - Confirmación de refund procesado
  - Historial de reembolsos realizados

- **`frontend/admin_reembolsos.js`**
  - `loadEventos()` - Carga eventos
  - `loadEntradasPagadas(eventoId)` - Obtiene entradas sin usar
  - `abrirModalCancelar(ticketId)` - Abre modal de confirmación
  - `procesarReembolso(ticketId, razon)` - Llama endpoint
  - `mostrarResultado(resultado)` - Muestra feedback
  - Helpers: formatCurrency, formatDate

#### 2️⃣ Backend - Model
- **`backend/models/ticketsModel.js`** (ADD)
  - `getEntradasPagadasNoUtilizadas(eventoId)`
    - Retorna tickets con estado='pagado' y cantidad_utilizada=0
  - `cancelarTicket(ticketId, razon, mpRefundId)`
    - Valida ticket no esté cancelado
    - Marca como 'cancelado'
    - Registra razon_cancelacion
    - Registra mp_refund_id
    - Inserta en tickets_historial

#### 3️⃣ Backend - Services (NEW)
- **`backend/services/mercadopagoRefundService.js`**
  - `procesarReembolso(paymentId, amount)`
    - Llama a MP API para refund
    - Valida respuesta
    - Retorna refund_id

#### 4️⃣ Backend - Controller
- **`backend/controllers/ticketsController.js`** (ADD)
  - `getEntradasPagadasNoUtilizadas(req, res)`
    - Valida evento existe
    - Retorna JSON con lista
  - `cancelarEntrada(req, res)`
    - Valida parámetros
    - Llama a refund service
    - Actualiza ticket
    - Retorna resultado

#### 5️⃣ Backend - Routes
- **`backend/routes/ticketsRoutes.js`** (ADD)
  - `GET /api/tickets/evento/:eventoId/entradas-pagadas-no-utilizadas`
  - `POST /api/tickets/:ticketId/cancelar`

### 🔌 Endpoints Nuevos

```javascript
// GET: Obtener entradas pagadas sin utilizar
GET /api/tickets/evento/:eventoId/entradas-pagadas-no-utilizadas
Response: { evento, entradas: [{id, cliente, email, cantidad, monto, ...}] }

// POST: Cancelar entrada y procesar refund
POST /api/tickets/:ticketId/cancelar
Body: { evento_id, razon, mp_payment_id }
Response: { id, status: 'cancelado', refund_id, monto_reembolsado }
```

### 📊 Cambios en BD

#### Tabla: tickets
Campos a llenar:
- `estado`: 'pagado' → 'cancelado'
- `razon_cancelacion`: "Solicitud del cliente"
- `monto_reembolsado`: 5000 (monto original)
- `fecha_cancelacion`: NOW()
- `mp_refund_id`: "12345678" (ID del refund en MP)
- `autorizado_por`: usuario_id (quién autorizó)

#### Tabla: tickets_historial
```sql
INSERT INTO tickets_historial 
  (id_ticket, evento_id, estado_anterior, estado_nuevo, nota)
VALUES 
  (3, 7, 'pagado', 'cancelado', 'Reembolso procesado - Solicitud del cliente');
```

### 🎨 Mockups

```
┌──────────────────────────────────────────────────┐
│ 🔄 Reembolsos y Cancelaciones                   │
├──────────────────────────────────────────────────┤
│ Evento: [dropdown: Seleccionar evento ▼]         │
├──────────────────────────────────────────────────┤
│ 📋 ENTRADAS PAGADAS (No Utilizadas)              │
├──────┬──────────────┬───────────┬────────┐       │
│ ID   │ Cliente      │ Email     │ Monto  │ Acc   │
├──────┼──────────────┼───────────┼────────┼───────┤
│ 3    │ Juan Pérez   │ juan@...  │ 5000   │ ✗    │
│ 5    │ María García │ maria@... │ 3250   │ ✗    │
└──────┴──────────────┴───────────┴────────┴───────┘

Modal al click ✗:
┌─────────────────────────────────┐
│ ¿Cancelar entrada? (ID: 3)      │
│                                  │
│ Razón:                           │
│ [ ] Solicitud del cliente        │
│ [ ] Error de venta               │
│ [ ] Otro                         │
│                                  │
│ [Cancelar] [Confirmar Refund]   │
└─────────────────────────────────┘
```

### 🧪 Testing

- [ ] Crear entrada pagada sin usar
- [ ] Llamar endpoint GET entradas-pagadas
- [ ] Procesar refund con MP API de test
- [ ] Verificar: estado=cancelado, refund_id guardado
- [ ] Verificar: ticket_historial registrado
- [ ] Intentar cancelar 2 veces (debe fallar)
- [ ] Intentar cancelar con evento incorrecto (debe fallar)

---

## 📊 FASE 4: REPORTES AVANZADOS

**Tiempo estimado:** 2 horas  
**Complejidad:** Media  
**Prioridad:** Media  

### 📋 Descripción

Reportes y analytics avanzados para análisis de ventas.

### 🎯 Objetivos

- ✅ Exportación a Excel con formato profesional
- ✅ Gráficos de ventas (chartjs)
- ✅ Análisis por período
- ✅ Predicciones básicas
- ✅ Dashboard resumen general

### 📦 Componentes a Implementar

#### 1️⃣ Frontend
- **`frontend/admin_reportes.html`**
  - Selector de período (mes/año)
  - Tabs: Resumen | Gráficos | Detalles
  - Dashboard con 6+ KPI cards
  - Gráficos: Línea (ventas/mes), Barra (evento-evento), Pie (tipo entrada)
  - Tabla detallada con filtros
  - Botón: Exportar Excel

- **`frontend/admin_reportes.js`**
  - `loadReportData(periodo)` - GET /api/reports/ventas/:periodo
  - `renderCharts()` - Dibuja gráficos con Chart.js
  - `exportarExcel()` - Descarga arquivo Excel
  - Helpers: formatCurrency, calcularPromedio, etc.

#### 2️⃣ Backend - Model
- **`backend/models/ticketsModel.js`** (ADD)
  - `getReportePorPeriodo(mes, anio)`
    - Retorna: total vendidas, ingresos, por tipo, etc.
  - `getPrediccionProxima(eventoId)`
    - Análisis simple: asistencia esperada

#### 3️⃣ Backend - Services (NEW)
- **`backend/services/excelExportService.js`**
  - `generarReporteExcel(datos, titulo)`
    - Crea archivo Excel con estilos
    - Incluye gráficos
    - Retorna buffer

#### 4️⃣ Backend - Controller
- **`backend/controllers/reportsController.js`** (NEW)
  - `getReportesVentas(req, res)`
  - `descargarExcel(req, res)`

#### 5️⃣ Backend - Routes
- **`backend/routes/reportsRoutes.js`** (NEW)
  - `GET /api/reports/ventas/:periodo`
  - `GET /api/reports/excel`

### 🔌 Endpoints Nuevos

```javascript
// GET: Datos de reporte para período
GET /api/reports/ventas/2026-05
Response: {
  periodo: "Mayo 2026",
  total_vendidas: 150,
  ingresos_totales: 750000,
  por_tipo: { ANTICIPADA: 100, PUERTA: 50 },
  eventos: [{ id, nombre, vendidas, ingresos }, ...],
  predicciones: { asistencia_estimada: 145 }
}

// GET: Descargar Excel
GET /api/reports/excel?periodo=2026-05
Response: Excel file (application/xlsx)
```

### 📊 Mockup Dashboard

```
┌─────────────────────────────────────────────────────────┐
│ 📊 Reportes de Ventas                                   │
├──────────────┬──────────────────────────────────────────┤
│ Período:     │ Mayo 2026 [▼]  [Actualizar]             │
├──────────────┴──────────────────────────────────────────┤
│ [RESUMEN]  [GRÁFICOS]  [DETALLES]  [Exportar Excel]   │
├──────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│ │ VENDIDAS │ │ INGRESOS │ │ PROMEDIO │ │ ASISTENCIA│  │
│ │   150    │ │ $750k    │ │ $5,000   │ │   145    │   │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
├──────────────────────────────────────────────────────────┤
│ Gráfico: Ventas por Evento                              │
│   50000 ┤         ╱╲                                    │
│   40000 ┤    ╱╲  ╱  ╲      ╱╲                           │
│   30000 ┤   ╱  ╲╱    ╲  ╱ ╱  ╲                          │
│         ├──────────────────────────────────             │
│   May   Jun   Jul   Aug   Sep   Oct                     │
└──────────────────────────────────────────────────────────┘
```

### 🧪 Testing

- [ ] GET /api/reports/ventas/2026-05
- [ ] Verificar datos agregados correctamente
- [ ] Exportar Excel con datos
- [ ] Abrir Excel y verificar formato
- [ ] Gráficos renderizan correctamente
- [ ] Filtrar por período diferentes

### 📈 Métricas Incluidas

**Generales:**
- Total vendidas (cantidad)
- Ingresos totales ($)
- Ingresos promedio por evento ($)
- Asistencia estimada (%)

**Por Tipo:**
- Anticipadas vs Puerta (cantidad y $)
- Porcentaje de cada tipo

**Por Evento:**
- Ranking de eventos por ventas
- Ranking por ingresos

**Predicciones:**
- Asistencia esperada basada en histórico
- Tendencia de ventas

---

## 🔗 Integración con Admin Panel

### admin.html (FUTURO)

```html
<!-- Sección: 📊 Reportes & Analytics -->
<a href="/admin_reportes.html" class="card">
  <h3>📊 Reportes</h3>
  <p>Análisis de ventas, gráficos y exportación Excel</p>
</a>

<a href="/admin_reembolsos.html" class="card">
  <h3>🔄 Reembolsos</h3>
  <p>Gestionar cancelaciones y devoluciones</p>
</a>
```

---

## 📋 Timeline Sugerido

| Fase | Status | Inicio Est. | Duración | Fin Est. |
|------|--------|-------------|----------|----------|
| 1 | ✅ | 28/05 | 2h | 28/05 |
| 2 | ✅ | 28/05 | 2h | 28/05 |
| 3 | 🔄 | 02/06 | 3h | 02/06 |
| 4 | 🔄 | 03/06 | 2h | 03/06 |
| Testing | ⏳ | 04/06 | 2h | 04/06 |
| **Producción** | ⏳ | 05/06 | - | 05/06 |

---

## 🛠️ Dependencies Requeridas

Para FASE 3:
```bash
# Ya instaladas
npm install axios # Para MP API
```

Para FASE 4:
```bash
npm install chart.js exceljs
```

---

## 🚀 Próxima Fase: CLIENTE LOGUEADO

Después de completar FASE 3 y FASE 4, implementar:
- **mis-entradas.html** - Ver tickets comprados
- **solicitar-devolucion.html** - Pedir refund
- **mi-perfil.html** - Datos de usuario

---

## 📝 Notas

- FASE 3 y 4 pueden hacerse en paralelo después de FASE 2
- Testing debe ser exhaustivo antes de producción
- Considerar load testing para reportes con muchos datos
- MP Refund API tiene límites de tasa

---

## ⏭️ Siguiente Fase (Inmediata)

→ **CLIENTE LOGUEADO: Mis Entradas** (esta sesión)
