<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class UserController extends Controller
{
    /**
     * GET /api/users
     */
    public function index()
    {
        return User::with('roles')
            ->latest()
            ->get();
    }

    /**
     * POST /api/users
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'min:3'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'min:6'],
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => bcrypt($data['password']),
        ]);

        return response()->json($user, 201);
    }

    /**
     * DELETE /api/users/{user}
     */
    public function destroy(User $user)
    {
        $user->delete();

        return response()->noContent();
    }
}
