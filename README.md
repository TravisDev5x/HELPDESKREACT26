<p align="center">
  <img src="docs/screenshots/dashboard-preview.png" alt="EkinDesk — Dashboard Preview" width="800"/>
</p>

<h1 align="center">🎫 EkinDesk</h1>

<p align="center">
  Sistema de gestión de tickets e incidencias de soporte técnico, diseñado para centralizar la atención al usuario, mejorar tiempos de respuesta y garantizar trazabilidad completa del ciclo de vida de cada ticket.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Laravel-10+-FF2D20?style=flat-square&logo=laravel&logoColor=white" alt="Laravel"/>
  <img src="https://img.shields.io/badge/React-18+-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React"/>
  <img src="https://img.shields.io/badge/Vite-5+-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite"/>
  <img src="https://img.shields.io/badge/Tailwind_CSS-3+-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind"/>
  <img src="https://img.shields.io/badge/shadcn%2Fui-Components-000000?style=flat-square" alt="shadcn/ui"/>
  <img src="https://img.shields.io/badge/MySQL-8+-4479A1?style=flat-square&logo=mysql&logoColor=white" alt="MySQL"/>
  <img src="https://img.shields.io/badge/Sanctum-Auth-FF2D20?style=flat-square&logo=laravel&logoColor=white" alt="Sanctum"/>
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License"/>
</p>

---

## 📋 Acerca del proyecto

**EkinDesk** es un sistema CRM de soporte técnico Full Stack desarrollado como proyecto personal, orientado a resolver una necesidad real: la gestión eficiente de incidencias en entornos de TI.

El sistema permite crear, asignar, priorizar y dar seguimiento a tickets de soporte, con roles diferenciados para administradores, agentes y usuarios finales. Está diseñado con enfoque en la usabilidad, la trazabilidad y el cumplimiento de tiempos de respuesta (SLA).

### ¿Por qué EkinDesk?

Nace de mi experiencia directa como Analista de Soporte Técnico, donde identifiqué la necesidad de contar con una herramienta que no solo registre tickets, sino que ofrezca visibilidad completa del estado de cada incidencia, permita la asignación inteligente y facilite el seguimiento hasta su resolución.

El nombre **EkinDesk** refleja identidad y propósito: un escritorio de soporte con personalidad propia, construido desde la trinchera del soporte TI.

---

## ✨ Funcionalidades principales

- **Gestión completa de tickets** — Creación, asignación, priorización, seguimiento y cierre de incidencias.
- **Roles y permisos** — Sistema de roles diferenciados (Administrador, Agente, Usuario) con control de acceso granular.
- **Dashboard interactivo** — Vista general del estado de tickets, métricas clave y actividad reciente.
- **Catálogos configurables** — Categorías, prioridades, estados y departamentos personalizables.
- **Autenticación segura** — Basada en Laravel Sanctum con manejo de sesiones y tokens.
- **Interfaz moderna** — UI construida con React, shadcn/ui y Tailwind CSS para una experiencia fluida y responsiva.
- **Usuarios demo** — Datos de prueba precargados para explorar el sistema de inmediato.

---

## 🛠️ Tech Stack

| Capa | Tecnología |
|------|------------|
| **Backend** | PHP 8.2+, Laravel 10+ |
| **Frontend** | React 18+, TypeScript, Vite 5 |
| **UI** | Tailwind CSS 3, shadcn/ui |
| **Auth** | Laravel Sanctum |
| **Base de datos** | MySQL 8 / SQLite |
| **Bundler** | Vite |

---

## 📸 Screenshots

> ⚠️ **Pendiente:** Agrega capturas de pantalla del dashboard, lista de tickets y formulario de creación en `docs/screenshots/`.

| Dashboard | Tickets | Detalle |
|-----------|---------|---------|
| ![Dashboard](docs/screenshots/dashboard.png) | ![Tickets](docs/screenshots/tickets.png) | ![Detalle](docs/screenshots/detalle.png) |

---

## 🚀 Instalación rápida

### Requisitos previos

- PHP 8.2+
- Composer 2.x
- Node.js 18 o 20 (LTS)
- npm 9.x
- MySQL / MariaDB o SQLite

### 1. Clonar el repositorio

```bash
git clone https://github.com/TravisDev5x/ekindesk.git
cd ekindesk
```

### 2. Backend (Laravel)

```bash
composer install
cp .env.example .env
php artisan key:generate
```

Configura la base de datos en `.env`:

- **SQLite (rápido):** `touch database/database.sqlite`
- **MySQL:** Crea la base de datos `ekindesk` y ajusta las credenciales en `.env`

### 3. Base de datos + datos demo

```bash
php artisan migrate:fresh --seed
```

Incluye catálogos, usuarios demo y tickets de ejemplo.

> 📄 Credenciales de prueba: ver [`USUARIOS_DEMO.md`](USUARIOS_DEMO.md)
>
> 🔑 Password común: `Password123!`

### 4. Frontend (React + Vite)

```bash
npm install
npm run build
```

### 5. Ejecutar

**Desarrollo (todo junto):**

```bash
composer dev
```

**O por separado:**

```bash
php artisan serve
npm run dev
```

Acceso: [http://127.0.0.1:8000](http://127.0.0.1:8000)

---

## 🏗️ Arquitectura del proyecto

```
├── app/                  # Backend Laravel (Models, Controllers, Services)
├── resources/js/         # Frontend React (Components, Pages, Hooks)
├── database/             # Migraciones y seeders
├── routes/               # API y rutas web
├── docs/                 # Documentación y screenshots
├── API_CONTRACT.md       # Contrato de API
├── ARCHITECTURE.md       # Arquitectura del sistema
├── INSTALACION.md        # Guía de instalación detallada
└── MIGRATIONS_NOTES.md   # Notas sobre migraciones
```

> Para detalles de la arquitectura interna, ver [`ARCHITECTURE.md`](ARCHITECTURE.md).
>
> Para el contrato de endpoints de la API, ver [`API_CONTRACT.md`](API_CONTRACT.md).

---

## 🚧 Roadmap

- [ ] Notificaciones en tiempo real (WebSockets / Broadcasting)
- [ ] Métricas y reportes exportables (PDF/Excel)
- [ ] Integración con correo electrónico para apertura automática de tickets
- [ ] Módulo de base de conocimiento (Knowledge Base)
- [ ] Soporte multi-idioma

---

## 📝 Documentación complementaria

| Documento | Descripción |
|-----------|-------------|
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Arquitectura general del sistema |
| [`API_CONTRACT.md`](API_CONTRACT.md) | Endpoints, métodos y respuestas de la API |
| [`INSTALACION.md`](INSTALACION.md) | Guía de instalación detallada |
| [`MIGRATIONS_NOTES.md`](MIGRATIONS_NOTES.md) | Notas y decisiones sobre migraciones |
| [`USUARIOS_DEMO.md`](USUARIOS_DEMO.md) | Credenciales y roles de usuarios de prueba |

---

## 🤝 Contribuciones

EkinDesk es un proyecto personal en desarrollo activo. Si encuentras algún bug o tienes una sugerencia, abre un [issue](https://github.com/TravisDev5x/ekindesk/issues).

---

## 📄 Licencia

Distribuido bajo la licencia MIT. Ver [`LICENSE`](LICENSE) para más información.

---

<p align="center">
  Desarrollado por <a href="https://github.com/TravisDev5x"><strong>Eric Rafael Pérez Hernández</strong></a>
  <br/>
  <sub>Analista de Soporte Técnico · Desarrollo Web en formación</sub>
</p>
