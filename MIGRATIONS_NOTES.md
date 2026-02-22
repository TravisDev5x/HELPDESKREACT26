# Migraciones RBAC (Spatie) - Notas de compatibilidad

Este proyecto usa **Spatie Permission** como unica fuente de verdad para RBAC.
Las tablas activas son: `roles`, `permissions`, `model_has_roles`, `model_has_permissions`, `role_has_permissions`.

## Migraciones legacy

- `2026_01_10_000353_create_roles_table.php`
  - Tabla `roles` pre-Spatie con `slug` y `softDeletes` (se mantiene).
  - La migracion de Spatie agrega `guard_name` si falta y normaliza indices.

- `2026_01_10_003529_create_role_user_table.php`
  - Tabla legacy `role_user` (antes de Spatie).
  - En instalaciones nuevas se **omite** su creacion cuando Spatie esta disponible.
  - En instalaciones existentes no se elimina para evitar perdida de datos.

- `2026_01_24_201500_backfill_model_has_roles.php`
  - Migra asignaciones desde `role_user` a `model_has_roles` si aplica.

## Duplicaciones defensivas

- `2026_01_24_200855_create_permission_tables.php`
  - Contiene la creacion oficial de tablas Spatie.
  - Se mantiene como fuente de verdad.

- `2026_01_24_210500_create_model_has_roles_if_missing.php`
  - Parche defensivo: crea `model_has_roles` solo si falta.

## Garantias

- `migrate` en produccion: no toca tablas existentes fuera de los checks de compatibilidad.
- `migrate:fresh` en entornos nuevos: crea solo tablas Spatie (sin `role_user`).
