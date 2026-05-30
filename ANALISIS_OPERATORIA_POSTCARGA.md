# 📊 Análisis: Operatoria Post-Compra de Entradas

**Fecha:** 28/05/2026  
**Estado:** ✅ FASE 1 & 2 COMPLETADAS - FASE 3 & 4 PLANIFICADAS

---

## 📋 RESUMEN EJECUTIVO

| Componente | Status | Referencia |
|-----------|--------|-----------|
| FASE 1: Admin - Venta de Entradas | ✅ COMPLETADA | [FASE_1_ADMIN_VENTA_ENTRADAS.md](FASE_1_ADMIN_VENTA_ENTRADAS.md) |
| FASE 2: Control de Puerta - Scanner | ✅ COMPLETADA | [FASE_2_SCANNER_PUERTA.md](FASE_2_SCANNER_PUERTA.md) |
| FASE 3: Devoluciones & Reembolsos | 🔄 PLANIFICADA | [PROXIMOS_PASOS_FASE_3_4.md](PROXIMOS_PASOS_FASE_3_4.md) |
| FASE 4: Reportes Avanzados | 🔄 PLANIFICADA | [PROXIMOS_PASOS_FASE_3_4.md](PROXIMOS_PASOS_FASE_3_4.md) |
| FASE 5: Cliente Logueado (Próximo) | ⏳ DISEÑO | TBD |

---

## 🟢 ¿QUÉ YA EXISTE?

### 1. **Base de Datos (Schema)**
✅ Tabla `tickets` con campos:
- `id` (PK)
- `id_evento` (FK a eventos_confirmados)
- `nombre_comprador`, `email`
- `cantidad`, `tipo_precio` (ANTICIPADA/PUERTA)
- `total`, `codigo_cupon`, `descuento_aplicado`
- `codigo_confirmacion` (UNIQUE)
- `estado` (ENUM: pendiente, **pagado**, **utilizado**, cancelado)
- `comprado_en` (timestamp)

✅ Tabla `cupones`:
- Descuentos por porcentaje o monto fijo
- Control de usos máximos y fecha de vencimiento

✅ Tabla `eventos_confirmados`:
- Datos del evento (fecha, hora, descripción, aforo)
- Control de eventos activos

✅ Tabla `clientes`:
- Relación 1:1 con `usuarios`
- Teléfono, email, notas

### 2. **Backend - Endpoints Implementados**

#### Compra:
```
GET  /api/tickets/eventos_confirmados          → Lista eventos disponibles
POST /api/tickets/checkout/simulate            → Calcula precio con cupones
POST /api/tickets/checkout/init                → Crea ticket + preferencia MP
GET  /api/tickets/public-key                   → Devuelve public key MP
POST /api/tickets/process-payment              → Procesa pago
POST /api/tickets/webhook                      → Webhook MP (actualiza estado)
```

#### Visualización:
```
GET  /api/tickets/:ticketId                    → Detalles del ticket (recepción)
```

### 3. **Estados de Tickets**
Los estados ya están preparados en el schema:
- `pendiente` → Compra iniciada, sin pago
- `pagado` → ✅ Pago completado
- `utilizado` → ✅ Entrada ya usada en puerta
- `cancelado` → Devolución/cancelación

---

## ✅ FASE 1: LISTA DE CLIENTES POR EVENTO (COMPLETADA 28/05)

**Descripción:**  
Dashboard admin para visualizar lista de compradores por evento con estadísticas.

**Status:** ✅ COMPLETADA Y TESTEADA

**Componentes Implementados:**
- Tabla `tickets` con 10 campos nuevos (EJECUTADA)
- Tabla `tickets_historial` para auditoría (EJECUTADA)
- Endpoints: GET clientes | GET resumen
- Frontend: admin_venta_entradas.html + .js
- Integración: admin.html actualizado

**Referencia:** [FASE_1_ADMIN_VENTA_ENTRADAS.md](FASE_1_ADMIN_VENTA_ENTRADAS.md)

---

## ✅ FASE 2: CONTROL DE ENTRADAS EN PUERTA (COMPLETADA 28/05)

**Descripción:**  
Sistema de scanner QR para validar entradas en la puerta del evento.

**Status:** ✅ COMPLETADA Y LISTA PARA TESTING

**Componentes Implementados:**
- Frontend: scanner-puerta.html (22 KB) con QR en vivo
- Backend Model: getTicketById(), validateTicketForEntry()
- Backend Controller: validarEntrada()
- Backend Route: PUT /:ticketId/validar
- Auditoría completa en tickets_historial
- Integración: admin.html actualizado

**Referencia:** [FASE_2_SCANNER_PUERTA.md](FASE_2_SCANNER_PUERTA.md)

---

## 🔄 FASE 3: DEVOLUCIONES Y REEMBOLSOS (PLANIFICADA 02/06)

**Descripción:**  
Sistema para procesar cancelaciones de entradas y devoluciones de dinero.

**Status:** 🔄 PLANIFICADO - DISEÑO COMPLETADO

**Componentes a Implementar:**
- Admin dashboard para cancelar entradas
- Integración con MercadoPago Refund API
- Auditoría de reembolsos
- Email de confirmación

**Tiempo Estimado:** 3 horas

**Referencia:** [PROXIMOS_PASOS_FASE_3_4.md](PROXIMOS_PASOS_FASE_3_4.md#🔄-fase-3-devoluciones-y-reembolsos)

---

## 🔄 FASE 4: REPORTES AVANZADOS (PLANIFICADA 03/06)

**Descripción:**  
Analytics y reportes con gráficos, Excel export y predicciones.

**Status:** 🔄 PLANIFICADO - DISEÑO COMPLETADO

**Componentes a Implementar:**
- Dashboard de analytics
- Gráficos con Chart.js
- Exportación a Excel con estilos
- Predicciones de asistencia

**Tiempo Estimado:** 2 horas

**Referencia:** [PROXIMOS_PASOS_FASE_3_4.md](PROXIMOS_PASOS_FASE_3_4.md#📊-fase-4-reportes-avanzados)

---

## 🎯 FUNCIONES ADICIONALES (Futuro)

ALTER TABLE eventos_confirmados ADD COLUMN (
    aforo_maximo INT,
    entradas_bloqueadas INT DEFAULT 0
);
```

### Cambios en Backend:

**Models (ticketsModel.js):**
- `getClientesPorEvento(eventoId)` - Lista de compradores
- `validarTicket(ticketId)` - Valida y marca como utilizado
- `cancelarTicket(ticketId, razon)` - Procesa cancelación
- `getHistorialTicket(ticketId)` - Obtiene historial de cambios
- `getResumenEvento(eventoId)` - Estadísticas del evento

**Controllers (ticketsController.js):**
- `getClientesPorEvento()` - GET /api/tickets/evento/:eventoId/clientes
- `getResumenEvento()` - GET /api/tickets/evento/:eventoId/resumen
- `validarEnPuerta()` - POST /api/tickets/:ticketId/validar
- `validarPorCodigo()` - POST /api/tickets/validar-por-codigo
- `cancelarTicket()` - POST /api/tickets/:ticketId/cancelar
- `getHistorialTicket()` - GET /api/tickets/:ticketId/historial
- `generarReporteEvento()` - GET /api/tickets/evento/:eventoId/reporte

**Routes (ticketsRoutes.js):**
- Agregar todas las rutas nuevas

**Services:**
- `mercadopagoPaymentService.js`: Agregar método para procesar reembolsos

### Cambios en Frontend:

**Nuevas páginas:**
- `scanner-puerta.html` - App para validar entradas
- `admin-entradas.html` - Panel para admin (listas de clientes)
- `admin-devoluciones.html` - Panel para procesar devoluciones

---

## 🎯 PRIORIDAD DE IMPLEMENTACIÓN

| Prioridad | Feature | Complejidad | Tiempo |
|-----------|---------|------------|--------|
| 🔴 CRÍTICA | Lista de clientes/estadísticas | ⭐⭐ | 2h |
| 🔴 CRÍTICA | Control de puerta (validar) | ⭐⭐⭐ | 4h |
| 🟠 ALTA | Devoluciones/reembolsos | ⭐⭐⭐⭐ | 6h |
| 🟠 ALTA | Historial de tickets | ⭐ | 1h |
| 🟡 MEDIA | Reportes y análisis | ⭐⭐ | 3h |
| 🟡 MEDIA | Integración con caja | ⭐⭐ | 2h |
| 🟢 BAJA | Transferencia de entradas | ⭐⭐⭐ | 3h |
| 🟢 BAJA | Notificaciones por email | ⭐⭐ | 2h |

**Total estimado:** 23 horas

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Fase 1: Base (Semana 1)
- [ ] Agregar campos a tabla `tickets`
- [ ] Crear tabla `tickets_historial`
- [ ] Implementar `getClientesPorEvento()` en model
- [ ] Implementar endpoint `/api/tickets/evento/:eventoId/clientes`
- [ ] Implementar `/api/tickets/evento/:eventoId/resumen`

### Fase 2: Control en Puerta (Semana 2)
- [ ] Agregar campo `escaneo_codigo` a tabla
- [ ] Generar código QR en preferencia
- [ ] Implementar `validarTicket()` en model
- [ ] Implementar `/api/tickets/:ticketId/validar`
- [ ] Crear `scanner-puerta.html`
- [ ] Testing en puerta con QR real

### Fase 3: Devoluciones (Semana 3)
- [ ] Implementar `cancelarTicket()` con reembolso MP
- [ ] Endpoint `/api/tickets/:ticketId/cancelar`
- [ ] Crear `admin-devoluciones.html`
- [ ] Testing de reembolsos

### Fase 4: Analytics & Polish (Semana 4)
- [ ] Reportes y estadísticas
- [ ] Integración con caja
- [ ] Notificaciones por email
- [ ] Testing completo

---

## 📱 FLUJO DE USUARIO FINAL

```
COMPRADOR:
1. Selecciona evento → Completa checkout → Paga ✅
2. Recibe email con código QR + código confirmación
3. En puerta: muestra QR o código
4. Personal escanea → Sistema marca como utilizado ✅
5. (Opcional) Si cancela antes: solicita reembolso ✅

ADMIN/PERSONAL:
1. Abre scanner-puerta.html
2. Escanea QR o ingresa código
3. Sistema valida y confirma
4. Contador: "30 entradas utilizadas / 45 totales"
5. Al final: reporte completo de asistencia

ADMIN (Panel):
1. Ve lista de compradores
2. Procesa devoluciones
3. Genera reportes
4. Concilia con caja
```

---

**Documento completado:** 28/05/2026  
**Revisado por:** Análisis técnico  
**Siguiente paso:** Iniciar Fase 1 de implementación
