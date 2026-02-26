# Fase 2 — Diseño de integración con TanStack Table

**Objetivo:** Definir cómo integrar TanStack Table en la vista de Usuarios sin romper compatibilidad. Sin escribir la vista completa de nuevo; solo la capa de tabla.

**Referencia:** [Fase 1 — Análisis](./USERS_TABLE_TANSTACK_FASE1_ANALISIS.md).

---

## 1. Principios del diseño

| Principio | Aplicación |
|-----------|------------|
| TanStack solo como motor lógico | Definición de columnas y filas; el HTML lo siguen generando los componentes shadcn existentes. |
| Reutilizar todo lo actual | Table, TableHeader, TableBody, TableRow, TableHead, TableCell, StatusBadge, renderRowActions, handlers. |
| Mantener contrato | Mismas props que recibe/usa la tabla (filteredUsers, selectedIds, loading, setSelectedIds, etc.). No cambiar nombres de funciones ni flujo de datos. |
| Prohibido | Reescribir la página, mover lógica de negocio, cambiar endpoints, alterar permisos. |

---

## 2. Capas propuestas

### 2.1 Capa 1: DataTable base (reutilizable)

**Ubicación sugerida:** `@/components/ui/data-table.jsx` (o `data-table.tsx`).

**Responsabilidad:**
- Recibir `columns` (definición TanStack), `data`, `loading`, y opciones de selección (getRowId, selectedIds, onSelectionChange).
- Usar `useReactTable` con:
  - `data`
  - `columns`
  - `getCoreRowModel()`
  - Si hay selección: `getRowId: (row) => row.id` (o prop), estado de filas seleccionadas y `onRowSelectionChange` (o callback equivalente).
- No imponer ordenación ni paginación en cliente; la tabla solo muestra las filas que recibe (paginación y orden son externos, como ahora).
- Renderizar:
  - `<Table>` (shadcn)
  - `<TableHeader>` con una `<TableRow>` que mapea `table.getHeaderGroups()[0].headers` a `<TableHead>` (respetando meta/className por columna si se define).
  - `<TableBody>`:
    - Si `loading === true`: mismo bloque de 5 filas skeleton que hoy (mismo HTML/clases).
    - Si `data.length === 0`: misma fila vacía con colSpan y mensaje "No se encontraron resultados".
    - Si no: `table.getRowModel().rows.map(row => <TableRow key={row.id}> ... </TableRow>)`, y cada celda con `flexRender(cell.column.columnDef.cell, cell.getContext())` o equivalente, de modo que el contenido sea el que definen las columnas.

**Props públicas (contrato sugerido):**
- `columns`: array de definiciones de columna (TanStack).
- `data`: array de filas (en Users = filteredUsers).
- `loading`: boolean.
- `getRowId`: (row) => row.id (o por defecto `(row) => row.id`).
- `rowSelection`: opcional; si se usa: `{ selectedRowIds: Set o objeto, onSelectionChange: (ids) => void }` o bien `selectedIds` + `onSelectedIdsChange` para no acoplar a TanStack el nombre del estado.
- `emptyMessage`: string opcional (por defecto "No se encontraron resultados").
- `emptyColSpan`: número (por defecto 5).

Así la DataTable queda agnóstica del dominio “usuarios” y puede reutilizarse en otras vistas (p. ej. Tickets más adelante) con otras columnas.

### 2.2 Capa 2: Definición de columnas para Usuarios

**Ubicación sugerida:** junto a la página (p. ej. `usersColumns.jsx` en la misma carpeta que `Users.jsx`) o dentro de `Users.jsx` como constante si se prefiere todo en un archivo.

**Forma:** Array de columnas para `@tanstack/react-table`:

- **Columna 1 — Selección (id: 'select'):**
  - header: Checkbox “select all” (mismo que ahora: checked si todos seleccionados, onCheckedChange para seleccionar/deseleccionar todos).
  - cell: Checkbox por fila (checked si `selectedIds.includes(row.original.id)`, onCheckedChange para toggle en `setSelectedIds`).
  - Tamaño: `size: 40` o meta con `className: 'w-[40px] text-center'`.

- **Columna 2 — Identidad (id: 'identidad'):**
  - header: "Identidad".
  - cell: mismo JSX actual (nombre bold, employee_number mono, email con icono Mail). Acceso a `row.original` para user.
  - meta: `className: '...'` si hace falta.

- **Columna 3 — Ubicación (id: 'ubicacion'):**
  - header: "Ubicación".
  - cell: mismo JSX actual (campaña, área, sede, ubicación con iconos).
  - meta: `className: 'hidden md:table-cell'` para mantener visibilidad responsive.

- **Columna 4 — Rol / Estado (id: 'rolEstado'):**
  - header: "Rol / Estado".
  - cell: StatusBadge + posición (row.original).

- **Columna 5 — Acciones (id: 'acciones'):**
  - header: "Acciones".
  - cell: llamada a `renderRowActions(row.original)` (la función actual de Users, recibida por props o contexto de columnas).
  - meta: `className: 'text-right ... px-6'`.

Las columnas necesitan recibir “slots” para cosas que hoy viven en Users: `setSelectedIds`, `selectedIds`, `renderRowActions`, `filteredUsers` (para el “select all”). Opciones:
- **A)** Pasar esas cosas por opciones de columna (accessorMeta o meta) al crear las columnas, o
- **B)** Crear las columnas dentro de Users con un hook `useUsersTableColumns({ selectedIds, setSelectedIds, renderRowActions, filteredUsers })` que devuelve el array de columnas. Así no se cambia el contrato externo de la página; solo se encapsula la definición.

Recomendación: **B** — `useUsersTableColumns` en Users.jsx que devuelve las columnas; la DataTable base solo recibe `columns` y `data`.

---

## 3. Sustitución en Users.jsx

### 3.1 Qué se mantiene igual

- Todo el estado (users, catalogs, loading, pagination, perPage, searchTerm, debouncedSearch, showTrashed, showPendingOnly, filters, sort, createOpen, editOpen, selectedIds, confirmOpen, actionConfig, actionReason, processing, approveMode, selectedUser, showFilters).
- `filteredUsers` (useMemo).
- `fetchData`, `initiateAction`, `executeAction`, `handleCreateSubmit`, `handleEditSubmit`, `updateFilter`, `clearFilters`, `mapValidationErrors`.
- `renderRowActions(user)` (misma función, misma firma).
- Toolbar (búsqueda, filtros, papelera, barra de selección múltiple).
- Card contenedor de la tabla.
- Bloque de paginación debajo de la tabla (Mostrar N, Anterior, Siguiente).
- Todos los diálogos (crear/editar, confirmar baja/veto).
- UserForm, StatusBadge, resolveRoleId.

### 3.2 Qué se sustituye (solo el bloque tabla)

**Antes:**  
De `<Table>` hasta `</Table>` (TableHeader + TableBody con loading / empty / map de filteredUsers).

**Después:**  
Un único componente que encapsula esa parte, por ejemplo:

```jsx
<UsersTable
  data={filteredUsers}
  loading={loading}
  selectedIds={selectedIds}
  onSelectedIdsChange={setSelectedIds}
  renderRowActions={renderRowActions}
  showTrashed={showTrashed}
/>
```

`UsersTable` por dentro:
- Usa `useUsersTableColumns(...)` para obtener las columnas (con selectedIds, setSelectedIds, renderRowActions, data para “select all”).
- Usa la DataTable base pasando `columns`, `data={filteredUsers}`, `loading`, `getRowId={(row) => row.id}`, `rowSelection={{ selectedIds, onSelectedIdsChange: setSelectedIds }}`, y el mismo `emptyMessage` / colSpan que ahora.
- Opcional: `UsersTable` puede vivir en el mismo archivo Users.jsx como componente interno, o en un archivo `UsersTable.jsx` en la misma carpeta; no debe cambiar la API pública de la página Users.

### 3.3 Contrato de datos

- `filteredUsers`: array de objetos con al menos `id`, `name`, `employee_number`, `email`, `status`, `is_blacklisted`, `position`, `campaign`, `area`, `sede`, `ubicacion`, y lo que use `renderRowActions`. El tipo no se cambia; TanStack solo recibe ese array como `data`.
- `selectedIds`: array de ids (números o strings según devuelva la API). La DataTable/UsersTable seguirá recibiendo y actualizando el mismo estado `selectedIds` / `setSelectedIds`.

---

## 4. Estructura de archivos sugerida

```
resources/js/
  components/
    ui/
      table.tsx          # existente, sin cambios
      data-table.jsx     # NUEVO: tabla base con useReactTable, render con shadcn Table*
  Pages/
    Users.jsx            # se sustituye solo el bloque <Table>...</Table> por <UsersTable ... />
    UsersTable.jsx       # OPCIONAL: componente que usa useUsersTableColumns + DataTable (o todo dentro de Users.jsx)
```

Si se quiere mínimo de archivos nuevos, la DataTable base puede vivir en `components/ui/data-table.jsx` y la definición de columnas + el wrapper de tabla de usuarios dentro de `Users.jsx` (por ejemplo un `function UsersTable({ ... }) { ... }` y el uso `<UsersTable ... />` en el return).

---

## 5. Dependencia

- Añadir **`@tanstack/react-table`** a `package.json` (dependencies). Versión estable reciente (ej. ^8.x).

No es necesario en esta fase añadir virtualización; la paginación es server-side y el número de filas por página es bajo (10–100). Si más adelante se quiere virtualización, será una extensión sobre esta misma estructura.

---

## 6. Garantías de compatibilidad

| Aspecto | Garantía |
|---------|----------|
| HTML semántico | Mismo `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>`. |
| Clases visuales | Las mismas clases en header, celdas y filas (incl. `group`, `bg-muted/40` en fila seleccionada, `hidden md:table-cell` en ubicación). |
| Loading | Mismas 5 filas de Skeleton. |
| Empty | Misma fila con colSpan y mensaje. |
| Selección | Mismo comportamiento: checkbox por fila, “select all” en cabecera, estado en `selectedIds`. |
| Acciones por fila | Misma función `renderRowActions(user)` y mismos botones (Aprobar, Editar, Vetar, Baja / Restaurar, Borrar permanente). |
| Props y estado de la página | Sin cambios; la página sigue exponiendo el mismo estado y llamando a los mismos handlers. |

---

## 7. Resumen para Fase 3 (implementación)

1. Instalar `@tanstack/react-table`.
2. Implementar **DataTable** base en `@/components/ui/data-table.jsx`: props (columns, data, loading, getRowId, selectedIds, onSelectedIdsChange, emptyMessage, emptyColSpan), useReactTable, render con Table/TableHeader/TableBody/TableRow/TableHead/TableCell de shadcn, loading y empty como hoy.
3. Definir columnas de Usuarios (en Users.jsx o en UsersTable.jsx) con `useUsersTableColumns` que reciba selectedIds, setSelectedIds, renderRowActions, data; devolver array de columnas con header/cell/meta según sección 2.2.
4. En Users.jsx, sustituir solo el bloque desde `<Table>` hasta `</Table>` por `<UsersTable data={filteredUsers} loading={...} selectedIds={...} onSelectedIdsChange={setSelectedIds} renderRowActions={renderRowActions} showTrashed={showTrashed} />` (o el nombre que se le dé al wrapper), manteniendo el mismo Card y la misma paginación debajo.
5. Verificación (Fase 4): misma vista, mismas acciones, mismos permisos, sin errores en consola.

**Principio rector:** Primero entender (Fase 1), luego integrar (Fase 2 diseño, Fase 3 código). No reescribir la vista; solo cambiar el motor de la tabla.
