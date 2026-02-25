# UX y confort: que el sistema se sienta vivo

## Cambios ya aplicados

### 1. Transición suave al cambiar de página
- Al navegar entre rutas (Tickets → Detalle → Usuarios, etc.) el contenido hace un **fade-in breve** (0,25 s) en lugar de un corte seco.
- Quien tenga **preferencia de movimiento reducido** (`prefers-reduced-motion: reduce`) no ve la animación; se respeta accesibilidad.

### 2. Indicador "Última actualización" (Tickets)
- En la lista de tickets, junto al botón de actualizar, se muestra **"Actualizado HH:MM"** después de cada carga.
- Da sensación de datos frescos y permite saber cuándo fue la última vez que se refrescó.

### 3. Toasts con estado (promise)
- Al **crear un ticket** el toast muestra: "Creando ticket…" → "Ticket creado correctamente" (o el mensaje de error).
- El usuario ve el progreso en un solo aviso en lugar de pantalla congelada y luego otro mensaje.

### 4. Respeto a `prefers-reduced-motion`
- La animación de transición de página se desactiva si el sistema o el navegador indican que el usuario prefiere menos movimiento.

---

## Ideas para seguir mejorando

### Feedback inmediato
- Usar **notify.promise** en más acciones (guardar usuario, reasignar ticket, cambiar estado) para unificar "Cargando… → Éxito/Error".
- **Botones con estado**: mostrar spinner en el botón que dispara la acción y deshabilitarlo hasta que termine.

### Estados vacíos amigables
- En listas vacías (sin tickets, sin usuarios, etc.), un **mensaje claro** + **acción sugerida** (ej. "Aún no hay tickets. Crea el primero." con botón "Crear ticket").
- Opcional: ilustración o icono grande para que la pantalla no se vea fría.

### Orientación
- **Breadcrumbs** en páginas profundas (ej. Tickets > #123) para que el usuario sepa dónde está y pueda volver con un clic.
- **Título de página** en `<title>` y en el header según la ruta (ya hay títulos por vista; revisar que estén en el documento).

### Sensación de datos vivos
- **"Actualizado hace X min"** en más listados (Usuarios, Incidencias) con el mismo patrón que en Tickets.
- Opcional: **auto-refresh suave** cada N minutos en listados (con aviso "Datos actualizados") o solo un botón "Actualizar" muy visible.

### Atajos y eficiencia
- **Atajo de teclado** para búsqueda global o para "Crear ticket" (ej. Ctrl+K) y mostrarlo en un tooltip o en el pie del layout.
- **Acciones rápidas** desde la lista (ej. cambiar estado sin entrar al detalle) para usuarios avanzados.

### Consistencia y calma
- **Mensajes de error** en lenguaje claro y con siguiente paso (ej. "No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.").
- **Confirmaciones** solo cuando la acción es destructiva o irreversible; evitar preguntar en acciones reversibles para no frenar el flujo.

### Accesibilidad
- Revisar **focus** al abrir/cerrar modales (devolver el foco al botón que abrió el diálogo).
- Asegurar **contraste** suficiente en badges y textos secundarios (ya cubierto en buena parte por shadcn/tokens).

---

## Resumen

Con transiciones suaves, indicador de última actualización, toasts con estado y respeto a movimiento reducido, la app gana en **claridad, feedback y confort**. Las ideas anteriores permiten seguir iterando sin grandes cambios de arquitectura.
