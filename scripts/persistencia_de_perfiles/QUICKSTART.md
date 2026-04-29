# Persistencia de profiles entre equipos

Este quickstart describe cómo empaquetar, cifrar, transferir y restaurar los profiles de Puppeteer/WhatsApp de forma segura entre equipos.

## Requisitos

- `tar`
- `gpg`
- `ssh`
- `scp`
- El directorio `backend/profile/` debe estar en `.gitignore`

## 1) Empaquetar y cifrar el profile

En el equipo origen (por ejemplo tu equipo del trabajo):

```bash
cd /home/rodrigo/tdcApiRest
./scripts/persistencia_de_perfiles/share_profile.sh pack --profiles both --output /tmp/tdc-profile.tar.gz.gpg
```

Esto crea un archivo cifrado `tdc-profile.tar.gz.gpg` que contiene:
- `backend/profile/wa-profile`
- `backend/profile/mp-profile`

## 2) Crear túnel reverso SSH hacia el servidor público de casa

Desde el equipo del trabajo, ejecuta:

```bash
ssh -p 443 -N -R 2222:localhost:22 user@HOME_SERVER_IP
```

Esto abre una conexión saliente en el puerto `443` hacia el servidor público y expone el puerto `2222` desde el servidor hacia tu equipo.

## 3) Subir el archivo cifrado al servidor público

Desde el equipo del trabajo (o desde el servidor si ya lo tienes disponible):

```bash
./scripts/persistencia_de_perfiles/share_profile.sh push --input /tmp/tdc-profile.tar.gz.gpg --remote user@HOME_SERVER_IP:/tmp --port 443
```

## 4) Descargar el archivo cifrado en el equipo destino

En el servidor público o en otro equipo autorizado:

```bash
./scripts/persistencia_de_perfiles/share_profile.sh pull --remote user@HOME_SERVER_IP:/tmp/tdc-profile.tar.gz.gpg --output /tmp/tdc-profile.tar.gz.gpg --port 443
```

## 5) Restaurar el profile en el equipo destino

```bash
./scripts/persistencia_de_perfiles/share_profile.sh restore --input /tmp/tdc-profile.tar.gz.gpg --dest /home/rodrigo/tdcApiRest/backend/profile
```

Esto descifrará y extraerá los perfiles en:

- `/home/rodrigo/tdcApiRest/backend/profile/wa-profile`
- `/home/rodrigo/tdcApiRest/backend/profile/mp-profile`

## Nota de seguridad

- No subas el archivo cifrado a Git.
- Si compartís el archivo, hacelo solo a través de canales seguros.
- No expongas el contenido de `backend/profile/` en repositorios públicos.
