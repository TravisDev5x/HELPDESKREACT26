# Sugerencias para mejorar el dashboard de SIGUA

Resumen del estado actual y propuestas priorizadas (rápidas, medias, grandes).

---

## Estado actual

- **Filtros:** sede, sistema, fecha desde/hasta.
- **KPIs:** total cuentas, CA-01 vigentes/vencidos, bitácoras hoy, incidentes abiertos, alertas (panel expandible).
- **Gráficas:** barras (cuentas por sistema), pastel (estado CA-01), área (bitácoras 30 días — **vacía**, el backend no expone serie).
- **Panel:** lista de alertas (el backend no devuelve `alertas`, solo `alertas_bajas` en cache; el front espera `data.alertas`).

---

## 1. Correcciones rápidas (alinear backend y frontend)

### 1.1 Alertas en el dashboard

- **Problema:** El frontend usa `data?.alertas` pero el backend solo envía `alertas_bajas` (cache). La lista de alertas puede quedar vacía.
- **Sugerencia:** En `SiguaDashboardController`, incluir en la respuesta las alertas no resueltas desde `sigua_alertas` (por ejemplo últimas 10–20), con `tipo`, `titulo`, `descripcion`, `severidad`, y opcionalmente `id` para enlazar a `/sigua/alertas`.
- **Formato sugerido:**  
  `'alertas' => Alerta::noResueltas()->latest()->take(20)->get(['id','tipo','titulo','descripcion','severidad','sede_id','created_at'])`

### 1.2 Serie temporal “Bitácoras últimos 30 días”

- **Problema:** El área de “Bitácoras últimos 30 días” está vacía porque el backend no devuelve serie por día.
- **Sugerencia:** En el mismo controller (o en un método dedicado), exponer algo como `bitacoras_por_dia`: array de `{ fecha, total }` para los últimos 30 días (respetando filtros sede/sistema/fechas). El frontend ya tiene el `AreaChart` preparado; solo falta alimentarlo.

---

## 2. Mejoras de UX y claridad

### 2.1 Accesos rápidos desde KPIs

- Hacer que cada KPI sea clicable y lleve a la pantalla correcta:
  - **Total cuentas** → `/sigua/cuentas` (con filtro de sistema si hay uno seleccionado).
  - **CA-01 vigentes** → `/sigua/ca01`.
  - **Bitácoras hoy** → `/sigua/bitacora` (filtro fecha = hoy).
  - **Incidentes abiertos** → `/sigua/incidentes` (filtro estado abierto).
  - **Alertas** → `/sigua/alertas`.
- Opción: envolver el valor en un `<Link>` o un botón “Ver detalle” además del ícono de expandir.

### 2.2 Indicador de “última actualización”

- Mostrar “Actualizado hace X min” o timestamp junto al botón “Refrescar” y actualizarlo después de cada `refetch`.
- Opcional: refresco automático cada 5–10 minutos cuando la pestaña esté visible (por ejemplo con `useInterval` o similar).

### 2.3 Filtros colapsables en móvil

- En pantallas pequeñas, mostrar los filtros en un acordeón o drawer “Filtros” para ganar espacio y mantener los KPIs y gráficas visibles de un vistazo.

### 2.4 Severidad en las alertas del panel

- Usar `severidad` (critical / warning / info) para dar estilo al ítem: borde/icono rojo para critical, ámbar para warning, azul para info. Así se prioriza mejor desde el dashboard.

---

## 3. Contenido y métricas adicionales

### 3.1 KPI “Cuentas sin CA-01” o “Genéricas sin responsable”

- Métrica útil para cumplimiento. Backend: contar cuentas genéricas activas sin CA-01 vigente (ya existe lógica en `AlertaService`). Incluirla en la respuesta del dashboard y un KPI con variante `warning` si > 0, con enlace a cuentas o alertas.

### 3.2 KPI “Último cruce” / “Anomalías pendientes”

- Mostrar fecha del último cruce y cantidad de resultados con `requiere_accion`. Fuente: tabla de cruces y `sigua_cruce_resultados`. Enlace a `/sigua/cruces`.

### 3.3 Gráfica “Distribución por sede”

- El backend ya devuelve `distribucion_por_sede`. Añadir en el frontend una gráfica (barras horizontales o pastel) con “Cuentas por sede” para ver dónde se concentra el volumen.

### 3.4 Cumplimiento de bitácora (por sede/sistema)

- Si `BitacoraService::obtenerCumplimiento()` está disponible, el dashboard podría exponer un resumen (por ejemplo “% días con registro en últimos 30 días” por sede o sistema) y mostrarlo como KPI o mini-tabla “Cumplimiento bitácora”.

---

## 4. Visual y jerarquía

### 4.1 Orden y agrupación de KPIs

- Agrupar por bloques: “Cuentas y sistemas”, “CA-01 y bitácora”, “Incidentes y alertas”. Títulos de sección opcionales para escaneo rápido.

### 4.2 Colores por sistema

- Si los sistemas tienen `color` (hex), usarlo en la barra “Cuentas por sistema” y en leyendas para identificar cada sistema de un vistazo.

### 4.3 Estado vacío más claro

- Cuando no hay datos (por filtros o por sistema nuevo), mostrar un mensaje explícito: “No hay datos para los filtros seleccionados” o “Aún no hay registros en este sistema” con sugerencia de limpiar filtros o ir a Importar/Bitácora.

---

## 5. Rendimiento y técnica

### 5.1 Cache del dashboard (backend)

- Para muchos sistemas/sedes, el endpoint del dashboard puede ser costoso. Valorar cache corto (1–5 min) por clave de filtros (`sigua_dashboard_{sede}_{sistema}_{desde}_{hasta}`) e invalidar al importar/cruzar/crear alertas relevantes.

### 5.2 Respuesta única para alertas + bitácoras por día

- Incluir en el mismo `index()` del dashboard:
  - `alertas` (lista reciente no resueltas),
  - `bitacoras_por_dia` (serie 30 días),
  - y opcionalmente `distribucion_por_sede` si aún no se usa en el front.
Así se evitan llamadas extra y el dashboard se pinta en un solo round-trip.

### 5.3 Skeleton por bloques

- Mantener el skeleton actual pero alineado con la nueva estructura (KPIs, gráfica barras, gráficas segunda fila, panel alertas) para que el layout no “salte” al cargar.

---

## 6. Priorización sugerida

| Prioridad | Mejora | Esfuerzo | Impacto |
|-----------|--------|----------|---------|
| Alta | Incluir `alertas` reales en el dashboard (backend) | Bajo | Alto |
| Alta | Serie “Bitácoras últimos 30 días” (backend + conectar front) | Medio | Alto |
| Media | KPIs clicables con enlace a pantalla correspondiente | Bajo | Medio |
| Media | KPI “Genéricas sin CA-01” y “Último cruce / anomalías” | Medio | Medio |
| Media | Gráfica “Cuentas por sede” con `distribucion_por_sede` | Bajo | Medio |
| Baja | Colores por sistema en gráficas | Bajo | Bajo |
| Baja | Filtros colapsables en móvil | Bajo | Bajo |
| Baja | Cache del endpoint dashboard | Medio | Medio (si hay muchos datos) |

---

## Resumen

- **Arreglos inmediatos:** que el backend devuelva `alertas` desde `sigua_alertas` y, si se puede, `bitacoras_por_dia` para rellenar la gráfica de 30 días.
- **Mejoras de uso:** enlaces desde KPIs, severidad en alertas, “última actualización”, y mejor estado vacío.
- **Más valor:** métricas de cumplimiento (genéricas sin CA-01, último cruce/anomalías), gráfica por sede, y opcionalmente cache del dashboard.

Si quieres, el siguiente paso puede ser implementar solo las de prioridad alta (alertas + serie bitácoras 30 días) en backend y conectar el frontend actual sin cambiar aún el resto del diseño.
