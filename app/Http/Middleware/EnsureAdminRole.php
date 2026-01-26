<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EnsureAdminRole
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();

        // Sin usuario autenticado, negar.
        if (!$user) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        // Regla normal: debe tener rol admin.
        if ($user->hasRole('admin')) {
            return $next($request);
        }

        // Ventana de arranque: si no hay ninguna asignación de roles en la BD,
        // permitimos que el primer usuario configure roles/permisos.
        $hasAssignments = DB::table('model_has_roles')->exists();
        if (!$hasAssignments) {
            return $next($request);
        }

        // Permitir también al primer usuario del sistema (id mínimo) para evitar quedar bloqueados.
        $firstUserId = DB::table('users')->orderBy('id')->value('id');
        if ($firstUserId && (int) $user->id === (int) $firstUserId) {
            return $next($request);
        }

        return response()->json(['message' => 'No autorizado'], 403);
    }
}
