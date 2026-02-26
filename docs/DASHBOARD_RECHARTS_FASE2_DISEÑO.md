# Fase 2 — Diseño de integración con Recharts

**Objetivo:** Definir cómo integrar Recharts en el Dashboard como motor de visualización únicamente, sin cambiar estructura, datos ni comportamiento.

**Referencia:** [Fase 1 — Análisis](./DASHBOARD_RECHARTS_FASE1_ANALISIS.md).

---

## 1. Principios del diseño

| Principio | Aplicación |
|-----------|------------|
| Recharts solo como motor de visualización | Gráficas dentro del cuerpo de las Cards; las Cards de shadcn siguen siendo el contenedor. |
| Mismos datos | Consumir `items` / `states` y `total` sin transformación de contrato; opcionalmente mapear a formato Recharts (name/value) en el componente de gráfica. |
| Colores desde el tema | Usar variables CSS (Tailwind) o paleta derivada de `STATE_COLORS` / `primary` / `muted` para que dark/light sigan funcionando. |
| Gráficas sobrias | Sin animaciones agresivas; opcionalmente animación suave y corta. Sin ejes innecesarios si la gráfica es compacta. |
| Prohibido | Cambiar estructura del dashboard, alterar contratos de datos, introducir temas visuales nuevos, duplicar lógica existente. |

---

## 2. Componentes a crear (aislados y reutilizables)

### 2.1 DashboardHorizontalBar

- **Ubicación sugerida:** `resources/js/components/dashboard/DashboardHorizontalBar.jsx` (o `@/components/dashboard/DashboardHorizontalBar.jsx`).
- **Props (contrato):**  
  `items`: array de `{ label, value }` (igual que MetricList).  
  `className`: opcional (contenedor).  
  `maxHeight`: opcional (ej. para coincidir con `max-h-[300px]`).  
  `barColor`: opcional (string o función); por defecto usar `hsl(var(--primary))` o equivalente para coincidir con `bg-primary/70`.
- **Responsabilidad:**  
  Renderizar un gráfico de **barras horizontales** con Recharts (`BarChart`, `Bar`, `XAxis`, `YAxis`, `Cell` si hace falta por color).  
  - Eje Y: labels (truncados si es necesario).  
  - Eje X: valores (o oculto si se usa solo ancho de barra).  
  - Barras: misma información que ahora (label + valor numérico visible).  
  - Empty: si `items.length === 0`, no renderizar gráfica; el padre (MetricList) sigue mostrando el fallback "Sin datos registrados".
- **Datos:** Normalización interna: `items` → array para Recharts (ej. `name: item.label, value: item.value`). El máximo para escala puede ser `Math.max(...items.map(i => i.value))` como ahora.
- **Estilo:** Colores desde CSS vars / Tailwind (primary, muted). Tipografía discreta (text-xs). Sin leyenda externa si la barra ya muestra el valor.

### 2.2 DashboardStackedBar (Distribución de estados)

- **Ubicación sugerida:** `resources/js/components/dashboard/DashboardStackedBar.jsx`.
- **Props (contrato):**  
  `states`: array de `{ label, value }`.  
  `total`: número.  
  `colors`: opcional; array de clases Tailwind o colores CSS; por defecto la paleta STATE_COLORS (mapeada a hex o CSS var si Recharts lo requiere).  
  `height`: opcional (ej. 24px para mantener `h-6`).
- **Responsabilidad:**  
  Renderizar una **barra apilada** (stacked bar) con Recharts. Cada segmento = (value / total) * 100. Segmentos con pct &lt; 1% se pueden ocultar (como ahora).  
  Tooltip discreto: estado, valor, porcentaje.
- **Leyenda:**  
  Opción A: Leyenda generada por Recharts (si existe y es configurable).  
  Opción B: Mantener la leyenda actual en grid (CardContent debajo de la barra) y solo reemplazar el div de la barra por el componente Recharts. Así se conserva el mismo layout (grid 2/4/6 columnas, estilos `bg-muted/20`, etc.).
- **Empty:** Si `states.length === 0` o `total === 0`, el componente no dibuja barras; el padre muestra "Sin datos".

---

## 3. Integración en los componentes existentes

### 3.1 MetricList

- **Antes:** En el body, `safeItems.map` con div + barra (`h-1.5 bg-muted` + div con `width: pct%`).
- **Después:**  
  - Mismo Card, CardHeader, CardTitle (icono + title).  
  - CardContent: mismo contenedor (`max-h-[300px] overflow-y-auto p-4`).  
  - Dentro: si `safeItems.length === 0`, mismo empty (BarChart3 + "Sin datos registrados").  
  - Si hay items: renderizar `<DashboardHorizontalBar items={safeItems} className="..." maxHeight={300} />` (o altura que preserve el aspecto).  
- **Props de MetricList:** Sin cambios (`title`, `icon`, `items`, `total`, `className`). No añadir props obligatorios nuevos; opcionalmente `useRecharts={true}` para poder hacer A/B o rollback.

### 3.2 StateDistribution

- **Antes:** Barra apilada con divs + leyenda en grid.
- **Después:**  
  - Mismo Card, CardHeader (título, descripción, Badge con total).  
  - CardContent:  
    1) `<DashboardStackedBar states={safeStates} total={total} height={24} />` (o el height que equivalga a `h-6`).  
    2) Leyenda: mantener el grid actual (mismos ítems, mismos estilos) para no romper layout ni accesibilidad.  
  - Empty: si `safeStates.length === 0`, mismo mensaje "Sin datos" en la barra (o delegado al componente Recharts que devuelva un placeholder).
- **Props de StateDistribution:** Sin cambios (`states`, `total`).

---

## 4. Colores y tema (dark/light)

- **Recharts** suele aceptar colores por nombre, hex o función. Para mantener compatibilidad con Tailwind y dark mode:
  - Opción 1: Definir una paleta en JS que refleje las clases de Tailwind (ej. para STATE_COLORS: valores hex o `hsl(var(--chart-1))` si se definen variables en CSS).  
  - Opción 2: Leer en runtime el computed style de un elemento con la clase Tailwind (más frágil).  
  - Opción 3: Definir en el tema del proyecto (o en un archivo de constantes) un array de colores para gráficas que coincida visualmente con `STATE_COLORS` y con `primary`/`muted`, y pasarlos a los componentes.  
- **Recomendación:** Archivo `resources/js/lib/chartColors.js` (o dentro de cada componente) que exporte:
  - `stateDistributionColors`: array de 8 colores (hex o CSS vars) equivalentes a STATE_COLORS.
  - `primaryBarColor`: para barras horizontales de MetricList (equivalente a `bg-primary/70`).
- Así dark/light se mantiene si esos colores se basan en variables CSS del tema (ej. `--primary`, `--muted`).

---

## 5. Comportamiento y accesibilidad

- **Tooltips:** Discretos; mismo contenido que ahora (label, valor, y en StateDistribution porcentaje). Sin retrasos largos.
- **Empty:** Sin datos → mismo mensaje y mismo icono/estilo que hoy; no dejar un espacio en blanco.
- **Responsive:** El contenedor de la gráfica debe respetar el mismo `max-h-[300px]` y el grid existente para que no haya overflow ni flicker.
- **Fallback:** Si Recharts falla o no está disponible, se puede envolver en error boundary y mostrar el bloque visual anterior (divs con barras) como fallback; en Fase 3 se puede decidir si es necesario.

---

## 6. Dependencia

- **recharts** (versión estable reciente, ej. ^2.x).  
  Instalación en Fase 3: `npm install recharts`.

---

## 7. Resumen para Fase 3 (implementación)

1. Instalar **recharts**.
2. Crear **DashboardHorizontalBar**: recibe `items` (`{ label, value }`), opcionalmente `barColor`, `maxHeight`. Renderiza BarChart horizontal. Empty manejado por el padre (MetricList).
3. Crear **DashboardStackedBar**: recibe `states`, `total`, opcionalmente `colors`, `height`. Renderiza barra apilada. Leyenda se mantiene en StateDistribution como está.
4. (Opcional) Añadir **chartColors.js** con paleta y primary para Recharts.
5. En **MetricList**: sustituir solo el bloque del map de barras por `<DashboardHorizontalBar items={safeItems} />` cuando hay items; mantener header y empty.
6. En **StateDistribution**: sustituir solo el div de la barra apilada por `<DashboardStackedBar states={safeStates} total={total} />`; mantener leyenda en grid.
7. Verificación (Fase 4): mismo aspecto, mismos datos, sin errores en consola, dark/light correcto, tooltips discretos, fallback sin datos.

**Principio rector:** Las gráficas son un detalle visual; si distraen, fallaron. Integración invisible para el usuario final.
