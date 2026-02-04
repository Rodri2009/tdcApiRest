# Refactorización de Solicitudes - Integración de Tablas Solicitudes

## Resumen de Cambios

Se ha refactorizado el `solicitudController.js` para alinearse correctamente con la nueva estructura de base de datos que incluye las tablas `solicitudes` (padre) y `solicitudes_alquiler` (hijo).

## Cambios Realizados

### 1. **Función `crearSolicitud`**
- **Antes**: Insertaba directamente en `solicitudes_alquiler` sin crear registro en `solicitudes`
- **Después**: 
  - Inserta primero en `solicitudes` (tabla padre) con categoría "ALQUILER" o "BANDA"
  - Obtiene el `id` generado automáticamente
  - Inserta en `solicitudes_alquiler` o `solicitudes_bandas` con ese mismo `id`
  - Maneja transacciones para garantizar integridad

**Campos agregados en solicitudes_alquiler:**
- `nombre_completo` - Nombre del solicitante
- `telefono` - Teléfono de contacto
- `email` - Email del solicitante
- `descripcion` - Descripción del evento
- `estado` - Estado de la solicitud
- `tipo_de_evento` - Tipo/subtipo de evento

### 2. **Función `actualizarSolicitud`**
- **Antes**: Solo actualizaba `solicitudes_alquiler` parcialmente
- **Después**: 
  - Actualiza tanto `solicitudes` como `solicitudes_alquiler` con todos los campos disponibles
  - Mantiene sincronización entre tablas padre e hijo

### 3. **Función `finalizarSolicitud`**
- **Antes**: Hacía JOIN entre `solicitudes` y `solicitudes_alquiler` sin actualizar todos los campos
- **Después**:
  - Actualiza `solicitudes` con datos del solicitante
  - Actualiza `solicitudes_alquiler` con los mismos datos para mantener redundancia controlada
  - Usa LEFT JOIN para obtener datos completos

### 4. **Función `getSolicitudPorId`**
- **Antes**: Consultaba `solicitudes_bandas` con JOIN incorrecto usando `s.id = sb.id_solicitud`
- **Después**:
  - Consulta `solicitudes_bandas` directamente por `id_solicitud`
  - Consulta `solicitudes_alquiler` directamente por `id`
  - Maneja ambos tipos de solicitudes correctamente

### 5. **Función `getSesionExistente`**
- **Antes**: Buscaba por `fingerprintid` en `solicitudes_alquiler` (columna que no existe)
- **Después**:
  - Simplificada para obtener la última solicitud sin filtros complejos
  - Devuelve NULL si no encuentra sesión activa

### 6. **Función `getSolicitudesPublicas`**
- **Antes**: Usaba `id_solicitud` en lugar de `id`
- **Después**:
  - Usa `id` (columna correcta en `solicitudes_alquiler`)
  - Consulta correcta para obtener solicitudes públicas confirmadas

### 7. **Función `updateVisibilidad`**
- **Antes**: Lógica confusa para determinar la tabla
- **Después**:
  - Primero busca en `solicitudes_alquiler` por `id`
  - Si no existe, busca en `solicitudes_bandas` por `id_solicitud`
  - Detecta correctamente qué tabla actualizar

## Estructura de Tablas

### Tabla `solicitudes` (Padre)
```sql
id (PK)
categoria (ALQUILER, BANDA, BANDAS, SERVICIOS, TALLERES)
fecha_creacion
estado
descripcion
nombre_solicitante
telefono_solicitante
email_solicitante
```

### Tabla `solicitudes_alquiler` (Hijo)
```sql
id (FK → solicitudes.id, PK)
tipo_servicio
fecha_evento
hora_evento
duracion
cantidad_de_personas
precio_basico
precio_final
es_publico
tipo_de_evento
nombre_completo (NUEVO)
telefono (NUEVO)
email (NUEVO)
descripcion (NUEVO)
estado (NUEVO)
```

### Tabla `solicitudes_bandas` (Hijo)
```sql
id_solicitud (PK, FK → solicitudes.id)
tipo_de_evento
tipo_servicio
es_publico
fecha_hora
fecha_evento
hora_evento
duracion
cantidad_de_personas
precio_basico
precio_final
nombre_completo
telefono
email
descripcion
estado
fingerprintid
[+ campos específicos de bandas]
```

## Flujo de Transacciones

### CREATE (Crear nueva solicitud)
1. BEGIN TRANSACTION
2. INSERT INTO solicitudes → obtener newId
3. IF esBanda THEN INSERT INTO solicitudes_bandas ELSE INSERT INTO solicitudes_alquiler
4. COMMIT (o ROLLBACK en caso de error)

### UPDATE (Actualizar solicitud existente)
1. BEGIN TRANSACTION
2. UPDATE solicitudes (descripción, solicitante, contacto)
3. UPDATE solicitudes_alquiler o solicitudes_bandas (todos los campos)
4. COMMIT (o ROLLBACK en caso de error)

### READ (Obtener solicitud)
1. Consultar tabla específica (bandas o alquiler) por id
2. Si es alquiler, puede obtener datos de solicitudes padre si es necesario

## Validaciones y Manejo de Errores

- Todas las operaciones CRUD ahora validan que el registro exista
- Las transacciones garantizan integridad referencial
- Se devuelven errores 404 si la solicitud no existe
- Se devuelven errores 400 para validaciones fallidas
- Se devuelven errores 500 para errores internos del servidor

## Testing Recomendado

1. **Crear solicitud de alquiler** → Verificar que se cree en ambas tablas
2. **Crear solicitud de banda** → Verificar que se cree en ambas tablas
3. **Actualizar solicitud** → Verificar sincronización entre tablas
4. **Finalizar solicitud** → Verificar que se envíen emails correctamente
5. **Obtener solicitud por ID** → Verificar que devuelva datos correctos
6. **Listar solicitudes públicas** → Verificar filtros y ordenamiento

## Notas Importantes

- La redundancia de datos en `solicitudes_alquiler` (nombre_completo, telefono, email, descripcion, estado) es intencional para permitir consultas más rápidas sin JOINs
- `solicitudes_bandas` usa `id_solicitud` como nombre de columna para mayor claridad semántica
- `solicitudes_alquiler` usa `id` para ser más conciso, siendo la tabla más usada
- Las transacciones son críticas para mantener la integridad referencial

## Archivos Modificados

- `/home/rodrigo/tdcApiRest/backend/controllers/solicitudController.js`
- `/home/rodrigo/tdcApiRest/database/01_schema.sql` (agregadas columnas a solicitudes_alquiler)
- `/home/rodrigo/tdcApiRest/database/03_test_data.sql` (ajustados inserts)
