# Importación y Exportación Excel/CSV — Módulo RH (TimeDesk)
## Fase 1: Análisis de Requisitos y Formato Maestro | Fase 2: Propuesta Arquitectónica

**Fecha:** 27/02/2026  
**Rol:** Arquitecto de Software / Desarrollador Full Stack Senior (Laravel, React, Maatwebsite/Laravel-Excel)  
**Regla crítica:** CERO HARDCODEO — todo concepto de negocio debe ser catálogo.  
**Fase 3 (implementación):** pendiente de aprobación explícita del cliente.

---

## FASE 1: Análisis de Requisitos y Formato Maestro

### 1.1 Integración de Maatwebsite/Laravel-Excel en el proyecto

**Estado actual:**

- El proyecto **no** tiene instalado `maatwebsite/excel`. En `composer.json` solo figura **`phpoffice/phpspreadsheet`** (^5.4).
- En el módulo SIGUA se usa PhpSpreadsheet **directamente** en `App\Services\Sigua\ImportacionService`: método `leerExcel()` con `IOFactory::load()` y `$sheet->toArray()`, sin clases Import/Export de Laravel Excel.
- Para **TimeDesk/RH** se recomienda integrar **Maatwebsite/Laravel-Excel** porque:
  - Permite clases `EmployeeImport` y `EmployeeExport` reutilizables, testeables y encolables.
  - Unifica validación por fila, manejo de errores y reporte (failures).
  - Export con estilos, cabeceras y formato idéntico al maestro sin duplicar lógica de escritura.
  - Compatible con la dependencia ya existente (Laravel Excel usa PhpSpreadsheet por debajo).

**Acción propuesta (Fase 3):**

- `composer require maatwebsite/excel`
- Crear `App\Imports\TimeDesk\EmployeeImport` y `App\Exports\TimeDesk\EmployeeExport` (o equivalente bajo `App\Imports`/`App\Exports`) usando el contrato de Laravel Excel.
- Mantener el código actual de SIGUA sin obligación de migrarlo a Laravel Excel en esta etapa.

---

### 1.2 Formato maestro: columnas clave

El archivo a importar/exportar (Excel .xlsx y CSV) contempla las siguientes columnas:

| Columna en archivo   | Uso en sistema                                      |
|----------------------|-----------------------------------------------------|
| **FECHA DE INGRESO** | `employee_profiles.hire_date` (date)                |
| **SEDE**             | Texto → buscar en `sites.name` o `sites.code` → `users.sede_id` |
| **TIPO DE INGRESO**  | Texto → catálogo **HireType** (Nuevo Ingreso, Reingreso, etc.) |
| **NOMBRE COMPLETO**  | Dividir en `first_name`, `paternal_last_name`, `maternal_last_name` en `users` |
| **ÁREA**             | Texto → `areas.name` → `users.area_id`             |
| **CAMPAÑA**          | Texto → `campaigns.name` → `users.campaign_id`     |
| **PUESTO ESPECÍFICO**| Texto → `positions.name` → `users.position_id`     |
| **HORARIO**          | Texto → `schedules.name` → asignación en `schedule_assignments` |
| **ESTATUS**          | Texto → catálogo **EmployeeStatus** (Entrevista, Capacitación, Activo, etc.) |
| **JEFE INMEDIATO**   | Texto → buscar usuario por nombre → FK (ver Fase 2) |

Otras columnas posibles (número de empleado, email, etc.) se pueden añadir al mismo formato y mapear a `users.employee_number`, `users.email`, etc., según definición final del maestro.

---

### 1.3 Modelos actuales relevantes

Resumen de modelos y tablas que intervienen en el flujo Import/Export RH:

| Modelo            | Tabla               | Columnas / relaciones relevantes para el formato maestro |
|-------------------|---------------------|----------------------------------------------------------|
| **User**          | `users`             | `first_name`, `paternal_last_name`, `maternal_last_name`, `name` (sincronizado), `employee_number`, `email`, `campaign_id`, `area_id`, `position_id`, `sede_id` (FK a `sites`), `ubicacion_id` (FK a `locations`), `status` (ciclo de cuenta: pending_email, pending_admin, active, blocked), SoftDeletes. Relación `employeeProfile()` hasOne. |
| **EmployeeProfile** | `employee_profiles` | `user_id` (unique), `hire_date`, `termination_reason_id`, `termination_date`. **No existe:** `manager_id`, `employee_status_id`, `hire_type_id`. |
| **Area**          | `areas`             | `name`, `is_active`.                                      |
| **Campaign**      | `campaigns`         | `name`, `is_active`.                                      |
| **Position**      | `positions`         | `name`, `is_active`.                                      |
| **Sede**          | `sites`             | `name`, `code`, `type`, `is_active`. Modelo `Sede`, tabla `sites`. |
| **Ubicacion**     | `locations`          | `sede_id`, `name`, `code`, `is_active`.                   |
| **Schedule**      | `schedules`         | `name`, `is_active`. Asignación a User/Area/Campaign vía `schedule_assignments` (polimórfica). |
| **TerminationReason** | `termination_reasons` | Ya existe; usado en bajas (no en columnas del formato maestro de “directorio activo”). |

**Conclusión:** Para soportar el formato maestro hacen falta:

- Catálogos nuevos: **EmployeeStatus** y **HireType** (y su uso en perfil o usuario).
- Campo **Jefe Inmediato** → FK `manager_id` (ver Fase 2 dónde ubicarlo).
- Asignación de **Horario** al usuario vía `schedule_assignments` (ya existente).
- Mapeo de texto del archivo (SEDE, ÁREA, CAMPAÑA, etc.) a IDs mediante búsqueda por nombre/código en los catálogos.

---

## FASE 2: Propuesta Arquitectónica

### 2.1 Nuevos catálogos (Cero hardcodeo)

Todo concepto de negocio debe ser catálogo en BD; no ENUMs ni listas fijas en código.

#### 2.1.1 EmployeeStatus (estatus del empleado en RH)

Ejemplos de valor: *Entrevista*, *Capacitación*, *Activo*, *Baja*, *Suspendido*, etc.

| Columna    | Tipo             | Descripción |
|-----------|------------------|-------------|
| `id`      | bigint PK        |             |
| `name`    | string           | Nombre para listados y para matching en import (ej. "Activo", "Capacitación"). |
| `description` | text nullable | Uso en reportes o ayuda. |
| `is_active` | boolean default true | Desactivar sin borrar (integridad histórica). |
| `timestamps` |             |             |

- **Modelo:** `App\Models\EmployeeStatus` con scope `active()`.
- **Uso:** FK en expediente del empleado (recomendado en `employee_profiles.employee_status_id` para no mezclar con `users.status` que es estado de *cuenta*).
- **Seed:** valores iniciales según negocio (Entrevista, Capacitación, Activo, Baja, etc.); el cliente puede ampliar o desactivar sin tocar código.

#### 2.1.2 HireType (tipo de ingreso)

Ejemplos: *Nuevo Ingreso*, *Reingreso*, *Transferencia*, etc.

| Columna    | Tipo             | Descripción |
|-----------|------------------|-------------|
| `id`      | bigint PK        |             |
| `name`    | string           | Nombre para listados y matching en import. |
| `description` | text nullable | Opcional. |
| `is_active` | boolean default true | |
| `timestamps` |             |             |

- **Modelo:** `App\Models\HireType` con scope `active()`.
- **Uso:** FK en expediente: `employee_profiles.hire_type_id`.
- **Seed:** valores típicos (Nuevo Ingreso, Reingreso, etc.).

---

### 2.2 Jefe Inmediato: dónde modelar la relación jerárquica

**Opción A — `manager_id` en tabla `users`**

- Ventajas: una sola tabla, consultas simples (ej. listado de usuarios con jefe), fácil de exponer en API de usuarios.
- Desventajas: mezcla “cuenta de sistema” con “organigrama”; la tabla `users` sigue creciendo con dominio RH; semánticamente el jefe es una relación del *empleado* (expediente), no de la *cuenta*.

**Opción B — `manager_id` en tabla `employee_profiles`**

- Ventajas: coherente con la decisión ya documentada en `DIRECTORIO_EMPLEADOS_RH_FASE1_FASE2.md` (datos de expediente en `employee_profiles`); separación clara entre identidad/cuenta (`users`) y datos de RH (perfil); escalable si se añaden más campos de organigrama (fecha de asignación del jefe, etc.).
- Desventajas: un JOIN (o eager load) más en listados que necesiten mostrar jefe; si el usuario no tiene perfil creado, no hay jefe (se puede crear perfil al vuelo en import cuando haya datos RH).

**Recomendación:** **Opción B — `manager_id` en `employee_profiles`.**

- FK: `employee_profiles.manager_id` → `users.id` (nullable). Un usuario (jefe) puede tener muchos subordinados: en `User` se expone `subordinates()` como `hasMany(EmployeeProfile::class, 'manager_id')` leyendo desde perfiles donde `manager_id = user.id`.
- Justificación: mantener “cuenta” vs “expediente RH” y alinear con hire_date, hire_type, employee_status y futuro crecimiento del directorio sin sobrecargar `users`.

---

### 2.3 Estrategia del Importador Inteligente

#### 2.3.1 División de la columna NOMBRE COMPLETO

Objetivo: poblar `first_name`, `paternal_last_name`, `maternal_last_name` (y con ello la columna `name` vía `User::syncNameColumn()`).

- **Heurística propuesta (sin hardcodear nombres):**
  - Normalizar: trim, colapsar espacios múltiples, opcionalmente quitar acentos para comparaciones internas si se desea.
  - Si la cadena está vacía → dejar los tres campos null (y permitir o no la fila según regla de negocio).
  - Si hay 1 token → asignar todo a `first_name`; apellidos null.
  - Si hay 2 tokens → primero → `first_name`, segundo → `paternal_last_name`; `maternal_last_name` null.
  - Si hay 3 tokens → primero → `first_name`, segundo → `paternal_last_name`, tercero → `maternal_last_name`.
  - Si hay 4 o más tokens: convención típica en México es “Nombre(s) Apellido_Paterno Apellido_Materno”. Estrategia: **últimos dos tokens** = apellido paterno y materno; **todo lo anterior** = `first_name` (ej. “María de la Cruz” + “García” + “López”). Así se cubren nombres compuestos sin catálogo de nombres.
- Opcional: configurar en el importador si se acepta “Apellido(s) Nombre(s)” (algunos reportes RH) e invertir lógica (último token = first_name, dos anteriores = apellidos); mejor como opción/configuración que como hardcodeo.

#### 2.3.2 Matching por texto para obtener IDs relacionales

- **SEDE:** buscar en `sites` por `name` o `code` (normalizado: trim, mayúsculas/minúsculas según convención del catálogo). Si el Excel trae “TLALPAN”, buscar donde `sites.name` o `sites.code` coincida (o búsqueda case-insensitive). Primera coincidencia; si hay ambigüedad (mismo nombre en dos sedes), priorizar `code` si viene en el archivo.
- **ÁREA, CAMPAÑA, PUESTO (Position):** búsqueda por `name` en `areas` / `campaigns` / `positions` (normalizado, solo registros `is_active` si se desea). Una coincidencia por nombre.
- **HORARIO:** búsqueda por `schedules.name` (solo activos). El importador debe crear la asignación en `schedule_assignments` para el usuario (scheduleable_type = User, scheduleable_id = user.id, valid_from/valid_until según política).
- **TIPO DE INGRESO / ESTATUS:** búsqueda por `hire_types.name` y `employee_statuses.name` (normalizado).
- **JEFE INMEDIATO:** buscar en `users` por nombre completo. Opciones: (1) comparar con columna `name` (calculada) o con concatenación de `first_name, paternal_last_name, maternal_last_name`; (2) normalizar ambos (quitar acentos, mayúsculas, espacios extra) para evitar fallos por tildes o mayúsculas. Si hay varios usuarios con el mismo nombre, criterio desempate: mismo área/campaña o primero por id; se puede documentar “en caso de duplicados se toma el primero por ID” o exigir número de empleado del jefe en el archivo en una columna futura.

Todo matching debe ser **case-insensitive** y con trim; opcionalmente normalización de acentos (collation o función) para robustez.

#### 2.3.3 Manejo de errores cuando un valor no existe

- **Política recomendada:** no inventar datos; no crear áreas, campañas o sedes “al vuelo” por defecto, para mantener integridad y cero ambigüedad (el maestro debe reflejar catálogos ya existentes o previamente cargados).
- **Comportamiento por fila:**
  - Si **SEDE, ÁREA, CAMPAÑA, PUESTO, HORARIO, TIPO DE INGRESO o ESTATUS** no tienen coincidencia en su catálogo → **no insertar/actualizar esa fila**; registrar el error en un reporte (número de fila, columna, valor recibido, mensaje tipo “Área no encontrada: X”).
  - Si **JEFE INMEDIATO** no tiene coincidencia → opción conservadora: **dejar `manager_id` en null** y registrar advertencia en el reporte (fila, “Jefe no encontrado: X”); la fila sí se importa.
- **Reporte de errores:** el importador debe acumular fallos por fila (y opcionalmente advertencias). Al finalizar, devolver:
  - Resumen: total filas procesadas, insertadas, actualizadas, filas con error.
  - Lista de errores: fila (o número de línea), columna/concepto, valor, mensaje.
- Esto se implementa con la API de **failures** de Laravel Excel (o equivalente) para que el usuario pueda descargar un Excel/CSV de filas fallidas y corregir y reimportar.

**Excepción opcional (a definir por negocio):** “Crear área al vuelo si no existe” como configuración del importador (ej. flag en request o en config). Si se habilita, solo para catálogos que el negocio acepte (típicamente Área; no recomendado para Sede o User). Fuera de ese caso, no crear al vuelo.

---

### 2.4 Exportación: estructura del Export

Objetivo: generar un Excel (y CSV) **idéntico al formato maestro**, cruzando todas las tablas necesarias.

- **Fuente de datos:** consulta de usuarios con:
  - Filtro: solo activos (`users.deleted_at` null) para “Exportar Activos”; solo bajas (`onlyTrashed()`) para “Exportar Bajas”.
  - Eager load: `employeeProfile` (y desde ahí `terminationReason`, `hireType`, `employeeStatus`, `manager`), `campaign`, `area`, `position`, `sede`, `ubicacion`, y la asignación de horario vigente (por ejemplo `scheduleAssignments` con `schedule` donde `valid_from`/`valid_until` contengan hoy o una fecha de referencia).
- **Columnas del archivo (orden del formato maestro):**
  - FECHA DE INGRESO → `employeeProfile->hire_date` (formato d/m/Y o según maestro).
  - SEDE → `sede->name` (o `code` si el maestro usa código).
  - TIPO DE INGRESO → `employeeProfile->hireType->name`.
  - NOMBRE COMPLETO → `user->name` (accessor que ya concatena first + paternal + maternal).
  - ÁREA → `area->name`.
  - CAMPAÑA → `campaign->name`.
  - PUESTO ESPECÍFICO → `position->name`.
  - HORARIO → nombre del `Schedule` vigente para ese usuario (resolver con la misma lógica que `getTodaySchedule()` o una versión que reciba fecha de referencia).
  - ESTATUS → `employeeProfile->employeeStatus->name` (o “—” si no tiene perfil/estatus).
  - JEFE INMEDIATO → `employeeProfile->manager->name` (o “—” si no tiene jefe).
- **Formato “moderno”:** usar Laravel Excel para cabeceras en negrita, anchos de columna automáticos, y si se requiere estilo de tabla. CSV: mismo orden de columnas, sin estilos.
- **Endpoints sugeridos:** “Exportar Activos” (Excel/CSV de usuarios activos) y “Exportar Bajas” (Excel/CSV de usuarios con `deleted_at` no null, con motivo y fecha de baja si se desea incluir en el maestro de bajas).

---

## Resumen para decisión

| Tema | Conclusión |
|------|------------|
| **Laravel Excel** | No está instalado; se propone añadir `maatwebsite/excel` y usarlo solo para Import/Export RH (SIGUA puede seguir con PhpSpreadsheet directo). |
| **Formato maestro** | Columnas: FECHA DE INGRESO, SEDE, TIPO DE INGRESO, NOMBRE COMPLETO, ÁREA, CAMPAÑA, PUESTO ESPECÍFICO, HORARIO, ESTATUS, JEFE INMEDIATO; mapeo a users + employee_profiles + catálogos. |
| **Catálogos nuevos** | **EmployeeStatus** (employee_statuses) y **HireType** (hire_types); FKs en `employee_profiles`. |
| **Jefe Inmediato** | **manager_id** en `employee_profiles` (FK a users.id); no en users. |
| **Nombre completo** | Heurística por número de tokens (1→first_name; 2→first+paternal; 3→first+paternal+maternal; 4+→últimos dos = apellidos, resto = first_name). |
| **Matching** | Por nombre/código normalizado en cada catálogo; jefe por nombre en users; sin crear entidades al vuelo por defecto. |
| **Errores** | No insertar fila si falta Área/Sede/Campaña/Position/Schedule/Estatus/Tipo ingreso; jefe opcional (null + advertencia); reporte de fallos descargable. |
| **Export** | Query con with([...]); columnas en orden maestro; “Exportar Activos” y “Exportar Bajas” con mismo formato. |

Cuando apruebes esta propuesta (incluida la ubicación de `manager_id` y la política de errores), se puede pasar a la **Fase 3**: migraciones, clases `EmployeeImport`/`EmployeeExport`, controlador y UI React (Dropzone, botones de exportación).

---

## Fase 3 — Nota de implementación (post-implementación)

**Laravel Excel:** En el proyecto se usa `phpoffice/phpspreadsheet` ^5.4. El paquete `maatwebsite/excel` (3.x) requiere PhpSpreadsheet ^1.30, por lo que **no se instaló** para no romper dependencias existentes (p. ej. SIGUA). La Fase 3 se implementó con **PhpSpreadsheet directamente** en:

- `App\Imports\TimeDesk\EmployeeImport`: lectura Excel/CSV, matching, heurística de nombre, transacciones, reporte de fallos y advertencias.
- `App\Exports\TimeDesk\EmployeeExport`: escritura Excel/CSV con formato maestro.

Cuando exista una versión de `maatwebsite/excel` compatible con PhpSpreadsheet 5.x, se puede refactorizar para usar sus interfaces (ToModel, WithHeadingRow, etc.) sin cambiar la lógica de negocio.
