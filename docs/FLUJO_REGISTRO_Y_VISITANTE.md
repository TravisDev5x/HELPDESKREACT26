# Flujo de registro y acceso como visitante

## Registro con correo

1. El usuario se registra en `/register` con **correo** (opcional en backend y frontend; se acepta cualquier dirección de correo).
2. **Backend** (`AuthController::register`):
   - Crea el usuario con `status = pending_email`.
   - Genera un token de verificación (24 h de validez) en `email_verification_tokens`.
   - Envía un **correo** con enlace a la SPA: `{APP_URL}/verify-email?token={token}`.
3. El usuario **no puede iniciar sesión** hasta verificar el correo (login rechaza `pending_email`).

## Verificación de correo

1. El usuario hace clic en el enlace del correo → abre la SPA en `/verify-email?token=...`.
2. La página llama a `GET /api/register/verify?token=...`.
3. **Backend** (`AuthController::verifyEmail`):
   - Valida el token y que no esté expirado.
   - Marca `email_verified_at = now()` y **`status = pending_admin`** (no `active`).
   - Crea o reutiliza el rol **visitante** (solo permiso `tickets.view_own`) y lo asigna al usuario.
   - Elimina el token usado.
4. Respuesta: *"Correo verificado. Ya puedes iniciar sesión y ver el panel como visitante. Un administrador te asignará un rol para interactuar."*

## Acceso como visitante

- El usuario **sí puede iniciar sesión** (solo se bloquean `pending_email` y `blocked`).
- Tiene rol **visitante**: solo permiso `tickets.view_own` (lectura de sus propios tickets; sin tickets aún).
- Ve el **dashboard de solicitante en solo lectura**:
  - Saludo, reloj, día, “Mis tickets” (vacío), calendario, actividad reciente.
  - **No** ve el botón “Crear ticket” ni “Crear mi primer ticket”.
  - Mensaje: *"Modo solo lectura. Un administrador te asignará un rol para crear y gestionar solicitudes."*
- **No** ve el overlay de “Un administrador asignará un rol” (ese overlay solo se muestra cuando está pendiente de rol y **no** tiene el rol visitante).

## Cuando un admin asigna un rol

- En **Usuarios**, el admin edita al usuario y le asigna un rol (ej. usuario, soporte, admin).
- Se hace `syncRoles([nuevoRol])` (se sustituye “visitante” por el nuevo rol).
- Si el usuario estaba en `pending_admin` y ahora tiene al menos un rol **distinto de solo visitante**, se actualiza **`status = active`**.
- A partir de ahí el usuario ve e interactúa según los permisos del rol asignado (crear tickets, ver área, etc.).

## Registro sin correo

- Si el usuario se registra **sin correo**: `status = pending_admin` y **no** se envía correo.
- No tiene rol hasta que un admin le asigne uno.
- Puede iniciar sesión y ve el **overlay** “Un administrador asignará un rol…” (no tiene permiso visitante).

## Envío del correo

- Se usa la plantilla `emails/verify-email.blade.php` y la clase `App\Mail\VerifyEmail`.
- La URL del enlace debe ser la de la **SPA** (`/verify-email?token=...`) para que el usuario vea la página de éxito y no JSON.
- Si el envío falla, se registra en log y la respuesta al registro indica que no se pudo enviar el correo (el usuario sigue en `pending_email` hasta verificar por otro medio o reenvío).
