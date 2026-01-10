<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class RoleController extends Controller
{
    /**
     * GET /api/roles
     */
    public function index()
    {
        return Role::latest()->get();
    }

    /**
     * POST /api/roles
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'min:3', 'unique:roles,name'],
        ]);

        $role = Role::create([
            'name' => $data['name'],
            'slug' => Str::slug($data['name']),
        ]);

        return response()->json($role, 201);
    }

    /**
     * DELETE /api/roles/{role}
     */
    public function destroy(Role $role)
    {
        $role->delete();

        return response()->noContent();
    }
}
