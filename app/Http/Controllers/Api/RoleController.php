<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class RoleController extends Controller
{
    /**
     * GET /api/roles
     */
    public function index()
    {
        $guard = config('auth.defaults.guard', 'web');
        $guards = collect([$guard, 'web', 'sanctum'])->unique()->all();

        return Role::with('permissions')
            ->whereIn('guard_name', $guards)
            ->orderBy('guard_name')
            ->orderBy('name')
            ->get();
    }

    /**
     * POST /api/roles
     */
    public function store(Request $request)
    {
        $guard = config('auth.defaults.guard', 'web');

        $data = $request->validate([
            'name' => [
                'required',
                'min:3',
                Rule::unique('roles', 'name')->where('guard_name', $guard),
            ],
        ]);

        $role = Role::create([
            'name' => $data['name'],
            'slug' => Str::slug($data['name']),
            'guard_name' => $guard,
        ]);

        return response()->json($role, 201);
    }

    /**
     * PUT /api/roles/{role}
     */
    public function update(Request $request, Role $role)
    {
        $guard = $role->guard_name ?? config('auth.defaults.guard', 'web');

        $data = $request->validate([
            'name' => [
                'required',
                'min:3',
                Rule::unique('roles', 'name')
                    ->where('guard_name', $guard)
                    ->ignore($role->id),
            ],
        ]);

        $role->name = $data['name'];
        $role->slug = Str::slug($data['name']);
        $role->guard_name = $guard;
        $role->save();

        return response()->json($role);
    }

    /**
     * DELETE /api/roles/{role}
     */
    public function destroy(Role $role)
    {
        // Clear assignments before delete to avoid orphaned relations
        $role->users()->detach();
        $role->delete();

        return response()->noContent();
    }
}
