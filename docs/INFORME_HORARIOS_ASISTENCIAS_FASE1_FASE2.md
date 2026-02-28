# Informe: Catálogo Modular de Horarios y Control de Asistencias

## FASE 1 — Análisis del Sistema Actual

### 1.1 Modelos principales

| Modelo | Tabla | Descripción |
|--------|--------|-------------|
| **User** | `users` | Usuarios del sistema. Soft deletes, Spatie Permission (HasRoles), verificación de email. |
| **Area** | `areas` | Áreas/departamentos. `name`, `is_active`. Relación: `hasMany(User)`. |
| **Campaign** | `campaigns` | Campañas. `name`, `is_active`. Relación: `hasMany(User)`. |
| **Position** | `positions` | Puestos. `name`, `is_active`. Relación: `hasMany(User)`. |
| **Sede** | `sites` | Sedes (tabla `sites`). `name`, `code`, `type` (physical | virtual), `is_active`. Relación: `hasMany(User)`. |
| **Ubicacion** | `locations` | Ubicaciones dentro de sedes. `sede_id`, `name`, `code`, `is_active`. Relación: `belongsTo(Sede)`, `hasMany(User)`. |
| **Role** | `roles` | Roles (Spatie). Soft deletes. Relación many-to-many con User vía `model_has_roles`. |

**En este proyecto no existe un modelo “Department”:** el equivalente funcional es **Area** (áreas/departamentos).

### 1.2 Estructura del modelo User

- **Identidad:** `employee_number` (único), `first_name`, `paternal_last_name`, `maternal_last_name`, `email`, `phone`, `name` (accessor).
- **Relaciones organizativas (FK nullable salvo posiblemente `sede_id`):**
  - `campaign_id` → Campaign  
  - `area_id` → Area  
  - `position_id` → Position  
  - `sede_id` → Sede (tabla `sites`)  
  - `ubicacion_id` → Ubicacion (tabla `locations`)
- **Otros:** `status`, `theme`, `locale`, `availability`, `avatar_path`, preferencias de UI, soft deletes, blacklist.
- **Relaciones:** `campaign()`, `area()`, `position()`, `sede()`, `ubicacion()`, `roles` (Spatie).

La API de usuarios (`UserController::index`) devuelve usuarios con `campaign`, `area`, `position`, `sede`, `ubicacion` y `roles` cargados (eager loading). No hay lógica de horarios ni asistencias en el core actual.

### 1.3 Relaciones usuario ↔ área / campaña

- **Usuario → Área:** muchos usuarios por área (`User belongsTo Area`, `Area hasMany User`).
- **Usuario → Campaña:** muchos usuarios por campaña (`User belongsTo Campaign`, `Campaign hasMany User`).
- **Usuario → Sede / Ubicación:** `User belongsTo Sede` y `User belongsTo Ubicacion`; sedes y ubicaciones ya están pensadas para organización física.

No hay tablas intermedias ni polimorfismo hoy entre usuarios y estos catálogos; solo FKs directas en `users`.

### 1.4 Asistencias y horarios existentes

- **No existe** en el proyecto ningún módulo de control de asistencias (entradas/salidas, punches, registros por día).
- **Sigua (módulo aparte):** en `sigua_empleados_rh` hay un campo `horario` (string, nullable) usado como dato de importación; no es un motor de horarios ni está vinculado a `users` ni a catálogos de horarios del helpdesk.

### 1.5 Resumen Fase 1

- **Entidades a considerar para asignación de horarios:** User, Area (departamento), Campaign (campañas temporales). Sede/Ubicacion son opcionales como segundo nivel de asignación si se desea.
- **Base actual:** FKs en `users` a campaigns, areas, positions, sites, locations; sin modelos ni tablas de horarios o asistencias.
- **Patrón ya usado:** Spatie Permission usa tablas polimórficas (`model_has_roles`, `model_has_permissions`) con `model_type` + `model_id`; el mismo patrón es viable para `scheduleables`.

---

## FASE 2 — Evaluación de Riesgos y Plan de Compatibilidad

### 2.1 Riesgos potenciales

1. **Rendimiento y N+1 al resolver el horario del día**
   - Si la resolución del horario sigue una jerarquía (ej. usuario → área → campaña → horario por defecto) y se hace en un loop (listados, reportes), cada consulta por usuario puede disparar varias consultas (morph, schedule, schedule_days).
   - **Mitigación:** Resolver el horario en una capa de servicio/repositorio con eager loading de `scheduleables` (con `schedule` y `scheduleDays`), o cachear por usuario/fecha (ej. clave `user:{id}:schedule:{date}`) con TTL corto. Evitar consultas en bucles sin precarga.

2. **Integridad con datos existentes**
   - Usuarios, áreas y campañas ya existen sin ninguna referencia a horarios. Cualquier lógica que asuma “siempre hay un horario” fallará hasta que exista un horario por defecto y se asigne (o se use fallback en código).
   - **Mitigación:** Horario “Por defecto” en BD + política en código: si no hay asignación polimórfica vigente para la fecha, usar ese horario por defecto (y opcionalmente registrar en logs para auditoría).

3. **Zona horaria y fechas**
   - `work_date`, `valid_from`, `valid_until` y los timestamps de punches deben ser consistentes (timezone de la aplicación o del usuario). Si más adelante se permite multi-timezone, habrá que definir si `work_date` es por sede o por usuario.
   - **Mitigación:** Definir desde el inicio timezone (ej. `config('app.timezone')`) y usar Carbon/DateTime en servidor; en la Fase 3 considerar campo `timezone` en User o Sede si se necesita.

4. **Permisos y auditoría**
   - Nuevos endpoints (registro de punches, consulta de horarios/asistencias) deben integrarse con el sistema de permisos existente (Spatie) y, si aplica, con logs de auditoría.
   - **Mitigación:** Crear permisos específicos (ej. `attendances.record_own`, `attendances.view_own`, `attendances.manage`) y usarlos en controladores y middleware; no reutilizar solo permisos genéricos de “users” para no mezclar responsabilidades.

5. **Sede obligatoria en Users**
   - La migración actual de `sites` añade `sede_id` a `users` sin `nullable`. Si en algún entorno se relajó a nullable, la lógica de “horario por sede” debe contemplar `sede_id` nulo.
   - **Mitigación:** En la resolución del horario, si se usa nivel “Sede”, comprobar `user->sede_id` antes de buscar asignación por sede.

### 2.2 Plan de retrocompatibilidad

- **Horario por defecto obligatorio**
  - Crear en seed/migración un registro en `schedules` (ej. nombre “General” o “Por defecto”, `is_active = true`) con sus `schedule_days` (ej. L–V con mismo bloque de entrada/salida/comida).
  - No crear filas en `scheduleables` para ese horario; se usará solo cuando no exista asignación vigente.

- **Resolución del horario para un usuario en una fecha**
  1. Buscar en `scheduleables` una asignación vigente para esa fecha donde:
     - `scheduleable_type` = `App\Models\User` y `scheduleable_id` = user.id, **o**
     - `scheduleable_type` = `App\Models\Area` y `scheduleable_id` = user.area_id (si existe), **o**
     - `scheduleable_type` = `App\Models\Campaign` y `scheduleable_id` = user.campaign_id (si existe).
  2. Orden de prioridad sugerido: **Usuario > Área > Campaña** (asignación más específica gana). Si se quiere “Sede” en el futuro, definir si va antes o después de Area/Campaign.
  3. Si no hay ninguna asignación vigente para esa fecha, devolver el **horario por defecto** (id fijo o por nombre “Por defecto”).
  4. Nunca devolver `null` en la capa de negocio: siempre un objeto Schedule (real o por defecto).

- **APIs y UI**
  - Endpoints que devuelvan “horario del día” o “expectativa de entrada/salida” deben devolver siempre un objeto coherente (ej. con `schedule_id` y `schedule_days` o un DTO aplanado); si el horario es el por defecto, puede incluirse un flag `is_default` para que el frontend lo muestre sin confusión.

### 2.3 Propuesta de arquitectura de base de datos

- La estructura que propones es adecuada y se integra bien con el código actual. Se recomienda mantenerla con las siguientes precisiones y una pequeña extensión.

**Tablas propuestas (confirmadas y ajustes)**

| Tabla | Comentario |
|-------|------------|
| **schedules** | `id`, `name`, `is_active`, `timestamps`. Correcto. |
| **schedule_days** | `id`, `schedule_id`, `day_of_week` (0–6 o 1–7 según convención), `is_working_day`, `expected_clock_in`, `expected_lunch_start`, `expected_lunch_end`, `expected_clock_out`, `tolerance_minutes`, `timestamps`. Usar tipos `time` o equivalentes para los campos de hora. Índice en `(schedule_id, day_of_week)`. |
| **scheduleables** (polimórfica) | `id`, `schedule_id`, `scheduleable_type`, `scheduleable_id`, `valid_from` (date), `valid_until` (date, nullable). Índices: `(scheduleable_type, scheduleable_id)`, `(valid_from, valid_until)`, y opcionalmente `(schedule_id)`. Permite asignar un mismo horario a User, Area o Campaign con vigencia temporal. |
| **attendances** | `id`, `user_id`, `work_date` (date), `clock_in`, `lunch_start`, `lunch_end`, `clock_out` (todos nullable para no obligar a registrar todos los eventos el mismo día). Recomendable: `timestamps` y índice único `(user_id, work_date)` para un registro por usuario por día. |

**Ajustes recomendados**

1. **Nombres de tablas**
   - En Laravel, la convención para la tabla polimórfica suele ser un nombre que describa la relación. En lugar de solo `scheduleables`, se puede usar:
     - `schedule_assignments` (o `schedule_scheduleables`) para dejar claro que es “asignación de horario a entidad”. La estructura de columnas sigue siendo polimórfica (`scheduleable_type`, `scheduleable_id`). Si prefieres mantener el nombre `scheduleables`, es válido; solo asegurar índices y FKs.

2. **Foreign keys**
   - `schedule_days.schedule_id` → `schedules.id` (onDelete cascade).
   - `scheduleables.schedule_id` → `schedules.id` (onDelete restrict o cascade según regla de negocio).
   - `attendances.user_id` → `users.id` (onDelete restrict o cascade según si quieres borrar asistencias al borrar usuario).

3. **Tipos de datos**
   - Horas esperadas: `time` o string en formato “H:i”.
   - Registros de punch: `datetime` o `timestamp` para tener fecha y hora; `work_date` como `date` para consultas y unicidad.

4. **Extensión opcional (Fase 3 o posterior)**
   - Si más adelante se asigna horario por **Sede**, basta con que `scheduleable_type` pueda ser `App\Models\Sede` y que existan filas en `scheduleables` para `sede_id`; no hace falta cambiar el esquema.

**Conclusión:** La arquitectura propuesta es óptima para tu código actual. Con el horario por defecto y la resolución en orden Usuario → Área → Campaña → Por defecto, se mantiene retrocompatibilidad y se evita que la aplicación falle cuando aún no existan asignaciones en `scheduleables`.

---

## Resumen de entregables

- **Fase 1:** Análisis de modelos (User, Area, Campaign, Position, Sede, Ubicacion, Role), relaciones usuario–área–campaña y comprobación de que no existe módulo de asistencias/horarios en el core (solo campo `horario` en Sigua).
- **Fase 2:** Riesgos (N+1, datos existentes, timezone, permisos, sede nullable); plan de retrocompatibilidad (horario por defecto + resolución jerárquica sin devolver nunca `null`); y validación de la arquitectura de BD con ajustes menores (nombres, índices, tipos y tabla polimórfica).

Cuando apruebes este plan, se puede proceder a la **Fase 3** (implementación: migraciones, seeders, modelos, lógica de controlador y componentes base en React) en el orden que indicaste.
