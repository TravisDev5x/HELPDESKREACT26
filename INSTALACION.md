# Requisitos e instalación — HelpDesk React

Guía para instalar el proyecto en otra PC o en un servidor (desarrollo o producción).

---

## 1. Requisitos del sistema

| Requisito | Versión mínima |
|-----------|----------------|
| **PHP** | 8.2+ (extensiones: `mbstring`, `openssl`, `pdo`, `tokenizer`, `xml`, `ctype`, `json`, `bcmath`, `fileinfo`) |
| **Composer** | 2.x |
| **Node.js** | 18.x o 20.x (LTS recomendado) |
| **npm** | 9.x (viene con Node) |
| **Base de datos** | SQLite 3 **o** MySQL 8 / MariaDB 10.3+ |

En Windows con Laragon ya tienes PHP y MySQL. Solo necesitas instalar Node.js desde [nodejs.org](https://nodejs.org).

---

## 2. Instalación paso a paso

### 2.1 Clonar o copiar el proyecto

```bash
git clone <url-del-repositorio> HelpdeskReact
cd HelpdeskReact
```

(O copiar la carpeta del proyecto en la nueva máquina.)

### 2.2 Backend (Laravel)

```bash
# Dependencias PHP
composer install

# Crear .env desde plantilla (si no existe)
cp .env.example .env
# En Windows: copy .env.example .env

# Clave de aplicación
php artisan key:generate
```

### 2.3 Configurar entorno (`.env`)

Edita `.env` y ajusta al menos:

- **`APP_NAME`** — Nombre de la app (ej. `HelpDesk`).
- **`APP_URL`** — URL pública (ej. `http://localhost:8000` o `https://tudominio.com`).
- **Base de datos:**
  - **SQLite (por defecto):**  
    `DB_CONNECTION=sqlite`  
    Crear el archivo de base de datos:
    ```bash
    touch database/database.sqlite
    ```
  - **MySQL/MariaDB:**
    ```env
    DB_CONNECTION=mysql
    DB_HOST=127.0.0.1
    DB_PORT=3306
    DB_DATABASE=helpdesk
    DB_USERNAME=root
    DB_PASSWORD=tu_password
    ```
    Crear la base de datos en MySQL antes de migrar (ej. `CREATE DATABASE helpdesk;`).
- **`SANCTUM_STATEFUL_DOMAINS`** — Dominios desde los que la SPA envía cookies (ej. `localhost,127.0.0.1,tudominio.com`).

### 2.4 Migraciones

```bash
php artisan migrate
```

Para **empezar de cero** (borra tablas y vuelve a crearlas):

```bash
php artisan migrate:fresh
```

### 2.5 Seeders (datos iniciales y demo)

| Comando | Descripción |
|---------|-------------|
| **`php artisan db:seed`** | Ejecuta `DatabaseSeeder` (por defecto llama a `FullDemoSeeder`). |
| **`php artisan migrate:fresh --seed`** | Borra todo, ejecuta migraciones y luego los seeders. |
| **`php artisan db:seed --class=FullDemoSeeder`** | Solo el seeder demo completo (catálogos + 5 usuarios tipo + 95 Faker + 210 tickets). |
| **`php artisan db:seed --class=CatalogSeeder`** | Solo catálogos básicos (campañas, áreas, puestos). |
| **`php artisan db:seed --class=UserSeeder`** | Solo usuarios (si existe y está configurado). |
| **`php artisan db:seed --class=AdminUserSeeder`** | Solo usuario admin (si existe). |

**Recomendación para primera instalación con datos de prueba:**

```bash
php artisan migrate:fresh --seed
```

Credenciales de los 5 usuarios tipo generados por `FullDemoSeeder`: ver **`USUARIOS_DEMO.md`**. Contraseña común: **`Password123!`**.

### 2.6 Frontend (React + Vite)

```bash
# Dependencias Node
npm install

# Compilar assets para producción (obligatorio si no usas "npm run dev")
npm run build
```

### 2.7 Permisos (Linux / servidor)

Carpetas escribibles por el servidor web:

```bash
chmod -R 775 storage bootstrap/cache
# El usuario del servidor web (ej. www-data) debe ser propietario o estar en el mismo grupo
```

---

## 3. Cómo ejecutar

### Desarrollo (PC local)

**Opción A — Todo en uno (Laravel + cola + logs + Vite):**

```bash
composer dev
```

(Requiere `concurrently`; levanta servidor PHP, queue, pail y Vite.)

**Opción B — Por separado:**

Terminal 1 — Backend:

```bash
php artisan serve
```

Terminal 2 — Frontend (recarga en caliente):

```bash
npm run dev
```

Acceder a la URL que indique `php artisan serve` (ej. `http://127.0.0.1:8000`). En desarrollo, Vite inyecta los scripts; si usas solo `php artisan serve` sin `npm run dev`, antes debes haber ejecutado **`npm run build`**.

### Producción (servidor)

1. **`.env` de producción:**  
   `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL` con la URL real.
2. **Build del frontend:**  
   `npm run build` (los assets quedan en `public/build`).
3. **Optimizar Laravel:**  
   `php artisan config:cache`, `php artisan route:cache`, `php artisan view:cache`.
4. **Servidor web:**  
   Apuntar el document root al directorio **`public`** del proyecto (Apache/Nginx).
5. **Cola (opcional):**  
   Si usas colas, un worker: `php artisan queue:work` (o Supervisor).

---

## 4. Resumen rápido (otra PC / servidor)

```bash
composer install
cp .env.example .env
php artisan key:generate
# Configurar DB en .env y, si es SQLite: touch database/database.sqlite
php artisan migrate
php artisan db:seed
# o: php artisan migrate:fresh --seed
npm install
npm run build
php artisan serve
```

Abrir en el navegador la URL del servidor (ej. `http://127.0.0.1:8000`). Para probar con usuarios demo, ver **USUARIOS_DEMO.md**.
