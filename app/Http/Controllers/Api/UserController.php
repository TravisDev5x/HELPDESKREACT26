<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\VerifyEmail;
use App\Models\User;
use App\Models\Role;
use App\Models\EmployeeProfile;
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
        $query = User::with(['campaign', 'area', 'position', 'sede', 'ubicacion', 'roles', 'employeeProfile.terminationReason']);

        if ($request->input('status') === 'only') {
            $query->onlyTrashed();
        }

        if ($search = $request->input('search')) {
            $term = "%{$search}%";
            $query->where(function ($q) use ($term) {
                $q->where('name', 'like', $term)
                    ->orWhere('first_name', 'like', $term)
                    ->orWhere('paternal_last_name', 'like', $term)
                    ->orWhere('maternal_last_name', 'like', $term)
                    ->orWhere('employee_number', 'like', $term)
                    ->orWhere('email', 'like', $term);
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
                    'first_name' => $user->first_name,
                    'paternal_last_name' => $user->paternal_last_name,
                    'maternal_last_name' => $user->maternal_last_name,
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
                    'employee_profile' => $user->relationLoaded('employeeProfile') && $user->employeeProfile
                        ? [
                            'termination_reason_id' => $user->employeeProfile->termination_reason_id,
                            'termination_reason' => $user->employeeProfile->terminationReason?->name,
                            'termination_date' => $user->employeeProfile->termination_date?->format('Y-m-d'),
                            'hire_date' => $user->employeeProfile->hire_date?->format('Y-m-d'),
                        ]
                        : null,
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
            'first_name' => 'required|string|max:255',
            'paternal_last_name' => 'required|string|max:255',
            'maternal_last_name' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255|unique:users,email',
            'employee_number' => 'required|unique:users,employee_number',
            'phone' => 'nullable|string|size:10|regex:/^\d{10}$/',
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
            'sede' => 'nullable|exists:sites,name',
            'ubicacion' => 'nullable|exists:locations,name',
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

        $role = null;
        if (!empty($validated['role_id'])) {
            $role = $this->resolveRoleForGuard((int) $validated['role_id']);
            if (!$role) {
                return response()->json([
                    'message' => 'Rol incompatible con el guard actual',
                ], 422);
            }
        }

        $user = User::create([
            'first_name' => $request->first_name,
            'paternal_last_name' => $request->paternal_last_name,
            'maternal_last_name' => $request->maternal_last_name,
            'email' => $request->filled('email') ? $request->email : null,
            'employee_number' => $request->employee_number,
            'phone' => $request->filled('phone') ? $request->phone : null,
            'password' => Hash::make($request->password),
            'campaign_id' => $campaignId,
            'area_id' => $areaId,
            'position_id' => $positionId,
            'sede_id' => $sedeId,
            'ubicacion_id' => $ubicacionId,
        ]);

        if ($role) {
            $user->syncRoles([$role]);
        }

        return response()->json($user, 201);
    }

    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'first_name' => 'required|string|max:255',
            'paternal_last_name' => 'required|string|max:255',
            'maternal_last_name' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255|unique:users,email,' . $user->id,
            'employee_number' => 'required|unique:users,employee_number,' . $user->id,
            'phone' => 'nullable|string|size:10|regex:/^\d{10}$/',
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
            'sede' => 'nullable|exists:sites,name',
            'ubicacion' => 'nullable|exists:locations,name',
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

        $user->fill($request->except(['campaign', 'area', 'position', 'password', 'role_id', 'name']));
        $user->email = $request->filled('email') ? $request->email : null;
        $user->phone = $request->filled('phone') ? $request->phone : null;

        if ($request->filled('password')) {
            $user->password = Hash::make($request->password);
        }

        $emailChanged = $request->has('email') && $request->email !== $originalEmail;

        $role = null;
        if ($request->filled('role_id')) {
            $role = $this->resolveRoleForGuard((int) $request->role_id);
            if (!$role) {
                return response()->json([
                    'message' => 'Rol incompatible con el guard actual',
                ], 422);
            }
        }

        $user->save();

        if ($request->filled('role_id')) {
            $user->syncRoles($role ? [$role] : []);
        }

        // Activar solo si tiene un rol distinto de visitante (visitante es solo lectura hasta que admin asigne rol)
        if ($user->status === 'pending_admin' && $user->roles()->count() > 0 && !($user->roles()->count() === 1 && $user->hasRole('visitante'))) {
            $user->update(['status' => 'active']);
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

            $url = url("/verify-email?token={$token}");
            try {
                Mail::to($user->email)->send(new VerifyEmail($url));
            } catch (\Throwable $e) {
                // Si falla el correo, el usuario queda en pending_email
            }
        }

        return response()->json(['message' => 'Usuario actualizado', 'user' => $user]);
    }

    /**
     * Resuelve el rol por ID aceptando guards web y sanctum; devuelve la versión con guard 'web' si existe.
     */
    protected function resolveRoleForGuard(int $roleId): ?Role
    {
        $role = Role::find($roleId);
        if (!$role) {
            return null;
        }

        $allowedGuards = ['web', 'sanctum'];
        if (!in_array($role->guard_name, $allowedGuards, true)) {
            return null;
        }

        if ($role->guard_name === 'web') {
            return $role;
        }

        return Role::where('name', $role->name)->where('guard_name', 'web')->first() ?? $role;
    }

    /**
     * Baja técnica (SoftDelete). Solo permitida si RH ya procesó la baja laboral (termination_date en expediente).
     */
    public function destroy(Request $request, User $user)
    {
        $terminationDate = $user->employeeProfile?->termination_date ?? null;
        if ($terminationDate === null) {
            abort(403, 'No puedes dar de baja a un usuario si Recursos Humanos no ha procesado su baja laboral previamente.');
        }

        $reason = $request->input('reason');
        if (is_string($reason) && strlen(trim($reason)) >= 5) {
            $user->update(['deletion_reason' => trim($reason)]);
        }

        $user->delete();
        return response()->json(['message' => 'Usuario eliminado']);
    }

    /**
     * Baja técnica masiva (SoftDelete). Solo permitida si RH ya procesó la baja laboral en cada usuario.
     */
    public function massDestroy(Request $request)
    {
        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:users,id',
            'reason' => 'required|string|min:5',
        ]);

        $users = User::with('employeeProfile')->whereIn('id', $request->ids)->get();
        foreach ($users as $user) {
            if ($user->employeeProfile?->termination_date === null) {
                abort(403, 'No puedes dar de baja a un usuario si Recursos Humanos no ha procesado su baja laboral previamente. Usuario sin baja laboral: ' . ($user->name ?? $user->employee_number));
            }
        }

        User::whereIn('id', $request->ids)->update(['deletion_reason' => $request->reason]);
        User::whereIn('id', $request->ids)->delete();

        return response()->json(['message' => 'Usuarios eliminados correctamente']);
    }

    /**
     * Crea o actualiza el EmployeeProfile del usuario con motivo y fecha de baja (RH).
     */
    protected function syncEmployeeProfileForTermination(User $user, ?int $terminationReasonId, ?string $terminationDate): void
    {
        $attrs = [];
        if ($terminationReasonId !== null) {
            $attrs['termination_reason_id'] = $terminationReasonId;
        }
        if ($terminationDate !== null) {
            $attrs['termination_date'] = $terminationDate;
        }
        if ($attrs === []) {
            return;
        }
        $user->employeeProfile()->updateOrCreate(['user_id' => $user->id], $attrs);
    }

    /**
     * @deprecated Exclusividad de Lista Negra: solo RH puede añadir/quitar (vía Procesar Baja en TimeDesk).
     * La función técnica de enviar a Blacklist ya no está disponible en el módulo global de IT.
     */
    // public function toggleBlacklist(Request $request) { ... }

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
