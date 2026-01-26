<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PermissionController extends Controller
{
    /**
     * GET /api/permissions
     */
    public function index()
    {
        $guard = config('auth.defaults.guard', 'web');
        $guards = collect([$guard, 'web', 'sanctum'])->unique()->all();

        return Permission::whereIn('guard_name', $guards)
            ->orderBy('guard_name')
            ->orderBy('name')
            ->get();
    }

    /**
     * POST /api/permissions
     */
    public function store(Request $request)
    {
        $guard = config('auth.defaults.guard', 'web');

        $data = $request->validate([
            'name' => [
                'required',
                'min:3',
                Rule::unique('permissions', 'name')->where('guard_name', $guard),
            ],
        ]);

        $permission = Permission::create([
            'name' => $data['name'],
            'guard_name' => $guard,
        ]);

        return response()->json($permission, 201);
    }

    /**
     * PUT /api/permissions/{permission}
     */
    public function update(Request $request, Permission $permission)
    {
        $guard = $permission->guard_name ?? config('auth.defaults.guard', 'web');

        $data = $request->validate([
            'name' => [
                'required',
                'min:3',
                Rule::unique('permissions', 'name')
                    ->where('guard_name', $guard)
                    ->ignore($permission->id),
            ],
        ]);

        $permission->name = $data['name'];
        $permission->guard_name = $guard;
        $permission->save();

        return response()->json($permission);
    }

    /**
     * DELETE /api/permissions/{permission}
     */
    public function destroy(Permission $permission)
    {
        $permission->delete();

        return response()->noContent();
    }
}
