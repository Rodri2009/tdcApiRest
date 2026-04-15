# Estrategia de Backup: Binary Logs de MariaDB

**Versión:** 1.0  
**Fecha:** 15 de Abril, 2026  
**Estado:** Activa

---

## 📋 Resumen

TDC implementa **Binary Logs (Binlog)** de MariaDB como estrategia de recovery. Esto reemplaza el sistema anterior basado en scripts de backup periódicos (`backup_and_update_sql.sh`, etc.).

**Ventajas:**
- ✅ Point-in-time recovery (recuperación a cualquier segundo)
- ✅ Zero overhead (~0% CPU adicional)
- ✅ Automático (sin scripts periódicos)
- ✅ Multi-host compatible (no requiere cron setup por host)
- ✅ Auditoría integrada (quién cambió qué y cuándo)

---

## 🔧 Configuración

### docker-compose.yml

```yaml
mariadb:
  command:
    - '--log-bin=/var/lib/mysql/binlogs/mariadb-bin'
    - '--binlog-format=MIXED'
    - '--binlog-expire-logs-seconds=604800'      # 7 días
    - '--max-binlog-size=1073741824'              # 1GB
  
  volumes:
    - mariadb_binlogs:/var/lib/mysql/binlogs

volumes:
  mariadb_binlogs:  # Volumen persistente para binlogs
```

### Parámetros

| Parámetro | Valor | Significado |
|-----------|-------|-------------|
| `log-bin` | `/var/lib/mysql/binlogs/mariadb-bin` | La ruta y prefijo de los archivos binlog |
| `binlog-format` | `MIXED` | Formato: ROW, STATEMENT, o MIXED (recomendado) |
| `binlog-expire-logs-seconds` | `604800` | 7 días - duración de retención |
| `max-binlog-size` | `1073741824` | 1GB - tamaño máximo por archivo |

---

## 📍 Ubicación de Binlogs

```
Docker Volume: docker_mariadb_binlogs

Archivos:
├── mariadb-bin.000001
├── mariadb-bin.000002
├── mariadb-bin.000003
└── mariadb-bin.index

Dentro del contenedor: /var/lib/mysql/binlogs/
En el host (Docker): /var/lib/docker/volumes/docker_mariadb_binlogs/_data/
```

**Notas:**
- Los binlogs se crean automáticamente
- Rotación automática cada 1GB o cada reinicio
- Archivos más antiguos se eliminarán después de 7 días
- El archivo `.index` mantiene lista de binlogs activos

---

## 🔄 Cómo Funciona

### Flujo de eventos:

```
1. Usuario/Sistema hace cambio en BD
            ↓
2. MariaDB escribe cambio a binlog (mariadb-bin.XXXXXX)
            ↓
3. Si file > 1GB → rotación a nuevo archivo
            ↓
4. Si archivo > 7 días → auto-eliminación
            ↓
5. Recovery disponible desde datos en binlog
```

---

## 🛠️ Recovery: Cómo Recuperar

### Listar binlogs disponibles

```bash
./scripts/recover-from-binlog.sh -l
```

Output:
```
[*] Listando Binary Logs disponibles...

Log_name: mariadb-bin.000001
File_size: 1073741824
Log_name: mariadb-bin.000002
File_size: 524288000
```

### Recuperar a un momento específico

```bash
# Queremos recuperar la BD al estado que tenía hace 10 minutos
./scripts/recover-from-binlog.sh -t "2026-04-15 14:30:00"
```

Output:
```
[*] Recuperando BD al momento: 2026-04-15 14:30:00
[!] Esto puede tardar varios minutos...

[*] Procesando binlogs hasta 2026-04-15 14:30:00...
✓ Archivo SQL generado: /tmp/recovery_12345.sql

Para aplicar la recuperación:
  mysql -u root -p < /tmp/recovery_12345.sql
```

### Recuperar desde un binlog específico

```bash
./scripts/recover-from-binlog.sh -f mariadb-bin.000042
```

### Modo verbose

```bash
./scripts/recover-from-binlog.sh -l -v
```

Muestra:
- Log_name, File_size, Encrypted
- Master status actual
- Position actual en binlog

---

## ⚠️ Limitaciones y Consideraciones

### 1. **Retención: 7 días**
```
Hoy: 15 de Abril
Datos disponibles: Hasta 8 de Abril (7 días atrás)
Antes de eso: ❌ NO recuperable
```

**Solución:** Para eventos más antiguos, necesitarías:
- Backup snapshot adicional (mysqldump mensual, opcional)
- Snapshots de volumen docker (infraestructura específica)

### 2. **Punto en tiempo = cambios hasta ese momento**

```bash
# Si queremos recuperar el estado de hace 5 minutos:
# - Se reaplican TODOS los cambios HASTA ese momento
# - Cambios posteriores se pierden
```

### 3. **Espacio en disco**

```
7 días de actividad × 10 cambios/segundo × 100 bytes/cambio
≈ 6 GB de binlogs

Recomendación:
- Servidor: 50GB en volumen mariadb_binlogs
- Desarrollo: 10GB suficiente
```

---

## 🚨 Escenarios de Recovery

### Escenario 1: "Alguien eliminó una solicitud hace 30 minutos"

```bash
# 1. Listar binlogs para confirm availability
./scripts/recover-from-binlog.sh -l

# 2. Calcular time hace 30 min
# Ahora: 2026-04-15 15:00:00
# Hace 30 min: 2026-04-15 14:30:00

# 3. Generar SQL de recuperación
./scripts/recover-from-binlog.sh -t "2026-04-15 14:30:00"

# 4. Revisar archivo generado
head -100 /tmp/recovery_12345.sql

# 5. Aplicar si es correcto
mysql -u root -p < /tmp/recovery_12345.sql
```

### Escenario 2: "Queremos verificar qué pasó en BD entre dos momentos"

```bash
# 1. Extraer binlog entre dos tiempos
./scripts/recover-from-binlog.sh -t "2026-04-15 14:00:00"
./scripts/recover-from-binlog.sh -t "2026-04-15 15:00:00"

# 2. Comparar eventos:
diff /tmp/recovery_*.sql | less
```

---

## 📊 Comparativa: Binlog vs. Backups Anteriores

| Aspecto | Binlog | mysqldump scripts (anterior) |
|--------|--------|------|
| **Setup** | Automático | Manual cada hora |
| **CPU overhead** | <1% | 5-10% (mysqldump) |
| **Storage** | 6-10 GB (7 días) | 1 GB + timestamp files |
| **Recovery velocity** | Minutos | Minutos |
| **Granularidad** | Segundo exacto | Última hora completa |
| **Multi-host** | ✅ Nativo | ⚠️ Requiere cron by host |
| **Auditoría** | ✅ Completa | ❌ Ninguna |
| **Git-friendly** | ✅ No polluta repo | ⚠️ Archivos constantemente |

---

## 🔐 Seguridad

### 1. Binlogs no están encriptados por defecto

Si necesitas encriptación (IMPORTANTE en producción):

```bash
./scripts/recover-from-binlog.sh -l -v
# Mirar columna "Encrypted"

# Habilitar en docker-compose.yml:
MARIADB_INIT_COMMAND: |
  SET GLOBAL binlog_encryption=ON;
```

### 2. Acceso a binlogs

- Los binlogs están en volumen Docker (protegido por permisos Docker)
- No contienen credenciales (solo queries)
- Requieren acceso MariaDB para desencriptar (si está encriptado)

---

## 🗒️ Monitoring

### Verificar tamaño de binlogs

```bash
docker exec docker-mariadb-1 du -sh /var/lib/mysql/binlogs
# Output: 5.2G    /var/lib/mysql/binlogs
```

### Verificar estado de binlog

```bash
docker exec docker-mariadb-1 mysql -u root -p"$MARIADB_ROOT_PASSWORD" -e "SHOW MASTER STATUS\G"
```

Output:
```
File: mariadb-bin.000345
Position: 1234567
Binlog_Do_DB: 
Binlog_Ignore_DB: 
Executed_Gtid_Set: 
```

---

## ✅ Checklist: Verificación Inicial

```bash
# 1. Verificar configuración en running container
docker exec docker-mariadb-1 mysql -u root -p"$MARIADB_ROOT_PASSWORD" -e "SHOW VARIABLES LIKE 'log_bin%';"

# Debe mostrar:
# log_bin: ON
# log_bin_basename: /var/log/mariadb/mariadb-bin

# 2. Listar binlogs
docker exec docker-mariadb-1 mysql -u root -p"$MARIADB_ROOT_PASSWORD" -e "SHOW BINARY LOGS;"

# Debe mostrar archivos como:
# mariadb-bin.000001
# mariadb-bin.000002

# 3. Probar script de recovery
./scripts/recover-from-binlog.sh -l

# 4. Probar recovery a momento reciente
./scripts/recover-from-binlog.sh -t "2026-04-15 15:30:00"
```

---

## 🚀 Próximos Pasos (Futuro)

### Para Producción:
1. **Binlog Encryption** - Encriptar binlogs en reposo
2. **Binlog Backup Externo** - Copiar binlogs a S3/backup externo después de 3 días
3. **Monitoring** - Alertas si binlogs >80% de espacio
4. **Archiving** - Mover binlogs viejos a almacenamiento frío

### Opcional:
- Replicación master-slave con otro MariaDB (alta disponibilidad)
- GTID (Global Transaction IDs) para mejor tracking

---

## 📞 Referencias

- [MariaDB Binary Logs Documentation](https://mariadb.com/kb/en/binary-log/)
- [mysqlbinlog Tool](https://mariadb.com/kb/en/mysqlbinlog/)
- [Point-in-Time Recovery](https://mariadb.com/kb/en/point-in-time-recovery/)

---

**Última actualización:** 15 de Abril, 2026
