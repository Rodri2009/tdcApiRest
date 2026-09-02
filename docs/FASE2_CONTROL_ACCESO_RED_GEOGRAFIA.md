# Fase 2: Control de acceso por red y geografía

## Objetivo

Restringir el acceso al sistema para que solo puedan entrar usuarios de la provincia de Buenos Aires, Argentina, y preferentemente solo desde la red interna o una VPN autorizada.

Este documento reúne la guía operativa y la implementación recomendada para este proyecto, manteniendo el equilibrio entre seguridad y continuidad del desarrollo.

---

## Principio de diseño

La estrategia correcta es aplicar controles de entrada en capas:

1. Red privada o VPN
2. Firewall del host
3. Proxy público con Nginx Proxy Manager
4. Restricción geográfica por IP como capa complementaria
5. Validación adicional dentro de la app solo como defensa secundaria

La idea central es esta:

- no exponer el backend ni la base de datos a Internet
- dejar solo el proxy como punto de entrada en 80/443
- bloquear acceso directo a los puertos internos del stack
- permitir administración solo desde red local o VPN
- usar geoblocking como reforzamiento, no como única seguridad

---

## Requisitos del negocio

Para este caso:

- el sistema es para público y personal asociado a Buenos Aires, Argentina
- no interesa que ingrese nadie fuera de la provincia
- el stack corre en un servidor local
- es posible resolver parte de la seguridad fuera del stack
- la solución debe integrarse sin bloquear el desarrollo activo

---

## Arquitectura recomendada

```text
Internet
  |
  v
[Firewall / Router / VPS]
  |
  +--> [VPN WireGuard / red interna autorizada]
  |
  +--> [Nginx Proxy Manager]
          |
          +--> dominio público -> backend interno
          +--> drive / servicios -> nextcloud / apps internas

[TDC stack interno]
  - backend: solo interno, sin puerto público
  - mariadb: solo interno, sin puerto público
  - nginx local: solo para desarrollo / acceso local
```

### Regla clave

Nunca publicar directamente:

- backend en 3000
- mariadb en 3306
- servicios auxiliares en 9001, 9002 y similares

Solo debe quedar visible:

- 80 y 443 del proxy
- puerto 81 del panel administrativo de NPM solo en red interna o VPN
- acceso SSH solo desde la red interna o VPN

---

## 1) Capa 1: red privada y VPN

La recomendación principal es usar VPN para administración y acceso interno.

Opciones válidas:

- WireGuard
- OpenVPN
- Tailscale

Regla:

- todo acceso administrativo debe pasar por VPN
- backend y DB no deben estar expuestos directamente a la Internet pública
- la aplicación debe quedar detrás de un proxy o de una red privada

---

## 2) Capa 2: firewall del host

La segunda capa es cerrar puertos no necesarios en el servidor Linux.

### UFW recomendado

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing

# HTTP y HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# SSH solo desde la red local o VPN
sudo ufw allow from 192.168.1.0/24 to any port 22/tcp

# VPN WireGuard
sudo ufw allow 51820/udp

# bloquear acceso directo a backend, DB y otros servicios internos
sudo ufw deny 3000/tcp
sudo ufw deny 3306/tcp
sudo ufw deny 9001/tcp
sudo ufw deny 9002/tcp

sudo ufw enable
```

Regla práctica para este proyecto:

- si no hace falta que un servicio sea público, no se expone
- en un servidor local, la red interna y la VPN deben ser la única vía administrativa

---

## 3) Capa 3: proxy frontal con Nginx Proxy Manager

NPM sirve como entrada pública para HTTP/HTTPS y enruta tráfico hacia servicios internos.

### Arquitectura válida para este servidor

```text
Internet
  |
  v
[NPM en el mismo servidor]
  |
  +--> app.tu-dominio.com -> docker-backend-1:3000
  +--> cloud.tu-dominio.com -> nextcloud:80
  +--> admin del proxy -> 81 (solo interna / VPN)
```

### Configuración recomendada del stack TDC

En el compose del proyecto TDC, el backend y la base no deben tener puertos publicados al host:

```yaml
backend:
  expose:
    - "3000"

mariadb:
  expose:
    - "3306"
```

Y el proxy NPM debe conectarse a la red Docker del proyecto:

```yaml
networks:
  tdc_network:
    external: true
    name: docker_tdc_network
```

### Host público en NPM

- dominio: app.tu-dominio.com
- forward host: docker-backend-1
- forward port: 3000
- protocolo: http

Esto evita depender del puerto 8080 del frontend local y reenvía correctamente al backend interno.

---

## 4) Capa 4: restricción geográfica por IP

La geolocalización es una capa adicional, no la primera línea de defensa.

### Opción realista

- usar GeoIP2 en nginx o WAF externo
- permitir solo AR y además permitir redes de Buenos Aires / red corporativa
- bloquear el resto por defecto

### Ejemplo de nginx con GeoIP

```nginx
http {
  geoip2 /etc/nginx/geoip/GeoLite2-Country.mmdb {
    $geoip2_country_code country iso_code;
  }

  map $geoip2_country_code $allowed_country {
    default 0;
    AR 1;
  }

  server {
    listen 80;
    server_name app.local;

    if ($allowed_country = 0) {
      return 444;
    }

    location / {
      proxy_pass http://backend:3000;
    }
  }
}
```

### Importante

No conviene colocar la restricción geográfica solamente en la app como guardia principal. La protección real debe quedar en infraestructura.

---

## 5) Capa 5: allowlist por IP / red

Además de la geolocalización, conviene definir una allowlist de redes y equipos autorizados:

- red local del negocio
- IP de administración
- IPs del equipo del proyecto
- VPN del personal autorizado

Toda conexión que no esté en la allowlist debe rechazarse.

---

## 6) Política recomendada para este proyecto

La política más práctica para este desarrollo es:

- frontend y backend en Docker local
- proxy público y frentes de entrada por NPM
- backend y DB aislados del host
- acceso local / VPN para administración
- geoblocking funcional como reforzamiento
- no abrir 3000 ni 3306 a Internet

Esto permite seguir trabajando en el proyecto sin bloquear el desarrollo, pero con una capa real de seguridad.

---

## 7) Implementación aplicada en este entorno

Se aplicó la parte de infraestructura y proxy:

- NPM quedó conectado a la red del proyecto TDC
- el host principal del proxy quedó apuntando a docker-backend-1:3000
- el stack TDC quedó sin exposición directa de backend y DB al host
- la app sigue disponible localmente y la entrada pública queda centralizada en el proxy

La validación realizada fue:

- NGINX del proxy pasó la validación de sintaxis
- el host público respondió con redirección correcta hacia HTTPS
- la configuración del proxy quedó funcional hacia el backend interno

---

## 8) Checklist final

Antes de dejar el entorno en producción real, revisar esto:

- [ ] volver a definir el dominio público final
- [ ] configurar certificados HTTPS en NPM
- [ ] dejar el backend sin puertos públicos
- [ ] dejar la DB sin puertos públicos
- [ ] restringir el panel de NPM a la red interna o VPN
- [ ] aplicar firewall del host
- [ ] definir allowlist de IPs y redes
- [ ] decidir si se activa geoblocking por país o red
- [ ] documentar la política de acceso para BA y red local

---

## 9) Resumen ejecutivo

La solución ideal para este proyecto no es intentar bloquear desde la app, sino dejar todo en infraestructura:

- punto de entrada único: NPM
- red interna para backend y DB
- firewall del host para cerrar puertos no usados
- acceso administrativo solo por VPN o LAN autorizada
- restricción geográfica como capa adicional para Buenos Aires / Argentina

Esto cumple con el negocio sin bloquear el desarrollo activo.

Cuando se trabaja en entorno local o servidor con IP fija, la mejor solución práctica es:

- permitir solo la red local o VPN
- bloquear cualquier IP fuera de esa red
- y usar geoblocking como segunda capa

### Ejemplo en nginx

```nginx
geo $allowed_ip {
  default 0;
  10.0.0.0/24 1;
  192.168.1.0/24 1;
  181.31.0.0/16 1;   # ejemplo de red autorizada de Buenos Aires
}

server {
  listen 80;
  server_name app.local;

  if ($allowed_ip = 0) {
    return 403;
  }
}
```

### Recomendación operativa

- Mantener lista de IPs autorizadas en un archivo separado.
- Revisar la lista con frecuencia.
- No confiar en un `allow all` por comodidad.

---

## Capa 5: Control de acceso en Docker

### Política recomendada

- Frontend y backend detrás de nginx.
- Base de datos sin publicación.
- `ports` solo para servicios públicos estrictamente necesarios.
- `expose` para tráfico interno.

### Ejemplo de docker-compose seguro

```yaml
version: '3.9'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    networks:
      - app-net
    depends_on:
      - backend

  backend:
    build: ./backend
    expose:
      - "3000"
    environment:
      PORT: 3000
      NODE_ENV: production
    networks:
      - app-net
    depends_on:
      - db

  db:
    image: mariadb:10.6
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
      MYSQL_DATABASE: ${DB_NAME}
    expose:
      - "3306"
    networks:
      - app-net

networks:
  app-net:
    driver: bridge
```

### Importante

Si el cliente no necesita acceso desde Internet, es mejor no publicar nada más que nginx.

---

## Capa 6: Middleware de seguridad en la app

Aunque la verdadera protección debe estar fuera de la app, dentro del backend conviene agregar validaciones adicionais.

### Ejemplo mínimo

```js
function enforceArgentinaOnly(req, res, next) {
  const allowedCountries = ['AR'];
  const country = req.headers['x-country-code'] || 'AR';

  if (!allowedCountries.includes(country)) {
    return res.status(403).json({ error: 'Acceso no autorizado para esta región.' });
  }

  next();
}
```

### Recomendación realista

- usar esto solo como filtros extra, no como seguridad principal.
- no depender completamente de headers del cliente.

---

## Recomendación de implementación por prioridad

### Prioridad 1: lo mínimo viable y robusto

1. Cerrar puertos del backend y la DB.
2. Publicar solo nginx.
3. Usar VPN o red interna para administración.
4. Permitir solo IPs conocidas.
5. Si hay acceso externo, bloquear por geografía con nginx o firewall.

### Prioridad 2: producción local segura

1. Red privada docker interna
2. ACL por IP
3. VPN con acceso restringido
4. Geoblocking en nginx
5. HTTPS obligatorio

### Prioridad 3: hardening avanzado

1. WAF / Cloudflare / proxy enterprise
2. Logs centralizados
3. Monitoreo de accesos anómalos
4. Alertas por IPs sospechosas

---

## Checklist operativo

### Infraestructura

- [ ] El backend no está publicado directamente.
- [ ] La DB no está publicada directamente.
- [ ] Solo Nginx expone 80/443.
- [ ] Hay VPN o red privada para admins.
- [ ] Existe listas de IPs autorizadas.

### Geografía

- [ ] Se define la política: solo Buenos Aires / Argentina.
- [ ] Hay geoblocking en nginx o firewall.
- [ ] Fallback para redes internas autorizadas.

### Docker

- [ ] `ports` solo en nginx.
- [ ] `expose` para servicios internos.
- [ ] `network` interna para backend/db.
- [ ] No se abren puertos adicionales sin necesidad.

### Validación

- [ ] Probar acceso desde red autorizada: OK.
- [ ] Probar acceso desde IP no autorizada: bloqueado.
- [ ] Probar acceso desde un país no permitido: bloqueado.
- [ ] Probar acceso por VPN: OK.
- [ ] Probar acceso directo al backend: fallido.

---

## Reglas de oro

1. Si no es necesario publicar, no publicar.
2. Si el cliente exige restricción de región, implementarla fuera de la app.
3. La VPN y el firewall son más confiables que la lógica del backend.
4. No depende de headers del navegador para seguridad real.
5. Si hay duda, priorizar “cerrado por defecto” sobre “acceso fácil”.

---

## Recomendación final para un proyecto en desarrollo

Para un sistema de desarrollo que aún está evolucionando, la estrategia más saludable es:

- poner la app detrás de nginx,
- bloquear 3000 y 3306,
- permitir acceso solo vía VPN o red interna,
- agregar geoblocking como segunda capa,
- y dejar la lógica de negocio intacta mientras se sigue construyendo.

Esto permite seguir desarrollando con seguridad sin detener el proyecto.

---

## Plantilla de implementación recomendada

### Variables de entorno sugeridas

```env
NODE_ENV=production
APP_ALLOWED_COUNTRIES=AR
APP_ALLOWED_NETWORKS=10.0.0.0/24,192.168.1.0/24
VPN_ENABLED=true
ALLOW_DIRECT_BACKEND=false
ALLOW_DIRECT_DB=false
```

### Reglas operativas

```text
- backend: no expuesto
- db: no expuesto
- nginx: sí expuesto en 80/443
- acceso administrativo: solo VPN
- acceso público: solo si es estrictamente necesario
- región: Buenos Aires/Argentina
```

---

## Resumen

La Fase 2 debe centrarse en la restricción de entrada a nivel de infraestructura, no solamente en la app. Es decir:

- red interna o VPN,
- firewall,
- IP allowlist,
- geoblocking,
- y solo luego controles dentro del backend.

Esta combinación es la que más se adapta al negocio de “solo Buenos Aires” y al contexto de servidor local.
