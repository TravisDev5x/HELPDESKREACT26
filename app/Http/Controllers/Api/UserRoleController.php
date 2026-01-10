<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class UserRoleController extends Controller
{
    /**
     * POST /api/users/{user}/roles
     * Sincroniza roles del usuario
     */
    public function sync(Request $request, User $user)
    {
        $data = $request->validate([
            'roles' => ['array'],
            'roles.*' => ['exists:roles,id'],
        ]);

        $user->roles()->sync($data['roles'] ?? []);

        return response()->noContent();
    }
}
