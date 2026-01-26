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

// ==========================
// LOGIN VISUAL (SPA)
// ==========================
Route::get('/login', function () {
    return view('app'); // React maneja el login
})->name('login');

// ==========================
// SPA (React)
// ==========================
// SIEMPRE AL FINAL
Route::get('/{any}', function () {
    return view('app');
})->where('any', '^(?!api).*');
