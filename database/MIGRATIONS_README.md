# Migraciones – Helpdesk

## Conjunto consolidado (inglés)

Las migraciones están **consolidadas** y usan **nombres en inglés**:

| Archivo | Descripción |
|---------|-------------|
| `2026_02_17_100001_create_cache_table.php` | Cache y cache_locks |
| `2026_02_17_100002_create_jobs_table.php` | Jobs, job_batches, failed_jobs |
| `2026_02_17_100003_create_catalogs_and_users_schema.php` | campaigns, areas, positions, users, sessions, blacklist_logs |
| `2026_02_17_100004_create_sites_table.php` | sites (antes sedes) + sede_id en users |
| `2026_02_17_100005_create_locations_table.php` | locations (antes ubicaciones) + ubicacion_id en users |
| `2026_02_17_100006_create_personal_access_tokens_table.php` | Sanctum |
| `2026_02_17_100007_create_email_verification_tokens_table.php` | Verificación de email |
| `2026_02_17_100008_create_permission_tables.php` | Spatie: permissions, roles, pivotes |
| `2026_02_17_100009_seed_roles_and_permissions.php` | Rol admin y permisos |
| `2026_02_17_100010_create_ticket_catalogs_and_tickets.php` | priorities, ticket_states, ticket_types, tickets, ticket_histories, ticket_area_access |
| `2026_02_17_100011_create_notifications_table.php` | Notificaciones Laravel |
| `2026_02_17_100012_create_admin_notifications_table.php` | Admin notifications |
| `2026_02_17_100013_create_incident_tables.php` | incident_types, incident_severities, incident_statuses, incidents, incident_attachments, incident_histories |
| `2026_02_17_100014_seed_incident_permissions.php` | Permisos de incidencias para admin |

## Tablas en inglés

- **sites** (equivalente a sedes)
- **locations** (equivalente a ubicaciones)

Los nombres de columna **sede_id** y **ubicacion_id** se mantienen en users, tickets e incidents para no romper la API. Los modelos `Sede` y `Ubicacion` usan `$table = 'sites'` y `$table = 'locations'`.

## Uso

**Instalación nueva:**

```bash
php artisan migrate
```

**Recrear base de datos:**

```bash
php artisan migrate:fresh
```
