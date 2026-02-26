# Arquitectura: Tickets vs Mis Tickets

## Resumen

- **Tickets**: módulo operativo (soporte, áreas, admins). Ver/asignar/escalar/comentar según permisos y área.
- **Mis Tickets**: módulo del solicitante. Solo tickets donde `requester_id = user->id`. Sin acciones administrativas.

No se comparte lógica de negocio entre ambos módulos; se evitan `if (isMyTickets)` o `if (role === solicitante)` en el mismo flujo.

---

## Módulo Tickets (operativo)

| Elemento | Uso |
|----------|-----|
| **Rutas** | `api/tickets`, `api/tickets/{id}`, `api/tickets/summary`, `api/tickets/analytics`, take/assign/unassign/alert/cancel/escalate, attachments |
| **Middleware** | `auth:sanctum`, `locale`, `throttle:tickets`, `perm:tickets.manage_all|tickets.view_area|tickets.view_own|tickets.create` |
| **Controlador** | `App\Http\Controllers\Api\TicketController` |
| **Política** | `App\Policies\TicketPolicy` — alcance por `scopeType` (all, area+own, area, own) y permisos (assign, comment, escalate, etc.) |
| **Queries** | `TicketPolicy::scopeFor($user, $query)` + filtros de catálogo y asignación |

Quién ve qué:
- **manage_all**: todos los tickets.
- **view_area + view_own**: tickets de su área y/o donde es solicitante.
- **view_own**: solo donde es solicitante.

Acciones: asignar, desasignar, tomar, escalar, cambiar estado/área, comentar (agentes). El solicitante en este módulo puede alert y cancel vía la misma API, pero la vista principal es operativa.

---

## Módulo Mis Tickets (solicitante)

| Elemento | Uso |
|----------|-----|
| **Rutas** | `api/my-tickets` (GET, POST), `api/my-tickets/{ticket}` (GET), `api/my-tickets/{ticket}/alert`, `api/my-tickets/{ticket}/comments`, `api/my-tickets/{ticket}/attachments`, `api/my-tickets/{ticket}/attachments/{id}/download`, `api/my-tickets/{ticket}/cancel` |
| **Middleware** | Solo `auth:sanctum`, `locale`. Sin permisos `tickets.*`. |
| **Controlador** | `App\Http\Controllers\Api\MyTicketsController` |
| **Política** | `App\Policies\RequesterTicketPolicy` — view, create, alert, comment, attach, cancel (cancel solo si no asignado y no final) |
| **Servicio** | `App\Services\RequesterTicketService` — `sendAlert()`, `addComment()`, `cancel()` (usado solo por Mis Tickets) |
| **Queries** | `Ticket::requesterOnly($user->id)` + filtros básicos (estado, prioridad, fecha, tipo) |

Permitido al solicitante: crear ticket, ver historial, observaciones (alert), comentarios, adjuntos (subir/descargar), cancelar solo antes de que soporte tome el ticket.

Prohibido: cambiar prioridad, reasignar, escalar, modificar SLA, cambiar área, cerrar manualmente, alterar estados operativos. Ver `docs/CONTRATO_MIS_TICKETS.md`.

---

## Separación de responsabilidades

1. **Queries**  
   - Tickets: `TicketPolicy::scopeFor()` + filtros operativos.  
   - Mis Tickets: `Ticket::requesterOnly($userId)` + filtros básicos en `MyTicketsController::applyRequesterFilters()`.

2. **Políticas**  
   - Tickets: `TicketPolicy` (alcance por área/permisos y acciones de agente).  
   - Mis Tickets: `RequesterTicketPolicy` (solo solicitante: view, create, alert, cancel).

3. **Servicios**  
   - Tickets: lógica en el controlador o servicios operativos propios.  
   - Mis Tickets: `RequesterTicketService` para alert y cancel; no reutilizado por el módulo Tickets.

4. **Abilities en respuesta**  
   - Tickets: `assign`, `release`, `escalate`, `comment`, `change_status`, `change_area`, `alert`, `cancel`.  
   - Mis Tickets: `alert`, `comment`, `attach`, `cancel` (sin acciones operativas).

---

## Admin y “Mis Tickets”

El admin puede:
- Ver todos los tickets en el módulo **Tickets**.
- Entrar a **Mis Tickets** y ver solo los tickets donde él es solicitante (comportamiento igual que cualquier usuario). No usa Mis Tickets como panel operativo.

---

## Crecimiento futuro

- Nuevos roles o vistas: añadir alcances/permisos en `TicketPolicy` y rutas bajo `api/tickets` sin mezclar con Mis Tickets.
- Nuevas acciones de solicitante: implementar en `RequesterTicketService` y exponer en `MyTicketsController` y `RequesterTicketPolicy`.
- Tests: testear Mis Tickets (policy, servicio, controlador) de forma independiente del flujo operativo.
