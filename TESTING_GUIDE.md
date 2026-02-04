# Guía de Testing - Refactorización de Solicitudes

## Pruebas Rápidas (Sin Código)

### 1. Verificar que el backend está activo
```bash
curl http://localhost:3000/api/bandas
```
✅ Debería devolver lista de bandas en JSON

### 2. Verificar estructura de tablas
```bash
# Acceder a la BD directamente
docker exec -it docker-mariadb-1 mysql -u rodrigo -p tdc_db

# Dentro de mysql:
DESCRIBE solicitudes;
DESCRIBE solicitudes_alquiler;
DESCRIBE solicitudes_bandas;

# Ver datos de prueba
SELECT COUNT(*) as total FROM solicitudes;
SELECT COUNT(*) as total FROM solicitudes_alquiler;
SELECT COUNT(*) as total FROM solicitudes_bandas;
```

## Pruebas Funcionales - Crear Solicitud

### Escenario 1: Crear solicitud de ALQUILER

```bash
# Guardar este payload en un archivo: payload_alquiler.json
{
  "tipoEvento": "INFANTILES",
  "fechaEvento": "2026-03-20",
  "horaInicio": "15:00",
  "duracionEvento": "4 horas",
  "cantidadPersonas": "25",
  "precioBase": "200000",
  "nombreCompleto": "Juan García",
  "telefono": "1123456789",
  "email": "juan.garcia@test.com",
  "descripcion": "Cumpleaños infantil temático"
}

# Ejecutar
curl -X POST http://localhost:3000/api/solicitudes \
  -H "Content-Type: application/json" \
  -d @payload_alquiler.json
```

**Verificación esperada:**
- Response: `{ "solicitudId": [id_generado] }`
- En BD: Row en `solicitudes` con categoría 'ALQUILER'
- En BD: Row en `solicitudes_alquiler` con mismo ID
- Ambos registros tienen nombre_completo = "Juan García"

### Escenario 2: Crear solicitud de BANDA

```bash
# Guardar en: payload_banda.json
{
  "tipoEvento": "FECHA_BANDAS",
  "fechaEvento": "2026-04-10",
  "horaInicio": "21:00",
  "duracionEvento": "5 horas",
  "cantidadPersonas": "150",
  "precioBase": "3000",
  "nombreCompleto": "Reite Tributo",
  "telefono": "1155001122",
  "email": "reite@test.com",
  "descripcion": "Noche de rock con Reite",
  "genero_musical": "Rock Nacional",
  "contacto_rol": "Manager"
}

curl -X POST http://localhost:3000/api/solicitudes \
  -H "Content-Type: application/json" \
  -d @payload_banda.json
```

**Verificación esperada:**
- Response: `{ "solicitudId": [id_generado] }`
- En BD: Row en `solicitudes` con categoría 'BANDA'
- En BD: Row en `solicitudes_bandas` con `id_solicitud = [id_generado]`
- Campo `genero_musical` presente en `solicitudes_bandas`

## Pruebas Funcionales - Actualizar Solicitud

### Escenario 3: Actualizar solicitud de alquiler

```bash
# Usar el ID de la solicitud creada anteriormente
ID=1

# Payload de actualización
{
  "tipoEvento": "ADOLESCENTES",
  "cantidadPersonas": "40",
  "precioBase": "250000",
  "nombreCompleto": "Juan Pablo García",
  "telefono": "1123456790"
}

curl -X PUT http://localhost:3000/api/solicitudes/$ID \
  -H "Content-Type: application/json" \
  -d @payload_update.json
```

**Verificación esperada:**
- Response: `{ "solicitudId": 1 }`
- En BD: `solicitudes.nombre_solicitante` actualizado a "Juan Pablo García"
- En BD: `solicitudes_alquiler.nombre_completo` actualizado a "Juan Pablo García"
- En BD: `solicitudes_alquiler.cantidad_de_personas` = "40"
- En BD: `solicitudes_alquiler.precio_basico` = 250000

## Pruebas Funcionales - Obtener Solicitud

### Escenario 4: Obtener solicitud por ID

```bash
ID=1
curl http://localhost:3000/api/solicitudes/$ID
```

**Verificación esperada:**
- Response contiene todos los campos de solicitud_alquiler
- Campo `nombreCompleto` está presente
- Campo `telefono` está presente
- Campo `email` está presente
- Campo `estado` es 'Solicitado'

## Pruebas Funcionales - Listar Solicitudes Públicas

### Escenario 5: Obtener solicitudes públicas

```bash
# Primero, actualizar una solicitud para marcarla como pública
# (Esto requeriría endpoint que no está documentado aún)

curl http://localhost:3000/api/solicitudes/publicas
```

**Verificación esperada:**
- Response es un array de solicitudes
- Todas las solicitudes tienen `es_publico: 1` o `esPublico: true`
- Todas tienen `estado: 'Confirmado'`
- Todas tienen `fecha_evento >= CURDATE()`

## Pruebas de Integridad de Datos

### Verificar relaciones padre-hijo

```sql
-- En mysql dentro del contenedor

-- 1. Verificar que todos los IDs en solicitudes_alquiler existen en solicitudes
SELECT sa.id FROM solicitudes_alquiler sa 
LEFT JOIN solicitudes s ON sa.id = s.id
WHERE s.id IS NULL;
-- Debería devolver: (no results)

-- 2. Verificar que todos los IDs en solicitudes_bandas existen en solicitudes
SELECT sb.id_solicitud FROM solicitudes_bandas sb 
LEFT JOIN solicitudes s ON sb.id_solicitud = s.id
WHERE s.id IS NULL;
-- Debería devolver: (no results)

-- 3. Verificar sincronización de datos
SELECT 
  sa.id,
  s.nombre_solicitante,
  sa.nombre_completo,
  (s.nombre_solicitante = sa.nombre_completo) as sincronizado
FROM solicitudes s
JOIN solicitudes_alquiler sa ON s.id = sa.id;
-- Todos deben mostrar sincronizado = 1 (true)
```

## Pruebas de Transacciones

### Escenario 6: Verificar que las transacciones funcionan

```bash
# En otra terminal, iniciar un INSERT incompleto:
# (Esto simularía un error durante la transacción)

# Luego verificar que:
# 1. NO se creó registro en solicitudes
# 2. NO se creó registro en solicitudes_alquiler
# Los cambios deben haber sido revertidos (ROLLBACK)
```

## Script de Testing Completo

```bash
#!/bin/bash

echo "🧪 Iniciando suite de tests..."

# 1. Test: Crear solicitud de alquiler
echo "1. Creando solicitud de alquiler..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/solicitudes \
  -H "Content-Type: application/json" \
  -d '{
    "tipoEvento": "INFANTILES",
    "fechaEvento": "2026-03-20",
    "horaInicio": "15:00",
    "duracionEvento": "4 horas",
    "cantidadPersonas": "25",
    "precioBase": "200000",
    "nombreCompleto": "Test User",
    "telefono": "1234567890",
    "email": "test@test.com",
    "descripcion": "Test event"
  }')

SOLICITUD_ID=$(echo $RESPONSE | grep -o '"solicitudId":[0-9]*' | cut -d: -f2)
echo "✅ Solicitud creada con ID: $SOLICITUD_ID"

# 2. Test: Obtener solicitud
echo "2. Obteniendo solicitud..."
curl -s http://localhost:3000/api/solicitudes/$SOLICITUD_ID | python3 -m json.tool > /tmp/test_solicitud.json
echo "✅ Solicitud obtenida"

# 3. Test: Actualizar solicitud
echo "3. Actualizando solicitud..."
curl -s -X PUT http://localhost:3000/api/solicitudes/$SOLICITUD_ID \
  -H "Content-Type: application/json" \
  -d '{
    "tipoEvento": "ADOLESCENTES",
    "cantidadPersonas": "40"
  }' | python3 -m json.tool > /tmp/test_update.json
echo "✅ Solicitud actualizada"

# 4. Test: Listar solicitudes públicas
echo "4. Listando solicitudes públicas..."
curl -s http://localhost:3000/api/solicitudes/publicas | python3 -m json.tool > /tmp/test_publicas.json
echo "✅ Solicitudes públicas obtenidas"

echo ""
echo "🎉 Todos los tests completados!"
echo "📁 Resultados guardados en /tmp/test_*.json"
```

## Checklist de Validación

- [ ] Backend responde en puerto 3000
- [ ] Crear solicitud devuelve ID válido
- [ ] Solicitud existe en `solicitudes` (padre)
- [ ] Solicitud existe en `solicitudes_alquiler` (hijo)
- [ ] Actualizar sincroniza ambas tablas
- [ ] Obtener solicitud devuelve datos completos
- [ ] Campos nombre_completo, telefono, email están presentes
- [ ] Transacciones funcionan (rollback en caso de error)
- [ ] No hay registros huérfanos en tablas hijas
- [ ] Datos están sincronizados entre padre e hijo

## Solución de Problemas

### Si curl falla con "Connection refused"
```bash
# Verificar que el contenedor backend está corriendo
docker ps | grep backend

# Si no está, reiniciar
docker-compose -f docker/docker-compose.yml restart backend
```

### Si ves errores de SQL
```bash
# Revisar logs del backend
docker-compose -f docker/docker-compose.yml logs backend -f

# Revisar logs de MariaDB
docker-compose -f docker/docker-compose.yml logs mariadb -f
```

### Si los datos no están sincronizados
```bash
# Ejecutar script de validación
mysql -u rodrigo -p tdc_db < /path/to/validation.sql
```

## Próximos Tests a Implementar

- [ ] Tests de bandas (solicitudes_bandas)
- [ ] Tests de servicios (solicitudes_servicios)
- [ ] Tests de talleres (solicitudes_talleres)
- [ ] Tests de concurrencia (múltiples solicitudes simultáneas)
- [ ] Tests de errores (validaciones, campos inválidos)
- [ ] Tests de emails (verificar que se envían)
