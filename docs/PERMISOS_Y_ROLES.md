# Permisos y roles: cómo se manejan y qué ve cada usuario

## 1. Modelo de datos (backend)

- **Spatie Laravel Permission**: los usuarios tienen **roles** (relación N:M) y los **roles** tienen **permisos** (N:M).
- Los permisos **no** se asignan directamente al usuario: el usuario tiene uno o más **roles**, y cada rol tiene una lista de **permisos**. Los permisos efectivos del usuario son la unión de los permisos de todos sus roles.
- **Tablas**: `users`, `roles`, `permissions`, `model_has_roles`, `role_has_permissions`. El usuario se vincula a roles por `model_has_roles`; el rol se vincula a permisos por `role_has_permissions`.

## 2. Qué recibe el frontend al autenticarse

En **login** y en **check-auth** el backend devuelve:

```json
{
  "user": { ...datos del usuario... },
  "roles": ["solicitante"],
  "permissions": ["tickets.create", "tickets.view_own"]
}
```

- **roles**: nombres de los roles asignados al usuario.
- **permissions**: nombres de **todos** los permisos que tiene el usuario a través de sus roles (`$user->getAllPermissions()->pluck('name')`).

Si el usuario **no tiene ningún rol**, `roles` y `permissions` serán arrays vacíos.

## 3. Cómo decide el frontend qué módulos mostrar

- El **AuthContext** guarda `user`, `roles` y `permissions` y expone:
  - **`can(permission)`**: devuelve `true` si `permissions` incluye ese permiso.
  - **`hasRole(role)`**: devuelve `true` si `roles` incluye ese rol.
- El **sidebar (AppLayout)** usa solo **permisos** para mostrar u ocultar enlaces:
  - **Tickets** en el menú: `can('tickets.manage_all') || can('tickets.view_area')`. Si el usuario solo tiene `tickets.create` y `tickets.view_own` (solicitante), **no** ve el módulo "Tickets" y solo ve Inicio + su dashboard con crear/gestionar sus tickets.
  - **Incidencias**: `can('incidents.view_own') || can('incidents.view_area') || can('incidents.manage_all')`.
  - **Usuarios**: `can('users.manage')`.
  - **Catálogos** (Prioridades, Estados, Tipos, Áreas, etc.): `can('catalogs.manage') || can('tickets.view_area') || can('tickets.manage_all')`.
- **Dashboard**: si el usuario tiene solo `tickets.create` o `tickets.view_own` (y no `tickets.view_area` ni `tickets.manage_all`), se muestra el **dashboard solicitante** (inicio con crear ticket, calendario, mis tickets, actividad reciente). En caso contrario se muestra el **dashboard operativo** (métricas, filtros, etc.).
- Las **rutas** (Tickets, Incidents, Users, etc.) están definidas para todos los usuarios autenticados; lo que cambia es qué enlaces del menú se muestran y qué responde la API (véase siguiente punto).

## 4. Cómo se protegen las APIs (backend)

- Casi todas las rutas de la API están dentro de grupos con **middleware**:
  - **`auth:sanctum`**: exige usuario autenticado.
  - **`perm:nombre_permiso`** (o `perm:permiso1|permiso2`): exige que el usuario tenga **al menos uno** de esos permisos (o rol **admin**, o condiciones especiales de arranque).
- Ejemplos:
  - **Usuarios** (CRUD): `perm:users.manage` → solo quien tenga ese permiso (típicamente admin/gestor).
  - **Tickets** (listado, crear, detalle, etc.): `perm:tickets.manage_all|tickets.view_area|tickets.view_own|tickets.create` → quien tenga alguno de esos puede entrar al grupo; luego cada acción (ver listado, crear, ver uno) se refina con **Policies** (por ejemplo solo ver “mis” tickets si solo tiene `view_own`).
  - **Incidencias**: `perm:incidents.manage_all|incidents.view_area|incidents.view_own|incidents.create`.
  - **Catálogos** (editar): `perm:catalogs.manage`.
- Si el usuario **no tiene** el permiso requerido (y no es admin ni está en las excepciones del middleware), la API responde **403 No autorizado**.
- **Rol admin**: el middleware `EnsurePermissionOrAdmin` permite acceso si el usuario tiene el rol **admin**, aunque no tenga el permiso concreto. Así un rol “admin” puede tener acceso amplio sin tener que asignar cada permiso a mano.

## 5. Flujo cuando el usuario no tiene rol

1. **Registro / alta**: el usuario puede quedar en estado **`pending_admin`** (o `pending_email` si tiene email y hay verificación). En ese momento normalmente **no tiene ningún rol** asignado.
2. **Login**: si el estado es `pending_admin`, el backend **sí permite** el login (solo bloquea `pending_email` y `blocked`). Devuelve `user`, `roles: []`, `permissions: []`.
3. **Frontend**:
   - `can('cualquier.permission')` → **false** para todo.
   - El sidebar solo muestra lo que no depende de permisos (por ejemplo **Inicio**, **Configuración**, **Perfil**). No se muestran Tickets, Incidencias, Usuarios ni Catálogos.
   - Al entrar a **Inicio**, el layout muestra un **overlay** (“Bienvenido. Un administrador asignará un rol a tu cuenta…”) porque `user.status === 'pending_admin'`. El usuario puede cerrar sesión pero no acceder a módulos restringidos.
4. **APIs**: si un usuario sin permisos intenta llamar a una ruta protegida con `perm:...`, el backend responde **403**. Por tanto aunque escriba la URL a mano, no verá datos de otros módulos.
5. **Asignación de rol**: un administrador entra en **Usuarios**, edita al usuario y le asigna un **rol** (y opcionalmente pasa su estado a `active`). Al guardar, si el usuario estaba en `pending_admin` y ahora tiene al menos un rol, se puede actualizar su estado (según lógica en `UserController` / `UserRoleController`).
6. **Actualización en el cliente**:
   - El layout hace **refresh del usuario cada 25 s** mientras `status === 'pending_admin'`, así cuando un admin le asigne un rol, en poco tiempo el frontend recibirá el nuevo `roles` y `permissions` y el overlay desaparecerá; el menú se actualizará y el usuario verá los módulos que correspondan a su nuevo rol.

## 6. Resumen por tipo de usuario (según rol/permisos)

| Situación                         | roles / permissions     | Qué ve en el menú                    | Dashboard      | APIs de tickets/incidents      |
|----------------------------------|--------------------------|--------------------------------------|----------------|--------------------------------|
| Sin rol (pending_admin)          | [] / []                  | Solo Inicio, Config, Perfil, etc.     | Overlay espera | 403 en rutas con perm:...      |
| Rol “solicitante” (solo tickets) | view_own, create         | Inicio (no “Tickets” en menú)         | Dashboard solicitante | Crear/ver sus tickets, 403 en listado global si se fuerza |
| Rol con view_area / manage_all   | view_area o manage_all   | Inicio + Tickets (+ Incidents si aplica) | Dashboard operativo | Según policy (área, asignación, etc.) |
| Rol admin                        | admin + muchos permisos  | Todo lo permitido al rol             | Dashboard operativo | Bypass en middleware perm       |

En resumen: **el acceso a módulos depende del rol solo porque el rol es quien asigna los permisos**; el frontend y el backend usan **permisos** para decidir qué mostrar y qué permitir. Si el usuario no tiene rol, no tiene permisos y solo ve lo “público” del layout y recibe 403 en el resto.
