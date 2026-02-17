# PR: <tipo>(<area>): Descripción corta

## Resumen
Explica brevemente qué cambia y por qué.

## Cambios principales
- Lista de cambios (archivos, endpoints, migraciones)

## Checklist de revisión (marcar antes de merge)
- [ ] No quedan referencias a `fechas_bandas_confirmadas` (grep OK)
- [ ] Frontend: enlaces rotos corregidos / archivos no usados eliminados
- [ ] Documentación actualizada (`REFACTORIZACION_SOLICITUDES.md`, changelog)
- [ ] Si hay DB drops, confirmar backup y ventana de mantenimiento

## Cómo probar
Pasos claros para QA / reviewers:
1. Ejecutar comprobaciones manuales indicadas en la sección 'Cómo probar'
2. Probar endpoints claves
3. Ejecutar `npx blc http://staging` (o local)

## Issue relacionada
Closes: #<issue-number> (poner número de la issue creada con la checklist)

