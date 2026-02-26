<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\Permission;
use Illuminate\Http\Request;

class RolePermissionController extends Controller
{
    /**
     * POST /api/roles/{role}/permissions
     * Sync permissions for a role.
     */
    public function sync(Request $request, Role $role)
    {
        $data = $request->validate([
            'permissions' => ['array'],
            'permissions.*' => ['integer', 'exists:permissions,id'],
        ]);

        $permissionIds = $data['permissions'] ?? [];
        // Solo permisos del mismo guard que el rol (evita mezclar web/sanctum y PermissionDoesNotExist)
        $permissions = $permissionIds
            ? Permission::whereIn('id', $permissionIds)->where('guard_name', $role->guard_name)->get()
            : [];
        $role->syncPermissions($permissions);

        return response()->noContent();
    }
}
