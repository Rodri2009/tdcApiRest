# Cambios: Persistencia de Transacciones en Caja Abierta

## Resumen del Problema
Cuando el usuario abría una caja y navegaba entre `admin_caja.html` y `admin_transacciones.html`, la lista de movimientos desaparecía visualmente, aunque el flag `cajaAbierta` seguía siendo `true`.

## Análisis de Root Cause
El problema estaba en **`frontend/admin_transacciones.js`** en la función `verificarCajaAbiertaReal()`:

1. La función obtenía correctamente la caja activa y sus movimientos desde `/api/cajas/activa`
2. Llenaba el array `cajaMovimientos` con esos datos
3. **PERO** luego llamaba a `renderTransactions(allTransactions)` **en lugar de** `renderTransactions(cajaMovimientos)`
4. Como `allTransactions` estaba vacío (porque el init evitaba llamar `fetchTransactions()` cuando hay caja abierta), **la página se rendería vacía**

## Cambios Realizados

### 1. **CRÍTICO: Línea 964 en admin_transacciones.js**
```javascript
// ANTES
renderTransactions(allTransactions);  // ❌ Renderiza array VACÍO

// DESPUÉS  
renderTransactions(cajaMovimientos);  // ✅ Renderiza movimientos cargados de la API
```
**Impacto**: Esto es el fix principal que resuelve la persistencia.

---

### 2. **Refactorizar `addTransactionToTop()` (líneas 415-428)**
Cambiado para ser explícito sobre qué array se modifica según el estado:

```javascript
// ANTES: Agregaba SIEMPRE a allTransactions, luego SI caja abierta también a cajaMovimientos, 
//        pero rendería allTransactions (confuso y propenso a errores)

// DESPUÉS: Condicional claro
if (cajaAbierta) {
    cajaMovimientos.unshift(tx);     // Agregar SOLO a cajaMovimientos
    renderTransactions(cajaMovimientos);
} else {
    allTransactions.unshift(tx);     // Agregar SOLO a allTransactions
    renderTransactions(allTransactions);
}
```
**Impacto**: Nuevas transacciones SSE se agregan al array correcto según contexto.

---

### 3. **Mejorar botón "Actualizar" (líneas 1020-1044)**
Agregada lógica para no intentar cargar transacciones de MP cuando hay caja abierta:

```javascript
if (cajaAbierta) {
    showBanner('📦 Caja abierta: mostrando solo transacciones de la caja actual', 'neutral');
} else {
    // ... llamar a fetchTransactions() como antes
}
```
**Impacto**: El botón de actualizar no intenta sobrescribir `cajaMovimientos` con datos de Mercado Pago.

---

## Flujo Correcto Ahora

### Escenario: Usuario abre caja y navega a transacciones

1. **User abre caja en `admin_caja.html`**
   - POST `/api/cajas` crea la caja
   - Caja guardada con `estado = 'abierta'`
   - Se crea el primer `movimiento_caja` (apertura)

2. **User navega a `admin_transacciones.html`**
   - `verificarCajaAbiertaReal()` se ejecuta PRIMERO
   - GET `/api/cajas/activa` retorna la caja + array `movimientos`
   - `cajaMovimientos = caja.movimientos` (se llena desde API)
   - `cajaAbierta = true`
   - **`renderTransactions(cajaMovimientos)` ← SE RENDERIZA CORRECTAMENTE** ✅
   - `fetchTransactions()` se salta (condicional en init)

3. **User navega de vuelta a `admin_caja.html` y retorna a transacciones**
   - Mismo proceso, `cajaMovimientos` se recarga desde API
   - Estado persiste

4. **Nueva transacción llega vía SSE (ej: Mercado Pago)**
   - `addTransactionToTop()` se ejecuta
   - **Como `cajaAbierta = true`, se agrega a `cajaMovimientos` (no `allTransactions`)**
   - Page se actualiza con la nueva tx

5. **User cierra la caja**
   - `cajaAbierta = false` 
   - Next time navegando, `verificarCajaAbiertaReal()` no encuentra caja abierta
   - Se carga `fetchTransactions()` normalmente
   - Se muestran transacciones de Mercado Pago

---

## Archivos Modificados
- ✅ `frontend/admin_transacciones.js`
  - Línea 341: `renderTransactions()` verifica `cajaAbierta` (ya existía, confirmar)
  - Línea 415-428: `addTransactionToTop()` refactorizado
  - Línea 964: **FIX CRÍTICO** - `renderTransactions(cajaMovimientos)`
  - Líneas 1020-1044: Botón actualizar mejorado

---

## Validación
```bash
# Syntax check
node --check frontend/admin_transacciones.js
# Output: (no output = OK)
```

---

## Testing
Ver: **TEST_CAJA_PERSISTENCE.md**

Resumen de prueba:
1. Abrir caja manual en admin_caja.html
2. Navegar a admin_transacciones.html
3. Verificar que se muestran movimientos de la caja
4. Navegar entre páginas varias veces
5. Verificar que movimientos persisten
6. Cerrar caja y verificar que se muestran transacciones de MP nuevamente

---

## Conceptos Clave

### Arrays en el Flujo
- **`cajaMovimientos`**: Array de transacciones que pertenecen a la caja actualmente abierta
  - Poblado desde `/api/cajas/activa` → `caja.movimientos`
  - Se muestra cuando `cajaAbierta = true`
  - Se limpian cuando se cierra caja (`cajaAbierta = false`)

- **`allTransactions`**: Array de transacciones de Mercado Pago
  - Poblado desde `/api/transacciones`
  - Se muestra solo cuando `cajaAbierta = false`
  - Nunca se carga si hay caja abierta (por eficiencia)

### Funciones Críticas
- `verificarCajaAbiertaReal()`: Determina si hay caja abierta al cargar página
- `renderTransactions(list)`: Renderiza el array pasado, pero internamente verifica `cajaAbierta` para mostrar el correcto
- `addTransactionToTop(tx)`: Agregar nuevo evento de transacción al array correcto

---

## Notas
- JWT payload usa `id_usuario` (underscore), backend está configurado correctamente
- Timezone: Argentina (America/Argentina/Buenos_Aires) manejado en backend
- SSE streaming funciona en ambos contextos (caja abierta y cerrada)
