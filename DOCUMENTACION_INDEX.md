# 📚 Índice de Documentación - TDC API REST

## Última actualización: 28/05/2026 (FASE 2 COMPLETADA)

---

## 🟢 DOCUMENTACIÓN VIGENTE (Uso Activo)

Estos documentos contienen información actual y relevante para el desarrollo.

### 🎯 ROADMAP IMPLEMENTACIÓN (Fases Activas)
- **[FASE_1_ADMIN_VENTA_ENTRADAS.md](FASE_1_ADMIN_VENTA_ENTRADAS.md)** - ✅ COMPLETADA (28/05) - Dashboard admin para gestión de ventas
- **[FASE_2_SCANNER_PUERTA.md](FASE_2_SCANNER_PUERTA.md)** - ✅ COMPLETADA (28/05) - Control de puerta con scanner QR
- **[PROXIMOS_PASOS_FASE_3_4.md](PROXIMOS_PASOS_FASE_3_4.md)** - 🔄 PLANIFICADO - Devoluciones, Reembolsos y Reportes

### 💳 Compra de Entradas & Pagos
- **[FLUJO_COMPRA_ENTRADAS.md](FLUJO_COMPRA_ENTRADAS.md)** - Flujo end-to-end de compra de entradas con MercadoPago
- **[SOPORTE_MERCADOPAGO_WALLET_BRICK.md](SOPORTE_MERCADOPAGO_WALLET_BRICK.md)** - Solución completa de problemas Wallet Brick
- **[ANALISIS_OPERATORIA_POSTCARGA.md](ANALISIS_OPERATORIA_POSTCARGA.md)** - Análisis completo de operatoria post-compra (listas, control de puerta, devoluciones)
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

## ✅ FASES IMPLEMENTADAS (Información Detallada)

Fases completadas del roadmap actual con documentación detallada.

### FASE 1 - Admin Dashboard Venta de Entradas (Completada 28/05/2026)
- **[FASE_1_ADMIN_VENTA_ENTRADAS.md](FASE_1_ADMIN_VENTA_ENTRADAS.md)** - Documentación completa FASE 1
  - Dashboard con 2 tabs: Compradores | Estadísticas
  - Tabla de 150+ compradores
  - 8 KPI cards
  - CSV export funcional
  - Status: ✅ TESTEADO Y FUNCIONAL

### FASE 2 - Control de Puerta Scanner QR (Completada 28/05/2026)
- **[FASE_2_SCANNER_PUERTA.md](FASE_2_SCANNER_PUERTA.md)** - Documentación completa FASE 2
  - Interfaz de escaneo QR en vivo
  - Validación de tickets contra BD
  - Panel de estadísticas
  - Historial de escaneos (últimos 50)
  - Status: ✅ LISTO PARA TESTING

---

## 🔄 PRÓXIMAS FASES (En Planificación)

Fases en planificación del roadmap actual.

### FASE 3 - Devoluciones y Reembolsos (Planificado 02/06, 3 horas)
- **[PROXIMOS_PASOS_FASE_3_4.md](PROXIMOS_PASOS_FASE_3_4.md#🔄-fase-3-devoluciones-y-reembolsos)** - Documentación completa FASE 3
  - Admin dashboard para cancelar entradas
  - Integración con MercadoPago Refund API
  - Auditoría de reembolsos
  - Status: 🔄 DISEÑO COMPLETADO, LISTO PARA IMPLEMENTAR

### FASE 4 - Reportes Avanzados (Planificado 03/06, 2 horas)
- **[PROXIMOS_PASOS_FASE_3_4.md](PROXIMOS_PASOS_FASE_3_4.md#📊-fase-4-reportes-avanzados)** - Documentación completa FASE 4
  - Dashboard de analytics
  - Gráficos con Chart.js
  - Exportación a Excel
  - Predicciones básicas
  - Status: 🔄 DISEÑO COMPLETADO, LISTO PARA IMPLEMENTAR

### FASE 5 - Cliente Logueado (Completada 28/05)
- **[FASE_5_CLIENTE_LOGUEADO.md](FASE_5_CLIENTE_LOGUEADO.md)** - Documentación completa FASE 5
  - Interfaz: Mis Entradas
  - Tabla de tickets con detalles
  - Modal de detalles
  - Endpoint GET /api/tickets/me
  - Status: ✅ COMPLETADA Y FUNCIONAL

---

## 🏛️ DOCUMENTACIÓN HISTÓRICA (Referencia Antigua)

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
| Vigentes | 15 |
| Fases Implementadas | 2 |
| Próximas Fases | 1 |
| Cheatsheet | 1 |
| Índices | 2 |
| Históricos | 3 |
| Antiguos | 1 |
| **Totales** | **35** |

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
