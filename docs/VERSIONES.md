# Versiones del stack y compatibilidades

Este proyecto usa un stack basado en Docker para la BD y Node.js para el backend. El punto crítico es la dependencia `mariadb`: las versiones recientes de `mariadb` suben el requisito mínimo de Node y, si la instalación local usa una versión vieja, `npm` falla con el mensaje:

`please upgrade node: mariadb requires at least version 20.0.0`

## Diagnóstico del error

La causa no es MariaDB en Docker, sino la librería Node `mariadb` instalada en la máquina local o en el backend:

- En `backend/package.json` y en `package.json` se estaba usando una versión con rango `^3.x`.
- `npm` resuelve la última versión compatible dentro de ese rango.
- En la serie `mariadb` 3.5.x, la dependencia de Node subió a `>= 20.0.0`.
- Si el entorno local tiene Node 18 o 16, la instalación falla antes de arrancar `reset.sh`.

La versión pinneada recomendada para este proyecto es `mariadb@3.4.7`, porque soporta Node 18 y sigue siendo compatible con el stack actual.

## Compatibilidad por versión

| Componente | Versión usada en proyecto | Compatibilidad recomendada | Observación |
|---|---:|---|---|
| Node.js (Docker backend) | `20-slim` | `>=18 <21` recomendado para el proyecto | La imagen Docker usa `node:20-slim` para evitar problemas con Puppeteer y `mariadb`. |
| Node.js local (dev) | `18.x` o `20.x` | `18.x` o `20.x` | `18.x` funciona con `mariadb@3.4.7`; `20.x` es la opción más segura y coincide con Docker. |
| npm | `9.x` (según Node 20) | `>=9` | `npm` incluido con Node 20. |
| Docker | `24.x+` | `24.x+` recomendado | Requerido por `docker compose` y contenedores del stack. |
| Docker Compose | `v2` | `v2.x` | Usado por `docker compose` en `scripts/*.sh`. |
| MariaDB (contenedor) | `10.6` | `10.6` | Imagen declarada en `docker/docker-compose.yml`. |
| `mariadb` npm | `3.4.7` | `3.4.7` para compatibilidad con Node 18 | Previene el error `please upgrade node` al instalar dependencias locales. |
| `mariadb` npm 3.5.x | `3.5.1+` | `Node >=20.0.0` | No compatible con Node 18/16. |
| `mariadb` npm 3.4.x | `3.4.0-3.4.7` | `Node >=14` | Compatible con Node 18 y 20. |
| `mariadb` npm 3.3.x | `3.3.0+` | `Node >=14` | Compatible con Node 18, pero no la mejor opción si se quiere un pin más reciente y estable. |

## Stack relevante del proyecto

### Backend

- `express`: `^4.18.2`
- `puppeteer`: `^21.11.0`
- `mercadopago`: `^2.12.0`
- `nodemailer`: `^6.9.7`
- `mariadb`: `3.4.7` (pinned para compatibilidad)

### Base de datos

- Imagen Docker: `mariadb:10.6`
- Puerto interno: `3306`
- Volúmenes: `mariadb_data`, `mariadb_binlogs`

### Infraestructura

- `docker/Dockerfile.backend`: base `node:20-slim`
- `docker/docker-compose.yml`: stack con `nginx`, `backend` y `mariadb`

## Reglas de compatibilidad

- Si se usa `mariadb@3.5.x`, entonces Node debe ser `20.0.0+`.
- Si se usa `mariadb@3.4.7`, Node `18.x` o `20.x` es compatible.
- El proyecto Docker está fijado en Node 20 para evitar conflictos con Puppeteer y con la dependencia `mariadb`.
- Los scripts locales deben ejecutarse con Node 20 o con un `mariadb` pinneado a una versión compatible.

## Recomendación actual

Se recomienda:

1. Usar Node 20 para desarrollo local si se quiere seguir el mismo runtime que Docker.
2. Mantener `mariadb` fijado en `3.4.7` si se necesita compatibilidad con Node 18.
3. No usar rangos `^3.x` sin control, porque `npm` puede resolver a `3.5.x` y romper el entorno.

## Evidencia técnica

La comprobación de versiones confirma que:

- `mariadb@3.5.4` exige `node >= 20.0.0`
- `mariadb@3.4.7` admite `node >= 14`
- el proyecto estaba usando rangos tipo `^3.3.0`, que permiten resolver a `3.5.x` y provocar exactamente este error
