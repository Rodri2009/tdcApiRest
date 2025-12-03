Instrucciones para aplicar la migración `6_migration_bandas_solicitudes.sql`

Opciones rápidas (elige la que se ajuste a tu entorno Docker):

1) Ejecutar dentro del servicio de base de datos (recomendado si usas `docker compose`):

   - Averigua el nombre del servicio de DB con:

     ```bash
     docker compose ps
     ```

   - Ejecuta la migración (sustituye `<db_service>` por el servicio real, y `tdc_db` por el nombre de la BD si aplica):

     ```bash
     docker compose exec <db_service> sh -c 'mysql -u root -p"$MYSQL_ROOT_PASSWORD" < /workspace/database/6_migration_bandas_solicitudes.sql'
     ```

   - Si la ruta dentro del contenedor es distinta, adapta `/workspace/database/...` al path donde esté montado el repo.

2) Alternativa: entrar al cliente mysql dentro del contenedor y ejecutar `SOURCE`:

   ```bash
   docker compose exec <db_service> sh
   mysql -u root -p
   USE <nombre_de_la_base_de_datos>;
   SOURCE /workspace/database/6_migration_bandas_solicitudes.sql;
   ```

3) Si no usas Docker, puedes ejecutar localmente con el cliente `mysql`:

   ```bash
   mysql -u root -p <nombre_de_la_base_de_datos> < database/6_migration_bandas_solicitudes.sql
   ```

Comprobación: la migración devuelve una fila con `migracion_6_ok` si todo fue bien.

Notas:
- La migración crea la tabla `bandas_solicitudes` con `id_solicitud` como PK y FK a `solicitudes(id_solicitud)`.
- Tras aplicar la migración, las llamadas a crear/actualizar solicitudes (cuando `tipoEvento === 'FECHA_EN_VIVO'`) guardarán los campos estructurados en `bandas_solicitudes`.
