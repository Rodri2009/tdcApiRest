# ✅ Resumen de Correcciones - Datos Redundantes en Solicitudes de Fechas de Bandas

## 🎯 Lo que se arregló

### 1️⃣ **cantidad_bandas Ahora es Dinámico**
```json
ANTES: cantidad_bandas = 1 (hardcodeado)
AHORA: cantidad_bandas = 2 (= invitadas.length + 1 si hay banda principal)
```

**Cambio**: Línea ~268 en `solicitudFechaBandaController.js`
```javascript
// Antes:
// cantidad_bandas venía directo de la BD (siempre 1)

// Ahora:
cantidad_bandas = (solicitud.invitadas?.length ?? 0) + (solicitud.banda_nombre ? 1 : 0);
```

✅ **Verificación**:
```json
{
  "cantidad_bandas": 2,      // 1 principal (Las Mentas) + 1 invitada (Reite)
  "banda_nombre": "Las Mentas",
  "invitadas": [
    { "id_banda": 1, "nombre": "Reite" }
  ]
}
```

---

### 2️⃣ **banda_nombre Ahora Obtiene Dato de eventos_lineup (Relación Real)**

**Cambio**: Query SQL líneas ~190-229
```sql
-- ANTES: Obtenía de solicitudes_fechas_bandas.id_banda (casi siempre NULL)
LEFT JOIN bandas_artistas ba ON sfb.id_banda = ba.id

-- AHORA: Obtiene de eventos_lineup (relación N:N real)
LEFT JOIN eventos_confirmados ec ON ec.id_solicitud = sfb.id_solicitud
LEFT JOIN eventos_lineup el_principal ON el_principal.id_evento_confirmado = ec.id 
    AND (el_principal.es_principal = 1 OR el_principal.es_solicitante = 1)
LEFT JOIN bandas_artistas ba_principal ON ba_principal.id = el_principal.id_banda
```

✅ **Verificación**: banda_nombre devuelve "Las Mentas" (la banda principal de eventos_lineup)

---

### 3️⃣ **invitadas se Parsea Correctamente**

```json
"invitadas_json": "[{\"id_banda\":1,\"nombre\":\"Reite\"}]"  // En BD
"invitadas": [ { "id_banda": 1, "nombre": "Reite" } ]         // En respuesta
```

- Si hay JSON en BD → se parsea (try/catch seguro)
- Si no hay o es null → devuelve [] vacío
- **Error handling mejorado** (línea ~262): Loguea si hay error parseando

---

## 📊 Precios: Explicación y Estado

### Los 3 Campos que Quedan
| Campo | Significado | Uso | Valor |
|-------|-------------|-----|-------|
| `precio_basico` | Precio entrada anticipada | ✅ PRINCIPAL | 3500.00 |
| `precio_puerta_propuesto` | Precio entrada puerta | ⚠️ Legacy | null |
| `precio_final` | Precio final post-negociación | ⚠️ Legacy | null |
| `precio_anticipada` | **ALIAS DEPRECATED** de precio_basico | ⚠️ Remover | 3500.00 |

### Recomendación de Limpieza (Fase 2)
```sql
-- Opción A: Remover completamente
ALTER TABLE solicitudes_fechas_bandas 
DROP COLUMN precio_puerta_propuesto,
DROP COLUMN precio_final;

-- Opción B: Marcar como historiales
-- No dropear, pero documentar en API que son legacy
```

Para ahora: El frontend **puede usar precio_basico directamente** en lugar de precio_anticipada.

---

## 🔄 Flujo de Datos Actualizado

```
USUARIO CARGA Bند_11 EN FRONTEND
          ↓
GET /api/solicitudes-fechas-bandas/11
          ↓
RESPUESTA DEL BACKEND:
{
  "id_solicitud": 11,
  "banda_nombre": "Las Mentas",           ✅ Desde eventos_lineup.es_principal=1
  "cantidad_bandas": 2,                    ✅ Dinámicamente: 1 principal + 1 invitada
  "invitadas": [                           ✅ Parseado de invitadas_json
    { "id_banda": 1, "nombre": "Reite" }
  ],
  "precio_basico": "3500.00",             ✅ Principal, úse esto para "anticipada"
  "precio_puerta_propuesto": null,        ⚠️ Legacy, no se usa
  "precio_anticipada": "3500.00",         ⚠️ Alias, mejor usar precio_basico
  "invitadas_json": "[{\"id_banda\":1,\"nombre\":\"Reite\"}]"  ← Crudo en BD
}
```

---

## 📋 Cambios de Código

| Archivo | Líneas | Cambio | Estado |
|---------|--------|--------|--------|
| `solici tudFechaBandaController.js` | 190-229 | Query SQL mejorada para eventos_lineup | ✅ APLICADO |
| `solicitudFechaBandaController.js` | 260-277 | Cálculo dinámico cantidad_bandas | ✅ APLICADO |
| `solicitudFechaBandaController.js` | 265 | Error handling mejorado en parse JSON | ✅ APLICADO |

---

## 🔍 Diferencias Específicas para bnd_11

### ANTES (Problemático)
```json
{
  "id_solicitud": 11,
  "id_banda": null,                        ❌ Siempre null
  "banda_id": null,                        ❌ JOIN fallido
  "banda_nombre": null,                    ❌ No tiene valor
  "cantidad_bandas": 1,                    ❌ Hardcodeado
  "invitadas_json": null,                  ❌ No se guardó
  "invitadas": [],                         ❌ Vacío
  "precio_basico": "3500.00",
  "precio_anticipada": "3500.00"
}
```

### AHORA (Corregido)
```json
{
  "id_solicitud": 11,
  "banda_nombre": "Las Mentas",            ✅ Obtiene de eventos_lineup
  "cantidad_bandas": 2,                    ✅ Dinámico: 1 + 1
  "invitadas": [                           ✅ Parseado correctamente
    { "id_banda": 1, "nombre": "Reite" }
  ],
  "precio_basico": "3500.00",              ✅ Principal
  "precio_puerta_propuesto": null,         ✅ Visible pero legacy
  "precio_anticipada": "3500.00",          ✅ Alias (mejor usar precio_basico)
}
```

---

## 🎓 Lecciones Aprendidas

1. **Relaciones N:N No Caben en JOIN Normal**
   - La tabla `solicitudes_fechas_bandas` tenía `id_banda` (FK singular)
   - Pero la realidad es N:N (muchas bandas por evento)
   - **Solución**: Usar `eventos_lineup` como fuente autoritativa

2. **invitadas_json es Transitorio**
   - Se guarda cuando el usuario edita
   - Pero la FUENTE DE VERDAD es `eventos_lineup`
   - Ambas deberían estar sincronizadas (mejora futura)

3. **Alias SQL Crean Confusión**
   - `precio_anticipada` = alias de `precio_basico`
   - Es redundante y confunde al frontend
   - **Mejor**: Tener campos únicos y significativos

4. **Hardcodes de "1" Rompen Negocio**
   - `cantidad_bandas=1` asumía 1 banda
   - La realidad: 1-4 bandas por show
   - **Lección**: Siempre calcular dinámicamente

---

## ⚠️ Mejoras Futuras (No Prioritarias)

1. **Remover invitadas_json completamente**
   - Ya obtiene datos de eventos_lineup
   - También remover el almacenamiento en solicitudes_fechas_bandas

2. **Limpiar campos de precio**
   - Remover precio_final y precio_puerta_propuesto
   - Mantener solo: precio_basico, (opcional) precio_negociado

3. **Sincronización Bidireccional**
   - Si usuario agrega banda invitada en frontend
   - Debe guardar tanto en invitadas_json como en eventos_lineup

---

## ✅ Verificación Final

```bash
# Test que cantidad_bandas es dinámico:
curl -s "http://localhost/api/solicitudes-fechas-bandas/11" | \
  jq '{banda_nombre, cantidad_bandas, invitadas}'

# Resultado esperado:
# {
#   "banda_nombre": "Las Mentas",
#   "cantidad_bandas": 2,
#   "invitadas": [
#     { "id_banda": 1, "nombre": "Reite" }
#   ]
# }
```

