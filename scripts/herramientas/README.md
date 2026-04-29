# Scripts de Herramientas

Utilidades JavaScript para tareas de datos y administración.

## crear_admin.js
Crea usuario administrador inicial en la BD.

```bash
node ./herramientas/crear_admin.js
```

## backfill_confirmed_solicitudes.js
Llena datos de eventos confirmados desde solicitudes.
- Sincroniza solicitudes con eventos_confirmados
- Migración histórica de datos

```bash
node ./herramientas/backfill_confirmed_solicitudes.js
```

## generar_contexto.js
Genera archivo de contexto del proyecto (documentation).
- Crea resumen de estructura del proyecto
- Útil para documentación

```bash
node ./herramientas/generar_contexto.js
```

## test_email_validation.js
Prueba validación de emails.

```bash
node ./herramientas/test_email_validation.js
```
