@echo off
set DB_CONNECTION=mysql
set DB_HOST=127.0.0.1
set DB_PORT=3306
set DB_DATABASE=helpdeskdata_smoke
set DB_USERNAME=root
set DB_PASSWORD=
set APP_URL=http://127.0.0.1:8001
set SESSION_DOMAIN=127.0.0.1
set SANCTUM_STATEFUL_DOMAINS=127.0.0.1:8001,127.0.0.1,localhost
set SESSION_SECURE_COOKIE=false
set SESSION_SAME_SITE=lax
"C:\laragon\bin\php\php-8.4.12-nts-Win32-vs17-x64\php.exe" artisan serve --host=127.0.0.1 --port=8001
