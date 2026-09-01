# Inventario

## Arquitectura y fuente de verdad

`inv_assets` conserva la identidad, ubicación, responsable actual y estado
operativo. El ciclo de vida usa `InvAssetOperationalState`: `AVAILABLE`,
`ASSIGNED`, `MAINTENANCE`, `RETIRED`, `LOST` y `STOLEN`.

Las especificaciones nuevas se almacenan únicamente en `inv_asset_specs` y
se normalizan mediante `AssetSpecificationService` y `AssetSpecSchema`.
`inv_assets.specs` permanece solo como compatibilidad de lectura y migración;
no debe usarse en nuevas escrituras.

`warranty_expiry` es el resumen de garantía de compra. `inv_warranties`
registra garantías o contratos adicionales.

## Operaciones

Las operaciones sensibles no pasan por la edición genérica:

- asignar / devolver / reasignar;
- trasladar;
- iniciar / cerrar mantenimiento;
- retirar, reportar pérdida o robo.

Todas validan alcance tenant, reglas de lifecycle y registran movimientos.
Los activos retirados, perdidos o robados son terminales.

## Seguridad y tenant

Los activos se consultan mediante `ClientScopeService`; los catálogos usan
`OperatorCatalogScopeService`. Sede, ubicación, usuarios, archivos y
relaciones se validan contra el alcance del actor. Imágenes y documentos usan
almacenamiento privado y endpoints autorizados.

## Rendimiento

La lista de activos y responsables pagina en base de datos. El timeline se
pagina y la ficha carga solo historial reciente. El Monitor utiliza agregados
SQL y los índices de Inventario cubren filtros tenant, estados, responsables,
movimientos, mantenimiento y garantías.

La exportación XLSX actual es síncrona: es apropiada para volumen moderado.
Si el volumen real lo exige, el siguiente paso es un export en cola/chunked,
no relajar scopes ni cargar catálogos globales.

## Importación y exportación

La importación admite hasta 1,000 filas, valida cada fila y mantiene errores
por fila. Las specs estructuradas usan `clave: valor; clave: valor`. Texto
libre no interpretable se conserva en notas, sin convertirlo en JSON legacy.
Las exportaciones respetan tenant y filtros; no incluyen specs ni notas en la
tabla general porque no son columnas de lista.

## Comandos legacy

Ambos comandos son dry-run por defecto y no eliminan información:

```bash
php artisan inventory:migrate-legacy-images
php artisan inventory:migrate-legacy-images --execute
php artisan inventory:migrate-legacy-specs
php artisan inventory:migrate-legacy-specs --execute
```

Ejecutar primero sin `--execute`, revisar el resultado y respaldar base de
datos/almacenamiento antes de una ejecución real. Los comandos son
idempotentes: puede repetirse una ejecución interrumpida sin sobrescribir
datos privados ni borrar JSON legacy.

## Despliegue

1. Respaldar PostgreSQL y almacenamiento.
2. Desplegar código y dependencias conforme al flujo habitual.
3. Ejecutar `php artisan migrate --force`.
4. Generar assets con `npm run build` si el pipeline no lo hace.
5. Ejecutar los dry-run legacy y revisar resultados.
6. Hacer smoke test: crear, asignar, trasladar, abrir archivo, importar y
   exportar un activo.
7. Revisar logs y alertas después del despliegue.

## Deuda conocida

- No hay búsqueda trigram/full-text: medir antes de habilitar extensiones.
- Exportaciones muy grandes requerirán cola/chunking.
- Los modelos Sigan no tienen rutas/UI de Inventario actuales; son legacy y
  deben retirarse solo tras una auditoría de referencias y datos.
