<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EnsurePermissionOrAdmin
{
    /**
     * Permite acceso si:
     * - El usuario tiene rol admin, o
     * - Tiene alguno de los permisos requeridos.
     *
     * @param  string[]  $permissions  Permisos separados por comas o pipes (middleware 'perm:users.manage|roles.manage')
     */
    public function handle(Request $request, Closure $next, ...$permissions)
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        // Bypass para admin
        if ($user->hasRole('admin')) {
            return $next($request);
        }

        // Compatibility for legacy fixtures only. The environment check makes
        // this fail closed even if the flag is accidentally present in production.
        if (app()->environment('testing') && config('security.testing_permission_bypass', false)) {
            $hasAssignments = DB::table('model_has_roles')->exists();
            $firstUserId = DB::table('users')->orderBy('id')->value('id');

            if (! $hasAssignments || ($firstUserId && (int) $user->id === (int) $firstUserId)) {
                return $next($request);
            }
        }

        // Check de permisos
        // Soporta separators: middleware puede venir como "perm:users.manage|roles.manage"
        $normalized = collect($permissions)
            ->flatMap(fn ($p) => preg_split('/[|,]/', $p))
            ->filter()
            ->values()
            ->all();

        if ($normalized && $user->hasAnyPermission($normalized)) {
            return $next($request);
        }

        return response()->json(['message' => 'No autorizado'], 403);
    }
}
