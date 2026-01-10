<?php

use Illuminate\Support\Facades\Route;



// Página principal
Route::get('/', function () {
    return view('app');
});

// Fallback SPA (excluye /api)
Route::get('/{any}', function () {
    return view('app');
})->where('any', '^(?!api).*$');

