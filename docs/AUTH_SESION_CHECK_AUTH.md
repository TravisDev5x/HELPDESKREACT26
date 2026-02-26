# Auth por sesión y /check-auth

## Principios

- **Un 401 en /login es normal.** El frontend no debe llamar `/check-auth` desde la página de login.
- **Un redirect HTML en una request AJAX es veneno.** El backend nunca redirige a login cuando la petición pide JSON (`Accept: application/json`); siempre responde 401 JSON.
- **Las cookies no significan sesión activa.** Pueden estar vacías o expiradas; el backend responde `{ authenticated: false }` en ese caso.

## Backend

- **GET /check-auth** está en `routes/web.php` (no en API).
- Middleware: solo `auth` (guard web). No `auth:api` ni `auth:sanctum`.
- Sin sesión y petición AJAX → **401** con `{ "authenticated": false }` (configurado en `bootstrap/app.php` con `renderable` para `AuthenticationException`).
- Con sesión → **200** con `{ "authenticated": true, "user", "roles", "permissions" }`.

## Frontend

- **No llamar /check-auth** desde rutas de invitado: `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`. En esas rutas se asume no autenticado y no se hace la petición.
- **Llamar /check-auth** solo al montar la app en rutas que no son de invitado, o después del login (p. ej. desde layout autenticado o `refreshUser()`).
- Axios: `withCredentials: true` (ya configurado por defecto en `@/lib/axios`).
- Ante **401**: no asumir autenticación; limpiar usuario y redirigir a login si aplica (el interceptor dispara `navigate-to-login`).

## Blindaje

- `/check-auth`: solo desde contexto donde la sesión puede existir (nunca desde login).
- Frontend: reacciona al 401 sin asumir que hay sesión.
- Backend: para requests que piden JSON, auth fallida = siempre JSON 401, nunca redirect HTML.
