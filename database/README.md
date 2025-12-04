# Base de Datos TDC

## Estructura

```
database/
├── 01_schema.sql      # Estructura de todas las tablas
├── 02_seed.sql        # Datos iniciales (tipos, precios, etc.)
├── init.sh            # Script de inicialización
├── seeds/             # CSVs con datos de referencia
└── _legacy/           # Archivos SQL obsoletos (backup)
```

## Lógica de Negocio

La BD soporta **4 tipos de clientes = 4 categorías de eventos**:

| Categoría | Subtipos | Frontend | Descripción |
|-----------|----------|----------|-------------|
| `ALQUILER_SALON` | 6 subtipos | page.html | Alquiler del salón para fiestas |
| `FECHA_BANDAS` | - | agenda_de_bandas.html | Eventos musicales con bandas |
| `TALLERES` | (futuro) | - | Talleres y cursos |
| `SERVICIO` | (futuro) | - | Servicios como depilación |

### Subtipos de ALQUILER_SALON

| Subtipo | Descripción |
|---------|-------------|
| `SIN_SERVICIO_DE_MESA` | Solo alquiler con cocina equipada |
| `CON_SERVICIO_DE_MESA` | Incluye personal de servicio |
| `INFORMALES` | Juntadas con encargada y limpieza |
| `INFANTILES` | Cumpleaños infantiles con inflables |
| `ADOLESCENTES` | Fiestas de 15 con DJ y sonido |
| `BABY_SHOWERS` | Baby showers con servicio completo |

## Tablas Principales

### Catálogos
- `opciones_tipos` - Tipos de eventos y subtipos
- `precios_vigencia` - Tarifas por tipo y duración
- `opciones_duracion` - Duraciones disponibles
- `configuracion_horarios` - Horarios por día
- `opciones_adicionales` - Servicios extra (inflables, manteles)

### Solicitudes
- `solicitudes` - Solicitudes de eventos
  - `tipo_de_evento`: Categoría (ALQUILER_SALON, FECHA_BANDAS, etc.)
  - `tipo_servicio`: Subtipo (INFANTILES, CON_SERVICIO_DE_MESA, etc.)
- `solicitudes_adicionales` - Adicionales seleccionados
- `solicitudes_personal` - Personal asignado

### Eventos (FECHA_BANDAS)
- `eventos` - Eventos de bandas
  - `nombre_banda`: Título del evento (lo que ve el público)
  - `nombre_contacto`: Quien organiza (datos de contacto)
  - `genero_musical`: Rock, Jazz, Cumbia, etc.
- `bandas_invitadas` - Bandas en un evento
- `eventos_personal` - Personal asignado

### Personal
- `personal_disponible` - Staff disponible
- `roles_por_evento` - Roles requeridos según tipo y cantidad

### Tickets y Cupones
- `tickets` - Entradas vendidas
- `cupones` - Códigos de descuento

## Instalación

### Nueva instalación (Docker)
```bash
# Los archivos se ejecutan automáticamente al crear el contenedor
docker-compose up -d mariadb
```

### Reiniciar BD desde cero
```bash
# Eliminar volumen y recrear
docker-compose down -v
docker-compose up -d mariadb
```

### Ejecutar manualmente
```bash
# Conectar al contenedor
docker-compose exec mariadb mariadb -u root -p tdc_db

# Ejecutar schema
source /docker-entrypoint-initdb.d/01_schema.sql

# Ejecutar seed
source /docker-entrypoint-initdb.d/02_seed.sql
```

## Migraciones

Los archivos de migraciones antiguas están en `_legacy/` como referencia.
El nuevo schema (`01_schema.sql`) ya incluye todas las migraciones aplicadas.

Si necesitas agregar nuevas migraciones:
1. Crear archivo `03_migration_descripcion.sql`
2. Aplicar manualmente en producción
3. Actualizar `01_schema.sql` para nuevas instalaciones
