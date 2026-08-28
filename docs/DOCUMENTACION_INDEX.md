# 📚 Índice de Documentación - TDC API REST

## Última actualización: 28/08/2026

Este índice refleja la documentación que realmente existe en el repositorio y prioriza la referencia por módulos funcionales antes que por documentos aislados o históricos.

---

## 🟢 DOCUMENTACIÓN PRIORITARIA

### Módulos funcionales

- **[modulos/README.md](modulos/README.md)** - índice principal de arquitectura modular por dominio
- **[modulos/01-autenticacion.md](modulos/01-autenticacion.md)** - login, JWT y permisos
- **[modulos/02-usuarios-clientes.md](modulos/02-usuarios-clientes.md)** - usuarios internos y clientes
- **[modulos/03-solicitudes-servicios.md](modulos/03-solicitudes-servicios.md)** - solicitudes, alquileres y servicios
- **[modulos/04-eventos-bandas-talleres.md](modulos/04-eventos-bandas-talleres.md)** - eventos, bandas, talleres y agenda
- **[modulos/05-caja-transacciones.md](modulos/05-caja-transacciones.md)** - caja, movimientos y cierre
- **[modulos/06-mercadopago-whatsapp.md](modulos/06-mercadopago-whatsapp.md)** - pagos, WhatsApp y snapshots de diagnóstico
- **[modulos/07-uploads-galeria.md](modulos/07-uploads-galeria.md)** - uploads, logos, flyers y galerías
- **[modulos/08-admin-reportes.md](modulos/08-admin-reportes.md)** - administración y reportes

### Documentación operativa y funcional del negocio

- **[FLUJO_COMPRA_ENTRADAS.md](FLUJO_COMPRA_ENTRADAS.md)** - flujo completo de compra de entradas
- **[ANALISIS_OPERATORIA_POSTCARGA.md](ANALISIS_OPERATORIA_POSTCARGA.md)** - operatoria post-carga y validación del pase
- **[LOGICA_NEGOCIO.md](LOGICA_NEGOCIO.md)** - reglas de negocio generales
- **[contexto_negocio.md](contexto_negocio.md)** - contexto del negocio y operación
- **[MERCADOPAGO_PARAMETROS_RETORNO.md](MERCADOPAGO_PARAMETROS_RETORNO.md)** - parámetros devueltos por Mercado Pago
- **[SCRAPER_MP.md](SCRAPER_MP.md)** - estrategia de scraping de actividad de Mercado Pago
- **[SOPORTE_MERCADOPAGO_WALLET_BRICK.md](SOPORTE_MERCADOPAGO_WALLET_BRICK.md)** - soporte y troubleshooting para Mercado Pago Wallet Brick
- **[WALLET_BRICK_BOTON_DESHABILITADO.md](WALLET_BRICK_BOTON_DESHABILITADO.md)** - caso de botón deshabilitado del brick

---

## 📌 DOCUMENTACIÓN QUE NO DEBE USARSE COMO FUENTE PRINCIPAL

Estos archivos siguen siendo útiles, pero no son la guía central del proyecto ni tienen prioridad sobre la estructura modular:

- **[MERCADOPAGO_PARAMETROS_RETORNO.md](MERCADOPAGO_PARAMETROS_RETORNO.md)** - documentación técnica puntual de parámetros MP
- **[SCRAPER_MP.md](SCRAPER_MP.md)** - detalle del scraper y comportamiento interno
- **[SOPORTE_MERCADOPAGO_WALLET_BRICK.md](SOPORTE_MERCADOPAGO_WALLET_BRICK.md)** - soporte específico de integración
- **[WALLET_BRICK_BOTON_DESHABILITADO.md](WALLET_BRICK_BOTON_DESHABILITADO.md)** - caso operativo específico

---

## 🧭 Regla de lectura recomendada

1. Empezar por [modulos/README.md](modulos/README.md) para ubicar el dominio.
2. Continuar con el módulo específico en [docs/modulos](modulos).
3. Usar los documentos raíz solo para detalles funcionales, flujos o soporte puntual.
4. Mantener el módulo como fuente principal de arquitectura y negocio.

---

## 🔍 Estado de referencias

Se revisaron los enlaces del índice y se corrigieron los que apuntaban a archivos inexistentes.
El índice actual solo referencia documentos presentes en la carpeta [docs](.).

---

## 📁 Estructura efectiva de documentación actual

```text
docs/
├── DOCUMENTACION_INDEX.md
├── ANALISIS_OPERATORIA_POSTCARGA.md
├── FLUJO_COMPRA_ENTRADAS.md
├── LOGICA_NEGOCIO.md
├── MERCADOPAGO_PARAMETROS_RETORNO.md
├── SCRAPER_MP.md
├── SOPORTE_MERCADOPAGO_WALLET_BRICK.md
├── WALLET_BRICK_BOTON_DESHABILITADO.md
├── contexto_negocio.md
└── modulos/
    ├── README.md
    ├── 01-autenticacion.md
    ├── 02-usuarios-clientes.md
    ├── 03-solicitudes-servicios.md
    ├── 04-eventos-bandas-talleres.md
    ├── 05-caja-transacciones.md
    ├── 06-mercadopago-whatsapp.md
    ├── 07-uploads-galeria.md
    └── 08-admin-reportes.md
```

---

## ✅ Observación clave

La documentación con prioridad funcional está en [docs/modulos](modulos). Los archivos sueltos en [docs](.) complementan esa base, pero no reemplazan la estructura modular.
