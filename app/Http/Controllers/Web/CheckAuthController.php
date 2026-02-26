<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

/**
 * Verificación de autenticación por sesión (guard web).
 * Solo para consumo del frontend autenticado por cookies.
 * NO usar en rutas API.
 */
class CheckAuthController extends Controller
{
    /**
     * GET /check-auth (ruta web, middleware auth).
     * Retorna JSON con authenticated y user (id, nombre, email, roles, permissions).
     */
    public function __invoke(): JsonResponse
    {
        $user = Auth::guard('web')->user();
        if (! $user) {
            return response()->json(['authenticated' => false, 'user' => null], 401);
        }

        $user->load('roles:id,name,guard_name');
        $permissions = $user->getAllPermissions()->pluck('name')->values();

        return response()->json([
            'authenticated' => true,
            'user' => $user,
            'roles' => $user->roles->pluck('name'),
            'permissions' => $permissions,
        ]);
    }
}
