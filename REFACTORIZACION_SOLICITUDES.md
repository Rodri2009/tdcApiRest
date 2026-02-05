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

---

## 8. Normalización adicional (Feb 05 2026)
Se aplicaron cambios adicionales para simplificar y normalizar las tablas de solicitudes y visibilidad pública:

1) Se añadió el campo `es_publico` en la tabla `solicitudes` (tabla padre). Este campo representa la visibilidad pública por defecto de la solicitud confirmada. Para `ALQUILER_SALON` por política se mantiene `es_publico = 0` por defecto.

2) Se homogenizó el nombre de PK en las tablas hijas: **todos los hijos usan ahora `id_solicitud`** como primary key (antes algunas usaban `id`).

3) Se eliminó el campo `es_publico` de las tablas hijas (`solicitudes_bandas`, `solicitudes_servicios`, `solicitudes_talleres`, `solicitudes_alquiler`) ya que la visibilidad se centraliza en la tabla padre `solicitudes` y en `eventos_confirmados`.

4) Se actualizaron los queries del backend para usar `id_solicitud` en todas las tablas hijas, y leer la visibilidad desde `solicitudes.es_publico` (o desde `es_publico_cuando_confirmada` cuando aplica la política de visible al confirmar).

5) Se añadió la migración `database/migrations/20260206_normalize_solicitudes.sql` para aplicar los cambios en instalaciones existentes (añadir columna `es_publico`, renombrar PKs de hijos a `id_solicitud`, eliminar columnas obsoletas y mantener integridad referencial).

6) Se ejecutó un reset de la BD para verificar que los scripts de inicialización (`03_test_data.sql`) funcionen con las nuevas definiciones; se actualizaron los datos de prueba en `03_test_data.sql` para reflejar los nuevos nombres de columna y el uso de `es_publico` en la tabla padre.

---

> Nota: Estos cambios se aplicaron para facilitar consultas transversales y reducir duplicación. Se dejó una migración atómica y puntos de recuperación (push) en la rama `main` antes de aplicar cambios destructivos.


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
