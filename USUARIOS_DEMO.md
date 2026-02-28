# Usuario administrador (FullDemoSeeder mínimo)

El seed por defecto crea **un solo usuario administrador** y la configuración base de catálogos, roles y sedes.

## Credenciales del administrador

| Campo | Valor |
|-------|--------|
| **Correo** | `admin@helpdesk.local` |
| **Número de empleado** | `ADMIN001` |
| **Contraseña** | `AdminHelpdesk2025!` |

## Roles creados (4)

| Rol | Descripción |
|-----|-------------|
| **admin** | Todos los permisos (helpdesk + SIGUA). |
| **soporte** | Ver área, comentar, cambiar estado, asignar tickets, filtrar por sede. |
| **usuario** | Crear tickets y ver los propios. |
| **consultor** | Ver por área y ver propios. |

## Sedes (3)

- **Tlalpan** (código: TLALPAN)
- **Vallejo** (código: VALLEJO)
- **Toledo** (código: TOLEDO)

## Cómo ejecutar el seeder

Con migraciones ya ejecutadas:

```bash
php artisan db:seed --class=FullDemoSeeder
```

Para vaciar la base y volver a migrar + sembrar todo:

```bash
php artisan migrate:fresh --seed
```

## Qué genera el seeder

- **Catálogos**: campaña General, áreas (Sistemas / TI, Soporte, Operaciones), puestos (Usuario Final, Soporte, Supervisor), las 3 sedes anteriores, prioridades y estados de ticket, tipos de ticket básicos.
- **Roles y permisos**: admin, soporte, usuario, consultor (permisos de helpdesk; los de SIGUA se añaden con `SiguaPermissionsSeeder`).
- **1 usuario**: administrador con rol `admin` y sede Tlalpan.
- **SIGUA**: permisos y configuración base se cargan con `SiguaPermissionsSeeder` y `SiguaConfiguracionSeeder` desde `DatabaseSeeder`.

No se generan usuarios demo masivos ni tickets de ejemplo.
