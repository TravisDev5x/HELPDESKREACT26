# Verificación: Posición de la Sidebar

## Checklist de testing manual

- [ ] **Default**: Con usuario nuevo o sin preferencia, la sidebar aparece a la **izquierda**.
- [ ] **Settings**: En Configuración → Barra lateral, se muestran los botones "Izquierda" y "Derecha"; el actual está resaltado.
- [ ] **Cambio inmediato**: Al elegir "Derecha", la sidebar se mueve a la derecha sin recargar; el contenido principal queda a la izquierda.
- [ ] **Persistencia**: Tras elegir "Derecha" y recargar la página, la sidebar sigue a la derecha (localStorage y, si aplica, usuario guardado).
- [ ] **Colapsar/expandir**: Con sidebar a la derecha, colapsar y expandir sigue funcionando (ancho y hamburguesa).
- [ ] **Tooltips**: Con sidebar a la derecha, los tooltips de ítems colapsados se abren a la **izquierda** del icono (hacia el contenido).
- [ ] **Catálogos (dropdown)**: Con sidebar a la derecha, el menú desplegable de catálogos (colapsado) se abre hacia la **izquierda**.
- [ ] **Tema AdminLTE Legacy**: Con sidebar a la izquierda, el borde de la barra es el derecho (inline-end); con sidebar a la derecha, el borde es el izquierdo (inline-start). Colores y contraste se mantienen.
- [ ] **Otros temas**: light, dark, light-dim, aeroglass, aeroglass-dark: comprobar que la barra se ve correctamente en izquierda y en derecha (borde y espaciado).
- [ ] **Móvil**: El Sheet de la sidebar (menú hamburguesa en header) sigue abriendo desde la izquierda; el contenido del Sheet respeta la posición para tooltips/bordes si se usa la misma preferencia.
- [ ] **Guardar preferencias**: En Settings, al cambiar posición y pulsar "Guardar", la preferencia se persiste en el backend (y en siguiente carga viene del usuario).
- [ ] **Accesibilidad**: Navegación por teclado y foco no se rompen al cambiar de posición; `aria-label` del botón hamburguesa sigue siendo correcto.

## Propiedades CSS migradas a lógicas / condicionales

| Ubicación | Antes | Después |
|----------|--------|--------|
| `app.css` AdminLTE `[data-sidebar="main"]` | `border-right-color` | `border-inline-end-color` + fallback `border-right-color` |
| `app.css` AdminLTE posición derecha | — | `[data-sidebar-position="right"]` → `border-inline-start-color` |
| `AppLayout.jsx` contenedor Sidebar | `border-r` fijo | `border-r` cuando left, `border-l` cuando right (según `sidebarPosition`) |

## Variables CSS para temas (documentación)

Si se crean o ajustan temas y se quiere respetar la posición de la sidebar:

- **`--sidebar-width`**: ancho expandido (por defecto `16rem`).
- **`--sidebar-width-collapsed`**: ancho colapsado (por defecto `72px`).
- El layout usa el atributo **`data-sidebar-position="left"`** o **`data-sidebar-position="right"`** en el contenedor flex principal.
- La sidebar tiene **`data-sidebar="main"`**. Para bordes según posición:
  - Por defecto (izquierda): usar **`border-inline-end`** (o `border-right` en LTR) para el borde que toca el contenido.
  - Cuando **`[data-sidebar-position="right"]`**: usar **`border-inline-start`** (o `border-left` en LTR) para ese borde.
- No es obligatorio definir estas variables; si no se definen, se usa el comportamiento por defecto (sidebar a la izquierda y bordes actuales).
