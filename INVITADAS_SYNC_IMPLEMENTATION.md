# Implementación de Sincronización de Invitadas - Estado Actual

## Resumen
Se implementó lógica para sincronizar `invitadas_json` recibido en PUT `/api/solicitudes-fechas-bandas/:id` hacia la tabla `eventos_lineup`.

## Cambios Realizados

### 1. Controlador (`backend/controllers/solicitudFechaBandaController.js`)

**Ubicación**: Líneas 588-632 (método `actualizarSolicitudFechaBanda`)

**Lógica implementada**:
```javascript
// ✅ SINCRONIZAR invitadas_json CON eventos_lineup
logVerbose(`[FECHA_BANDA] SINCRONIZANDO INVITADAS - tipo: ${typeof invitadas_json}, isArray: ${Array.isArray(invitadas_json)}`);

try {
    if (invitadas_json && Array.isArray(invitadas_json) && invitadas_json.length > 0) {
        // Obtener el id_evento_confirmado para esta solicitud
        const [eventoRow] = await conn.query(
            "SELECT id FROM eventos_confirmados WHERE id_solicitud = ? AND tipo_evento = 'BANDA'",
            [idNum]
        );
        
        if (eventoRow && eventoRow.id) {
            const eventoId = eventoRow.id;
            
            // DELETE invitadas antiguas (mantener principal: es_principal=1)
            await conn.query(
                `DELETE FROM eventos_lineup 
                 WHERE id_evento_confirmado = ? AND es_principal = 0 AND es_solicitante = 0`,
                [eventoId]
            );
            
            // INSERT nuevas invitadas
            let orden = 0;
            for (const inv of invitadas_json) {
                if (inv.id_banda && inv.nombre) {
                    await conn.query(
                        `INSERT INTO eventos_lineup 
                         (id_evento_confirmado, id_banda, nombre_banda, orden_show, es_principal, es_solicitante, estado) 
                         VALUES (?, ?, ?, ?, 0, 0, 'invitada')`,
                        [eventoId, inv.id_banda, inv.nombre, orden++]
                    );
                }
            }
        }
    }
} catch (e) {
    logWarning(`[FECHA_BANDA] Error sincronizando invitadas_json:`, e.message);
    // No fallar el PUT por error en sincronización
}
```

## Flujo de Sincronización

**Entrada**: PUT `/api/solicitudes-fechas-bandas/11` con payload:
```json
{
    "invitadas_json": [
        {"id_banda": 1, "nombre": "Reite"},
        {"id_banda": 2, "nombre": "Pateando Bares"},
        {"id_banda": 4, "nombre": "Cumbia Sudaka"}
    ]
}
```

**Proceso**:
1. Desestructurar `invitadas_json` del `req.body`
2. Actualizar tabla `solicitudes_fechas_bandas` con otros campos (si aplica)
3. **Sincronizar invitadas**:
   - Obtener `id` del evento confirmado para la solicitud
   - DELETE de `eventos_lineup` donde `es_principal=0` y `es_solicitante=0` (invitadas previas)
   - INSERT cada invitada nueva con `orden_show` secuencial
   - Mantener banda principal intacta (es_principal=1)

**Salida**: HTTP 200 - "Solicitud actualizada exitosamente."

## Estado de Verificación

### ✅ Implementado:
- Código de sincronización escrito y válido (sin errores de sintaxis)
- Integrado en el flujo PUT del controlador
- Manejo de errores con try-catch
- Logging detallado para debugging

### ⚠️ Pendiente de Verificación:
- Ejecución real del código en los logs
- Sincronización efectiva en la BD
- Verificación GET que muestre invitadas sincronizadas

### 🔍 Problema Identificado:
- Caching de módulos en Node.js impide verificación inmediata
- Necesario rebuild completo de Docker para garantizar nueva versión ejecutándose

## Próximos Pasos Recomendados

1. **Rebuild completo de Docker**:
   ```bash
   docker compose -f docker/docker-compose.yml down
   docker compose -f docker/docker-compose.yml up -d
   ```

2. **Test de sincronización**:
   ```bash
   # PUT con invitadas
   curl -X PUT http://localhost/api/solicitudes-fechas-bandas/11 \
     -H "Authorization: Bearer $TOKEN" \
     -d '{"invitadas_json": [...]}'
   
   # Verificar en BD
   SELECT * FROM eventos_lineup 
   WHERE id_evento_confirmado = 4 
   AND es_principal = 0
   ORDER BY orden_show;
   ```

3. **GET para verificar persistencia**:
   ```bash
   curl http://localhost/api/solicitudes-fechas-bandas/11
   ```
   La respuesta debe incluir:
   ```json
   {
       "cantidad_bandas": 4,  // 1 principal + 3 invitadas
       "invitadas": [
           {"id_banda": 1, "nombre": "Reite"},
           {"id_banda": 2, "nombre": "Pateando Bares"},
           {"id_banda": 4, "nombre": "Cumbia Sudaka"}
       ]
   }
   ```

## Arquitectura de Autoridad de Datos

Después de Phase 2 (removimiento de campos de BD):

| Campo | Tabla Anterior | Tabla Actual | Autoridad |
|-------|---|---|---|
| Banda Principal | `solicitudes_fechas_bandas.id_banda` | `eventos_lineup.es_principal=1` | eventos_lineup |
| Invitadas | `solicitudes_fechas_bandas.invitadas_json` | `eventos_lineup.es_principal=0,es_solicitante=0` | eventos_lineup |
| Precio | `solicitudes_fechas_bandas.precio_*` (3 columnas) | `solicitudes_fechas_bandas.precio_basico` | precio_basico |

## Ventajas de la Sincronización

- ✅ Almacenamiento normalizado (sin JSON duplicado)
- ✅ Relaciones claras entre entidades  
- ✅ Facilita queries y reporting
- ✅ Consistencia de datos
- ✅ Auditable (se puede trackear cambios)

## Notas Técnicas

- Usa `evento_confirmado.id` como FK principal para `eventos_lineup`
- Preserva banda principal, solo reemplaza invitadas
- Ordena invitadas por `orden_show` (0-indexed)
- Manejo gracioso de errores (no rompe el PUT)
-Loguea cada paso para debugging

---
**Fecha de implementación**: 2026-02-20  
**Responsable**: Sistema de sincronización de BD  
**Estado**: Código implementado, pending full deployment verification
