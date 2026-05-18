# 🔍 Guía: Importación Retroactiva de MP con Debugging Visual

## ¿Qué es?

Es una herramienta para importar transacciones de Mercado Pago para un **período específico seleccionado por el usuario**, con **logs en tiempo real** visibles desde VNC Viewer. Permite ver exactamente qué está pasando durante el scraping de MP.

## ¿Por qué?

El refresh automático de MP puede interferir con el scraping paginado. Con esta herramienta:
- ✅ Seleccionas el período exacto que quieres importar
- ✅ Ves los logs en tiempo real en la consola del navegador Y en el servidor (via VNC)
- ✅ Detecta y reporta interferencias de refresh automático
- ✅ Reintentos automáticos en caso de errores de navegación

## 📱 Cómo Usar

### Paso 1: Abrir Interfaz de Caja

1. Abre: `http://localhost/admin_caja.html`
2. Verifica que hay una **Caja Abierta** en pantalla
3. Desplázate hacia abajo hasta la sección **"Importación Retroactiva (Debugging Visual)"**

### Paso 2: Configurar Período

Verás tres campos:

```
┌─────────────────────────────────────────────────────────────┐
│ Desde (Fecha):     [2026-05-16 22:06:19]  ← auto prerellenado
│ Hasta (Fecha):     [2026-05-17 23:45:30]  ← auto prerellenado  
│ Máx Páginas:       [20]                    ← cambiar si quieres
└─────────────────────────────────────────────────────────────┘
```

**Valores por defecto:**
- **Desde**: Fecha de apertura de la caja
- **Hasta**: Ahora
- **Máx Páginas**: 20 (máximo recomendado)

Puedes modificar cualquier fecha clickeando en el campo.

### Paso 3: Abre VNC Viewer

En paralelo, abre VNC Viewer apuntando a:
- **Host**: `localhost`
- **Puerto**: `5901`
- **Password**: (según tu configuración)

Esto te permitirá ver visualmente el navegador de Puppeteer scrapeando MP.

### Paso 4: Clickea "Importar Retroactivos"

Haz clic en el botón **"Importar Retroactivos"** 🟣

Verás:
1. **En el navegador (admin_caja.html)**:
   - Logs en panel inferior con timestamp
   - Progreso de importación
   - Errores (si los hay)

2. **En VNC Viewer**:
   - El navegador de Puppeteer paginando por MP
   - Viendo los clics en botón "Página siguiente"
   - Cambios en el DOM de la página

3. **En terminal (backend)**:
   - Ejecuta `./scripts/backend_logs.sh` para ver logs del servidor
   - Verás: "📄 Página N", "✅ X transacciones", "🔄 Refresh detectado", etc.

## 📊 Logs que Verás

### En el Panel de Logs (admin_caja.html):

```
[22:30:45] 🔄 Iniciando importación retroactiva...
[22:30:45] 📅 Período: 16/5/2026, 22:06 → 17/5/2026, 23:45
[22:30:45] 📄 Máx páginas: 20
[22:30:45] ⏳ Esto puede tomar 1-2 minutos...
[22:30:46] 📡 POST /api/cajas/2/importar-retroactivos
[22:31:15] 📥 Respuesta recibida: 200 OK
[22:31:15] ✅ RESULTADO:
[22:31:15]   Importados: 15
[22:31:15]   Fallidos: 0
[22:31:15]   Filtrables: 74/389
[22:31:15]   Páginas escaneadas: 5
[22:31:15]   Refresh detectados: 0
```

### En Backend Logs (`./scripts/backend_logs.sh`):

```
[ActivityService] 🔄 Iniciando scraping paginado...
[ActivityService] 🔒 Intentando deshabilitar refresh automático de MP...
[ActivityService] ✓ Protección de refresh activada

[ActivityService] 📄 Página 1: Extrayendo transacciones...
[ActivityService]   ↳ Elementos del DOM antes: 15
[ActivityService] ✅ Página 1: 15 transacciones extraídas (total: 15)
[ActivityService]   ↳ Elementos del DOM después: 15
[ActivityService] ➡️  Clickeando botón "Página siguiente"...
[ActivityService]   ✓ Contenido cambió, nueva página cargada

[ActivityService] 📄 Página 2: Extrayendo transacciones...
[ActivityService]   ↳ Elementos del DOM antes: 15
[ActivityService] ✅ Página 2: 15 transacciones extraídas (total: 30)
[ActivityService]   ↳ Elementos del DOM después: 15

[ActivityService] ✅ Scraping completado: 74 transacciones en 5 páginas
```

## 🚨 Situaciones Especiales

### Si ves "Refresh detectado"

```
⚠️  Advertencia: 2 refresh automáticos detectados
```

Significa que MP refrescó automáticamente durante el scraping. El sistema reinténtalo automáticamente, pero algunos movimientos pueden haber sido perdidos. Soluciones:

1. **Repite la importación** para el mismo período
2. **Aumenta maxPaginas** (ej: 25 en lugar de 20)
3. **Acorta el período** (ej: en lugar de "todo el mes", importa una semana)

### Si ves "Errores de navegación"

```
⚠️  Advertencia: 3 errores de navegación/context detectados
```

El contexto de JavaScript de Puppeteer fue destruido (causado por navegación/refresh de MP). El sistema reinténtalo automáticamente hasta 3 veces por página.

### Si ves "0 importados"

Significa que todos los movimientos ya existen en la BD (deduplicación funcionando). Prueba:

1. Cambiar el período (ej: fechas más antiguas)
2. Limpiar manualmente algunos movimientos de la BD si sospechas que faltan

## 🔍 Debugging Avanzado

### Ver Logs del Backend en Tiempo Real:

```bash
cd /home/almacen/tdcApiRest
./scripts/backend_logs.sh
```

### Ver Todas las Importaciones Recientes:

```bash
docker exec docker-mariadb-1 mysql -u rodrigo -pdesa8102test tdc_db -e "
SELECT creado_en, tipo, monto, descripcion 
FROM movimientos_caja 
WHERE id_caja = 2 AND categoria = 'mercadopago'
ORDER BY creado_en DESC LIMIT 20;
"
```

### Contar Duplicados (si sospechas):

```bash
docker exec docker-mariadb-1 mysql -u rodrigo -pdesa8102test tdc_db -e "
SELECT comprobante_ref, COUNT(*) as cant 
FROM movimientos_caja 
WHERE id_caja = 2 AND categoria = 'mercadopago'
GROUP BY comprobante_ref 
HAVING cant > 1;
"
```

## 💡 Tips

1. **Hazlo desde VNC**: Abre el navegador en VNC mientras importas para ver visualmente cómo pagina Puppeteer
2. **Monitorea múltiples ventanas**:
   - Navegador: admin_caja.html
   - VNC: Puppeteer scrapeando
   - Terminal: backend_logs.sh
3. **Ajusta maxPaginas**: Si ves muchos refreshs, reduce a 15. Si quieres más, aumenta a 30
4. **Períodos cortos primero**: Importa primero 1-2 días, luego amplía el rango

## 📋 Resumen de Cambios

### Nuevos Archivos/Cambios:
- ✅ Endpoint POST `/api/cajas/:id/importar-retroactivos`
- ✅ Panel de UI en admin_caja.html con date pickers
- ✅ Función `importarMovimientosRetroactivos()` en admin_caja.js
- ✅ Función `agregarLogRetroactivo()` con logs en tiempo real
- ✅ Logs detallados en `scrapeActivityAllPages()` con detección de refreshs
- ✅ Manejo robusto de errores "Execution context destroyed"
- ✅ Reintentos automáticos (hasta 3 por página)

### Deduplicación Habilitada:
- ✅ No importa transacciones que ya existen (por `comprobante_ref`)
- ✅ Reporta cantidad de duplicados evitados

## 🎯 Próximos Pasos

Después de perfeccionar esta herramienta, implementaremos **Opción 1**:
- Auto-import cuando la caja se abre
- Sync periódico en background
- Detección automática de cierre de caja

---

**¿Preguntas?** Revisa los logs, son muy descriptivos 😊
