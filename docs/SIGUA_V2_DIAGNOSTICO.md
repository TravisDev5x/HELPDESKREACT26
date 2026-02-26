# Diagnóstico completo — SIGUA v2 post-upgrade

Fecha: 2026-02-26

---

## BACKEND — BD

### 1. Migraciones sigua (migrate:status)

Todas las migraciones SIGUA están en estado **Ran** (ejecutadas):

- `2026_02_25_100100_create_sigua_systems_table`
- `2026_02_25_100101_create_sigua_accounts_table`
- `2026_02_25_100102_create_sigua_ca01_table`
- `2026_02_25_100103_create_sigua_ca01_accounts_table`
- `2026_02_25_100104_create_sigua_logbook_table`
- `2026_02_25_100105_create_sigua_logbook_unused_table`
- `2026_02_25_100106_create_sigua_incidents_table`
- `2026_02_25_100107_create_sigua_imports_table`
- `2026_02_25_100108_create_sigua_cross_matches_table`
- `2026_02_25_200001_add_datos_importados_to_sigua_imports_table`
- `2026_02_26_100001_create_sigua_empleados_rh_table`
- `2026_02_26_100002_create_sigua_cruce_resultados_table`
- `2026_02_26_100003_create_sigua_alertas_table`
- `2026_02_26_100004_create_sigua_configuracion_table`
- `2026_02_26_100005_alter_sigua_systems_add_mapeo_and_ui`
- `2026_02_26_100006_alter_sigua_accounts_add_tipo_and_fks`
- `2026_02_26_100007_alter_sigua_logbook_add_tipo_registro_and_empleado_rh`
- `2026_02_26_100008_alter_sigua_incidents_add_bitacora_and_estado`
- `2026_02_26_100009_alter_sigua_imports_add_registros_sin_cambio_and_tipo_sistema`
- `2026_02_26_100010_alter_sigua_cross_matches_add_nombre_sistemas_and_tipo_individual`
- `2026_02_26_100011_add_pendiente_revision_to_sigua_accounts_estado`
- `2026_02_26_120000_fix_sigua_permissions_for_admin`

**Resultado: ✅ OK**

---

### 2. Tablas v2 nuevas

| Tabla                   | Existe |
|-------------------------|--------|
| sigua_empleados_rh      | ✅ Sí  |
| sigua_cruce_resultados  | ✅ Sí  |
| sigua_alertas           | ✅ Sí  |
| sigua_configuracion     | ✅ Sí  |

**Resultado: ✅ OK**

---

### 3. Columnas v2 en tablas existentes

| Tabla / columna                    | Verificación |
|-----------------------------------|--------------|
| sigua_systems.campos_mapeo        | ✅ Existe    |
| sigua_accounts.empleado_rh_id      | ✅ Existe    |
| sigua_accounts.tipo                | ✅ Existe    |
| sigua_logbook.tipo_registro        | ✅ Existe    |
| sigua_incidents.bitacora_id        | ✅ Existe    |

**Nota:** La tabla de cuentas se llama `sigua_accounts` (no `sigua_cuentas`). El modelo es `CuentaGenerica`.

**Resultado: ✅ OK**

---

## BACKEND — Modelos

### 4. Conteos en Tinker

| Modelo          | Count |
|-----------------|-------|
| Sistema         | 3     |
| EmpleadoRh      | 0     |
| CuentaGenerica  | 30    |
| FormatoCA01     | 3     |
| Bitacora        | 50    |
| Alerta          | 0     |

`Configuracion::getValor('ca01_vigencia_meses')` → **6** (valor devuelto correctamente; default 6 si no existe clave).

**Resultado: ✅ OK**

---

### 5. Modelos nuevos v2

| Modelo         | Ubicación                          | Existe |
|----------------|------------------------------------|--------|
| EmpleadoRh     | App\Models\Sigua\EmpleadoRh        | ✅ Sí  |
| CruceResultado | App\Models\Sigua\CruceResultado    | ✅ Sí  |
| Alerta         | App\Models\Sigua\Alerta            | ✅ Sí  |
| Configuracion  | App\Models\Sigua\Configuracion     | ✅ Sí  |

**Resultado: ✅ OK**

---

## BACKEND — Services

### 6. ImportacionService — importarSistema() dinámico

- Método `importarSistema(string $filePath, int $sistemaId, int $importadoPorUserId, ?int $sedeIdDefault = null)` en `ImportacionService`.
- Usa `campos_mapeo` y `regex_id_empleado` del modelo Sistema (sin tipos fijos por slug en la firma).
- No depende de tipos fijos por tipo de importación para el mapeo; es dinámico por sistema.

**Resultado: ✅ OK**

---

### 7. CruceService — ejecutarCruceCompleto() y resultados_por_sistema

- `ejecutarCruceCompleto(?array $sistemaIds, int $ejecutadoPorUserId)` existe.
- Cruce guarda `resultado_json` con `stats`.
- Los resultados por empleado/cuenta se guardan en `sigua_cruce_resultados` con columna/atributo `resultados_por_sistema` (JSON) en cada `CruceResultado`.

**Resultado: ✅ OK**

---

### 8. AlertaService — generarAlertas()

- `AlertaService::generarAlertas()` existe y ejecuta todas las verificaciones (CA01, bitácora, bajas, genéricas sin CA01, sistemas sin importación).

**Resultado: ✅ OK**

---

## BACKEND — Controllers y rutas

### 9. Rutas sigua (route:list --path=sigua)

Se listan **52 rutas** bajo `api/sigua/`, entre ellas:

- dashboard, alertas, configuracion, bitacora, ca01, cruces, cuentas, empleados-rh, importar, importar/preview, importar/historial, incidentes, reportes, sistemas (CRUD).

**Resultado: ✅ OK**

---

### 10. Endpoints v2

| Endpoint / funcionalidad              | Ruta / controlador                                      | Estado  |
|--------------------------------------|----------------------------------------------------------|---------|
| Empleados RH                         | GET api/sigua/empleados-rh, empleados-rh/{id}            | ✅ OK   |
| Importar preview                     | POST api/sigua/importar/preview                          | ✅ OK   |
| Sistemas CRUD                        | GET/POST/GET/PATCH/DELETE api/sigua/sistemas             | ✅ OK   |
| Clasificar cuenta                    | PATCH api/sigua/cuentas/{cuenta}/clasificar              | ✅ OK   |
| Alertas                              | GET api/sigua/alertas, PATCH leer/resolver               | ✅ OK   |
| Configuración                        | GET/PUT api/sigua/configuracion                          | ✅ OK   |

**Resultado: ✅ OK**

---

## BACKEND — Commands

### 11. Comandos sigua (artisan list | grep sigua)

- sigua:cruce
- sigua:generar-alertas
- sigua:importar
- sigua:importar-automatico
- sigua:resumen-semanal
- sigua:verificar-bajas
- sigua:verificar-bitacora
- sigua:verificar-ca01

**Resultado: ✅ OK**

---

## FRONTEND

### 12. Páginas Sigua/ — errores de import

- Rutas en `Main.jsx` con lazy import de todas las páginas bajo `@/Pages/Sigua/`.
- Linter sin errores en `resources/js/Pages/Sigua`.

**Resultado: ✅ OK** (sin errores de import detectados)

---

### 13. Dashboard — KPIs dinámicos por sistema

- El dashboard usa `data?.indicadores_por_sistema` y `data?.total_cuentas_por_sistema` del API.
- `SiguaDashboardController` devuelve `indicadores_por_sistema` y `total_cuentas_por_sistema`.
- La UI pinta KPIs por sistema cuando `indicadoresPorSistema.length > 0` (no hardcodeado por sistema).

**Resultado: ✅ OK**

---

### 14. Páginas: Sistemas, Empleados RH, Alertas, Configuración

| Página        | Componente           | Ruta frontend      | En Main.jsx |
|---------------|----------------------|--------------------|-------------|
| Sistemas      | SiguaSistemas        | /sigua/sistemas    | ✅          |
| Empleados RH  | SiguaEmpleados       | /sigua/empleados-rh| ✅          |
| Alertas       | SiguaAlertas         | /sigua/alertas     | ✅          |
| Configuración | SiguaConfiguracion   | /sigua/configuracion | ✅       |

**Resultado: ✅ OK**

---

### 15. Importación — preview y selector de sistema dinámico

- `SiguaImportar.tsx` usa `getSistemas()` para cargar sistemas activos y `previewImportacion(file, sistemaId)` cuando tipo es `sistema`.
- Selector de sistema cuando `tipo === "sistema"` (selector dinámico).
- Opción "Por sistema (dinámico)" en `TIPO_OPTIONS`.

**Resultado: ✅ OK**

---

## PERMISOS

### 16. Admin y acceso a todas las páginas (guard)

- Migración `2026_02_26_120000_fix_sigua_permissions_for_admin` ejecutada:
  - Crea/asegura permisos `sigua.*` con `guard_name = 'web'`.
  - Añade `sigua.cruces.view` y `sigua.cruces.ejecutar` (usados en SiguaCruces y SiguaDashboard).
  - Asigna todos los permisos `sigua.*` (guard web) al rol `admin` (name='admin', guard_name='web').
  - Ejecuta `permission:cache-reset`.
- El usuario usa `$guard_name = 'web'`; los permisos SIGUA están con guard `web`, alineado con tickets.* e incidents.*.

**Resultado: ✅ OK** (problema de guard y permisos corregido; el admin debería poder acceder a todas las páginas SIGUA tras cerrar sesión/volver a entrar si aplica).

---

## Resumen por ítem

| # | Área              | Resultado |
|---|-------------------|-----------|
| 1 | Migraciones sigua| ✅ OK     |
| 2 | Tablas v2 nuevas | ✅ OK     |
| 3 | Columnas v2      | ✅ OK     |
| 4 | Counts / Config  | ✅ OK     |
| 5 | Modelos nuevos   | ✅ OK     |
| 6 | ImportacionService | ✅ OK  |
| 7 | CruceService     | ✅ OK     |
| 8 | AlertaService    | ✅ OK     |
| 9 | Rutas sigua      | ✅ OK     |
|10 | Endpoints v2     | ✅ OK     |
|11 | Commands         | ✅ OK     |
|12 | Páginas import   | ✅ OK     |
|13 | Dashboard KPIs   | ✅ OK     |
|14 | Páginas v2       | ✅ OK     |
|15 | Import preview   | ✅ OK     |
|16 | Permisos admin   | ✅ OK     |

**Estado global: ✅ SIGUA v2 listo tras el upgrade.**  
Si el admin sigue sin ver alguna página, cerrar sesión y volver a entrar para refrescar permisos en sesión.
