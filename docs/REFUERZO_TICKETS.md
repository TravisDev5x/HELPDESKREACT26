# Refuerzo del sistema de tickets

Documento de referencia para endurecer seguridad, consistencia y negocio del módulo de tickets.

---

## 1. Backend: políticas, validación, BD, auditoría, rate limiting

| Prioridad | Mejora | Dónde | Estado |
|-----------|--------|--------|--------|
| **Alta** | Rate limiting en rutas de tickets (evitar abuso de creación/actualización). | `routes/api.php`, `AppServiceProvider::boot()` | ✅ Implementado |
| **Alta** | Auditoría de cambios en tickets activada por defecto; canal `audit` en logging. | `config/helpdesk.php`, `config/logging.php` | ✅ Config activada |
| **Alta** | Índices BD: `requester_id`, `assigned_user_id`, `created_at`; `ticket_histories(ticket_id, created_at)`. | Nueva migración | Pendiente |
| **Media** | Constraints: `due_at >= created_at`; `resolved_at` coherente con estado final. | Nueva migración | Pendiente |
| **Media** | Validación: `description` con máximo (ej. 10000 caracteres); validar `area_current_id` al escalar. | `StoreTicketRequest`, `TicketController::update` | ✅ description max |
| **Media** | Política `delete` si en el futuro se permite borrado lógico/físico. | `TicketPolicy.php` | Pendiente |

---

## 2. API: respuestas y códigos HTTP

| Prioridad | Mejora | Dónde | Estado |
|-----------|--------|--------|--------|
| **Alta** | Formato unificado de errores: `{ "message", "errors"?, "code"? }` en handler de excepciones. | `bootstrap/app.php` / `App\Exceptions\Handler` | Pendiente |
| **Alta** | 404 y 403 en JSON consistentes para la API. | Handler de excepciones | Pendiente |
| **Media** | Versionado de API (`/api/v1/`) para evolución sin romper clientes. | `routes/api.php` | Pendiente |
| **Baja** | Documentar contrato de éxito (201 + recurso, 200 + recurso). | OpenAPI/Swagger opcional | Pendiente |

---

## 3. Frontend: validación, carga, errores, accesibilidad

| Prioridad | Mejora | Dónde | Estado |
|-----------|--------|--------|--------|
| **Alta** | Mostrar errores 422 por campo (`errors`) en formularios (crear/actualizar ticket, alerta). | `TicketCreate.jsx`, `TicketDetalle.jsx` | Pendiente |
| **Alta** | Estados de carga en botones (tomar, asignar, alerta, cancelar, adjuntos) para evitar doble envío. | `TicketDetalle.jsx` | Parcial |
| **Media** | Validación en cliente: longitud subject/description, fechas, antes de enviar. | `TicketCreate.jsx` | Pendiente |
| **Media** | Accesibilidad: `aria-*`, `htmlFor`/`id`, `aria-busy`, roles en tablas y modales. | Páginas de tickets | Pendiente |
| **Baja** | Modal de confirmación para cancelar ticket (en lugar de `window.confirm`). | `TicketDetalle.jsx` | Pendiente |

---

## 4. Negocio: SLA, recordatorios, cierre, escalado

| Prioridad | Mejora | Dónde | Estado |
|-----------|--------|--------|--------|
| **Alta** | SLA configurable por tipo de ticket y/o prioridad (tabla o config). | `config/helpdesk.php` o migración, `Ticket` model, `TicketController::store` | Pendiente |
| **Alta** | Job/Command: recordatorios para tickets próximos a vencer o vencidos sin asignar. | `app/Jobs/`, `app/Console/Commands/`, scheduler | Pendiente |
| **Media** | Cierre automático: estado “resuelto” sin reapertura X días → “cerrado”. | Command programado | Pendiente |
| **Media** | Escalado automático por tiempo en área sin resolución. | Job/Command, notificaciones | Pendiente |

---

## 5. Seguridad: permisos por campo, sanitización, adjuntos

| Prioridad | Mejora | Dónde | Estado |
|-----------|--------|--------|--------|
| **Alta** | Aceptar en `update` solo los campos permitidos por permiso (ej. `ticket_state_id` solo si `change_status`). | `UpdateTicketRequest` o `TicketController::update` | Pendiente |
| **Alta** | Sanitización: no guardar HTML en subject/description; si se permite rich text, whitelist o Markdown. | Store/Update, frontend sin `dangerouslySetInnerHTML` | Revisar |
| **Media** | Adjuntos: whitelist de extensiones/MIME; sanitizar nombre de archivo (path traversal). | `TicketAttachmentController::store` | Pendiente |
| **Media** | CSRF/SPA: verificar Sanctum y CORS para rutas que modifican estado. | `config/sanctum.php`, `config/cors.php` | Revisar |
| **Baja** | Revisar que notas/historial no se rendericen con HTML crudo sin sanitizar. | `TicketDetalle.jsx` | Revisar |

---

## Implementado en este refuerzo

- **Rate limit** para el grupo de rutas de tickets (límite por usuario autenticado).
- **Auditoría de tickets** activada por defecto (`config/helpdesk.php`).
- **Validación** de longitud máxima en `description` al crear ticket (`StoreTicketRequest`).

---

## Próximos pasos recomendados

1. Crear migración con índices en `tickets` y `ticket_histories`.
2. Añadir handler de excepciones para respuestas JSON unificadas (422, 403, 404).
3. En frontend: mostrar `errors` por campo en formularios de ticket.
4. Definir SLA por tipo/prioridad y Job de recordatorios.
