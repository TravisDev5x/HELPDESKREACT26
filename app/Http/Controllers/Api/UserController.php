<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\VerifyEmail;
use App\Models\User;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class UserController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = User::with(['campaign', 'area', 'position', 'sede', 'ubicacion', 'roles']);

        if ($request->input('status') === 'only') {
            $query->onlyTrashed();
        }

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('employee_number', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $sortable = ['id', 'name', 'employee_number', 'email', 'status', 'created_at'];
        $sort = $request->input('sort', 'id');
        $direction = $request->input('direction', 'desc') === 'asc' ? 'asc' : 'desc';
        if (!in_array($sort, $sortable, true)) {
            $sort = 'id';
        }

        $perPage = (int) $request->input('per_page', 10);
        if ($perPage < 5) $perPage = 5;
        if ($perPage > 100) $perPage = 100;

        $users = $query->orderBy($sort, $direction)
            ->paginate($perPage)
            ->through(function ($user) {
                return [
                    'id' => $user->id,
                    'employee_number' => $user->employee_number,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'campaign' => $user->campaign->name ?? 'Sin Asignar',
                    'area' => $user->area->name ?? 'Sin Asignar',
                    'position' => $user->position->name ?? 'Sin Asignar',
                    'sede' => $user->sede->name ?? 'Sin Asignar',
                    'sede_type' => $user->sede->type ?? null,
                    'ubicacion' => $user->ubicacion->name ?? null,
                    'status' => $user->status,
                    'is_blacklisted' => $user->is_blacklisted,
                    'roles' => $user->roles->map(fn ($r) => ['id' => $r->id, 'name' => $r->name]),
                    'deleted_at' => $user->deleted_at,
                ];
            });

        return response()->json($users);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'employee_number' => 'required|unique:users,employee_number',
            'phone' => 'required|digits:10',
            'role_id' => 'required|exists:roles,id,deleted_at,NULL',
            'password' => [
                'required',
                'string',
                'min:12',
                'regex:/[a-z]/',
                'regex:/[A-Z]/',
                'regex:/[0-9]/',
                'regex:/[^A-Za-z0-9]/',
            ],
            'campaign' => 'required|exists:campaigns,name',
            'area' => 'required|exists:areas,name',
            'position' => 'required|exists:positions,name',
            'sede' => 'nullable|exists:sedes,name',
            'ubicacion' => 'nullable|exists:ubicaciones,name',
        ]);

        $campaignId = \App\Models\Campaign::where('name', $request->campaign)->first()->id;
        $areaId = \App\Models\Area::where('name', $request->area)->first()->id;
        $positionId = \App\Models\Position::where('name', $request->position)->first()->id;
        $sedeId = $request->filled('sede')
            ? \App\Models\Sede::where('name', $request->sede)->first()->id
            : \App\Models\Sede::where('code', 'REMOTO')->value('id');
        $ubicacionId = null;
        if ($request->filled('ubicacion')) {
            $ubicacionId = \App\Models\Ubicacion::where('name', $request->ubicacion)
                ->where('sede_id', $sedeId)
                ->value('id');
            if (!$ubicacionId) {
                return response()->json(['message' => 'Ubicación no pertenece a la sede seleccionada'], 422);
            }
        }

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'employee_number' => $request->employee_number,
            'phone' => $request->phone,
            'password' => Hash::make($request->password),
            'campaign_id' => $campaignId,
            'area_id' => $areaId,
            'position_id' => $positionId,
            'sede_id' => $sedeId,
            'ubicacion_id' => $ubicacionId,
        ]);

        if (!empty($validated['role_id'])) {
            $role = Role::find((int) $validated['role_id']);
            if ($role) {
                $user->syncRoles([$role]);
            }
        }

        return response()->json($user, 201);
    }

    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|unique:users,email,' . $user->id,
            'employee_number' => 'required|unique:users,employee_number,' . $user->id,
            'phone' => 'required|digits:10',
            'role_id' => 'required|exists:roles,id,deleted_at,NULL',
            'status' => 'sometimes|in:pending_email,pending_admin,active,blocked',
            'password' => [
                'nullable',
                'string',
                'min:12',
                'regex:/[a-z]/',
                'regex:/[A-Z]/',
                'regex:/[0-9]/',
                'regex:/[^A-Za-z0-9]/',
            ],
            'campaign' => 'required|exists:campaigns,name',
            'area' => 'required|exists:areas,name',
            'position' => 'required|exists:positions,name',
            'sede' => 'nullable|exists:sedes,name',
            'ubicacion' => 'nullable|exists:ubicaciones,name',
        ]);

        if ($request->has('campaign')) {
            $user->campaign_id = \App\Models\Campaign::where('name', $request->campaign)->first()->id;
        }
        if ($request->has('area')) {
            $user->area_id = \App\Models\Area::where('name', $request->area)->first()->id;
        }
        if ($request->has('position')) {
            $user->position_id = \App\Models\Position::where('name', $request->position)->first()->id;
        }
        if ($request->has('sede')) {
            $user->sede_id = \App\Models\Sede::where('name', $request->sede)->first()->id;
        }
        if ($request->has('ubicacion')) {
            $ubicacion = \App\Models\Ubicacion::where('name', $request->ubicacion)->first();
            if ($ubicacion && $user->sede_id && $ubicacion->sede_id !== $user->sede_id) {
                return response()->json(['message' => 'Ubicación no pertenece a la sede seleccionada'], 422);
            }
            $user->ubicacion_id = $ubicacion?->id;
        }

        $originalEmail = $user->email;

        $user->fill($request->except(['campaign', 'area', 'position', 'password', 'role_id']));

        if ($request->filled('password')) {
            $user->password = Hash::make($request->password);
        }

        $emailChanged = $request->has('email') && $request->email !== $originalEmail;

        $user->save();

        if ($request->filled('role_id')) {
            $role = Role::find((int) $request->role_id);
            $user->syncRoles($role ? [$role] : []);
        }

        if ($emailChanged && $user->email) {
            $user->email_verified_at = null;
            $user->status = 'pending_email';
            $user->save();

            $token = Str::uuid()->toString();
            DB::table('email_verification_tokens')->insert([
                'user_id' => $user->id,
                'token' => $token,
                'expires_at' => now()->addHours(24),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $url = url("/api/register/verify?token={$token}");
            try {
                Mail::to($user->email)->send(new VerifyEmail($url));
            } catch (\Throwable $e) {
                // Si falla el correo, el usuario queda en pending_email
            }
        }

        return response()->json(['message' => 'Usuario actualizado', 'user' => $user]);
    }

    public function destroy(User $user)
    {
        $user->delete();
        return response()->json(['message' => 'Usuario eliminado']);
    }

    public function massDestroy(Request $request)
    {
        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:users,id',
            'reason' => 'required|string|min:5'
        ]);

        User::whereIn('id', $request->ids)->update(['deletion_reason' => $request->reason]);
        User::whereIn('id', $request->ids)->delete();

        return response()->json(['message' => 'Usuarios eliminados correctamente']);
    }

    public function toggleBlacklist(Request $request)
    {
        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:users,id',
            'reason' => 'required|string|min:5',
            'action' => 'required|in:add,remove'
        ]);

        DB::transaction(function () use ($request) {
            $isAdding = $request->action === 'add';

            User::whereIn('id', $request->ids)->update(['is_blacklisted' => $isAdding]);

            $logs = [];
            foreach ($request->ids as $id) {
                $logs[] = [
                    'user_id' => $id,
                    'admin_id' => Auth::id(),
                    'action' => $isAdding ? 'ADDED' : 'REMOVED',
                    'reason' => $request->reason,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
            DB::table('blacklist_logs')->insert($logs);
        });

        return response()->json(['message' => 'Lista negra actualizada']);
    }

    public function restore($id)
    {
        $user = User::onlyTrashed()->findOrFail($id);
        $user->restore();
        return response()->json(['message' => 'Usuario restaurado']);
    }

    public function forceDelete($id)
    {
        $user = User::onlyTrashed()->findOrFail($id);
        $user->forceDelete();
        return response()->json(['message' => 'Usuario eliminado permanentemente']);
    }
}
