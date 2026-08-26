# 📊 Database Scripts - Guía Completa

## 📁 Archivos SQL

| Archivo | Propósito | Ejecutado al |
|---------|----------|-------------|
| `01_schema.sql` | Crea toda la estructura de tablas | `docker-compose up` (primera vez) |
| `02_seed.sql` | Inserta datos iniciales (configuración, tipos de eventos) | `docker-compose up` (primera vez) |
| `03_test_data.sql` | Datos de prueba (usuarios, clientes, solicitudes para testing) | Manual si se necesita |
| `04_fase1_alteraciones.sql` | Cambios en estructura (post-launch improvements) | Ya ejecutado |
| `05_migrate_cajas_new_fields.sql` | Nuevos campos para caja/transacciones | Ya ejecutado |
| `06_migrate_clientes_usuarios.sql` | **Documentación** de migración clientes→usuarios (ver script Node.js) | Manual con Node.js |

## 🔄 Flujo de Uso

### ✅ Primera instalación
```bash
cd docker
docker-compose up -d --build
# Automáticamente ejecuta: 01_schema.sql → 02_seed.sql
```

### ✅ Agregar datos de prueba
```bash
docker exec tdc-mysql mysql -u root -proot_password tdc_db < database/03_test_data.sql
```

### ✅ Ejecutar migración de clientes a usuarios
```bash
docker exec tdc-backend node backend/scripts/migrar_clientes.js
```

## ⚠️ IMPORTANTE: Cambios en Base de Datos

### ❌ nunca hacer esto en el HOST (tu máquina):
```bash
npm install                    # ❌ MAL
node backend/scripts/...js    # ❌ MAL
mysql -u root -p...SQL        # ❌ MAL
```

### ✅ Hacer esto DENTRO de DOCKER:
```bash
docker exec <backend-container> npm install
docker exec <backend-container> node backend/scripts/migrar_clientes.js
docker exec tdc-mysql mysql -u root -ppassword tdc_db < file.sql
```

## 📝 Cómo Agregar una Nueva Migración

### Paso 1: Crear archivo SQL
```bash
# Siguiente número: 07
touch database/07_nombre_cambio.sql
```

### Paso 2: Escribir el cambio SQL
```sql
-- database/07_nombre_cambio.sql
-- Descripción: Qué cambios hace

-- Sintaxis del cambio:
ALTER TABLE tabla ADD COLUMN nueva_columna VARCHAR(255);
```

### Paso 3: Documentar en este README
```markdown
| `07_nombre_cambio.sql` | Descripción del cambio | Ejecución necesaria |
```

### Paso 4: Si necesitas procesar datos con Node.js
Crear: `backend/scripts/07_nombre_migracion.js`
```javascript
// backend/scripts/07_nombre_migracion.js
require('dotenv').config();
const pool = require('../db');

async function migracion() {
  // Tu lógica aquí
}

migracion().then(() => {
  console.log('✅ Migración completada');
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
```

Luego ejecutar:
```bash
docker exec tdc-backend node backend/scripts/07_nombre_migracion.js
```

### Paso 5: Commit y Push
```bash
git add database/07_nombre_cambio.sql backend/scripts/07_nombre_migracion.js
git commit -m "feat: agregar migración para 07_nombre_cambio"
git push
```

### Paso 6: En otra máquina
```bash
git pull
cd docker
docker-compose up -d --build    # Ejecuta SQL automáticamente
docker exec tdc-backend node backend/scripts/07_nombre_migracion.js
```

## 🔐 Notas de Seguridad

1. **Nunca commitear `.env` o credenciales**
   - Las contraseñas de MySQL se pasan por variables en Docker
   - Ver `docker/docker-compose.yml`

2. **Scripts de migración deben ser idempotentes**
   - Agregar `IF NOT EXISTS` en CREATE TABLE/PROCEDURE
   - Verificar antes de INSERT si ya existe

3. **Backups antes de cambios significativos**
   ```bash
   docker exec tdc-mysql mysqldump -u root -ppassword tdc_db > backup_$(date +%Y%m%d).sql
   ```

## 🐛 Troubleshooting

### "Error: Cannot find module 'dotenv'"
```bash
# El script necesita estar dentro de Docker
docker exec tdc-backend npm install  # Si no está instalado
docker exec tdc-backend node backend/scripts/migracion.js
```

### "Connection refused" en script Node.js
```bash
# MySQL no está corriendo
docker-compose ps  # Ver si tdc-mysql está "Up"
docker-compose logs tdc-mysql  # Ver errores
```

### "Permission denied" al ejecutar script
```bash
# Scripts necesitan permisos 755
chmod 755 backend/scripts/migracion.js
# O hacerlo desde Git
git add -f backend/scripts/migracion.js
```

---

**Última actualización:** 8 de julio de 2026
**Versión:** 1.0 - Guía completa de migraciones
