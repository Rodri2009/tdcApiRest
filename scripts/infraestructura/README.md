# Scripts de Infraestructura

Herramientas para gestionar contenedores, punto de entrada y configuración.

## docker_entrypoint.sh
Script de punto de entrada para contenedores Docker.
- Se ejecuta automáticamente al iniciar contenedores
- No requiere ejecución manual

## cleanup_duplicate_containers.sh
Limpia contenedores duplicados o huérfanos.
- Elimina contenedores sin imagen activa
- Libera espacio en disco

```bash
./infraestructura/cleanup_duplicate_containers.sh
```

## fetch_frontend_assets.sh
Descarga assets estáticos para el frontend.

```bash
./infraestructura/fetch_frontend_assets.sh
```

## update_logging.sh
Actualiza configuración de logging.

```bash
./infraestructura/update_logging.sh
```
