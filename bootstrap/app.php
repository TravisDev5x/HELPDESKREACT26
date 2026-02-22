<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;
use App\Http\Middleware\EnforcePasswordChange;
use App\Http\Middleware\AuditReportAccess;
use App\Http\Middleware\SecurityHeaders;
use App\Http\Middleware\SetLocale;
use App\Http\Middleware\EnsurePermissionOrAdmin;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {

        /*
        |--------------------------------------------------------------------------
        | Sanctum para SPA (React)
        |--------------------------------------------------------------------------
        | Permite que las rutas API reconozcan la sesión del navegador
        | usando cookies seguras (NO JWT).
        */

        $middleware->api(prepend: [
            EnsureFrontendRequestsAreStateful::class,
        ]);

        $middleware->api(append: [
            EnforcePasswordChange::class,
            SecurityHeaders::class,
        ]);

        $middleware->web(append: [
            SecurityHeaders::class,
        ]);

        // Alias para poder usarlo en rutas (y colocar después de auth)
        $middleware->alias([
            'locale' => SetLocale::class,
            'perm' => EnsurePermissionOrAdmin::class,
            'report.audit' => AuditReportAccess::class,
            'role' => \Spatie\Permission\Middleware\RoleMiddleware::class,
            'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
            'role_or_permission' => \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,
        ]);

    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })
    ->create();

