---
name: Cleanup: eliminar código legacy `fechas_bandas_confirmadas`
about: Issue para planificar y trackear la limpieza completa (endpoints, referencias, frontend, migraciones)
title: "Cleanup: eliminar referencias a fechas_bandas_confirmadas"
labels: [cleanup, migration, tech-debt]
assignees: [Rodri2009]
---

## Resumen
Esta issue agrupa las tareas necesarias para eliminar por completo el código y datos legacy relacionados con `fechas_bandas_confirmadas` y validar la migración a `eventos_confirmados`.

## Objetivo
- Asegurar que no queden endpoints activos ni referencias en código.
- Eliminar archivos HTML/JS no utilizados, enlaces rotos y cualquier documentación obsoleta.
- Validar en staging y programar eliminación en producción con backup.

## Checklist
- [ ] Crear branch `cleanup/fechas-bandas` y tag `pre-cleanup-YYYYMMDD` (hecho localmente)
- [ ] Backup DB completo y almacenamiento seguro (`backup_pre_cleanup.sql`)
- [ ] Documentar y ejecutar comprobaciones manuales faltantes
- [ ] Eliminar handlers/middlewares de trazado (server.js) y endpoints legacy (si quedan)
- [ ] Buscar y eliminar referencias en código: `grep -R "fechas_bandas_confirmadas"` (excluir migrations y docs)
- [ ] Revisar frontend: detectar y corregir enlaces rotos (`npx blc`), eliminar HTML/JS no referenciados
- [ ] Ejecutar `npx depcheck` / `npm run lint` y arreglar dependencias y warnings
- [ ] Crear PRs pequeños por área (backend, frontend, docs) con checklist de QA manual y reviewers
- [ ] Desplegar a staging y ejecutar la checklist de comprobaciones manuales y link‑checker en staging
- [ ] Monitoreo 24–48h, si OK: programar eliminación en producción con ventana de mantenimiento

## Notas
- No borrar nada irreversible sin backup y aprobación explícita.
- Guardar capturas/nombres de tablas renombradas (archivo de la migración y registros) en la issue.

**Responsable**: @Rodri2009

