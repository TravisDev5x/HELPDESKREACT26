# Contrato minimo de API (SPA + clientes externos)

Este documento describe el contrato minimo consumido por la SPA y clientes externos.
No agrega endpoints nuevos ni cambia respuestas existentes.

## Auth

### POST /api/login
- Body: { identifier, password }
- Response 200:
  - { user, roles, permissions }
- Errores:
  - 422 { errors: { root: "..." } }
  - 403 { errors: { root: "..." } }

### GET /api/check-auth
- Response 200:
  - { user: null }
  - { user, roles, permissions } si hay sesion

### POST /api/logout
- Response 200: { message }

## Tickets

### GET /api/tickets
- Filtros:
  - area_current_id, area_origin_id, sede_id, ubicacion_id
  - ticket_type_id, priority_id, ticket_state_id
  - date_from (YYYY-MM-DD)
  - date_to (YYYY-MM-DD)
  - assigned_to=me
  - assigned_status=unassigned
  - assigned_user_id
  - per_page (10|25|50|100)
  - page
- Response: paginacion estandar de Laravel (data, links, meta)

### POST /api/tickets
- Body requerido:
  - subject, area_origin_id, area_current_id, sede_id
  - ticket_type_id, priority_id, ticket_state_id
  - created_at (fecha del cliente)
- Body opcional:
  - description, ubicacion_id
- Response 201: ticket con relaciones + abilities

### GET /api/tickets/{id}
- Response 200: ticket con relaciones, historial y abilities

### PUT /api/tickets/{id}
- Body opcional:
  - ticket_state_id, priority_id, area_current_id, note
- Response 200: ticket actualizado con relaciones + abilities

### POST /api/tickets/{id}/take
- Autoasigna el ticket al usuario actual.

### POST /api/tickets/{id}/assign
- Body: { assigned_user_id }

### POST /api/tickets/{id}/unassign
- Quita responsable.

### POST /api/tickets/{id}/escalate
- Body: { area_destino_id, note? }

### GET /api/tickets/analytics
- Filtros:
  - area_current_id, area_origin_id, sede_id, ubicacion_id
  - ticket_type_id, priority_id, ticket_state_id
  - date_from (YYYY-MM-DD)
  - date_to (YYYY-MM-DD)
- Response 200: { states, burned, areas_receive, areas_resolve, top_resolvers, types_frequent, types_resolved }

### GET /api/tickets/summary
- Filtros:
  - area_current_id, area_origin_id, sede_id, ubicacion_id
  - ticket_type_id, priority_id, ticket_state_id
  - date_from (YYYY-MM-DD)
  - date_to (YYYY-MM-DD)
  - assigned_to=me
  - assigned_status=unassigned
  - assigned_user_id
- Response 200: { total, burned, canceled, by_state }

### GET /api/tickets/export
- Filtros:
  - area_current_id, area_origin_id, sede_id, ubicacion_id
  - ticket_type_id, priority_id, ticket_state_id
  - date_from (YYYY-MM-DD)
  - date_to (YYYY-MM-DD)
- Response 200: CSV

## Catalogos

### GET /api/catalogs
- Devuelve colecciones de catalogos (campaigns, areas, positions, sedes, ubicaciones,
  priorities, ticket_states, ticket_types, incident_types, incident_severities,
  incident_statuses, roles, permissions, area_users).

### CRUD por catalogo
- /api/campaigns, /api/areas, /api/positions, /api/sedes, /api/ubicaciones,
  /api/priorities, /api/ticket-states, /api/ticket-types,
  /api/incident-types, /api/incident-severities, /api/incident-statuses

Regla para clientes:
- Usar siempre ids como referencia.
- Cuando exista code (ticket_states, ticket_types, sedes, ubicaciones), usarlo como
  identificador estable. No depender de name.

## Errores (formato estandar)
- Validacion (422): { message, errors: { campo: [..] } }
- Auth/permiso (401/403): { message } o { errors: { root: "..." } }
- Conflictos (409): { message }
- Throttle (429): { message }

## Paginacion
- Formato Laravel: { data, links, meta }
- per_page permitido: 10, 25, 50, 100

## Incidents

### GET /api/incidents
- Filtros:
  - area_id, sede_id
  - incident_type_id, incident_severity_id, incident_status_id
  - reporter_id, involved_user_id
  - date_from (YYYY-MM-DD)
  - date_to (YYYY-MM-DD)
  - occurred_from (YYYY-MM-DD)
  - occurred_to (YYYY-MM-DD)
  - assigned_to=me
  - assigned_status=unassigned
  - assigned_user_id
  - search
  - per_page (10|25|50|100)
  - page
- Response: paginacion estandar de Laravel (data, links, meta)

### POST /api/incidents
- Body requerido:
  - subject, area_id, sede_id
  - incident_type_id, incident_severity_id, incident_status_id
  - enabled_at (YYYY-MM-DD)
- Body opcional:
  - description, occurred_at, involved_user_id, assigned_user_id
  - attachments[] (multipart/form-data)
- Response 201: incidente con relaciones + abilities

### GET /api/incidents/{id}
- Response 200: incidente con relaciones, historial, adjuntos y abilities

### PUT /api/incidents/{id}
- Body opcional:
  - incident_status_id, incident_severity_id, assigned_user_id, enabled_at, note
- Response 200: incidente actualizado con relaciones + abilities

### POST /api/incidents/{id}/take
- Autoasigna la incidencia al usuario actual.

### POST /api/incidents/{id}/assign
- Body: { assigned_user_id }

### POST /api/incidents/{id}/unassign
- Quita responsable.

### POST /api/incidents/{id}/attachments
- Body: attachments[] (multipart/form-data)
- Response 201: adjuntos creados

### DELETE /api/incidents/{id}/attachments/{attachment}
- Elimina el adjunto.
