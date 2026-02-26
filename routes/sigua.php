<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Sigua\SiguaDashboardController;
use App\Http\Controllers\Sigua\CuentaGenericaController;
use App\Http\Controllers\Sigua\CA01Controller;
use App\Http\Controllers\Sigua\BitacoraController;
use App\Http\Controllers\Sigua\IncidenteController;
use App\Http\Controllers\Sigua\ImportacionController;
use App\Http\Controllers\Sigua\CruceController;
use App\Http\Controllers\Sigua\ReporteController;
use App\Http\Controllers\Sigua\SiguaCatalogController;

/*
|--------------------------------------------------------------------------
| SIGUA - API Routes
|--------------------------------------------------------------------------
| Prefijo: /api/sigua (aplicado al registrar este archivo).
| Middleware base: auth:sanctum, locale.
| Permisos por ruta con middleware perm:...
*/

Route::prefix('sigua')->middleware(['auth:sanctum', 'locale'])->group(function () {

    // Dashboard
    Route::get('dashboard', [SiguaDashboardController::class, 'index'])
        ->middleware('perm:sigua.dashboard');

    // Catálogos SIGUA
    Route::get('sistemas', [SiguaCatalogController::class, 'sistemas'])
        ->middleware('perm:sigua.dashboard|sigua.cuentas.view');

    // Cuentas genéricas (apiResource: index, store, show, update, destroy)
    Route::middleware('perm:sigua.cuentas.view|sigua.cuentas.manage')->group(function () {
        Route::post('cuentas/bulk-estado', [CuentaGenericaController::class, 'bulkUpdateEstado'])
            ->middleware('perm:sigua.cuentas.manage');
        Route::apiResource('cuentas', CuentaGenericaController::class);
    });

    // CA-01 (renovar debe ir antes del resource para no capturar {ca01} como id)
    Route::middleware('perm:sigua.ca01.view|sigua.ca01.manage')->group(function () {
        Route::post('ca01/{ca01}/renovar', [CA01Controller::class, 'renovar'])
            ->middleware('perm:sigua.ca01.manage');
        Route::apiResource('ca01', CA01Controller::class)
            ->only(['index', 'store', 'show', 'update']);
    });

    // Bitácora (rutas específicas antes que las genéricas)
    Route::middleware('perm:sigua.bitacora.view|sigua.bitacora.registrar|sigua.bitacora.sede')->group(function () {
        Route::post('bitacora/bulk', [BitacoraController::class, 'storeBulk'])
            ->middleware('perm:sigua.bitacora.registrar');
        Route::get('bitacora/hoy', [BitacoraController::class, 'hoy'])
            ->middleware('perm:sigua.bitacora.view|sigua.bitacora.sede');
        Route::get('bitacora/sede/{sede}', [BitacoraController::class, 'porSede'])
            ->middleware('perm:sigua.bitacora.view|sigua.bitacora.sede');
        Route::get('bitacora/sin-uso', [BitacoraController::class, 'sinUso'])
            ->middleware('perm:sigua.bitacora.view');
        Route::post('bitacora/sin-uso', [BitacoraController::class, 'storeSinUso'])
            ->middleware('perm:sigua.bitacora.registrar');
        Route::get('bitacora', [BitacoraController::class, 'index']);
        Route::post('bitacora', [BitacoraController::class, 'store'])
            ->middleware('perm:sigua.bitacora.registrar');
    });

    // Incidentes (acciones específicas antes del resource)
    Route::middleware('perm:sigua.incidentes.view|sigua.incidentes.manage')->group(function () {
        Route::patch('incidentes/{incidente}/investigar', [IncidenteController::class, 'investigar'])
            ->middleware('perm:sigua.incidentes.manage');
        Route::patch('incidentes/{incidente}/resolver', [IncidenteController::class, 'resolver'])
            ->middleware('perm:sigua.incidentes.manage');
        Route::patch('incidentes/{incidente}/escalar', [IncidenteController::class, 'escalar'])
            ->middleware('perm:sigua.incidentes.manage');
        Route::apiResource('incidentes', IncidenteController::class)
            ->only(['index', 'store', 'show', 'update']);
    });

    // Importaciones
    Route::middleware('perm:sigua.importar')->group(function () {
        Route::post('importar', [ImportacionController::class, 'importar']);
        Route::get('importar/historial', [ImportacionController::class, 'historial']);
    });

    // Cruces (historial y detalle antes de POST para evitar conflicto)
    Route::middleware('perm:sigua.cruces')->group(function () {
        Route::post('cruces', [CruceController::class, 'ejecutar']);
        Route::get('cruces/historial', [CruceController::class, 'historial']);
        Route::get('cruces/{cruce}', [CruceController::class, 'detalle']);
    });

    // Reportes
    Route::middleware('perm:sigua.reportes')->group(function () {
        Route::get('reportes/resumen', [ReporteController::class, 'resumenGeneral']);
        Route::get('reportes/exportar-cuentas', [ReporteController::class, 'exportarCuentas']);
        Route::get('reportes/exportar-bitacora', [ReporteController::class, 'exportarBitacora']);
        Route::get('reportes/exportar-cruce/{cruce}', [ReporteController::class, 'exportarCruce']);
    });
});
