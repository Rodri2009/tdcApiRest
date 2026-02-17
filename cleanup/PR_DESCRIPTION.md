Esta rama `cleanup/fechas-bandas` agrupa las tareas iniciales para iniciar la limpieza.

Tareas propuestas en esta rama (a dividir en PRs más pequeñas):
- backend: eliminar handlers temporales, actualizar verificación/QA manual, remover rutas legacy si quedan
- migrations: consolidar migraciones finales (archivo de archivado ya creado)
- frontend: ejecutar link-checker, remover HTML/JS no referenciado
- docs: actualizar `REFACTORIZACION_SOLICITUDES.md` y CHANGELOG

Pasos para reviewers:
1. Revisar cada commit por área
2. Ejecutar comprobaciones manuales según la checklist (ver documentación relevante)
3. Ejecutar `npx blc http://localhost`

