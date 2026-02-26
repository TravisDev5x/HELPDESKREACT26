# Fase 1 — Análisis: Vista Gestión de Usuarios (Users.jsx)

**Objetivo:** Reemplazar solo la implementación de la tabla por TanStack Table sin romper nada. Este documento es el análisis obligatorio previo a cualquier cambio de código.

---

## 1. Estructura del componente

### 1.1 Componentes en el archivo

| Componente | Ubicación | Rol |
|------------|-----------|-----|
| `StatusBadge` | Líneas 55-76 | Presentacional: badge de estado (activo, pending_admin, blocked, vetado). |
| `resolveRoleId` | Líneas 78-85 | Utilidad: obtiene `role_id` para el formulario a partir de `user.roles` y catálogos. |
| `UserForm` | Líneas 88-257 | Formulario crear/editar: react-hook-form + zod, campos personales y organizacionales, contraseña. |
| `Users` (default export) | Líneas 260-516 | Página completa: estado, datos, toolbar, **tabla**, paginación, diálogos. |

### 1.2 Flujo de la página `Users`

- **Estado local** (useState): `users`, `catalogs`, `loading`, `pagination`, `perPage`, `searchTerm`, `debouncedSearch`, `showTrashed`, `showPendingOnly`, `filters`, `sort`, `createOpen`, `editOpen`, `selectedIds`, `confirmOpen`, `actionConfig`, `actionReason`, `processing`, `approveMode`, `selectedUser`, `showFilters`.
- **Datos de la tabla:** `filteredUsers` (useMemo). Si `showPendingOnly` → `users.filter(u => u.status === "pending_admin")`, si no → `users`.
- **Origen de `users`:** API `GET /api/users` con params (paginación, orden, búsqueda, filtros). Se llama en `fetchData(page)`.
- **Paginación:** Server-side. `pagination` tiene `current`, `last`, `total`. Selector `per_page` (10, 20, 50, 100) y botones Anterior/Siguiente que llaman `fetchData(pagination.current ± 1)`.

---

## 2. Tabla actual: qué hay que sustituir

### 2.1 Estructura HTML / componentes usados

- Contenedor: `<Card className="overflow-hidden border-border/60 shadow-sm">`.
- Dentro: `<Table>`, `<TableHeader>`, `<TableBody>`, `<TableRow>`, `<TableHead>`, `<TableCell>` (todos de `@/components/ui/table`).
- Clases relevantes:
  - `TableHeader`: `className="bg-muted/30"`.
  - `TableHead`: `font-bold text-xs uppercase tracking-wider`, uno con `w-[40px] text-center`, otro con `text-right ... px-6`.
  - `TableRow` (filas datos): `className={group ${selectedIds.includes(user.id) ? "bg-muted/40" : ""}}`.
  - Celdas con layouts internos (flex, flex-col, gap, etc.).

### 2.2 Columnas existentes (orden)

| # | Cabecera | Contenido celda | Render personalizado |
|---|----------|-----------------|----------------------|
| 1 | Checkbox (w-[40px]) | Checkbox selección fila | Sí: estado `selectedIds`, toggle por fila; cabecera: “select all” sobre `filteredUsers`. |
| 2 | Identidad | Nombre + nº empleado + email | Sí: `user.name` (bold), `user.employee_number` (mono, muted), `user.email` con icono Mail. |
| 3 | Ubicación (hidden md:table-cell) | Campaña, área, sede, ubicación | Sí: varios renglones con iconos Briefcase/Building2; `user.campaign`, `user.area`, `user.sede`, `user.ubicacion`. |
| 4 | Rol / Estado | StatusBadge + posición | Sí: `<StatusBadge status={user.status} isBlacklisted={user.is_blacklisted} />` y `user.position` con icono ShieldCheck. |
| 5 | Acciones (text-right px-6) | Botones por fila | Sí: `renderRowActions(user)` (ver abajo). |

### 2.3 Acciones por fila (`renderRowActions(user)`)

- **Si `showTrashed`:**  
  - Restaurar: `POST /api/users/{id}/restore`, luego `fetchData()`, notify.success.  
  - Borrar permanente: `confirm()` luego `DELETE /api/users/{id}/force`, luego `fetchData()`.
- **Si no trashed:**  
  - Aprobar (solo si `user.status === "pending_admin"`): abre edit en modo aprobar (`setApproveMode(true)`, `setEditOpen(true)`).  
  - Editar: abre modal edición con `selectedUser`.  
  - Vetar: `initiateAction('BLACKLIST', user.id)`.  
  - Baja: `initiateAction('DELETE', user.id)`.

Todas usan `Button size="icon" variant="ghost"` con clases de color (emerald, slate, amber, red, etc.) y `Tooltip`/`TooltipProvider` en el bloque no-trashed.

### 2.4 Estados de la tabla (TableBody)

1. **Loading:** 5 filas de skeleton (Checkbox, Identidad, Ubicación, Rol/Estado, Acciones) con `<Skeleton>`.  
2. **Empty:** una fila con `colSpan={5}`, mensaje “No se encontraron resultados” e icono Search.  
3. **Datos:** `filteredUsers.map((user) => <TableRow key={user.id} ...> ... </TableRow>)`.

---

## 3. Datos y filtros

- **Origen:** `GET /api/users` con `page`, `per_page`, `status` (trashed), `sort`, `direction`, `search`, `campaign`, `area`, `role_id`, `user_status`, `sede`, `ubicacion`. Respuesta: `data`, `current_page`, `last_page`, `total`.
- **Filtros:** Server-side (params en `fetchData`). Valores en `filters` (campaign, area, role, status, sede, ubicacion) y `debouncedSearch` (searchTerm con debounce 400 ms).
- **Orden:** Server-side (`sort.field`, `sort.dir`); actualmente no hay cabeceras clickeables en la tabla, el sort viene del estado inicial `{ field: "id", dir: "desc" }`.
- **Filtro local:** `showPendingOnly` → `filteredUsers = users.filter(u => u.status === "pending_admin")`; en resto de casos `filteredUsers = users`.

---

## 4. Dependencias de permisos / roles

- **Ruta:** `/users` está bajo `ProtectedRoute` (requiere usuario logueado). El ítem de menú “Users” solo se muestra si `can('users.manage')` (AppLayout).
- **Página Users.jsx:** No hace comprobación explícita de permiso; asume que quien llega tiene acceso. La API devolverá 403 si no tiene `users.manage`.
- **Acciones:** No se ocultan por rol dentro de la tabla; si el usuario ve la página, ve todas las acciones (vetar, baja, editar, aprobar). La seguridad es de backend.

---

## 5. Qué NO debe tocarse (lógica de negocio y contrato)

- **Llamadas API:** `GET /api/users`, `POST /api/users`, `PUT /api/users/:id`, `POST /api/users/:id/roles`, `POST /api/users/restore`, `DELETE /api/users/:id/force`, `POST /api/users/mass-delete`, `POST /api/users/blacklist`. Parámetros y manejo de respuesta deben seguir igual.
- **Estado y handlers:** `fetchData`, `initiateAction`, `executeAction`, `handleCreateSubmit`, `handleEditSubmit`, `updateFilter`, `clearFilters`, `setSelectedIds`, lógica de `confirmOpen` / `actionConfig` / `actionReason`.
- **Diálogos:** Crear/Editar (UserForm), Confirmar baja/veto. Apertura/cierre y props (defaultValues, onSubmit, onCancel, catalogs, isEdit, approveMode, selectedUser).
- **Toolbar:** Búsqueda, botón filtros, botón papelera, selección múltiple (barra con “Eliminar” y “Vetar” cuando hay `selectedIds`). Panel de filtros (Selects campaign, area, role, sede, ubicacion, status, Limpiar).
- **Paginación:** Bloque actual debajo de la tabla (Mostrar N de total, Anterior, Siguiente). `perPage`, `pagination`, `fetchData(1)` o `fetchData(pagination.current ± 1)`.
- **Persistencia:** `localStorage` para `users.perPage` y filtros (`users.filterCampaign`, etc.).
- **Permisos:** Sin cambios; no añadir ni quitar comprobaciones en esta vista.

---

## 6. Qué es solo UI (sustituible por TanStack)

- **Solo la tabla:** desde `<Table>` hasta el cierre de `</Table>` (incluido el contenido de `TableHeader` y `TableBody`).
- Se mantiene el mismo:
  - Número y orden de columnas (checkbox, identidad, ubicación, rol/estado, acciones).
  - Contenido visual de cada celda (mismos componentes: Checkbox, StatusBadge, iconos, textos, `renderRowActions`).
  - Clases CSS (Tailwind/shadcn) para que la vista se vea igual.
  - Comportamiento: loading (skeletons), empty (mensaje), datos (filas con selección y acciones).
- El **Card** que envuelve la tabla y el **bloque de paginación** debajo del `<Table>` no forman parte de la “tabla interna”; pueden quedarse como están y solo reemplazarse el bloque `<Table>...</Table>` por un componente que use TanStack Table y siga generando el mismo HTML/clases.

---

## 7. Resumen para integración TanStack

- **Sustituir:** Unicamente el fragmento que renderiza `<Table>` + `<TableHeader>` + `<TableBody>` (incl. loading, empty, filas de datos).
- **TanStack:** Usar como motor lógico (columnas, orden de filas, selección si se desea). El HTML de salida debe seguir siendo los mismos `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>` con las mismas clases y el mismo contenido por celda.
- **Reutilizar:** Componentes shadcn (Table, TableHeader, TableBody, TableRow, TableHead, TableCell), StatusBadge, renderRowActions, handlers existentes, estado (`filteredUsers`, `selectedIds`, `loading`).
- **No cambiar:** Contenedor de la página, toolbar, filtros, paginación, diálogos, API, permisos, nombres de funciones y props públicas del default export.

---

## 8. Riesgos si se cambia más de lo indicado

- Cambiar el contrato de `fetchData` o los params de `/api/users` → riesgo de rotura con el backend.
- Mover estado (selectedIds, loading, etc.) a otro componente sin mantener la misma interfaz → posibles regresiones en selección múltiple o en diálogos.
- Cambiar el HTML semántico o las clases de la tabla → diferencias visuales o de accesibilidad.
- Ocultar/mostrar acciones por rol en front sin que el backend lo exija → posible inconsistencia; mejor no tocar permisos en esta tarea.

**Principio:** Primero entender, luego integrar. Solo se sustituye la implementación de la tabla por TanStack Table, manteniendo estructura visual, flujos de datos, permisos y comportamiento existente.
