# TDC - Sistema de Gestión de Salones de Eventos

Este proyecto es la migración de una aplicación originalmente creada en Google Apps Script a una arquitectura moderna basada en Docker, Node.js, Express.js y MariaDB.

## Requisitos Previos

Para ejecutar este proyecto en un nuevo entorno (como Debian 12/13), necesitarás tener instalado lo siguiente:

1.  **Git:** Para clonar el repositorio.
2.  **Docker:** Para gestionar los contenedores de la aplicación.
3.  **Docker Compose:** Para orquestar los servicios de Docker.

*Nota: Las instrucciones de instalación para Docker y Docker Compose en sistemas Debian/Ubuntu están detalladas en la sección de "Instalación por Primera Vez".*

---

## Puesta en Marcha (Desde Cero)

Sigue estos pasos para clonar y ejecutar el proyecto por primera vez.

### 1. Clonar el Repositorio

Abre una terminal y clona el proyecto desde GitHub:

```bash
git clone <URL_DE_TU_REPOSITORIO_EN_GITHU>
cd <NOMBRE_DEL_DIRECTORIO_DEL_PROYECTO>