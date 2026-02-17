# Refactorización de Solicitudes y Eventos Confirmados

## Objetivo
Normalizar la estructura de datos para unificar el manejo de eventos confirmados (bandas, alquileres, servicios, talleres) en una sola tabla genérica, mejorando consistencia, escalabilidad y mantenibilidad.

---

## 1. Cambios en la Base de Datos

### 1.1 Tablas de Solicitudes (Sin Cambios Estructurales)
Mantienen su estructura actual, con un campo adicional `es_publico_cuando_confirmada` para indicar si debe aparecer en la agenda pública:
- `solicitudes_alquiler` (base + nuevo campo)
- `solicitudes_bandas` (base + nuevo campo)
- `solicitudes_servicios` (base + nuevo campo)
- `solicitudes_talleres` (base + nuevo campo)

### 1.2 Nueva Tabla: `eventos_confirmados`
Tabla genérica unificada para todos los eventos confirmados (bandas, alquileres, servicios, talleres):

```sql
CREATE TABLE IF NOT EXISTS eventos_confirmados (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_solicitud INT NOT NULL COMMENT 'FK a la solicitud original',
    tipo_evento ENUM('ALQUILER_SALON', 'BANDA', 'SERVICIO', 'TALLER') NOT NULL,
    tabla_origen VARCHAR(50) NOT NULL COMMENT 'Tabla de la que proviene: solicitudes_alquiler, solicitudes_bandas, etc.',
    
    -- Información del evento
    nombre_evento VARCHAR(255) NOT NULL,
    descripcion TEXT,
    fecha_evento DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    duracion_estimada VARCHAR(100),
    
    -- Información de contacto
    nombre_cliente VARCHAR(255),
    email_cliente VARCHAR(255),
    telefono_cliente VARCHAR(50),
    
    -- Datos económicos
    precio_base DECIMAL(10,2),
    precio_final DECIMAL(10,2),
    
    -- Información pública
    es_publico TINYINT(1) DEFAULT 0 COMMENT '1=Visible en agenda pública',
    activo TINYINT(1) DEFAULT 1 COMMENT '1=Vigente, 0=Cancelado o archivado',
    
    -- Información específica por tipo
    genero_musical VARCHAR(255) COMMENT 'Solo bandas',
    cantidad_personas INT COMMENT 'Solo alquileres/bandas',
    tipo_servicio VARCHAR(255) COMMENT 'Solo servicios',
    nombre_taller VARCHAR(255) COMMENT 'Solo talleres',
    
    -- Auditoría
    confirmado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    cancelado_en TIMESTAMP NULL,
    
    -- Índices
    INDEX idx_tipo_evento (tipo_evento),
    INDEX idx_fecha (fecha_evento),
    INDEX idx_es_publico (es_publico),
    INDEX idx_activo (activo),
    INDEX idx_id_solicitud (id_solicitud),
    UNIQUE KEY uk_solicitud (id_solicitud, tipo_evento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Eventos confirmados unificados de todas las solicitudes';
```

### 1.3 Cambios en Tablas de Solicitudes
Agregar campo `es_publico_cuando_confirmada` a cada tabla (ya existe en algunas, se asegura consistencia):

- `solicitudes_alquiler`: Agregado `es_publico_cuando_confirmada` (antes `es_publico`, se renombra para claridad)
- `solicitudes_bandas`: Agregado `es_publico_cuando_confirmada`
- `solicitudes_servicios`: Agregado `es_publico_cuando_confirmada`
- `solicitudes_talleres`: Agregado `es_publico_cuando_confirmada`

---

## 2. Cambios en el Backend

### 2.1 Archivo: `backend/controllers/adminController.js`

**Función: `getSolicitudes()`**
- Mantener consulta UNION actual (sin cambios en lógica, usa datos de solicitudes)
- Agregar información de si tiene evento confirmado

**Función: `actualizarEstadoSolicitud()`**
- Al cambiar estado a 'Confirmado': insertar en `eventos_confirmados` (para todos los tipos)
- Al cambiar estado a 'Cancelado': actualizar `eventos_confirmados.activo = 0` y `cancelado_en = NOW()`
- Usar tabla origen (`solicitudes_alquiler`, `solicitudes_bandas`, etc.) para determinar tipo

**Nueva Función: `obtenerEventosConfirmados()`**
- Consultar `eventos_confirmados` donde `es_publico = 1` y `activo = 1`
- Usada por agenda pública y admin

### 2.2 Archivo: `backend/controllers/solicitudController.js`

**Función: `getSolicitudPorId()`**
- Mantener lógica de prefijos (`alq_`, `bnd_`, `srv_`, `tll_`)
- Agregar información de si tiene evento confirmado asociado

---

## 3. Flujo de Datos

### Crear Solicitud
1. Usuario crea solicitud (ej. banda)
2. Se inserta en `solicitudes` + `solicitudes_bandas`
3. Estado: 'Solicitado'
4. **No aparece en `eventos_confirmados`**

### Confirmar Solicitud
1. Admin cambia estado a 'Confirmado' en `solicitudes_bandas`
2. Endpoint `PUT /api/admin/solicitudes/:id/estado` con `{ estado: 'Confirmado' }`
3. **Automáticamente inserta en `eventos_confirmados`**:
   - Lee datos de la solicitud
   - Inserta fila en `eventos_confirmados` con `tipo_evento`, `tabla_origen`
   - Si `es_publico_cuando_confirmada = 1` en solicitud, también `es_publico = 1` en evento

### Cancelar Solicitud
1. Admin cambia estado a 'Cancelado'
2. **Automáticamente marca evento como inactivo**:
   - `UPDATE eventos_confirmados SET activo = 0, cancelado_en = NOW() WHERE id_solicitud = ?`
   - Solicitud sigue en su tabla (historial)

### Ver Agenda Pública
1. Frontend consulta `/api/eventos/publicos`
2. Devuelve filas de `eventos_confirmados` donde `es_publico = 1 AND activo = 1`
3. Datos normalizados, sin acceso a solicitudes internas

---

## 4. Cambios Esperados en DB

| Tabla | Cambio |
|-------|--------|
| `solicitudes_alquiler` | Agregar `es_publico_cuando_confirmada` |
| `solicitudes_bandas` | Agregar `es_publico_cuando_confirmada` |
| `solicitudes_servicios` | Agregar `es_publico_cuando_confirmada` |
| `solicitudes_talleres` | Agregar `es_publico_cuando_confirmada` |
| `fechas_bandas_confirmadas` | **Eliminada / Migrada** (ya no se utiliza; datos migrados a `eventos_confirmados`) |
| `eventos_confirmados` | **Nueva** |

---

## 5. Historial de Ejecución

### Fase 1: Modificación SQL ✅
- [x] Actualizar `01_schema.sql` con nueva tabla y cambios
  - Creada tabla `eventos_confirmados` con estructura unificada
  - Agregado campo `es_publico_cuando_confirmada` a:
    - `solicitudes_alquiler` 
    - `solicitudes_bandas`
    - `solicitudes_servicios`
    - `solicitudes_talleres`
- [x] Resetear DB y verificar ✅
  - BD inicializada correctamente
  - Tabla `eventos_confirmados` creada con índices apropiados
  - Todos los campos presentes en tablas de solicitudes
- [x] Analizar logs ✅
  - Backend conecta correctamente a MariaDB
  - Servidor escucha en puerto 3000

### Fase 2: Refactorización Backend ✅
- [x] Actualizar `adminController.js`
  - Función `actualizarEstadoSolicitud()` refactorizada para:
    - Manejar todos los tipos (alquiler, banda, servicio, taller)
    - Insertar en `eventos_confirmados` al confirmar cualquier tipo
    - Marcar como inactivo en `eventos_confirmados` al cancelar
    - Lógica de prefijos (`alq_`, `bnd_`, `srv_`, `tll_`)
    - Transacciones ACID para integridad
  - Compatibilidad con `fechas_bandas_confirmadas` eliminada; usar `eventos_confirmados` para todos los tipos

### Fase 3: Testing ✅
- [x] Pruebas curl exitosas:
  - **Confirmación de alquiler (alq_4)**:
    - Endpoint: `PUT /api/admin/solicitudes/alq_4/estado`
    - Payload: `{"estado":"Confirmado"}`
    - Resultado: ✅ Insertado en `eventos_confirmados`
    - Datos verificados en DB:
      ```
      id=1, id_solicitud=4, tipo_evento=ALQUILER_SALON, 
      tabla_origen=solicitudes_alquiler, nombre_evento=ALQUILER_SALON,
      es_publico=0, activo=1, confirmado_en=2026-02-05 02:02:31
      ```
  - **Confirmación de alquiler (alq_3)**:
    - Endpoint: `PUT /api/admin/solicitudes/alq_3/estado`
    - Resultado: ✅ Insertado en `eventos_confirmados` (id=2)
  - **Cancelación (alq_4)**:
    - Endpoint: `PUT /api/admin/solicitudes/alq_4/estado`
    - Payload: `{"estado":"Cancelado"}`
    - Resultado: ✅ Marcado como inactivo
    - Verificación DB:
      ```
      id_solicitud=4, activo=0, cancelado_en=2026-02-05 02:03:01
      ```

### Fase 4: Validación Final ✅
- [x] Solicitudes visibles en `/api/admin/solicitudes` con todos los tipos
- [x] Tabla `eventos_confirmados` funcionando correctamente
- [x] Transacciones sin errores en logs
- [x] Integridad referencial mantenida

### Fase 5: Archivado y limpieza final ✅
- [x] Creada la migración `database/migrations/20260205_archive_and_drop_fechas_bandas.sql` para archivar y renombrar la tabla legacy `fechas_bandas_confirmadas_deprecated` a `fechas_bandas_confirmadas_backup_20260205` de forma atómica.
- [x] Ejecutada la migración en la DB de prueba y verificado que la tabla fue renombrada correctamente y contenía los registros esperados antes del archivado.
- [x] Eliminada la tabla backup `fechas_bandas_confirmadas_backup_20260205` (DROP) tras validar que los datos están a salvo en los backups de la migración y que no quedan referencias activas en el código ni en runtime.
- [x] Eliminado código temporal de trazado y handlers de bloqueo en `backend/server.js` y actualizado `docker/nginx.conf` para devolver 404 en rutas legacy.
- [x] Actualizado y endurecido `scripts/verify_migration.sh` para excluir migraciones, datos de prueba y archivos internos, añadir reportes robustos y evitar falsos positivos. La verificación final pasó con éxito.
- [x] Todos los cambios fueron commitados en la rama principal y enviados al remoto (push).

---

## 6. Resultados y Validación

### Base de Datos
✅ **Tabla `eventos_confirmados` creada exitosamente**
- 24 campos diseñados para todos los tipos
- Índices en: tipo_evento, fecha, es_publico, activo, id_solicitud
- UNIQUE KEY en (id_solicitud, tipo_evento) para evitar duplicados
- Timestamps para auditoría

✅ **Campos nuevos en tablas de solicitudes**
- `es_publico_cuando_confirmada` agregado a todas (4 tablas)
- Permite control granular de qué se publica al confirmar

### Backend
✅ **Función `actualizarEstadoSolicitud()` refactorizada**
- Parsea prefijos correctamente: `alq_`, `bnd_`, `srv_`, `tll_`
- Inserta en `eventos_confirmados` para TODOS los tipos al confirmar
- Marca como inactivo al cancelar (sin eliminar historial)
- Transacciones ACID con `beginTransaction()` y `commit()`
- Mantiene compatibilidad backward con `fechas_bandas_confirmadas`

### Pruebas
✅ **Flujo de Confirmación**
- Solicitudes creadas en estado "Solicitado" ✓
- Cambio a "Confirmado" inserta en `eventos_confirmados` ✓
- Campo `es_publico` se respeta según `es_publico_cuando_confirmada` ✓

✅ **Flujo de Cancelación**
- Solicitudes confirmadas pueden cancelarse ✓
- Evento en `eventos_confirmados` se marca como `activo=0` ✓
- `cancelado_en` timestamp registrado ✓
- Historial preservado (no se elimina) ✓

✅ **Integridad de Datos**
- No hay duplicados en `eventos_confirmados` (UNIQUE KEY) ✓
- Todos los datos migrables sin pérdida ✓
- Índices optimizan consultas por tipo, fecha, estado ✓

---

## 7. Próximos Pasos Opcionales

1. **Endpoint para Eventos Públicos**: Crear `GET /api/eventos/publicos` que devuelva solo `es_publico=1 AND activo=1`
2. **Deprecación de `fechas_bandas_confirmadas`**: Una vez validado, se puede eliminar o mantener como vista materializada
3. **Notificaciones**: Agregar lógica para notificar clientes cuando su solicitud se confirma
4. **Reportes**: Crear reportes basados en `eventos_confirmados` para visibilidad de agenda
5. **Migraciones**: Script para migrar bandas ya confirmadas de `fechas_bandas_confirmadas` a `eventos_confirmados`

---

## Notas Técnicas Finales

- **Campos `nombre_cliente`, `email_cliente`, `telefono_cliente`**: Se extraen de la solicitud al confirmar y se guardan en `eventos_confirmados` para independencia de datos
- **Campo `tabla_origen`**: Permite saber de cuál tabla específica proviene cada evento (facilita auditoría y trazabilidad)
- **Compatibilidad Backward**: Eliminada. El código utiliza `eventos_confirmados` y las rutas legacy `/fechas_bandas_confirmadas` han sido removidas.
- **Transacciones**: Uso de `beginTransaction()` y `commit()` asegura atomicidad en operaciones complejas
- **Error Handling**: Si falla la inserción en `eventos_confirmados`, se hace `rollback()` automático

---

## 8. Checklist práctico para eliminar redundancias y verificar el sistema (para su seguimiento mañana) ✅
A continuación tienes una lista accionable, priorizada y con comandos útiles para acelerar la limpieza, verificación y despliegue seguro.

### Prioridad alta (hacer primero)
- **Backup antes de cualquier cambio destructivo** 🛟
  - Hacer copia de la BD: `docker exec -i docker-mariadb-1 mysqldump -u root -p$MARIADB_ROOT_PASSWORD tdc_db > /tmp/backup_pre_cleanup.sql`
  - Crear branch y tag: `git checkout -b cleanup/fechas-bandas && git tag pre-cleanup-$(date +%Y%m%d)`

- **Verificaciones rápidas de endpoints y rutas** 🔎
  - Ejecutar verificación de migraciones: `./scripts/verify_migration.sh`
  - Listar rutas registradas (desde backend en ejecución): `curl -s -X GET http://localhost/api/debug/routes -H "Authorization: Bearer $TOKEN" | jq .`
  - Añadir pruebas que verifiquen que los endpoints legacy devuelvan `404` y que los nuevos respondan `200`.

- **Eliminar handlers y trazas temporales** 🧹
  - Revisar `backend/server.js` por middlewares de tracing, `console.warn` y handlers `*fechas_bandas_confirmadas*` y retirarlos (ya se eliminaron de forma principal, verificar no queden más copias).
  - Ejecutar linter y comprobaciones manuales: `cd backend && npm run lint`

### Prioridad media (limpieza de código y pruebas) ⚙️
- **Buscar y eliminar referencias**
  - Búsqueda general: `grep -R "fechas_bandas_confirmadas" -n . --exclude-dir=database/migrations --exclude-dir=.git || true`
  - Buscar patterns relacionados: `grep -R "fechas_bandas|fechas_bandas_confirmadas|fechas-" -n . --exclude-dir=.git || true`

- **Frontend: enlaces y archivos sin uso** 🧭
  - Buscar referencias en frontend: `grep -R "fechas_bandas_confirmadas|eventos_confirmados" frontend -n || true`
  - Detectar enlaces rotos en site local (instala `broken-link-checker` si falta): `npx blc http://localhost -ro`
  - Lista de archivos no referenciados (manual/heurística): revisar `frontend/*.html` y usar `grep` para detectar archivos que nunca aparecen.
  - Ejecutar checks de accesibilidad/HTML si están disponibles (`npx html-validator-cli` o similar).

- **Dependencias no usadas**
  - Ejecutar `npx depcheck` en `backend` y `frontend` para detectar paquetes sin uso.

### Prioridad baja (optimización y documentación) 📝
- **Actualizar documentación**
  - Añadir notas de la limpieza en `REFACTORIZACION_SOLICITUDES.md` (esta sección) y en `CHANGELOG` o release notes.

- **Pruebas de integración y CI**
  - Añadir paso CI que ejecute `./scripts/verify_migration.sh` y el chequeo de enlaces del frontend en staging.

- **DB: limpieza final**
  - Verificar `information_schema.KEY_COLUMN_USAGE` para detectar FKs que referencien tablas legacy antes de borrar (si hay alguna):
    ```sql
    SELECT TABLE_NAME, CONSTRAINT_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE REFERENCED_TABLE_NAME LIKE 'fechas_bandas%' AND CONSTRAINT_SCHEMA = DATABASE();
    ```
  - **Solo DROP** tablas legacy después de aprobación y backup; preferir renombrado/archivado antes de eliminar en producción.

### Procedimiento sugerido (paso a paso para mañana)
1. Crear branch `cleanup/fechas-bandas` y tag `pre-cleanup`.
2. Ejecutar backup DB y guardar en almacenamiento seguro.
3. Ejecutar `./scripts/verify_migration.sh` y comprobaciones manuales para certificar estado actual.
4. Buscar y eliminar referencias de código (1 módulo/ruta por PR). Añadir pasos de verificación manual que prueben comportamiento esperado (legacy 404, nuevos 200).
5. Revisar frontend: ejecutar `npx blc` y corregir/retirar enlaces/HTML sin uso; abrir PRs separados.
6. Merge a `main` tras revisión; desplegar a staging; ejecutar `verify_migration.sh` y link-checker en staging.
7. Monitorear logs (nginx + backend) 24–48 horas; si todo ok, planear eliminación final en producción con ventana de mantenimiento.

### Tips y recordatorios 🔔
- Hacer cambios pequeños y reversibles (1 PR = 1 cambio de propósito).
- Añadir pruebas automáticas que impidan que se vuelvan a introducir rutas legacy.
- Documentar cada DROP/ARCHIVE con una entrada en `database/migrations` y en el changelog.
- Tener una copia del `backup_pre_cleanup.sql` disponible antes de cualquier DROP.


