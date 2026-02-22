<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Role;
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
            'roles.*' => ['exists:roles,id,deleted_at,NULL'],
        ]);

        $roleIds = $data['roles'] ?? [];
        $roles = $roleIds ? Role::whereIn('id', $roleIds)->get() : collect();
        $expectedGuard = config('auth.defaults.guard', 'web');

        $normalized = $roles->map(function ($role) use ($expectedGuard) {
            if ($role->guard_name === $expectedGuard) {
                return $role;
            }
            return Role::where('name', $role->name)
                ->where('guard_name', $expectedGuard)
                ->first();
        })->filter();

        if ($roles->count() !== $normalized->count()) {
            return response()->json([
                'message' => 'Roles incompatibles con el guard actual',
            ], 422);
        }

        $user->syncRoles($normalized->unique('id'));

        if ($user->status === 'pending_admin' && $user->roles()->count() > 0) {
            $user->update(['status' => 'active']);
        }

        return response()->noContent();
    }
}
