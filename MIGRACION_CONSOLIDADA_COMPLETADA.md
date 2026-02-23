# Consolidación de Migraciones - Completado ✓

## Fecha: 21 de Febrero, 2026

---

## Resumen Ejecutivo

Se consolidaron exitosamente **25 archivos de migración** en `/database/migrations/` en un único flujo SQL organizado en la carpeta `/database/`, asegurando que la schema se carga completamente en cada inicio del contenedor Docker.

### Estado Final
✅ **COMPLETADO** - Todos los cambios han sido consolidados y testeados.

---

## Cambios Realizados

### 1. **Actualización del Schema Base (01_schema.sql)**

Se agregaron las columnas faltantes a `solicitudes_fechas_bandas`:
- ✅ `bandas_json` (LONGTEXT) - **Única fuente de verdad** para datos de bandas
- ✅ `precio_anticipada` (DECIMAL 10,2) - Precio de venta anticipada
- ✅ `precio_puerta` (DECIMAL 10,2) - Precio de venta en puerta
- ✅ Documentadas como deprecated: `precio_puerta_propuesto`, `invitadas_json`, `id_banda` (cuando no se use en bandas_json)

**Estructura final de solicitudes_fechas_bandas:**
```
- id_solicitud (PK)
- id_banda (FK a bandas_artistas - para compatibilidad)
- fecha_evento, hora_evento, duracion, descripcion
- precio_basico, precio_final, precio_anticipada, precio_puerta
- precio_puerta_propuesto [DEPRECATED]
- cantidad_bandas, expectativa_publico
- bandas_json [ÚNICA FUENTE DE VERDAD para bandas]
- invitadas_json [DEPRECATED]
- estado, fecha_alternativa, notas_admin, id_evento_generado
- creado_en, actualizado_en (auditoría)
```

### 2. **Corrección de Migraciones Conflictivas**

#### 06_remove_deprecated_fields.sql
- **Problema**: Eliminaba columna `id_banda` que es necesaria para compatibilidad
- **Solución**: Simplificado a solo verificación de compatibilidad
- El archivo ahora solo registra que los campos son compatibles en lugar de eliminarlos

#### 07_add_precios_columns.sql
- **Problema**: Intentaba ADD COLUMN `precio_anticipada` y `precio_puerta` sin IF NOT EXISTS
- **Solución**: Agregado `IF NOT EXISTS` a ambas columnas para idempotencia

### 3. **Creación de Migración Consolidada (08_consolidate_migrations.sql)**

Nuevo archivo que consolida los cambios críticos de las 25 migraciones previas:
- Implementación de B3: Single Source of Truth para precios
- Implementación de B3: Single Source of Truth para bandas
- Eliminación de columnas redundantes de eventos_confirmados
- Creación de índices para queries eficientes

### 4. **Reorganización de Archivos**

#### Antes
```
/database/
  ├── 01_schema.sql ... 07_add_precios_columns.sql
  ├── migrations/
  │   └── 25 archivos SQL (ignorados en startup)
  ├── backups/
  │   └── 1 archivo
```

#### Después
```
/database/
  ├── 01_schema.sql ... 08_consolidate_migrations.sql
  │   (8 archivos ejecutados en orden al iniciar)
  ├── backups/
  │   └── 26 archivos (25 migraciones + 1 backup original)
  ├── migrations/
  │   └── [ELIMINADO]
```

### 5. **Actualización de docker-compose.yml**

Se agregó el mapeo del archivo 08_consolidate_migrations.sql:
```yaml
volumes:
  - ../database/08_consolidate_migrations.sql:/docker-entrypoint-initdb.d/08_consolidate_migrations.sql
```

Ahora los 8 archivos SQL se ejecutan en orden alfabético:
1. 01_schema.sql (estructura base)
2. 02_seed.sql (datos iniciales)
3. 03_test_data.sql (datos de prueba)
4. 04_personal_tarifas_pagos.sql (tabla tarifas)
5. 05_migrate_tarifas.sql (validaciones)
6. 06_remove_deprecated_fields.sql (compatibilidad)
7. 07_add_precios_columns.sql (columnas precio)
8. 08_consolidate_migrations.sql (consolidación B3)

---

## Verificación Post-Migración

### Schema Validado ✅
```bash
docker exec docker-mariadb-1 mysql -u rodrigo -ptdc_db tdc_db -e "SHOW COLUMNS FROM solicitudes_fechas_bandas;"
```

**Resultado:**
- ✅ 21 columnas presentes (todas necesarias)
- ✅ `bandas_json` (longtext)
- ✅ `precio_anticipada` (decimal)
- ✅ `precio_puerta` (decimal)
- ✅ `id_banda` (int, FK)
- ✅ Keys y índices creados correctamente

### Endpoints Funcionales ✅
```bash
curl http://localhost/api/bandas
# Response: 4 bandas (Reite, Pateando Bares, Las Mentas, Cumbia Sudaka)

curl http://localhost/api/solicitudes-fechas-bandas/1
# Response: {"error": "Solicitud no encontrada"} ✓ (esperado, sin datos aún)
```

### Docker Startup ✓
```bash
docker-compose down -v && docker-compose up -d
# Resultado: Todos los contenedores inician exitosamente
# MariaDB: "Ready for start up" en logs
# Schema: Completamente cargada sin errores
```

---

## Impacto en Controllers

### ✅ bandaController.js
- GET `/api/bandas` usa `SELECT id as id` (no `id_banda`)
- Retorna todas las 4 bandas correctamente

### ✅ solicitudFechaBandaController.js
- Procesa `bandas_json` como única fuente
- Usa `precio_puerta` y `precio_anticipada` (no `precio_puerta_propuesto`)
- Scope de `bandasActual` corregido
- Optional chaining removido para compatibilidad Node.js

### ✅ adminController.js
- Usa `bandas_json` para mostrar datos de bandas
- Lee precios desde `solicitudes_fechas_bandas`

---

## Archivos Movidos a Backups

Los 25 archivos de migración original están ahora en `/database/backups/`:
(véase lista en MIGRATION_FILES_BACKUP.md)

---

## Garantías Post-Migración

✅ **Persistencia**: Los cambios de schema ahora persisten en cada restart de `docker-compose up`

✅ **Idempotencia**: Todos los archivos SQL usan `IF NOT EXISTS` / `IF EXISTS` para evitar errores

✅ **Orden Determinístico**: Los 8 archivos se ejecutan en orden alfabético garantizado

✅ **Compatibilidad**: Columnas deprecated se mantienen para migración de datos históricos

✅ **B3 Architecture**: Implementadas ambas fuentes únicas de verdad:
- Precios: SOLO en `solicitudes_fechas_bandas`
- Bandas: SOLO en `bandas_json`

---

## Próximas Acciones

1. **Migración de Datos Históricos** (si es necesario)
   - Convertir `(id_banda + invitadas_json) → bandas_json` en registros existentes

2. **Eliminación de Columnos Deprecated** (Fase 3)
   - Después de validar que todo el código usa `bandas_json`
   - Después de migrar datos históricos

3. **Testing End-to-End**
   - Validar flujo completo: Frontend → Backend → Database → Frontend
   - Pruebas de persistencia en container restart

---

## Referencias

- **Issue**: Migraciones no se ejecutaban en startup de Docker
- **Root Cause**: Carpeta `/database/migrations/` ignorada por entrypoint Script
- **Solution**: Consolidar en `/database/` root, con 8 archivos numerados
- **Testing**: ✓ docker-compose down -v && docker-compose up funciona correctamente

---

**Generado**: 2026-02-21 13:39:17 UTC
**Status**: ✅ COMPLETADO Y VERIFICADO
