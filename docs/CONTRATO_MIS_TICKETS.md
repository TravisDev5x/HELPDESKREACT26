# Contrato del módulo Mis Tickets

**Principio de diseño (no negociable):**  
El solicitante no gestiona la operación; participa en la resolución de su problema.

---

## Alcance

- **Función principal:** Permitir al solicitante visualizar solo los tickets que él creó, entender su estado y colaborar mediante información y comunicación.
- **Queries:** Siempre `requester_id = auth()->id()` (en código: `Ticket::requesterOnly($user->id)`). Sin mezcla con alcance operativo (área, asignación).

---

## Acciones permitidas al solicitante

| Acción | Endpoint / uso |
|--------|-----------------|
| Crear tickets | `POST /api/my-tickets` |
| Ver listado y detalle | `GET /api/my-tickets`, `GET /api/my-tickets/{ticket}` |
| Ver historial completo (sin notas internas) | Incluido en detalle |
| Agregar observaciones / alertas | `POST /api/my-tickets/{ticket}/alert` |
| Agregar comentarios | `POST /api/my-tickets/{ticket}/comments` (body: `note`) |
| Subir archivos adjuntos | `POST /api/my-tickets/{ticket}/attachments` |
| Descargar adjuntos | `GET /api/my-tickets/{ticket}/attachments/{attachment}/download` |
| Recibir alertas y notificaciones de estado | Lógica de notificaciones existente |
| Cancelar ticket | `POST /api/my-tickets/{ticket}/cancel` **solo antes de que soporte tome el ticket** (no asignado) |

---

## Acciones explícitamente prohibidas

El solicitante **no** puede:

- Cambiar prioridad
- Reasignar tickets
- Escalar tickets
- Modificar SLA
- Cambiar área responsable
- Cerrar tickets manualmente
- Alterar estados operativos

Estas acciones pertenecen **exclusivamente** al módulo central (Tickets).

---

## Arquitectura

- **Mis Tickets:** Queries por `requester_id`; policies y casos de uso propios (ej. `AddTicketCommentAsRequester` en `RequesterTicketService`).
- **Tickets (central):** Queries operativas por área, estado, asignación; policies administrativas.
- **Prohibido:** Compartir controladores, compartir servicios de gestión, usar flags tipo `isRequester` en el mismo flujo.

---

## Rol Admin

- Gestiona tickets **solo** desde el módulo central.
- Puede ver Mis Tickets **únicamente como simulación de solicitante** (solo los tickets donde él es `requester_id`).
- No reutiliza lógica del solicitante para acciones administrativas.

---

## Regla de oro (futuras decisiones)

**Si una acción altera la operación global, no pertenece al módulo del solicitante.**

- Estable y escalable.
- Sin ambigüedad de poder entre roles.
- El solicitante tiene visibilidad y voz, no palancas operativas.
