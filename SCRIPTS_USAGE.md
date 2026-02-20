# Scripts del Backend con Soporte para Flags de Depuración

Todos los scripts de inicio y reinicio ahora soportan flags de depuración que se pasan directamente al servidor Node.js.

## Scripts Actualizados

### 1. `restart_backend.sh`
Reinicia el contenedor del backend con soporte para reconstrucción y flags de depuración.

**Uso:**
```bash
# Sin flags (modo normal)
./scripts/restart_backend.sh

# Con rebuild
./scripts/restart_backend.sh --rebuild

# Con flags de depuración
./scripts/restart_backend.sh -v
./scripts/restart_backend.sh --debug
./scripts/restart_backend.sh --down --rebuild -d

# Combinaciones
./scripts/restart_backend.sh --no-logs -e
./scripts/restart_backend.sh --rebuild --down -v -e
```

**Flags de Docker:**
- `--rebuild`: Reconstruye la imagen del backend sin cache
- `--down`: Ejecuta docker-compose down antes de rebuild/up
- `--no-logs`: No muestra logs en foreground (útil si ejecutas con flags de depuración)

**Flags de Depuración** (se pasan a `node server.js`):
- `-v, --verbose`: Muestra todos los detalles de procesamiento
- `-e, --error`: Solo muestra errores (perfecto para depuración dirigida)
- `-d, --debug`: Combina verbose + error (máximo detalle)
- `-h, --help`: Muestra ayuda del servidor

---

### 2. `up.sh`
Levanta el entorno completo desde cero (nginx, mariadb, backend).

**Uso:**
```bash
# Levantamiento normal
./scripts/up.sh

# Con migraciones SQL automáticas
./scripts/up.sh --migrate

# Con flags de depuración
./scripts/up.sh -v
./scripts/up.sh --debug
./scripts/up.sh --migrate -d

# Combinaciones
./scripts/up.sh --migrate -e
./scripts/up.sh -v --help
```

**Flags Docker:**
- `--migrate` / `--apply-migrations`: Aplica migraciones de `database/migrations/`

**Flags de Depuración:**
- `-v, --verbose`: Muestra detalles de procesamiento
- `-e, --error`: Solo errores
- `-d, --debug`: Verbose + error
- `-h, --help`: Muestra ayuda del servidor

---

### 3. `reset.sh`
Destruye completamente el entorno (base de datos incluida) y lo reconstruye desde cero.

**Uso:**
```bash
# Reset completo mode normal
./scripts/reset.sh

# Reset con depuración verbose
./scripts/reset.sh -v

# Reset con máximo detalle
./scripts/reset.sh -d

# Reset con solo errores
./scripts/reset.sh -e
```

**Flags de Depuración:**
- `-v, --verbose`: Muestra procesamiento
- `-e, --error`: Solo errores
- `-d, --debug`: Verbose + error
- `-h, --help`: Muestra ayuda

⚠️ **ADVERTENCIA:** Este script destruye la base de datos. Los datos desaparecen permanentemente.

---

### 4. `down-and-backup.sh`
Hace backup de tablas sensibles y baja el entorno.

**Uso:**
```bash
# Backup y down (normal)
./scripts/down-and-backup.sh

# Solo backup, sin bajar (SKIP_DOWN=1)
SKIP_DOWN=1 ./scripts/down-and-backup.sh
```

ℹ️ Este script **no soporta flags de depuración** (solo hace backup y baja).

---

## Ejemplos Prácticos

### Escenario 1: Depuración rápida durante desarrollo
```bash
# Levanta todo con máximo detalle
./scripts/up.sh -d

# Después, si necesitas reiniciar solo el backend con verbose
./scripts/restart_backend.sh -v
```

### Escenario 2: Depuración de un error específico en pruebas
```bash
# Reset completo + ejecutar con solo errores
./scripts/reset.sh -e
```

### Escenario 3: Validar que la BD está correcta sin ruido
```bash
# Reset limpio sin logs (aplica migraciones silenciosamente)
./scripts/reset.sh

# Luego, levanta backend con depuración
./scripts/restart_backend.sh -v
```

### Escenario 4: Reconstruir y levantate con debug
```bash
./scripts/restart_backend.sh --down --rebuild -d
```

---

## Comportamiento Esperado

### Con `-v` (verbose):
```
[2026-02-20T14:20:27.687Z] Petición recibida: GET /api/solicitudes
[2026-02-20T14:20:27.750Z] ℹ [VERBOSE] Query params: {}
[2026-02-20T14:20:27.890Z] ✓ [EXITO] Solicitudes obtenidas: 12 registros
```

### Con `-e` (error):
```
[2026-02-20T14:20:27.687Z] Petición recibida: POST /api/solicitudes
[2026-02-20T14:21:32.105Z] ✗ [ERROR] Error al guardar solicitud
  Stack: Error: ER_BAD_FIELD_ERROR: Unknown column...
```

### Con `-d` (debug = verbose + error):
```
[2026-02-20T14:20:27.687Z] Petición recibida: GET /api/solicitudes
[2026-02-20T14:20:27.750Z] ℹ [VERBOSE] Query params: {}
[2026-02-20T14:20:27.890Z] 🔍 [QUERY] SELECT * FROM solicitudes
[2026-02-20T14:20:27.920Z] ✓ [EXITO] Solicitudes obtenidas: 12 registros
```

### Sin flags (modo producción):
```
[2026-02-20T14:20:27.687Z] Petición recibida: GET /api/solicitudes
[2026-02-20T14:20:28.102Z] Petición recibida: POST /api/solicitudes
```

---

## Troubleshooting

**Problema:** El backend no inicia con los flags
```bash
# Asegúrate de:
1. Tener los permisos adecuados
   chmod +x scripts/*.sh

2. Estar en el directorio raíz del proyecto
   cd /path/to/tdcApiRest

3. Tener Docker corriendo
   docker ps
```

**Problema:** Los flags no se aplican
```bash
# Verifica que la imagen esté actualizada
./scripts/restart_backend.sh --rebuild

# Si aún no funciona, reset completo
./scripts/reset.sh -d
```

**Problema:** Los logs son demasiado verbosos
```bash
# Usa solo `-e` para errores
./scripts/restart_backend.sh -e

# O redirige a archivo
./scripts/up.sh -v > backend.log 2>&1
```

---

## Referencias

- Para más detalles sobre los flags de depuración, consulta [LOGGING_SYSTEM.md](LOGGING_SYSTEM.md)
- Sistema de logging centralizado: [backend/lib/debugFlags.js](backend/lib/debugFlags.js)
