# Fase 4 — Compatibilidad y accesibilidad (Recharts)

**Objetivo:** Garantizar que el dashboard con Recharts no tenga errores en consola, no parpadee, funcione en dark/light y sea accesible.

**Referencias:** [Fase 1](./DASHBOARD_RECHARTS_FASE1_ANALISIS.md), [Fase 2](./DASHBOARD_RECHARTS_FASE2_DISEÑO.md).

---

## Cambios realizados en código

### 1. Evitar errores en consola

- **DashboardHorizontalBar:** `items` se normaliza a array; cada ítem usa `label`/`value` con fallbacks (`String(...).trim() || "—"`, `Number(...) || 0`). El dominio del eje X es `[0, domainMax]` con `domainMax = Number.isFinite(maxValue) && maxValue > 0 ? maxValue : 1` para no pasar nunca NaN o cero inválido a Recharts.
- **DashboardStackedBar:** `states` y `total` se normalizan (`Array.isArray`, `Number(total) || 0`). Segmentos con `label`/`value` seguros. El eje usa `safeTotal`.
- **ChartErrorBoundary:** Si Recharts o el hijo lanzan, se captura el error, se registra en consola y se muestra el mensaje "No se pudo mostrar la gráfica" sin romper la página. MetricList y StateDistribution envuelven sus gráficas con este boundary.

### 2. Sin flicker

- **DashboardHorizontalBar:** Altura del contenedor fija: `chartHeight = Math.min(maxHeight, Math.max(120, data.length * 36))`, de modo que el espacio reservado es estable.
- **DashboardStackedBar:** Altura fija (`height={24}`). Empty state usa la misma altura.
- ResponsiveContainer recibe siempre un contenedor con dimensiones definidas.

### 3. Dark / light mode

- Tooltips usan clases que respetan el tema: `bg-card`, `border-border`, `text-foreground`, `text-muted-foreground`, `ring-border/50`.
- Etiquetas del eje Y en DashboardHorizontalBar usan `fill="hsl(var(--muted-foreground))"` para seguir el tema.
- Cursor del tooltip: `hsl(var(--muted))`. Sin colores fijos que fuercen un solo tema.

### 4. Contraste y tooltips discretos

- Tooltips: `shadow-md`, `ring-1 ring-border/50` para separación visual.
- Contenido: `font-medium text-foreground` para el label y `text-muted-foreground` para el valor, coherente con el resto del dashboard.

### 5. Fallback sin datos

- **MetricList:** Si `safeItems.length === 0`, se muestra el bloque existente (icono BarChart3 + "Sin datos registrados").
- **DashboardStackedBar:** Si no hay segmentos o `total === 0`, se muestra un div con "Sin datos", `role="status"` y `aria-live="polite"`.

### 6. Accesibilidad

- **DashboardHorizontalBar:** Contenedor con `role="img"` y `aria-label="Gráfico de barras horizontales con valores por categoría"`.
- **DashboardStackedBar:** Contenedor con `role="img"` y `aria-label="Distribución de estados en barra apilada"`. Empty state con `role="status"`, `aria-live="polite"` y `aria-label="Sin datos para la distribución de estados"`.
- **Tooltips:** `role="tooltip"` y `aria-hidden` (contenido complementario).
- **ChartErrorBoundary:** Fallback con `role="status"` y `aria-label="Error al mostrar la gráfica"`.

---

## Checklist de verificación manual (Fase 4)

| Verificación | Cómo comprobar |
|--------------|----------------|
| Sin errores en consola | Abrir DevTools → Console. Cargar el dashboard (admin con datos). Cambiar filtros, aplicar, limpiar. No debe aparecer ningún error. |
| Carga sin flicker | Recargar la página con el dashboard visible. Las cards de métricas no deben “saltar” ni parpadear de forma notable al reemplazar skeleton por gráficas. |
| Dark mode | Cambiar a tema oscuro (si la app lo permite). Revisar: tooltips, etiquetas de ejes, empty state y fallback del error boundary. Deben verse con contraste correcto. |
| Light mode | Mismo chequeo en tema claro. |
| Sin datos | Con filtros que devuelvan 0 tickets: MetricList muestra "Sin datos registrados"; StateDistribution muestra "Sin datos" en la barra y la leyenda vacía o sin segmentos. |
| Tooltips discretos | Pasar el ratón sobre barras: el tooltip debe mostrarse con el mismo contenido (label, valor; en estados, porcentaje) y no tapar la vista. |
| Fallback de error | (Opcional) Simular un error (p. ej. forzar un throw en el hijo del boundary): debe mostrarse "No se pudo mostrar la gráfica" y el resto del dashboard debe seguir funcionando. |

---

## Resultado esperado

- Dashboard visualmente equivalente o mejor.
- Métricas con Recharts estables y sin errores en consola.
- Compatible con dark/light.
- Fallbacks claros cuando no hay datos o hay error.
- Mejora de accesibilidad (roles y etiquetas ARIA) sin cambiar el flujo de uso.

**Principio rector:** Las gráficas son un detalle visual; si distraen, fallaron. Integración invisible para el usuario final.
