🚀 Instalación rápida — HelpDesk React (Laravel + React)

Guía corta para levantar el proyecto en otra PC o servidor.

🔧 Requisitos

PHP 8.2+

Composer 2.x

Node.js 18 o 20 (LTS)

npm 9.x

BD: SQLite o MySQL / MariaDB

📦 Instalación
git clone <url-del-repo>
cd HelpdeskReact
Backend (Laravel)
composer install
cp .env.example .env   # Windows: copy .env.example .env
php artisan key:generate

Configura la base de datos en .env.

SQLite (rápido):

touch database/database.sqlite

MySQL: crea antes la BD (helpdesk) y ajusta credenciales.

🗄️ Base de datos + datos demo
php artisan migrate:fresh --seed

Incluye catálogos, usuarios demo y tickets.
📄 Credenciales: ver USUARIOS_DEMO.md
🔑 Password común: Password123!

🎨 Frontend (React + Vite)
npm install
npm run build
▶️ Ejecutar

Desarrollo (todo junto):

composer dev

O separado:

php artisan serve
npm run dev

Acceso típico: http://127.0.0.1:8000

🌐 Producción (resumen)
npm run build
php artisan config:cache
php artisan route:cache
php artisan view:cache

APP_ENV=production

APP_DEBUG=false

Document root → /public

🧠 TL;DR
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate:fresh --seed
npm install && npm run build
php artisan serve
