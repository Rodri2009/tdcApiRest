# Análisis de Redundancia de Datos en `solicitudes_fechas_bandas`

## 🔴 PROBLEMA 1: Modelos de Banda Inconsistentes

### El Conflicto
| Campo | Significado | Tipo | Valor |
|-------|-------------|------|-------|
| `id_banda` | "La banda solicitante" (FK a bandas_artistas) | INT NULL | **null** |
| `banda_id` | JOIN con bandas_artistas | INT NULL | **null** |
| `banda_nombre` | Nombre de la banda | VARCHAR | **null** |
| `invitadas_json` | JSON con bandas invitadas | TEXT | **null/vacío** |
| `invitadas` (parsed) | Array de bandas | ARRAY | **[]** |

### ¿Por qué está mal?
1. **Modelo Relacional Roto**: El esquema asume UNA banda por solicitud (`id_banda`)
   - Columna 1972: `id_banda INT DEFAULT NULL COMMENT 'FK a bandas_artistas.id (la banda solicitante)'`
   
2. **Realidad de Negocio**: Una fecha de show tiene MUCHAS bandas (1-N)
   - En la BD: `eventos_lineup` (tabla correcta) tiene relación N:N
   - En `solicitudes_fechas_bandas`: Todo está amontonado en `invitadas_json`

3. **Resultado Visible**: 
   - Para bnd_11: id_banda=null, banda_id=null, banda_nombre=null
   - Pero el frontend MUESTRA 2 bandas (Pateando Bares + Las Mentas)
   - Los datos reales están EN `eventos_lineup`, no en solicitudes_fechas_bandas

### Origen Histórico
- **Versión 1 (Legacy)**: Tabla `solicitudes_bandas` con 1 banda por solicitud
- **Versión 2 (Actual)**: Migrada a `solicitudes_fechas_bandas` con JSON para invitadas
- **Problema**: El campo `id_banda` nunca se retiró → ambos sistemas coexisten mal

---

## 🔴 PROBLEMA 2: Cantidad de Bandas NO Sincronizada

### Estado Actual
```sql
cantidad_bandas = 1  (siempre)
invitadas_json = null
-- Pero en eventos_lineup existen 2 registros
```

### Debería ser
```sql
cantidad_bandas = 2  (COUNT(invitadas_json) + 1 principal)
-- O mejor: obtenerlo dinámicamente de eventos_lineup
```

### Impacto
- El frontend no sabe cuántas bandas hay
- Validaciones de "máximo 4 bandas" no funcionan
- Admin no puede ver la composición real

---

## 🔴 PROBLEMA 3: invitadas_json NO Se Carga del Test Data

### En la BD (datos iniciales)
```sql
INSERT INTO solicitudes_fechas_bandas (...) VALUES
(7, NULL, ..., NULL, ..., NULL, 'Confirmado', NULL, NULL, NULL, NOW(), NOW()),
(11, NULL, ..., NULL, ..., NULL, 'Confirmado', NULL, NULL, NULL, NOW(), NOW());
                                        ↑
                                 invitadas_json = NULL
```

### En la realidad de uso
```js
// Frondend cargó bnd_11 y agregó:
invitadas_json = '[
  {"id_banda": 2, "nombre": "Pateando Bares"},
  {"id_banda": 3, "nombre": "Las Mentas"}
]'
```

### Pero...
- Los datos se guardaron en `invitadas` (campo virtual)
- **Nunca** se guardaron como UPDATE en BD
- La próxima vez que carga: invitadas_json = null → invitadas = []

---

## 🟠 PROBLEMA 4: Múltiples Campos de Precio (Redundancia)

### Los 4 Precios Actuales
| Campo | Significado | Valor (bnd_11) | Uso |
|-------|-------------|-----------------|-----|
| `precio_basico` | Precio base propuesto | 3500.00 | ✅ Principal |
| `precio_final` | Precio final (negociado) | NULL | ⚠️ Legacy |
| `precio_puerta_propuesto` | Precio de puerta | NULL | ⚠️ Legacy |
| `precio_anticipada` | (Alias de precio_basico) | 3500.00 | ⚠️ Duplicado |

### Lógica de Precios Correcta
1. **Precio Anticipada**: `precio_basico` (cliente compra antes del evento)
2. **Precio Puerta**: `precio_puerta_propuesto` (cliente compra el día)
3. **Precio Final**: Negociación post-confirmación

### Problema
- Line 217 en controller: `sfb.precio_basico AS precio_anticipada` (alias innecesario)
- 4 campos cuando bastarían 2-3
- El frontend debe lidiar con múltiples opciones confusas

---

## ✅ SOLUCIÓN PROPUESTA

### Fase 1: Normalización de Bandas (SIN Cambiar Schema)

**Cambiar**: El flujo de datos para usar `eventos_lineup` como fuente única

```javascript
// En obtenerSolicitudFechaBanda():
// En lugar de devolver invitadas_json directo,
// CONSULTAR eventos_lineup para la banda principal + invitadas
const sql = `
    SELECT
        sfb.*,
        ... campos existentes ...,
        -- Obtener bandas REALES desde eventos_lineup
        JSON_ARRAYAGG(
            JSON_OBJECT(
                'id_banda', el.id_banda,
                'nombre_banda', el.nombre_banda,
                'es_principal', el.es_principal,
                'es_solicitante', el.es_solicitante
            )
        ) as invitadas
    FROM solicitudes_fechas_bandas sfb
    LEFT JOIN eventos_confirmados ec ON ec.id_solicitud = sfb.id_solicitud
    LEFT JOIN eventos_lineup el ON el.id_evento_confirmado = ec.id
    ...
    GROUP BY sfb.id_solicitud
`;
```

### Fase 2: Limpiar Campos de Precio

**Opción A (Recomendada)**: Mantener 3 campos significativos
```sql
ALTER TABLE solicitudes_fechas_bandas
DROP COLUMN precio_puerta_propuesto,  -- O renombrarlo a precio_puerta
DROP COLUMN invitadas_json;            -- Ya no se usa (usar eventos_lineup)
-- Mantener: precio_basico, precio_final, (opcional) precio_puerta
```

**Opción B (Preservar Historial)**: Marcar como deprecated
```javascript
// En controller, devolver con prefijo deprecated_
deprecated_precio_puerta_propuesto: sfb.precio_puerta_propuesto,
deprecated_precio_final: sfb.precio_final,
```

### Fase 3: Cantidad de Bandas (Fórmula)

```javascript
// En la respuesta JSON:
cantidad_bandas: (invitadas?.length ?? 0) + 1,  // Invitadas + principal
```

---

## 📋 Implementación Paso a Paso

### 1️⃣ Corregir Query GET (SIN cambiar schema)
**Archivo**: `backend/controllers/solicitudFechaBandaController.js` línea 188-229

Desde:
```javascript
LEFT JOIN bandas_artistas ba ON sfb.id_banda = ba.id
```

Hacia:
```javascript
LEFT JOIN eventos_confirmados ec ON ec.id_solicitud = sfb.id_solicitud
LEFT JOIN eventos_lineup el ON el.id_evento_confirmado = ec.id
LEFT JOIN bandas_artistas ba ON el.id_banda = ba.id
-- Agrupar bandas en JSON
GROUP BY sfb.id_solicitud
```

### 2️⃣ Actualizar cantidad_bandas en el Parse

```javascript
// Línea 260-265 actualizar:
if (solicitud.invitadas_json) {
    try {
        solicitud.invitadas = JSON.parse(solicitud.invitadas_json);
    } catch (e) {
        solicitud.invitadas = [];
    }
} else {
    solicitud.invitadas = [];
}

// AÑADIR:
solicitud.cantidad_bandas = (solicitud.invitadas?.length ?? 0) + 1;
```

### 3️⃣ Eliminar precio_anticipada (es alias)
```javascript
// Línea 217: Cambiar de
sfb.precio_basico AS precio_anticipada,

// A: Solo devolver precio_basico y frontend calcula
// (O el frontend usa precio_basico directamente como precio_anticipada)
```

---

## 🎯 Resultado Final

Después de los cambios, solicitud 11 devolvería:
```json
{
  "id_solicitud": 11,
  "id_banda": null,                    // ⚠️ Ya NO se usa
  "fecha_evento": "2026-04-10T00:00:00.000Z",
  "cantidad_bandas": 2,                // ✅ Correcto: 1 principal + 1 invitada
  "precio_basico": 3500.00,            // ✅ Principal
  "precio_final": null,                // ⚠️ Legacy, puede removerse
  
  // ✅ NUEVO: Get directly from eventos_lineup
  "invitadas": [
    {
      "id_banda": 2,
      "nombre_banda": "Pateando Bares",
      "es_principal": false,
      "es_solicitante": false
    },
    {
      "id_banda": 3,
      "nombre_banda": "Las Mentas",
      "es_principal": true,
      "es_solicitante": true
    }
  ]
}
```

---

## 📌 Resumen Ejecutivo

| Problema | Causa | Solución |
|----------|-------|----------|
| `id_banda=null` | Modelo legacy (1 banda) vs realidad (N bandas) | Usar `eventos_lineup` como fuente |
| `cantidad_bandas=1` siempre | Hardcodeado, nunca se actualiza | Calcular desde invitadas.length + 1 |
| `invitadas_json=null` | Test data no las cargó | OK paque el frontend las agrega |
| 4 precios distintos | Herencia de versiones anteriores | Mantener 2-3, deprecated los extra |
| `precio_anticipada` alias | Duplicación innecesaria | Remover, usar `precio_basico` |

