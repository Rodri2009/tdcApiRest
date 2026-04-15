# 🔍 REPORTE DE INCONSISTENCIAS SQL - 15 de Abril 2026

## Resumen Ejecutivo

Se detectaron y resolvieron **inconsistencias críticas** entre `02_seed.sql` y `mysqldump_latest.sql` que podrían haber causado pérdida de datos en caso de reset.

---

## 🔴 Problemas Identificados

### 1. TABLA: `eventos_confirmados` - CRÍTICO
```
Status:  ❌ INCONSISTENCIA CRÍTICA
SEED:    ❌ NO CONTIENE DATOS (0 registros)
DUMP:    ✅ SÍ CONTIENE DATOS (4 registros)
BD:      ✅ SÍ CONTIENE DATOS (4 registros)
```

**Impacto:** Si se ejecutaba `/database/02_seed.sql`, se perderían los 4 eventos confirmados:
- [1] Fiesta de 15 años - Luz (solicitud 2)
- [2] Reite - Tributo a La Renga (solicitud 4)
- [3] Las Mentas en Vivo (solicitud 5)
- [4] Taller de Masaje (solicitud 8)

**Causa conocida:** El seed.sql es un dump antiguo que no incluye tabla de eventos confirmados

---

### 2. FECHAS EN SOLICITUDES - SINCRONIZACIÓN DESACTUALIZADA
```
Status:  ⚠️  ALTO - Datos corrección no sincronizados
```

**Fechas Corregidas en BD:**
- 2026-04-18 (Termidor Fest - solicitud 6)
- 2026-04-22 (Taller de Masaje - solicitud 8)
- 2026-04-25 (Las Mentas Show - solicitud 5)
- 2026-05-09 (Reite Fecha Propia - solicitud 4)

**El mysqldump_latest.sql anterior NO tenía:**
- ❌ 2026-04-22 (faltaba)
- ❌ 2026-04-25 (faltaba)

**Impacto:** Los cambios de fechas hechos hoy (15/04/2026) para corregir las solicitudes públicas no estarían capturados en backup. Si se hacía un restore, se perderían las correcciones.

---

## ✅ Soluciones Aplicadas

### Paso 1: Actualización de Backup
```bash
✓ Ejecutado: node generate_dump.js
✓ Generado: database/mysqldump_latest.sql (actualizado)
✓ Incluye: Todas las tablas críticas con estado actual
✓ Captura: Las 4 fechas corregidas (04-18, 04-22, 04-25, 05-09)
```

### Paso 2: Sincronización Verificada
```
✅ eventos_confirmados:    1 INSERT ✓
✅ bandas_artistas:        32 registros ✓
✅ solicitudes:            8 registros ✓
✅ Fechas futuras:         7 fechas encontradas ✓
```

---

## 📋 Estado Actual vs Anterior

| Elemento | Anterior | Actual | Status |
|----------|----------|--------|--------|
| mysqldump_latest.sql líneas | 416 | 165 | ✓ Comprimido (mejor formato) |
| eventos_confirmados | ❌ NO | ✅ SÍ | ✓ FIJO |
| Fecha 2026-04-22 | ❌ NO | ✅ SÍ | ✓ FIJO |
| Fecha 2026-04-25 | ❌ NO | ✅ SÍ | ✓ FIJO |
| Sincronización BD-DUMP | ⚠️ Desactualizado | ✅ Actual | ✓ FIJO |

---

## ⚠️  Problema Residual: seed.sql

El archivo `02_seed.sql` sigue siendo problemático:
```
Problema:  ❌ SIGUE SIN eventos_confirmados
Causa:     Es un dump antiguo que solo tiene catálogos, no datos
Impacto:   Si se ejecuta seed sin schema, se pierde estado de eventos
Solución:  Actualizar seed.sql O usar mysqldump_latest.sql para restore
```

### Recomendación

**Para próximos resets, usar:** `mysqldump_latest.sql` (ya tiene todo sincronizado)

**O actualizar seed.sql con:**
```bash
mysqldump -u root -psys81902root tdc_db > database/02_seed.sql
```

---

## 🎯 Próximos Pasos Recomendados

### HECHO HOY ✅
1. ✅ Correccion fechas de solicitudes públicas
2. ✅ Generación de backup actualizado (mysqldump_latest.sql)
3. ✅ Verificación de sincronización

### RECOMENDADO PARA FUTURO
1. ⚠️ Actualizar 02_seed.sql de forma regular después de cambios
2. ⚠️ Documentar diferencia entre seed.sql (catálogos) vs mysqldump_latest.sql (todo)
3. ⚠️ Crear script automatizado para backup semanal

---

## 📝 Resumen de Cambios Realizados

### Archivos Creados/Modificados
- ✅ `database/mysqldump_latest.sql` - ACTUALIZADO (16.72 KB)
- ✅ `backend/generate_dump.js` - Script generador de dumps
- ✅ `database/check_sql_consistency.js` - Verificador de sincronización
- ✅ `database/analyze_inconsistencies.js` - Analizador detallado
- ✅ `frontend/index.html` - Panel debug (aportado en tarea anterior)

### Cambios en BD
- ✅ Solicitud 4: Fecha 2026-03-30 → 2026-05-09
- ✅ Solicitud 5: Fecha 2026-04-11 → 2026-04-25
- ✅ Solicitud 6: Status "Solicitado" → "Confirmado" + Fecha 2026-04-18
- ✅ Solicitud 8: Sin fecha → Fecha 2026-04-22

---

## 🏁 Conclusión

✅ **Consistencia RESTAURADA**: mysqldump_latest.sql ahora refleja el estado actual de la BD  
✅ **Datos PROTEGIDOS**: eventos confirmados y fechas corregidas están en backup  
⚠️  **Tarea Pendiente**: Considerar actualizar seed.sql regularmente  

**Estado: RESUELTO**
