# Base de Datos TDC

## Estructura

```
database/
├── 01_schema.sql      # Estructura de tablas (DDL) - OBLIGATORIO
├── 02_seed.sql        # Datos de configuración y catálogos - OBLIGATORIO
├── 03_test_data.sql   # Datos de prueba - OPCIONAL (solo desarrollo)
├── seeds/             # CSVs con datos de referencia (backup)
└── README.md          # Esta documentación
```

## Archivos SQL

### 01_schema.sql

> Nota: las migraciones históricas que ya fueron consolidadas en `01_schema.sql`/`02_seed.sql` permanecen en `database/migrations/` marcadas como `-- ARCHIVED:`. Durante `./reset.sh` esos archivos archivados se omiten automáticamente.
- **Propósito**: Creación de todas las tablas (solo DDL)
- **Contenido**: CREATE TABLE, índices, foreign keys
- **NUNCA incluye**: INSERT, UPDATE o datos

### 02_seed.sql
- **Propósito**: Datos de configuración necesarios para el funcionamiento
- **Contenido**: Tipos de evento, precios, horarios, adicionales, roles, personal
- **Se ejecuta**: Siempre después del schema

### 03_test_data.sql
- **Propósito**: Datos de prueba para desarrollo
- **Contenido**: Solicitudes de ejemplo
- **Se ejecuta**: Solo en desarrollo (opcional)

## Lógica de Negocio

La BD soporta **4 tipos de clientes = 4 categorías de eventos**:

| Categoría | Subtipos | Frontend | Descripción |
|-----------|----------|----------|-------------|
| `ALQUILER_SALON` | 6 subtipos | page.html | Alquiler del salón para fiestas |
| `FECHA_BANDAS` | - | agenda_de_bandas.html | Eventos musicales con bandas |
| `TALLERES_ACTIVIDADES` | 2 subtipos | seccion_talleres.html | Talleres y cursos |
| `CUIDADO_PERSONAL` | 2 subtipos | seccion_cuidado_personal.html | Servicios de depilación |

### Subtipos de ALQUILER_SALON

| Subtipo | Descripción |
|---------|-------------|
| `SIN_SERVICIO_DE_MESA` | Solo alquiler con cocina equipada |
| `CON_SERVICIO_DE_MESA` | Incluye personal de servicio |
| `INFORMALES` | Juntadas con encargada y limpieza |
| `INFANTILES` | Cumpleaños infantiles con inflables |
| `ADOLESCENTES` | Fiestas de 15 con DJ y sonido |
| `BABY_SHOWERS` | Baby showers con servicio completo |

### Modelo de Precios

Los precios se calculan como: `precio_por_hora × duracion_horas`

- `precios_vigencia`: Define precio por hora según tipo de evento y rango de cantidad
  - `cantidad_min`, `cantidad_max`: Rango de personas/participantes
  - `precio_por_hora`: Tarifa aplicable
  - `vigente_desde`, `vigente_hasta`: Período de validez

## Tablas Principales

### Catálogos
- `opciones_tipos` - Tipos de eventos con categoría, monto_sena y deposito
- `precios_vigencia` - Tarifas por tipo y rango de cantidad
- `opciones_duracion` - Duraciones disponibles por tipo
- `configuracion_horarios` - Horarios por día y tipo de evento
- `opciones_adicionales` - Servicios extra (inflables, manteles)

### Solicitudes
- `solicitudes` - Solicitudes de eventos
  - `tipo_de_evento`: Categoría (ALQUILER_SALON, FECHA_BANDAS, etc.)
  - `tipo_servicio`: Subtipo (INFANTILES, CON_SERVICIO_DE_MESA, etc.)
- `solicitudes_adicionales` - Adicionales seleccionados
- `solicitudes_personal` - Personal asignado

### Eventos (FECHA_BANDAS)
- `eventos` - Eventos de bandas
- `bandas_invitadas` - Bandas en un evento
- `eventos_personal` - Personal asignado

### Personal
- `personal_disponible` - Staff disponible
- `catalogo_roles` - Roles de personal disponibles

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

# Opcional: datos de prueba
source /docker-entrypoint-initdb.d/03_test_data.sql
```
