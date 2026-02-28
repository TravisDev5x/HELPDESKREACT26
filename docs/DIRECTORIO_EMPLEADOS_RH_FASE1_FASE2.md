# Directorio de Empleados y Gestión de Bajas RH (TimeDesk) — Fase 1 y Fase 2

**Fecha:** 27/02/2026  
**Rol:** Arquitecto de Software / Desarrollador Full Stack Senior (Laravel + React)  
**Alcance:** Análisis del motor de bajas actual y propuesta arquitectónica para RH, con regla **Cero Hardcodeo** y reutilización del módulo de Usuarios.  
**Fase 3 (implementación):** pendiente de aprobación.

---

## Reglas críticas del sistema

1. **No reescribir la lógica central:** El módulo de Usuarios ya gestiona bajas individuales, bajas masivas y blacklist. Consumir y extender; no duplicar.
2. **Cero hardcodeo:** Todo lo catalogable debe tener catálogo en BD. Sin ENUMs fijos ni listas quemadas para conceptos de negocio.

---

## FASE 1: Análisis del motor de bajas actual

### 1.1 Modelo `User` y columnas relevantes

| Origen | Archivo |
|--------|---------|
| Modelo | `app/Models/User.php` |

- **Traits:** `HasFactory`, `Notifiable`, **`SoftDeletes`**, `HasRoles`, `SiguaRelations`.
- **Columnas relevantes para bajas y listas negras:**

| Columna | Tipo | Uso |
|---------|------|-----|
| `deleted_at` | timestamp (SoftDeletes) | Marca la baja: usuario “dado de baja” sigue en BD pero excluido por defecto de consultas. |
| `status` | string | Ciclo de vida de la **cuenta**: `pending_email`, `pending_admin`, `active`, `blocked`. No indica baja laboral; la baja se refleja con `deleted_at`. |
| `deletion_reason` | text, nullable | Motivo de baja en texto libre. **Solo se escribe en baja masiva** (`massDestroy`); en baja individual (`destroy`) no se actualiza. |
| `is_blacklisted` | boolean | Vetado; bloquea login y se audita en `blacklist_logs`. |

`deletion_reason` **no** está en `$fillable`; se actualiza con `User::whereIn(...)->update(['deletion_reason' => $request->reason])` antes del `delete()`.

**No existe en el esquema actual:** motivo de baja catalogado (FK a catálogo) ni fecha efectiva de baja (`termination_date`).

### 1.2 Procesamiento técnico de las bajas

| Acción | Método / Ruta | Comportamiento técnico |
|--------|----------------|-------------------------|
| **Baja individual** | `destroy(User $user)` — `DELETE /api/users/{id}` | `$user->delete()` → solo SoftDelete. **No** se guarda `deletion_reason` ni motivo de RH. |
| **Baja masiva** | `massDestroy` — `POST /api/users/mass-delete` | Valida `ids` + `reason` (mín. 5 caracteres). `update(['deletion_reason' => $request->reason])` sobre los IDs, luego `delete()` (SoftDelete). |
| **Blacklist (vetar)** | `toggleBlacklist` — `POST /api/users/blacklist` | `update(['is_blacklisted' => true|false])` + insert en `blacklist_logs` (user_id, admin_id, action, reason). No modifica `deleted_at`. |
| **Restaurar** | `restore($id)` — `POST /api/users/{id}/restore` | `User::onlyTrashed()->findOrFail($id)->restore()` → limpia `deleted_at`. |
| **Eliminar permanente** | `forceDelete($id)` — `DELETE /api/users/{id}/force` | `forceDelete()` sobre el registro en papelera. |

Resumen: la “baja” en el sistema es **exclusivamente SoftDelete** (`deleted_at`). El motivo en texto libre solo se persiste en baja masiva; no hay catálogo de motivos ni fecha de baja.

### 1.3 Interacción con Blacklist

- **Login:** En `AuthController`, si `$user->is_blacklisted` → respuesta 403 y mensaje de cuenta vetada.
- **Independencia:** Blacklist es independiente de la baja. Un usuario puede estar vetado y no dado de baja, o dado de baja y no vetado.
- **Auditoría:** `blacklist_logs` registra cada add/remove con motivo y admin.

La gestión de bajas RH no debe reimplementar la blacklist; puede limitarse a disparar la baja técnica existente y opcionalmente definir política (ej. “al dar de baja desde RH también vetar”) en un solo lugar.

### 1.4 Listado de usuarios activos vs inactivos (backend)

- **Endpoint:** `GET /api/users` — `UserController::index`.
- **Filtro “papelera”:**
  - `status=only` (query) → `$query->onlyTrashed()` → solo registros con `deleted_at` no null (bajas).
  - Sin `status=only` → por defecto Eloquent excluye trashed → solo **activos**.
- **Otros parámetros:** `search`, `campaign`, `area`, `role_id`, `sede`, `ubicacion`, `per_page`, `sort`, `direction`. El parámetro `user_status` se envía desde el front pero **no se aplica en el backend** en el código actual.
- **Respuesta:** cada ítem incluye `id`, `name`, `employee_number`, `email`, relaciones (campaign, area, position, sede, ubicacion, roles), `status`, `is_blacklisted`, `deleted_at`. **No** se expone `deletion_reason` en el listado.

Conclusión: la separación Activos / Bajas se hace con el mismo endpoint variando `status=only`; no hay endpoint específico “solo RH”.

---

## FASE 2: Propuesta arquitectónica para Recursos Humanos

### 2.1 Catálogo de motivos de baja (Cero Hardcodeo)

Para cumplir la regla de **cero hardcodeo**, el motivo de baja debe ser un **catálogo en base de datos**, no un ENUM ni lista fija en código.

**Nueva tabla y modelo: `termination_reasons` / `TerminationReason`**

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | bigint PK | |
| `name` | string | Nombre para listados y selects (ej. "Renuncia", "Abandono", "Despido", "Término de contrato"). |
| `description` | text nullable | Descripción opcional para ayuda o reportes. |
| `is_active` | boolean default true | Permite desactivar motivos sin borrarlos (integridad histórica). |
| `timestamps` | | |

**Modelo:** `App\Models\TerminationReason` con scope `active()` para listados. CRUD de catálogo protegido por permiso (ej. `termination_reasons.manage` o reutilizar un permiso de catálogos/TimeDesk).  
**Seed inicial:** valores típicos (Renuncia, Abandono, Despido, Término de contrato, Otro) insertados por seeder; el negocio puede ampliar o desactivar sin tocar código.

Así, la interfaz de RH consumirá siempre el catálogo dinámico (API de termination_reasons) y no tendrá opciones fijas en front ni backend.

### 2.2 Extensión de datos del empleado: ¿en `users` o en `employee_profiles`?

Se necesita guardar para cada baja (o potencialmente para el expediente del empleado):

- `termination_reason_id` (FK a `termination_reasons`, nullable).
- `termination_date` (date nullable, fecha efectiva de baja).

**Opción A — Columnas en `users`**

- Añadir en `users`: `termination_reason_id` (FK nullable), `termination_date` (date nullable).
- Al dar de baja (desde RH o desde el módulo de Usuarios), rellenar estos campos cuando se disponga del motivo y la fecha (p. ej. solo cuando la baja se dispara desde la vista RH).

**Ventajas:** una sola tabla, consultas simples, mismo registro que ya tiene `deleted_at` y `deletion_reason`; fácil incluir en el mismo `index` de usuarios (with/append).  
**Desventajas:** la tabla `users` sigue creciendo con campos de dominio RH; si más adelante se añaden más datos de expediente (fecha ingreso, tipo de contrato, etc.) habría que seguir ampliando `users`.

**Opción B — Tabla `employee_profiles` (1:1 con `users`)**

- Nueva tabla `employee_profiles`: `id`, `user_id` (unique), `termination_reason_id` (nullable), `termination_date` (nullable), y opcionalmente otros campos de RH (fecha_ingreso, etc.).
- Relación en `User`: `hasOne(EmployeeProfile::class)`.

**Ventajas:** separación clara entre “cuenta de sistema” y “expediente de empleado”; muy extensible para más datos de RH sin tocar `users`.  
**Desventajas:** un JOIN (o carga eager) más en listados y en el flujo de baja; si por ahora solo se necesitan motivo y fecha de baja, puede parecer exceso.

**Recomendación**

- Si el producto va a crecer en datos de empleado (fecha ingreso, tipo de contrato, etc.), **Opción B** es más limpia y escalable.
- Si el alcance se limita a motivo y fecha de baja y se prioriza mínimo cambio y máxima reutilización del listado actual, **Opción A** es suficiente.

En ambos casos el flujo de baja técnica existente (SoftDelete + `deletion_reason` opcional) se mantiene; solo se **complementa** con `termination_reason_id` y `termination_date` cuando la baja se dispara desde la vista de Directorio/Gestión de Bajas RH.

### 2.3 Adaptación del flujo: RH dispara la baja técnica e inyecta motivo y fecha

Objetivo: un solo motor de baja (SoftDelete); la interfaz RH solo enriquece el request con datos de expediente.

**Backend (extensión, no reescritura):**

1. **Baja individual**  
   - En `UserController::destroy` (o en un método interno compartido), aceptar en el request (body o query) parámetros opcionales: `termination_reason_id`, `termination_date`, y opcionalmente `reason` (texto libre → `deletion_reason`).  
   - Si vienen presentes: actualizar el usuario (o su `employee_profile`) con `termination_reason_id` y `termination_date` y, si se envía `reason`, `deletion_reason`.  
   - Luego ejecutar la baja técnica existente: `$user->delete()`.

2. **Baja masiva**  
   - En `UserController::massDestroy`, aceptar opcionales `termination_reason_id` y `termination_date` (y mantener `reason` para `deletion_reason`).  
   - Para cada ID: actualizar usuario (o perfil) con motivo y fecha de baja y `deletion_reason`; luego aplicar `delete()` como hoy (por ejemplo en un bucle o manteniendo el `whereIn` + `delete()` actual, pero asegurando que antes se haga el update de los nuevos campos por cada usuario si se usan perfiles).

3. **Validación:**  
   - `termination_reason_id`: `nullable|exists:termination_reasons,id` (y opcionalmente comprobar `is_active`).  
   - `termination_date`: `nullable|date`.

Así, la interfaz de RH solo envía esos campos adicionales al llamar a los mismos endpoints (`DELETE /api/users/{id}` y `POST /api/users/mass-delete`); no se crea un “baja RH” distinto que duplique lógica.

**Frontend RH (flujo “Procesar Baja”):**

- Modal “Procesar Baja” con:  
  - **Motivo de baja:** select que consuma `GET /api/termination-reasons` (o el catálogo incluido en un endpoint de catálogos existente) — solo ítems activos.  
  - **Fecha de baja:** date picker (default hoy).  
  - **Motivo (texto):** textarea opcional, mapeado a `reason` para `deletion_reason`.  
- Al confirmar:  
  - Baja individual: `DELETE /api/users/{id}` con body (o query) `termination_reason_id`, `termination_date`, `reason`.  
  - Baja masiva: `POST /api/users/mass-delete` con `ids`, `reason`, `termination_reason_id`, `termination_date`.  
El backend, al recibir estos datos, los persiste (en `users` o en `employee_profiles`) y luego ejecuta la misma lógica actual de baja.

### 2.4 Vistas React: Directorio de Empleados y Gestión de Bajas (TimeDesk)

**Viabilidad:** sí, alineado con el resto del proyecto y con la regla de cero hardcodeo.

**Estructura propuesta:**

- **Ruta:** `/timedesk/employees` (o `/timedesk/employees/index` si se prefiere índice explícito).  
- **Componente:** `resources/js/Pages/TimeDesk/Employees/Index.jsx` (o `Employees.jsx` bajo `TimeDesk`), protegido por el mismo `TimeDeskGuard` y permisos de TimeDesk (ej. `attendances.manage` / `attendances.view_all`).

**Contenido de la vista:**

1. **Pestañas:** “Activos” y “Bajas”.  
   - **Activos:** `GET /api/users` sin `status=only` (y opcionalmente filtros por campaña, área, etc., si se exponen en la misma API).  
   - **Bajas:** `GET /api/users?status=only`.  
   En Fase 3, si el backend incluye en la respuesta `termination_reason_id`, `termination_date` (y nombre del motivo vía relación o en el payload), la pestaña “Bajas” puede mostrar motivo y fecha de baja.

2. **Acción “Procesar Baja”:**  
   - Botón por fila (y opcionalmente selección múltiple + “Procesar Baja” masivo).  
   - Al hacer clic: abrir **Modal** que:  
     - Cargue el **catálogo dinámico** de motivos: `GET /api/termination-reasons` (o equivalente en catálogos) — solo activos.  
     - Muestre: select de motivo (obligatorio desde RH), date de fecha de baja (obligatorio), y campo de motivo en texto libre (opcional, para `deletion_reason`).  
   - Al confirmar: llamar a `DELETE /api/users/{id}` o `POST /api/users/mass-delete` con `termination_reason_id`, `termination_date` y `reason`; el backend actualizado guardará los datos de RH y ejecutará la baja existente.

3. **Sidebar:** bajo el módulo TimeDesk, ítem “Directorio de Empleados” (o “Empleados” / “Gestión de Bajas”) con enlace a `/timedesk/employees`, visible para quienes tengan permiso de TimeDesk.

No se reimplementa la gestión completa de usuarios: esta vista es un **listado orientado a RH + acción “Procesar Baja”** que consume la misma API de usuarios y el catálogo dinámico de motivos, sin listas fijas en código.

---

## Resumen para decisión

| Tema | Conclusión |
|------|------------|
| Motor de bajas actual | SoftDelete + `deletion_reason` solo en baja masiva; sin motivo catalogado ni fecha de baja. |
| Blacklist | Independiente de la baja; no es necesario tocarla para RH. |
| Motivo de baja | Catálogo en BD: tabla `termination_reasons`, modelo `TerminationReason` (id, name, description, is_active). Cero hardcodeo. |
| Dónde guardar motivo y fecha RH | Opción A: columnas en `users`. Opción B: tabla `employee_profiles` 1:1. Elección según extensión futura de datos de empleado. |
| Flujo RH | Misma baja (destroy / massDestroy); request enriquecido con `termination_reason_id`, `termination_date` y opcionalmente `reason`; backend persiste y ejecuta la baja actual. |
| Vista TimeDesk/Employees | Viable: `TimeDesk/Employees/Index.jsx`, pestañas Activos/Bajas, modal “Procesar Baja” que consume catálogo dinámico de TerminationReasons y llama a la API existente. |

Cuando apruebes esta propuesta (incluida la elección A vs B para almacenar motivo y fecha), se puede pasar a la **Fase 3**: CRUD del catálogo, migraciones, extensión del controlador y vistas en React.
