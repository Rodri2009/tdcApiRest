# Reorganización de Archivos SQL y Reset de Base de Datos

## Estructura de Archivos

La base de datos ahora está organizada en tres capas claramente separadas:

### 1. **01_schema.sql** (740 líneas)
- **Propósito**: Define la estructura completa de la base de datos
- **Contenido**: 
  - CREATE TABLE statements para todas las tablas
  - Definición de claves primarias y foráneas
  - Índices para optimización
  - Constraints y validaciones
- **Cuándo cargar**: Primero, siempre
- **Cambios**: Raramente (solo cuando se necesitan cambios estructurales)

### 2. **02_seed.sql** (162 líneas)
- **Propósito**: Carga datos de configuración y catálogos necesarios para que el sistema funcione
- **Contenido**:
  - `configuracion`: Datos del negocio (nombre, teléfono, correo, horarios)
  - `opciones_tipos`: Tipos de eventos (INFANTILES, BODAS, BANDAS, etc.) - 15 registros
  - `opciones_duracion`: Duraciones disponibles (3h, 4h, 5h, etc.) - 22 registros
  - `configuracion_horarios`: Horarios de atención - 42 registros
  - `opciones_adicionales`: Servicios adicionales (mesas, sillas, inflables) - 8 registros
  - `catalogo_roles`: Roles del personal (DJ, Mesera, Bartender, etc.) - 11 registros
  - `catalogo_instrumentos`: Instrumentos musicales - 28 registros
  - `personal_disponible`: Personal que trabaja en la empresa - 7 registros
  - `personal_tarifas`: Tarifas por rol - 6 registros
  - `precios_servicios`: Precios de servicios - 6 registros
  - `precios_vigencia`: Matriz de precios por tipo de evento y cantidad de pax - 27 registros
  - `servicios_catalogo`: Servicios de terceros (masajes, depilación, estética) - 6 registros
  - `bandas_artistas`: Bandas disponibles - 4 bandas + 19 formaciones
  - `cupones`: Descuentos (ROCK20, DESCUENTO10K, PUERTA25) - 3 registros
- **Cuándo cargar**: Segundo, después del schema
- **Cambios**: Ocasionalmente (al agregar nuevos tipos, duraciones, roles, instrumentos, bandas o cambiar precios)

### 3. **03_test_data.sql** (128 líneas)
- **Propósito**: Contiene datos transaccionales de prueba para desarrollo y testing
- **Contenido**:
  - `usuarios`: Usuario admin de prueba
  - `clientes`: 11 clientes de ejemplo
  - `solicitudes`: 11 solicitudes completas (ALQUILER, BANDAS, SERVICIOS, TALLERES)
  - `solicitudes_alquiler`: Detalles de 4 alquileres
  - `solicitudes_fechas_bandas`: Detalles de 5 eventos musicales conformados
  - `solicitudes_servicios`: 1 servicio de catering
  - `solicitudes_talleres`: 1 taller de fotografía
  - `solicitudes_adicionales`: Servicios adicionales agregados
  - `eventos_confirmados`: 4 eventos confirmados con bands
  - `eventos_lineup`: 7 bandas en lineups de eventos
  - `personal_pagos`: 2 registros de pagos a personal
- **Cuándo cargar**: Tercero, después de 02_seed.sql
- **Cambios**: Frecuentemente (se actualiza según los tests necesarios)

## Script de Reset

### Ubicación
```
scripts/reset.sh
```

### Uso Básico
```bash
# Hacer ejecutable (si no lo está)
chmod +x scripts/reset.sh

# Ejecutar reset
./scripts/reset.sh
```

### Configuración
Edita las variables en el script si necesitas cambiar:
- `DB_NAME`: Nombre de la base de datos (default: `tdc_db`)
- `DB_USER`: Usuario MySQL (default: `root`)
- `DB_PASSWORD`: Contraseña (default: vacío)
- `DB_HOST`: Host (default: `localhost`)
- `DB_PORT`: Puerto (default: `3306`)

### Qué Hace el Script
1. **Verifica** que existan los 3 archivos SQL
2. **Elimina** la base de datos existente (si existe)
3. **Crea** una base de datos nueva con charset utf8mb4
4. **Carga** 01_schema.sql
5. **Carga** 02_seed.sql
6. **Carga** 03_test_data.sql
7. **Verifica** la integridad de datos cargando conteos de tablas importantes

### Output Esperado
```
=================================================
  TDC App - Database Reset
=================================================

[*] Verificando archivos SQL...
    ✓ 01_schema.sql
    ✓ 02_seed.sql
    ✓ 03_test_data.sql

[*] Eliminando base de datos existente... ✓ OK
[*] Creando base de datos nueva... ✓ OK
[*] Cargando: Schema (Estructura de tablas)... ✓ OK
[*] Cargando: Seed Data (Configuración y catálogos)... ✓ OK
[*] Cargando: Test Data (Datos dinámicos de prueba)... ✓ OK

[*] Verificando integridad de datos...
    ✓ Configuración: 7 registros
    ✓ Tipos de eventos: 15 registros
    ✓ Clientes: 11 registros
    ✓ Usuarios: 1 registros
    ✓ Solicitudes: 11 registros
    ✓ Eventos confirmados: 4 registros
    ✓ Bandas artistas: 4 registros

=================================================
  ✓ Base de datos reiniciada exitosamente
=================================================
```

## Flujo de Desarrollo

### Situación 1: Cambios en el Schema
```
1. Editar 01_schema.sql
2. Ejecutar: ./scripts/reset.sh
3. Hacer git commit de 01_schema.sql
```

### Situación 2: Cambios en Configuración/Catálogos
```
1. Editar 02_seed.sql
2. Ejecutar: ./scripts/reset.sh
3. Hacer git commit de 02_seed.sql
```

### Situación 3: Cambios en Datos de Prueba
```
1. Editar 03_test_data.sql
2. Ejecutar: ./scripts/reset.sh
3. Hacer git commit de 03_test_data.sql
```

### Situación 4: Resetear después de cambios en la BDD
```
# Si accidentalmente modificaste datos directamente en MySQL
./scripts/reset.sh

# Esto restaura estado limpio desde los SQL
```

## Backups

Los archivos anteriores se mantienen como referencia:
- `02_seed.sql.bak` - Versión anterior de semillas
- `03_test_data.sql.bak` - Versión anterior de datos de prueba

## Ventajas de Esta Estructura

✅ **Separación clara de responsabilidades**: Cada archivo tiene un propósito específico

✅ **Fácil mantenimiento**: Cambios en diferentes capas no interfieren entre sí

✅ **Reset limpio**: Puedes resetear toda la BD en segundos

✅ **Desarrollo ágil**: No hay que preocuparse por datos acumulados

✅ **Testing**: Todos los tests empiezan con un estado conocido

✅ **Versionamiento**: Git rastrear cambios claramente

✅ **Producción-ready**: Mismos archivos pueden servir para producción (con datos reales)

## Notas

- El script maneja errores y se detiene si algo falla
- Los colores en output facilitan la lectura (✓ OK en verde, ✗ FALLÓ en rojo)
- Todos los caracteres especiales (ñ, acentos, emojis) se soportan gracias a utf8mb4
- Usa LOCK TABLES/UNLOCK TABLES para eficiencia en cargas
- Compatible con MySQL 5.7+ y MariaDB 10.2+

## Próximos Pasos

Si necesitas:
- **Agregar nuevos tipos de eventos**: Edita la sección en `02_seed.sql`
- **Agregar bandas**: Edita `bandas_artistas` en `02_seed.sql`
- **Cambiar precios**: Edita `precios_vigencia` en `02_seed.sql`
- **Agregar clientes para testing**: Edita `clientes` en `03_test_data.sql`
- **Agregar solicitudes test**: Edita `solicitudes*` en `03_test_data.sql`

---

**Última actualización**: Febrero 23, 2026
