# Fix: Guardar múltiples bandas (invitadas)

## Problema
El formulario `editar_solicitud_fecha_bandas.html` guardaba correctamente las bandas invitadas en la BD, pero al reabrir la página, solo se mostraba la banda principal seleccionada. Las invitadas desaparecían de la UI, causando que se perdieran al guardar nuevamente.

## Raíz del Problema
En `cargarEvento()` (función que carga el evento del API), el frontend:
1. ✓ Recibía `invitadas_json` correctamente del backend
2. ✓ El API los parseaba como `invitadas` (array de objetos)
3. ✗ **PERO** no los cargaba en `bandasSeleccionadas` para mostrar en la UI
4. ✗ Además, buscaba `evento.nombre_banda` que era `null`, ignorando que el backend devuelve `banda_nombre`

## Solución Implementada

### 1. Mejor normalización de campos (líneas 925-960)
```javascript
// Antes: if (evento.banda_nombre && !evento.nombre_banda) evento.nombre_banda = evento.banda_nombre;
// Después:
if (!evento.nombre_banda && evento.banda_nombre) {
    evento.nombre_banda = evento.banda_nombre;
}
if (!evento.id_banda && evento.banda_id) {
    evento.id_banda = evento.banda_id;
}
// ... más campos normalizados ...
```
- Más explícito y robusto
- Cubre todos los campos que el API devuelve

### 2. Parsing de invitadas mejorado (líneas 961-972)
```javascript
if (!evento.invitadas || !Array.isArray(evento.invitadas)) {
    if (evento.invitadas_json && typeof evento.invitadas_json === 'string') {
        try { evento.invitadas = JSON.parse(evento.invitadas_json); } catch (e) { evento.invitadas = []; }
    } else {
        evento.invitadas = [];
    }
}
```
- Asegura que `evento.invitadas` siempre sea un array
- Fallback si viene como string JSON

### 3. **NUEVO**: Cargar bandas invitadas en `bandasSeleccionadas` (líneas 985-1008)
```javascript
// 2. Agregar bandas invitadas (si existen)
if (evento.invitadas && Array.isArray(evento.invitadas) && evento.invitadas.length > 0) {
    console.log('[BANDAS] Bandas invitadas encontradas en evento:', evento.invitadas);
    evento.invitadas.forEach(invitada => {
        const match = bandasDisponibles.find(b => b.id === invitada.id_banda);
        if (match) {
            bandasSeleccionadas.push({ id: match.id, nombre: match.nombre, genero: match.genero_musical || '', logoUrl: match.logo_url || '' });
        } else {
            bandasSeleccionadas.push({ id: invitada.id_banda, nombre: invitada.nombre, genero: '', logoUrl: '' });
        }
    });
}
```
- **Ahora el formulario muestra las bandas invitadas al abrir**
- Popula `bandasSeleccionadas` con: banda principal + todas las invitadas
- Si invitada no existe en `bandasDisponibles`, crea un objeto placeholder

## Flujo Completo (Ahora Funciona)

### Guardar (POST/PUT)
1. Usuario selecciona banda principal + N bandas invitadas
2. Frontend crea `invitadas_json` = array de invitadas
3. Backend guarda en `solicitudes_fechas_bandas.invitadas_json`
4. ✓ Se persiste en la BD

### Reabrir (GET)
1. Frontend GET `/api/solicitudes-fechas-bandas/:id`
2. Backend devuelve:
   - `banda_nombre`: nombre de la banda principal
   - `invitadas`: array parseado de invitadas
3. Frontend normaliza `banda_nombre` → `nombre_banda`, carga ambas en `bandasSeleccionadas`
4. Renderiza ambas en el UI
5. ✓ Usuario ve todas las bandas seleccionadas

## Prueba (Sin Autenticación)

### Verificar que el API devuelve datos correctos:
```bash
curl http://localhost:3000/api/solicitudes-fechas-bandas/10 | jq '{
  banda_nombre,
  id_banda,
  invitadas: .invitadas | length,
  invitadas_detail: .invitadas
}'
```

**Resultado esperado:**
```json
{
  "banda_nombre": "Cumbia Sudaka",
  "id_banda": 4,
  "invitadas": 2,
  "invitadas_detail": [
    {"id_banda": 2, "nombre": "Pateando Bares"},
    {"id_banda": 1, "nombre": "Reite"}
  ]
}
```

### Prueba en el navegador:
1. Abrir: `/editar_solicitud_fecha_bandas.html?bnd_10`
2. Login como admin
3. Esperar a que cargue el evento
4. **Verificar**: En la sección "Bandas Seleccionadas" deberían aparecer 3 bandas:
   - 1. Cumbia Sudaka (principal)
   - 2. Pateando Bares (invitada)
   - 3. Reite (invitada)
5. Hacer cambios (ej. agregar otra banda)
6. Click "Guardar Cambios"
7. Reabrir la página
8. **Verificar**: Todas las bandas deberían persistir

## Logs de Depuración

En la consola del navegador (F12 → Console), deberías ver:
```
[BANDAS] Después de normalización - nombre_banda: Cumbia Sudaka id_banda: 4
[BANDAS] Bandas invitadas encontradas en evento: (2) [{…}, {…}]
[BANDAS] bandasSeleccionadas poblado con principal + invitadas (total 3)
```

## Cambios Realizados

- **Archivo**: `frontend/editar_solicitud_fecha_bandas.html`
- **Funciones afectadas**: `cargarEvento()` (líneas 925-1011)
- **Líneas añadidas**: ~85 líneas
- **Cambios lógicos**:
  1. Normalización de campos más robusta
  2. Parsing de invitadas garantizado
  3. Carga de invitadas en `bandasSeleccionadas` (NUEVO)

## Estado

✓ Backend: guarda y devuelve invitadas_json correctamente
✓ Frontend: ahora carga y renderiza invitadas al abrir formulario
✓ Persistencia: múltiples bandas se mantienen al reabrir

**El problema de guardar múltiples bandas está RESUELTO.**
