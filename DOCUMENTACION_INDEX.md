# 📚 Índice de Documentación - TDC API REST

## Última actualización: 27/04/2026

---

## 🟢 DOCUMENTACIÓN VIGENTE (Uso Activo)

Estos documentos contienen información actual y relevante para el desarrollo.

### 🏗️ Arquitectura & Diseño
- **[arquitectura_oauth.md](arquitectura_oauth.md)** - Flujo OAuth y autenticación en backend
- **[diagrama_modelo.md](diagrama_modelo.md)** - Diagrama del modelo relacional actual
- **[analisis_relacional.md](analisis_relacional.md)** - Análisis completo del modelo relacional
- **[analisis_redundancia.md](analisis_redundancia.md)** - Análisis de redundancias en tablas

### 🔐 Autenticación & Seguridad
- **[guia_setup_oauth.md](guia_setup_oauth.md)** - Setup Google OAuth 2.0
- **[OAUTH_SETUP.md](OAUTH_SETUP.md)** - Integración OAuth & autenticación general
- **[guia_proteccion_rutas.md](guia_proteccion_rutas.md)** - Implementación de protección de rutas

### 🛠️ Desarrollo & Operaciones
- **[estado_backend.md](estado_backend.md)** - Estado actual de implementación backend
- **[guia_docker_build.md](guia_docker_build.md)** - Proceso de build y copias en Docker
- **[guia_logs.md](guia_logs.md)** - Guía de diferenciación de logs
- **[auditoria_endpoints.md](auditoria_endpoints.md)** - Auditoría de endpoints de solicitudes

### 📋 Herramientas & Scripting
- **[guia_limpieza_scripts.md](guia_limpieza_scripts.md)** - Candidatos a eliminar y análisis

### 📖 Principal
- **[README.md](README.md)** - Documentación principal del proyecto

---

## ✅ DOCUMENTACIÓN COMPLETADA (Referencia Histórica)

Fases y tareas que ya fueron finalizadas. Se mantienen como referencia.

### Fase 2 - Normalización
- **[completado_fase2_validacion.md](completado_fase2_validacion.md)**
- **[completado_normalizacion_db.md](completado_normalizacion_db.md)**
- **[completado_plan_normalizacion.md](completado_plan_normalizacion.md)**
- **[completado_quickstart_fase2.md](completado_quickstart_fase2.md)**
- **[completado_sesion_fase2_final.md](completado_sesion_fase2_final.md)**
- **[completado_resumen_fase2.md](completado_resumen_fase2.md)**

### Testing Completado
- **[completado_testing_fase2.md](completado_testing_fase2.md)**
- **[completado_testing_oauth.md](completado_testing_oauth.md)**
- **[completado_testing_proteccion.md](completado_testing_proteccion.md)**
- **[completado_testing_solicitudes.md](completado_testing_solicitudes.md)**

### Implementaciones Completadas
- **[completado_proteccion_rutas.md](completado_proteccion_rutas.md)**
- **[completado_cambios_bandas.md](completado_cambios_bandas.md)**

### Referencias de Fase
- **[referencia_cheatsheet_fase2.md](referencia_cheatsheet_fase2.md)** - Resumen ejecutivo de cambios fase 2

---

## 📖 REFERENCIAS E ÍNDICES

Índices, referencias históricas y documentación obsoleta mantenida como referencia.

### Índices
- **[referencia_indice_analisis.md](referencia_indice_analisis.md)** - Índice de análisis relacional
- **[referencia_indice_fase2.md](referencia_indice_fase2.md)** - Índice de documentación fase 2

### Históricos (ALQUILER - Eliminado)
- **[referencia_historica_alquiler.md](referencia_historica_alquiler.md)** - Análisis de solicitudes_alquiler [OBSOLETO]
- **[referencia_historica_refactor_alquiler.md](referencia_historica_refactor_alquiler.md)** - Refactorización ALQUILER [OBSOLETO]

### Antiguos
- **[referencia_resumen_antiguo.md](referencia_resumen_antiguo.md)** - Resumen de implementación antiguo

---

## 📊 Estadísticas de Documentación

| Categoría | Cantidad |
|-----------|----------|
| Vigentes | 12 |
| Completadas | 6 |
| Referencias | 1 |
| Cheatsheet | 1 |
| Índices | 2 |
| Históricos | 3 |
| Antiguos | 1 |
| Totales | **32** |

---

## 🗂️ Estructura de Archivos .md

```
/home/almacen/tdcApiRest/
├── README.md                                    (Principal)
│
├─ 🟢 VIGENTES (12)
│   ├── arquitectura_oauth.md
│   ├── analisis_relacional.md
│   ├── analisis_redundancia.md
│   ├── diagrama_modelo.md
│   ├── guia_setup_oauth.md
│   ├── guia_proteccion_rutas.md
│   ├── guia_docker_build.md
│   ├── guia_logs.md
│   ├── guia_limpieza_scripts.md
│   ├── estado_backend.md
│   ├── auditoria_endpoints.md
│   └── OAUTH_SETUP.md
│
├─ ✅ COMPLETADOS (6)
│   ├── completado_fase2_validacion.md
│   ├── completado_normalizacion_db.md
│   ├── completado_plan_normalizacion.md
│   ├── completado_quickstart_fase2.md
│   ├── completado_sesion_fase2_final.md
│   └── completado_resumen_fase2.md
│
├─ 🧪 TESTING (4)
│   ├── completado_testing_fase2.md
│   ├── completado_testing_oauth.md
│   ├── completado_testing_proteccion.md
│   └── completado_testing_solicitudes.md
│
├─ 📖 REFERENCIAS (7)
│   ├── referencia_cheatsheet_fase2.md
│   ├── referencia_indice_analisis.md
│   ├── referencia_indice_fase2.md
│   ├── referencia_historica_alquiler.md
│   ├── referencia_historica_refactor_alquiler.md
│   ├── referencia_resumen_antiguo.md
│   └── completado_cambios_bandas.md
│
└── completado_proteccion_rutas.md
```

---

## 💡 Cómo Usar Este Índice

1. **Busca documentación activa**: Mira la sección "🟢 DOCUMENTACIÓN VIGENTE"
2. **Busca referencia histórica**: Ve a "✅ DOCUMENTACIÓN COMPLETADA"
3. **Busca índices**: Consulta la sección "📖 REFERENCIAS E ÍNDICES"
4. **Archivos con prefijo "completado_"**: Ya fueron finalizados (referencia)
5. **Archivos con prefijo "referencia_"**: Material histórico o índices

---

## 📝 Convenciones de Nomenclatura

| Prefijo | Significado | Ejemplo |
|---------|-------------|---------|
| (ninguno) | Documentación activa | `arquitectura_oauth.md` |
| `completado_` | Fase/tarea finalizada | `completado_fase2_validacion.md` |
| `referencia_` | Índice o histórico | `referencia_indice_fase2.md` |
| (mayúsculas) | Documentación especial | `README.md`, `OAUTH_SETUP.md` |

---

## 🚀 Próximos Pasos

- [ ] Consolidar `OAUTH_SETUP.md` con `guia_setup_oauth.md`
- [ ] Revisar si mantener documentos obsoletos (ALQUILER)
- [ ] Crear script de archivado automático para documentos completados
- [ ] Actualizar referencias en README.md

---

**Última reorganización:** 27/04/2026
**Status:** ✅ Organización completada
