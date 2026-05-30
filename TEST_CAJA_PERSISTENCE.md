# Prueba: Persistencia de Movimientos en Caja Abierta

## Escenario de Prueba
Verificar que los movimientos de una caja abierta persisten cuando navegas entre admin_caja.html y admin_transacciones.html

## Pasos

### 1. Limpiar estado previo
- Abre la consola del navegador (F12)
- Limpia el localStorage: `localStorage.clear()`
- Recarga la página

### 2. Abrir una caja manual
- Ve a **Admin → Cajas** (admin_caja.html)
- Click **"Abrir caja"** → formulario manual
- Ingresa:
  - **Saldo inicial**: `1000`
  - Click **"Abrir"**
- Espera confirmación: "Caja abierta exitosamente"
- **En la consola, busca**: `[admin_caja]` logs que confirmen la caja está abierta
- Anota el ID de la caja o el timestamp

### 3. Ir a Transacciones
- Click **"Transacciones"** en el navbar (o boton "Ver transacciones")
- **Espera a que cargue**
- **En la consola, busca**: `[admin_transacciones] Caja abierta encontrada`
- **Verifica en la consola**:
  - `cajaMovimientos.length` > 0 (debe haber al menos 1, la apertura)
  - `cajaAbierta = true`
  - Debe mostrar algo como: `[admin_transacciones] Caja abierta encontrada: <ID> movimientos: 1`

### 4. Verificar que se muestren movimientos
- En la página, busca la sección de **"Transacciones"**
- Debe mostrar **solo los movimientos de esta caja** (típicamente al menos 1 = apertura de caja)
- NO debe mostrar todas las transacciones de Mercado Pago

### 5. Navegar de vuelta a Cajas y retornar a Transacciones
- Click **"Cajas"** en navbar
- Verifica que la caja sigue abierta (botón "Cerrar caja" visible)
- Click **"Transacciones"** nuevamente
- **Verifica en la consola**:
  - `[admin_transacciones] Caja abierta encontrada` aparece nuevamente
  - `cajaMovimientos` sigue teniendo los mismos movimientos
- **En la página**:
  - Los mismos movimientos siguen visible
  - NO desaparecen

### 6. Cerrar caja y verificar cambio
- Ve a **"Cajas"**
- Click **"Cerrar caja"**
- Ve a **"Transacciones"**
- **En la consola**, debe mostrar: `cajaAbierta = false`
- **En la página**:
  - Ahora debe mostrar **todas las transacciones de Mercado Pago** (no solo de caja)
  - O un mensaje como "No hay transacciones" si la tienda es nueva

## Indicadores de Éxito ✅
- ✅ Movimientos se muestran en admin_transacciones.html cuando caja está abierta
- ✅ Movimientos persisten al navegar entre páginas (sin desaparecer)
- ✅ Console logs muestran `cajaAbierta = true/false` correctamente
- ✅ Al cerrar caja, se vuelven a mostrar transacciones de MP (o nada si está vacío)
- ✅ Sin errores en la consola

## Indicadores de Fallo ❌
- ❌ Aparece página en blanco o sin transacciones cuando caja está abierta
- ❌ Movimientos desaparecen al navegar a otra página
- ❌ Console muestra `cajaMovimientos.length = 0` pero debería tener movimientos
- ❌ Se muestran transacciones de Mercado Pago en lugar de solo de caja
- ❌ Errores JavaScript en la consola

## Debuggeo si algo falla
Abre la consola (F12) y ejecuta:
```javascript
// Ver estado actual
console.log('cajaAbierta:', cajaAbierta);
console.log('cajaMovimientos:', cajaMovimientos);
console.log('cajaMovimientos.length:', cajaMovimientos.length);
console.log('allTransactions.length:', allTransactions.length);
console.log('_cajaAbiertaId:', window._cajaAbiertaId);
```

Si `cajaAbierta = true` pero `cajaMovimientos.length = 0`, el problema está en la API (`/api/cajas/activa`).

Si `cajaMovimientos.length > 0` pero no se ven en la página, el problema está en `renderTransactions()`.
