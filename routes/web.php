<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
| AQUÍ SOLO VIVE LÓGICA DE FRONTEND AUTENTICADO POR COOKIES (SESIÓN).
| - Verificación de sesión: /check-auth (guard web, middleware auth).
| - Vistas SPA y login visual.
| NO mezclar con API: la API no valida sesiones; solo tokens.
*/

// ==========================
// VERIFICACIÓN DE AUTENTICACIÓN (SESIÓN)
// ==========================
// - Solo en web. Usa exclusivamente middleware('auth') y guard web. NO auth:api.
// - El frontend debe llamar /check-auth DESPUÉS del login o desde layout autenticado.
// - Llamar /check-auth desde /login dará 401 (correcto; no es bug).
// - Requests AJAX sin sesión reciben 401 JSON { authenticated: false } (nunca redirect HTML).
Route::get('/check-auth', App\Http\Controllers\Web\CheckAuthController::class)
    ->middleware('auth')
    ->name('check-auth');

// ==========================
// DIAGNÓSTICO (opcional)
// ==========================
Route::get('/test-disco', function () {
    Storage::disk('public')->put('prueba.txt', 'OK');
    return 'OK';
});

// Cabeceras para la SPA: no almacenar en caché (evita versión antigua en Brave/Chromium)
$spaHeaders = [
    'Cache-Control' => 'no-store, no-cache, must-revalidate',
    'Pragma' => 'no-cache',
    'Expires' => '0',
];

// ==========================
// LOGIN VISUAL (SPA)
// ==========================
Route::get('/login', fn () => response()->view('app')->withHeaders($spaHeaders))->name('login');

// ==========================
// SPA (React)
// ==========================
// SIEMPRE AL FINAL
Route::get('/{any}', fn () => response()->view('app')->withHeaders($spaHeaders))->where('any', '^(?!api).*');
