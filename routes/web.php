<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
| SOLO vistas y SPA
| NUNCA lógica de autenticación
*/

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
