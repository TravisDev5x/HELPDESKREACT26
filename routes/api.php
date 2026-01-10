<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\UserRoleController;

// Roles
Route::apiResource('roles', RoleController::class)
    ->only(['index', 'store', 'destroy']);

// Users
Route::apiResource('users', UserController::class)
    ->only(['index', 'store', 'destroy']);

// Asignar roles a usuario
Route::post('users/{user}/roles', [UserRoleController::class, 'sync']);
