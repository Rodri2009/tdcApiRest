# Módulo 07: Uploads y galería

## Objetivo

Gestionar contenido visual del sitio: logos, flyers, banners, imágenes de galería y contenido multimedia.

## Alcance

- uploads de archivos
- almacenamiento local
- galería por categoría
- visualización en frontend
- contenido relacionado a bandas, eventos y servicios

## Entidades principales

- archivos cargados
- galería
- categorías de contenido

## Ruta principal

- `POST /api/uploads`
- `GET /api/uploads`
- endpoints relacionados con galería y archivos

## Lógica esperada

- Los archivos se guardan en carpetas de uploads.
- El backend sirve contenido estático desde `/uploads`.
- Las imágenes se usan tanto en el sitio público como en el admin.

## Reglas de negocio

- Validar tamaño y tipo de archivo.
- Mantener carpetas y estructura organizadas por categoría.
- No cargar archivos sin una referencia clara al dominio asociado.

## Componentes del módulo

### Routes
- `backend/routes/uploadsRoutes.js`

### Controllers
- `backend/controllers/uploadsController.js`

### Infraestructura
- `backend/uploads/`
- `backend/server.js` con `app.use('/uploads', ...)`

## Dependencias

- sistema de archivos
- frontend
- módulo de eventos / bandas / servicios

## Riesgos

- archivos huérfanos
- nombres duplicados
- almacenamiento sin clasificación

## Próximos pasos

- definir una norma de nomenclatura por tipo de contenido
- asociar cada archivo a una entidad de negocio
- centralizar validación de tipos y tamaños
