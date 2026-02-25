# Rendimiento (frontend y backend)

## Cambios ya aplicados

### Frontend

- **Code splitting (Vite):** Los módulos de `node_modules` se dividen en chunks (`react-vendor`, `router`, `ui-vendor`, `vendor`). La primera carga descarga menos JS y el navegador puede cachear cada chunk por separado.
- **AuthContext estable:** El valor del contexto y las funciones (`login`, `logout`, `can`, etc.) están memoizados con `useCallback`/`useMemo` para evitar re-renders en cascada en toda la app cuando solo cambia el usuario o el loading.
- **Rutas lazy:** Las páginas (Dashboard, Tickets, Users, etc.) se cargan bajo demanda con `React.lazy()`; solo se descarga el JS de la ruta que visitas.
- **Caché de catálogos (cliente):** La respuesta de `/api/catalogs` se guarda en `sessionStorage` 15 minutos para no repetir la misma petición en cada pantalla.
- **Tickets sin limpiar caché al montar:** En la página de Tickets se eliminó la llamada a `clearCatalogCache()` al montar, así la primera carga reutiliza catálogos en caché si ya se pidieron (p. ej. desde Dashboard o Users) y se evitan peticiones duplicadas a catálogos.

### Backend

- **Caché de catálogos (servidor):** La ruta `GET /api/catalogs` usa `Cache::remember()` por usuario (clave `catalogs.v1.{user_id}`) con TTL de 10 minutos. Así se evita ejecutar todas las consultas a BD en cada request; los catálogos se sirven desde caché (Redis/archivo según `CACHE_DRIVER`).

## Recomendaciones adicionales

### 1. Servir en producción con compresión (gzip/brotli)

En el servidor (Nginx, Apache o Laravel con middleware), activa compresión para JS/CSS. Los chunks se reducen mucho en tamaño por la red.

### 2. Build de producción

Siempre usar assets compilados en producción:

```bash
npm run build
```

Y en `.env`: `APP_ENV=production`. Así Vite genera chunks minificados y con hash.

### 3. Listas muy largas (Tickets, Users)

Si en Tickets o Users se muestran cientos de filas, considera **virtualización** (por ejemplo `@tanstack/react-virtual` o `react-window`) para renderizar solo las filas visibles y mejorar FPS al hacer scroll.

### 4. Imágenes

Si en el futuro hay muchas imágenes (avatares, adjuntos), usa `loading="lazy"` y tamaños adecuados (thumbnails) para no cargar imágenes pesadas de golpe.

### 5. Red

- Mantén **HTTP/2** (o HTTP/3) en el servidor para multiplexar peticiones.
- Revisa que el backend responda rápido en rutas pesadas (`/api/catalogs`, `/api/tickets`, analytics). Índices en BD y caché (Redis) en Laravel ayudan.

### 6. Herramientas

- **Lighthouse** (Chrome DevTools) para métricas y sugerencias.
- **React DevTools Profiler** para ver qué componentes se re-renderizan más y cuánto tardan.
