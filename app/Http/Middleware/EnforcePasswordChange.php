<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnforcePasswordChange
{
    /**
     * Block business endpoints when force_password_change is active.
     * Allow only: check-auth (me), profile show, password change, logout.
     */
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user('sanctum') ?? $request->user();
        if (!$user || !$user->force_password_change) {
            return $next($request);
        }

        $path = $request->path(); // e.g. api/check-auth
        $method = strtoupper($request->method());

        $allowed = [
            'GET' => ['api/check-auth', 'api/profile'],
            'PUT' => ['api/profile/password'],
            'POST' => ['api/logout'],
        ];

        if (isset($allowed[$method]) && in_array($path, $allowed[$method], true)) {
            return $next($request);
        }

        return response()->json([
            'message' => 'Debe cambiar su contraseña para continuar.',
        ], 403);
    }
}
