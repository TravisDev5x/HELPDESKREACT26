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
            'permissions.*' => ['exists:permissions,id'],
        ]);

        $permissionIds = $data['permissions'] ?? [];
        $permissions = $permissionIds ? Permission::whereIn('id', $permissionIds)->get() : [];
        $role->syncPermissions($permissions);

        return response()->noContent();
    }
}
