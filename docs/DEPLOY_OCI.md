# Despliegue en Oracle Cloud (OCI) — Always Free

Runbook para desplegar Tikara en una VM Compute de OCI (Ampere A1, Always Free)
usando Docker Compose, sin dominio propio (IP pública + sslip.io + Let's Encrypt).

## 1. Provisionar la VM (consola de OCI)

1. VCN con subnet pública, Security List permitiendo entrada TCP `22`, `80`, `443`.
2. Compute instance:
   - Shape: `VM.Standard.A1.Flex` (2-4 OCPU / 12-24 GB, Always Free)
   - Imagen: Ubuntu 24.04 LTS (arm64)
   - SSH key pública: contenido de `~/.ssh/oci_tikara.pub`
3. Anotar la IP pública asignada.

## 2. Bootstrap del servidor

```bash
ssh -i ~/.ssh/oci_tikara ubuntu@<IP>

sudo apt update && sudo apt upgrade -y
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
# reconectar la sesión SSH para que el grupo docker surta efecto

# Abrir 80/443 a nivel de iptables (las imágenes Ubuntu de OCI traen reglas
# propias además de la Security List de la consola)
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save   # si está instalado; si no, agregar a /etc/iptables/rules.v4

git clone https://github.com/TravisDev5x/ekindesk.git tikara
cd tikara
```

## 3. `.env` de producción

Crear `~/tikara/.env` en el servidor (nunca se commitea):

```env
APP_NAME=Tikara
APP_ENV=production
APP_KEY=                      # generar con: docker compose -f docker-compose.prod.yml run --rm app php artisan key:generate --show
APP_DEBUG=false
APP_URL=https://<ip-con-guiones>.sslip.io

TENANCY_ENFORCE_SUBDOMAIN=false
TENANCY_STRICT_CLIENT_PORTAL=true
TENANCY_LEGACY_MSP_WIDE_ACCESS=false

SESSION_DRIVER=database
SESSION_DOMAIN=null
SESSION_SECURE_COOKIE=true
SANCTUM_STATEFUL_DOMAINS=<ip-con-guiones>.sslip.io

CORS_ALLOWED_ORIGINS=https://<ip-con-guiones>.sslip.io
CORS_SUPPORTS_CREDENTIALS=true

DB_CONNECTION=pgsql
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=tikara
DB_USERNAME=tikara
DB_PASSWORD=                  # generar una contraseña fuerte

QUEUE_CONNECTION=database
CACHE_STORE=database

MAIL_MAILER=smtp
MAIL_HOST=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USERNAME=apikey
MAIL_PASSWORD=                # API key de SendGrid
MAIL_FROM_ADDRESS=hello@tikara.local
MAIL_FROM_NAME=Tikara
```

### Notificaciones en tiempo real (Reverb)

No requiere una API externa ni un servicio de pago: Reverb corre como un
contenedor interno y Nginx publica el WebSocket bajo el mismo dominio de la
aplicación. Después de crear el `.env`, ejecuta una sola vez:

```bash
docker compose -f docker-compose.prod.yml exec app php artisan reverb:install
```

Ese comando genera las credenciales de Reverb. Para el despliegue Docker,
ajusta además estas variables en `.env` (sustituye el dominio):

```dotenv
BROADCAST_CONNECTION=reverb
REVERB_HOST=reverb
REVERB_PORT=8080
REVERB_SCHEME=http
REVERB_SERVER_HOST=0.0.0.0
REVERB_SERVER_PORT=8080
REVERB_ALLOWED_ORIGINS=https://<ip-con-guiones>.sslip.io
```

No agregues `VITE_REVERB_*`: el frontend recibe únicamente la clave pública
en tiempo de ejecución y conecta al mismo dominio por WSS. Reinicia los
contenedores tras guardar el `.env`.

`<ip-con-guiones>` es la IP pública con puntos reemplazados por guiones
(ej. `203.0.113.10` → `203-0-113-10`), formato que exige sslip.io.

## 4. Primer arranque (HTTP, sin certificado todavía)

```bash
cp docker/nginx/http.conf docker/nginx/default.conf   # default.conf no se commitea (ver .gitignore)
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec app php artisan migrate --force
```

Verificar que responde por HTTP: `curl -I http://<ip>`.

## 5. Obtener certificado real (Let's Encrypt)

```bash
docker compose -f docker-compose.prod.yml run --rm certbot \
  certonly --webroot -w /var/www/certbot \
  -d <ip-con-guiones>.sslip.io \
  --email tu-correo@ejemplo.com --agree-tos --no-eff-email
```

## 6. Activar HTTPS

```bash
sed "s/SERVER_NAME/<ip-con-guiones>.sslip.io/g" docker/nginx/https.conf > docker/nginx/default.conf
docker compose -f docker-compose.prod.yml up -d nginx
```

## 7. Verificación

```bash
curl -I https://<ip-con-guiones>.sslip.io      # 200, certificado válido
docker compose -f docker-compose.prod.yml ps   # los 4 servicios Up/healthy
docker compose -f docker-compose.prod.yml logs queue --tail=20
```

## Renovación del certificado

Let's Encrypt expira cada 90 días. Cron sugerido en el host:

```
0 3 * * * cd ~/tikara && docker compose -f docker-compose.prod.yml run --rm certbot renew --webroot -w /var/www/certbot && docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```
