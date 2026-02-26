# Fase 1 — Análisis: Dashboard Principal (Recharts)

**Objetivo:** Analizar el Dashboard actual para integrar Recharts solo en la visualización de métricas, sin romper comportamiento ni estructura.

**Regla:** No modificar código en esta fase. No instalar dependencias aún.

---

## 1. Estructura del Dashboard

El Dashboard se compone de **tres vistas** según permisos:

| Vista | Condición | Archivo |
|-------|-----------|---------|
| **DashboardSolicitante** | Solo `create` o `view_own` (sin `manage_all` ni `view_area`) | `Dashboard.jsx` |
| **DashboardIntermedio** | `view_area` sin `manage_all` | `Dashboard.jsx` |
| **Dashboard (admin)** | `manage_all` o equivalente | `Dashboard.jsx` |

Todas viven en **un único archivo:** `resources/js/Pages/Dashboard.jsx`.

---

## 2. Componentes que renderizan métricas

### 2.1 SummaryMetric (líneas 70–99)

- **Rol:** Card de un solo número (KPI): label, value, icono, helper opcional.
- **Datos:** Props `label`, `value`, `icon`, `helper`, `variant` (default | destructive | success).
- **Estructura:** `<Card>` → `<CardContent className="p-5 flex items-start justify-between">` → texto (label, value, helper) + icono en contenedor redondeado.
- **Estilos:** Tailwind: `text-[10px] uppercase`, `text-2xl font-bold`, `text-muted-foreground`, variantes por `variant` (bordes y fondos emerald/red/default).
- **Estados:** No tiene loading/empty propios; el padre controla el valor (puede ser "—", "N/A", 0).
- **Visual:** Solo número + icono. **No usa barras ni gráficas.** No es candidato a Recharts (a menos que se quiera un mini sparkline opcional; el prompt pide reemplazar “visualización interna” de métricas con barras/rankings).

**Decisión:** **NO sustituir** por Recharts. Mantener como está.

---

### 2.2 MetricList (líneas 101–154)

- **Rol:** Card con lista de ítems con **barra horizontal** por ítem (ranking).
- **Datos:** Props `title`, `icon`, `items` (array de `{ label, value }`), `total`, `className`.
- **Origen de datos:**
  - **Dashboard admin:** `data.top_resolvers`, `data.areas_receive`, `data.areas_resolve`, `data.types_frequent`, `data.types_resolved` (API `GET /api/tickets/analytics`).
  - **Dashboard intermedio:** `typesFrequent`, `topRequesters` (API `GET /api/tickets/analytics` con `assigned_to: "me"`).
- **Estructura:**
  - **Header:** `CardHeader` con `CardTitle` (icono + title), `pb-3 border-b bg-muted/10 px-4 py-3`.
  - **Body:** `CardContent p-0` → div `max-h-[300px] overflow-y-auto p-4 space-y-4`. Por ítem: label + valor numérico + barra (`h-1.5 bg-muted rounded-full` con div interno `width: ${pct}%`, `bg-primary/70 group-hover:bg-primary`).
- **Cálculo visual:** `maxValue = max(items.value)`, `pct = (value / maxValue) * 100`. Los valores **no** vienen normalizados; se normalizan en cliente para el ancho de la barra.
- **Empty:** `items` vacío → icono `BarChart3`, texto "Sin datos registrados", `py-8`, `opacity-50`.
- **Estados:** Sin loading propio; el padre puede pasar `items=[]` mientras carga.

**Candidato Recharts:** Sí. Sustituir **solo el cuerpo** (el bloque que mapea `items` a barras) por un componente Recharts (p. ej. barra horizontal). Mantener la misma Card, header y contrato de props.

---

### 2.3 StateDistribution (líneas 156–216)

- **Rol:** Card con **barra apilada** (stacked bar) por estado + leyenda en grid.
- **Datos:** Props `states` (array de `{ label, value }`), `total` (número).
- **Origen:** Dashboard admin: `statesSorted` (derivado de `data.states` ordenado por value desc), `totalTickets` (suma de values). API `GET /api/tickets/analytics`.
- **Estructura:**
  - **Header:** `CardHeader` con título "Distribución de Estados", descripción, `Badge` con total.
  - **Body:**  
    1) Barra apilada: `h-6 w-full rounded-md flex` con segmentos `div` con `width: ${pct}%`, `STATE_COLORS[idx % 8]`, segmentos con pct &lt; 1 ocultos. Tooltip nativo `title`.  
    2) Leyenda: grid `grid-cols-2 md:grid-cols-4 lg:grid-cols-6`, ítems con punto de color + label + "value (pct%)".
- **Cálculo:** `pct = (value / total) * 100`. Los valores vienen en unidades absolutas; el porcentaje se calcula en cliente.
- **Colores:** `STATE_COLORS` (array de 8 clases Tailwind: sky, emerald, amber, rose, indigo, teal, orange, violet con variantes dark).
- **Empty:** `states` vacío → div "Sin datos" dentro de la barra.
- **Estados:** Sin loading propio.

**Candidato Recharts:** Sí. Sustituir la barra apilada (y opcionalmente la leyenda si Recharts la genera) por un `BarChart` apilado o equivalente. Mantener la misma Card, header y props.

---

### 2.4 DashboardSkeleton (líneas 218–230)

- **Rol:** Loading global del dashboard (grid de Skeleton).
- **No tocar.** No es una métrica con gráfica.

---

### 2.5 Cards “a mano” en DashboardSolicitante (líneas 568–636, 624–636)

- **Métricas:** 4 cards de KPIs (Tickets realizados, Resueltos, Cancelados, “Quien te resuelve más”) y una card “Tipos de ticket que más envías” (lista con Badge, sin barras).
- **Datos:** `stats` (total, resolved, cancelled), `topResolver`, `top5Types` (calculados en cliente desde `tickets` de `GET /api/tickets`).
- **Visual:** Card + CardContent con número/etiqueta; “Tipos que más envías” es lista `<ul>` con Badge. **No hay barras horizontales.**
- **Decisión:** **NO sustituir** por Recharts (sin gráfica de barras). Opcional: si en el futuro “Tipos que más envías” se convierte en barra, sería candidato.

---

## 3. Flujo de datos

### 3.1 Dashboard admin (manage_all)

- **API:** `GET /api/tickets/analytics` con query params (filtros: date_from, date_to, ticket_state_id, priority_id, ticket_type_id, area_current_id, sede_id).
- **Estado:** `data` (respuesta JSON), `loading`, `error`, `appliedFilters`, `filters`, `catalogs`. Persistencia: `localStorage` para `dashboard.filters`.
- **Respuesta esperada (contrato):**  
  `states`, `burned`, `areas_receive`, `areas_resolve`, `top_resolvers`, `types_frequent`, `types_resolved`, `top_requesters`, `avg_resolution_hours`.  
  Cada lista es array de `{ label: string, value: number }` (excepto `burned` y `avg_resolution_hours` que son números).

### 3.2 Dashboard intermedio (view_area)

- **APIs:** `GET /api/tickets/summary` (varios rangos) y `GET /api/tickets/analytics` con `assigned_to: "me"`.
- **Estado:** `summary`, `analytics`, `summaryLast7`, `summaryLast30`, `summaryPrev7`, `loading`, `error`.
- **Uso de métricas:** `SummaryMetric` (no Recharts) y **MetricList** con `types_frequent` y `top_requesters`.

### 3.3 Dashboard solicitante

- **API:** `GET /api/tickets` (mis tickets), `GET /api/notifications`. No usa MetricList ni StateDistribution en la implementación actual; solo cards numéricas y lista de tipos con Badge.

---

## 4. Resumen: qué es solo visual (sustituible por Recharts)

| Componente | Qué sustituir | Qué mantener |
|------------|----------------|--------------|
| **MetricList** | El **body**: el `<div>` que hace `safeItems.map` con la barra horizontal (`h-1.5 bg-muted` + div con `width: pct%`). | Card, CardHeader (título, icono), CardContent contenedor, props `title`, `icon`, `items`, `total`, `className`. Comportamiento empty (BarChart3 + "Sin datos registrados"). |
| **StateDistribution** | El **body**: la barra apilada (div flex con segmentos por estado) y, si se desea, la leyenda (o dejarla generada por Recharts). | Card, CardHeader (título, descripción, Badge total), props `states`, `total`. Colores STATE_COLORS. Comportamiento empty ("Sin datos"). |

---

## 5. Qué NO debe modificarse

- **Estructura del dashboard:** Tres ramas (solicitante / intermedio / admin), orden de bloques, barra de filtros, botones Refrescar/Exportar.
- **Lógica de negocio:** `buildParams`, `loadAnalytics`, `applyFilters`, `clearFilters`, uso de `appliedFilters`/`filters`, persistencia en `localStorage`.
- **APIs y contratos:** Parámetros y formato de respuesta de `/api/tickets/analytics` y `/api/tickets/summary`. No cambiar nombres de propiedades (`states`, `top_resolvers`, etc.).
- **Permisos y rutas:** Decisión de qué vista mostrar según `can()`. No tocar AuthContext ni rutas.
- **SummaryMetric:** Sin cambios (no es gráfica).
- **DashboardSkeleton:** Sin cambios.
- **DashboardWelcome:** Sin cambios.
- **Cards del solicitante** (KPIs + lista “Tipos que más envías”): Sin cambios, salvo que se decida añadir una gráfica opcional más adelante.
- **Estados de carga/error:** El dashboard ya controla loading/error a nivel de vista; los componentes de métricas no deben duplicar esa lógica ni cambiar el contrato de datos para “adaptar” a Recharts (misma forma de datos).

---

## 6. Valores y normalización

- **MetricList:** Los valores son **conteos** (enteros). Se normalizan en cliente: `pct = (value / maxValue) * 100` para el ancho de la barra. Recharts puede recibir los mismos `items` y hacer barra horizontal (ej. valor = value, o normalizar internamente).
- **StateDistribution:** Los valores son **conteos**. Porcentaje = `(value / total) * 100`. Segmentos &lt; 1% se ocultan. Recharts puede recibir `states` y `total` y generar stacked bar con los mismos porcentajes.

---

## 7. Estilos Tailwind relevantes (conservar aspecto)

- **MetricList:**  
  Header: `text-xs font-bold uppercase tracking-wider text-muted-foreground`, `bg-muted/10`, `border-b`, `px-4 py-3`.  
  Body: `max-h-[300px]`, `p-4 space-y-4`, barra `h-1.5 bg-muted rounded-full`, fill `bg-primary/70` / `group-hover:bg-primary`, label `text-xs font-medium`, valor `font-mono text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded text-[10px]`.
- **StateDistribution:**  
  Barra: `h-6`, `rounded-md`, `ring-1 ring-border/50`, segmentos con `STATE_COLORS`, `border-r border-background/20`. Leyenda: `grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3`, ítem `bg-muted/20 p-2 rounded border border-border/30`, punto `h-2.5 w-2.5 rounded-full`, texto `text-[10px]`.

---

## 8. Riesgos si se cambia más de lo indicado

- Cambiar la forma de los datos (`items`/`states`) obligaría a transformar en el padre o en el API y podría romper otros consumidores o el contrato documentado.
- Unificar o reescribir las Cards completas (header + body) aumenta el riesgo de regresiones en layout y accesibilidad.
- Introducir animaciones llamativas o temas nuevos contradice el principio “las gráficas son un detalle visual; si distraen, fallaron”.

---

## 9. Conclusión para Fase 2

- **Candidatos a Recharts:** Solo **MetricList** (cuerpo: barras horizontales) y **StateDistribution** (cuerpo: barra apilada + leyenda).
- **Contrato:** Mismas props, mismos datos (`items`/`states` + `total`), mismos estados empty. Recharts solo como motor de render de la parte gráfica dentro de la Card existente.
- **No tocar:** SummaryMetric, skeleton, welcome, filtros, APIs, permisos, estructura de las tres vistas.
