# Scripts de Diagnóstico

Herramientas para verificar el estado y la integridad de la aplicación.

## diagnose_db.sh
Diagnóstico de conexión a base de datos.
- Verifica disponibilidad de Docker
- Comprueba conectividad con MySQL/MariaDB
- Muestra configuración actual
- Recomienda acciones para resolver errores

```bash
./diagnostico/diagnose_db.sh
```

## verify_seed_data.sh
Verifica integridad de datos semilla y prueba.
- Compara registros en BD vs archivos SQL
- Identifica discrepancias
- Valida que todos los datos iniciales se cargaron correctamente

```bash
./diagnostico/verify_seed_data.sh
```
