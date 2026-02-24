# Calendario de tickets

## Punto de entrada único

- **Ruta:** `/calendario`
- **Sidebar:** ítem "Calendario" visible para **todos** los roles (misma ruta para todos).
- **Vista:** una sola página; el contenido se adapta según permisos (RBAC). No hay vistas duplicadas por rol.

## Histórico por rol

| Rol / permisos | Criterio por defecto | Filtros adicionales (operativos) |
|----------------|----------------------|-----------------------------------|
| **Solicitante** (solo `tickets.view_own`) | Tickets **creados por el usuario** | — |
| **Operativo / soporte / admin** (`tickets.view_area` o `tickets.manage_all`) | Tickets **asignados a mí** | "Creados por mí", "Todos los que puedo ver" |

- Solicitante: la policy ya restringe a `requester_id = user.id`; no se envían parámetros extra.
- Operativo: por defecto `assigned_to=me`; opciones "Creados por mí" (`created_by=me`) y "Todos los que puedo ver" (sin filtro extra).

## Fecha usada en el calendario

- **Fecha base actual:** `created_at` (fecha de creación del ticket).
- **Criterio:** se marca un día en el calendario si existe al menos un ticket cuya fecha base cae en ese día.
- **Extensibilidad:** el diseño permite añadir en el futuro vistas alternativas (por ejemplo por `updated_at` o `due_date`) sin cambiar el comportamiento actual; la lógica de fecha está centralizada en una función helper (`getCalendarDate` en la página de calendario).

## API

- **Listado:** `GET /api/tickets` con:
  - `per_page`: hasta 500 (para cargar suficiente historial).
  - `assigned_to=me`: solo asignados al usuario.
  - `created_by=me`: solo creados por el usuario (requester_id = user.id).

## Compatibilidad y crecimiento

- No se altera el comportamiento actual de tickets del solicitante ni de permisos existentes.
- El calendario responde siempre a: *"qué tickets puedo ver"* (policy) ∩ *"qué criterio está activo"* (scope/filtros).
- Preparado para filtros futuros (área, estado, rango de fechas, campañas, sedes) ampliando queries y UI sin cambiar la ruta ni la vista.
