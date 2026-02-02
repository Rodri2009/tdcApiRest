# Tests del Backend (Integration & Smoke)

Este directorio contiene pruebas de integración y scripts de smoke para validar los endpoints principales del backend.

Resumen rápido:
- Test principal de smoke: `backend/test/integration/smoke.spec.js` (Mocha + Supertest)
- Tests adicionales de integración: `backend/test/integration/*.spec.js`
- Script de smoke opcional (cURL): `scripts/smoke_endpoints.sh` (POSIX/sh compatible)

Cómo ejecutar los tests localmente:

1) Ejecutar desde la carpeta `backend` (recomendado):

```bash
cd backend
npm test
```

2) Ejecutar dentro del contenedor (recomendado para reproducibilidad):

```bash
docker-compose -f docker/docker-compose.yml exec -T backend sh -lc "cd /app && npm test"
```

3) Ejecutar un test específico:

```bash
# desde la raíz
cd backend
npx mocha test/integration/smoke.spec.js --reporter spec
```

Notas importantes y decisiones:
- La suite usa `mocha` + `supertest` y las aserciones se realizan con `assert` (API de Node.js). Evitamos `chai` por incompatibilidades de ESM en esta versión de dependencias.
- `server.js` exporta la instancia `app` cuando se requiere desde los tests para permitir tests con `supertest` sin levantar el servidor explícitamente.
- Los tests de smoke cubren endpoints públicos y incluyen creación/consulta de `solicitudes`, `bandas` y envío de email de prueba. Si la base de datos se inicializa desde cero (por ejemplo con `./reset.sh`), las migraciones (06–09) se han montado para ejecutarse automáticamente y dejar el entorno listo para los tests.
- Para depurar tests que devuelven 500, revisa los logs del backend y, si corresponde, comprueba que las migraciones necesarias se hayan aplicado en la BD (`servicios_catalogo`, `profesionales_servicios`, `turnos_servicios`, etc.).

Consejos:
- Ejecuta `./reset.sh` antes de correr la suite si quieres empezar con un entorno completamente limpio y semillado.
- Para añadir nuevos tests integra los archivos dentro de `backend/test/integration` con sufijo `.spec.js`.

Si necesitas que integre ejecución automática de smoke-tests en la CI, puedo preparar un workflow de GitHub Actions que ejecute `npm test` en cada PR.
