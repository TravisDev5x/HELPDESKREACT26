<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\NewEmployeePendingApprovalMail;
use App\Models\Area;
use App\Models\Campaign;
use App\Models\EmployeeProfile;
use App\Models\EmployeeStatus;
use App\Models\HireType;
use App\Models\Position;
use App\Models\RecruitmentSource;
use App\Models\Role;
use App\Models\Schedule;
use App\Models\ScheduleAssignment;
use App\Models\Sede;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

/**
 * Alta de empleados desde RH (TimeDesk). Crea usuario en estado pendiente de aprobación
 * con rol Visitante y notifica a Administradores. No asigna roles técnicos.
 */
class TimeDeskEmployeeController extends Controller
{
    /**
     * Catálogos para el formulario de alta (RH). Todo desde BD (cero hardcodeo).
     * Estatus → employee_statuses; Tipo de ingreso → hire_types. Sin roles de Spatie.
     */
    public function catalogs(): JsonResponse
    {
        $sedes = Sede::where('is_active', true)->orderBy('name')->get(['id', 'name', 'code']);
        $areas = Area::where('is_active', true)->orderBy('name')->get(['id', 'name']);
        $campaigns = Campaign::where('is_active', true)->orderBy('name')->get(['id', 'name']);
        $positions = Position::where('is_active', true)->orderBy('name')->get(['id', 'name']);
        $schedules = Schedule::where('is_active', true)->orderBy('name')->get(['id', 'name']);
        $employeeStatuses = EmployeeStatus::active()->orderBy('name')->get(['id', 'name']);
        $hireTypes = HireType::active()->orderBy('name')->get(['id', 'name']);
        $managers = User::whereNull('deleted_at')
            ->where('status', 'active')
            ->orderBy('name')
            ->get(['id', 'name', 'email'])
            ->map(fn ($u) => ['id' => $u->id, 'name' => $u->name, 'email' => $u->email]);

        $recruitmentSources = RecruitmentSource::active()->orderBy('name')->get(['id', 'name']);

        return response()->json([
            'sedes' => $sedes,
            'areas' => $areas,
            'campaigns' => $campaigns,
            'positions' => $positions,
            'schedules' => $schedules,
            'employee_statuses' => $employeeStatuses,
            'hire_types' => $hireTypes,
            'recruitment_sources' => $recruitmentSources,
            'managers' => $managers,
        ]);
    }

    /**
     * Crear empleado desde RH: User pendiente de aprobación + rol Visitante + EmployeeProfile.
     * Si tipo de ingreso es "Reingreso", busca usuario por email (incl. eliminados) y restaura en lugar de crear.
     * Si el candidato está en Lista Negra, aborta con ValidationException en el campo email.
     * recruitment_source_id es obligatorio solo cuando el tipo de ingreso es "Nuevo Ingreso".
     */
    public function store(Request $request): JsonResponse
    {
        $hireType = $request->hire_type_id ? HireType::find($request->hire_type_id) : null;
        $isReingreso = $hireType && stripos($hireType->name, 'Reingreso') !== false;
        $isNuevoIngreso = $hireType && stripos($hireType->name, 'Nuevo Ingreso') !== false;

        $existingUser = null;
        if ($isReingreso && $request->filled('email')) {
            $existingUser = User::withTrashed()->where('email', $request->input('email'))->first();
            if (! $existingUser) {
                throw ValidationException::withMessages([
                    'email' => ['No se encontró un empleado previo con ese correo electrónico. Verifique el correo o seleccione Tipo de ingreso: Nuevo Ingreso.'],
                ]);
            }
            if ($existingUser->is_blacklisted) {
                throw ValidationException::withMessages([
                    'email' => ['Operación denegada: Este candidato se encuentra en la Lista Negra y no es elegible para recontratación.'],
                ]);
            }
        }

        $emailRules = array_filter([
            $isReingreso ? 'required' : 'nullable',
            'email',
            'max:255',
            ! $isReingreso ? Rule::unique('users', 'email')->whereNull('deleted_at') : null,
        ]);
        $employeeNumberRule = Rule::unique('users', 'employee_number')->whereNull('deleted_at');
        if ($existingUser) {
            $employeeNumberRule = $employeeNumberRule->ignore($existingUser->id);
        }

        $existingProfile = $existingUser ? EmployeeProfile::where('user_id', $existingUser->id)->first() : null;
        $curpRule = Rule::unique('employee_profiles', 'curp')->ignore($existingProfile?->id ?? 0);
        $nssRule = Rule::unique('employee_profiles', 'nss')->ignore($existingProfile?->id ?? 0);

        $validated = $request->validate([
            'first_name' => 'required|string|max:255',
            'paternal_last_name' => 'required|string|max:255',
            'maternal_last_name' => 'nullable|string|max:255',
            'email' => $emailRules,
            'employee_number' => ['required', 'string', 'max:255', $employeeNumberRule],
            'phone' => 'nullable|string|max:20',
            'sede_id' => 'required|exists:sites,id',
            'area_id' => 'nullable|exists:areas,id',
            'campaign_id' => 'nullable|exists:campaigns,id',
            'position_id' => 'nullable|exists:positions,id',
            'employee_status_id' => 'nullable|exists:employee_statuses,id',
            'hire_type_id' => 'nullable|exists:hire_types,id',
            'recruitment_source_id' => [
                Rule::requiredIf($isNuevoIngreso),
                'nullable',
                'exists:recruitment_sources,id',
            ],
            'manager_id' => 'nullable|exists:users,id',
            'hire_date' => 'nullable|date',
            'schedule_id' => 'nullable|exists:schedules,id',
            'curp' => ['nullable', 'string', 'max:18', $curpRule],
            'nss' => ['nullable', 'string', 'max:11', $nssRule],
            'address' => 'nullable|string|max:65535',
            'has_csf' => 'boolean',
            'ine_file' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120',
            'csf_file' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120',
            'address_proof_file' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120',
            'studies_proof_file' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120',
        ]);

        if ($isReingreso && ! $existingUser) {
            $existingUser = User::withTrashed()->where('email', $validated['email'])->first();
            if (! $existingUser) {
                throw ValidationException::withMessages([
                    'email' => ['No se encontró un empleado previo con ese correo electrónico. Verifique el correo o seleccione Tipo de ingreso: Nuevo Ingreso.'],
                ]);
            }
            if ($existingUser->is_blacklisted) {
                throw ValidationException::withMessages([
                    'email' => ['Operación denegada: Este candidato se encuentra en la Lista Negra y no es elegible para recontratación.'],
                ]);
            }
        }

        $user = DB::transaction(function () use ($validated, $request, $isReingreso, $existingUser) {
            if ($isReingreso && $existingUser) {
                return $this->restoreAndUpdateReingreso($existingUser, $validated, $request);
            }

            return $this->createNewEmployee($validated, $request);
        });

        $this->notifyAdminsNewEmployee($user);

        return response()->json([
            'message' => 'Expediente creado con éxito. Se ha notificado a los Administradores de IT para que aprueben la cuenta y le asignen accesos.',
            'user' => [
                'id' => $user->id,
                'employee_number' => $user->employee_number,
                'name' => $user->name,
            ],
        ], 201);
    }

    /**
     * Crea un nuevo usuario y su EmployeeProfile (flujo Nuevo Ingreso u otro tipo).
     */
    private function createNewEmployee(array $validated, Request $request): User
    {
        $password = Hash::make(Str::random(32));

        $user = User::create([
            'first_name' => $validated['first_name'],
            'paternal_last_name' => $validated['paternal_last_name'],
            'maternal_last_name' => $validated['maternal_last_name'] ?? null,
            'email' => $validated['email'] ?? null,
            'employee_number' => $validated['employee_number'],
            'phone' => $validated['phone'] ?? null,
            'password' => $password,
            'status' => 'pending_admin',
            'sede_id' => $validated['sede_id'],
            'area_id' => $validated['area_id'] ?? null,
            'campaign_id' => $validated['campaign_id'] ?? null,
            'position_id' => $validated['position_id'] ?? null,
        ]);

        $user->syncNameColumn();
        $user->save();

        $visitanteRole = Role::firstOrCreate(
            ['name' => 'visitante', 'guard_name' => 'web'],
            ['name' => 'visitante', 'slug' => 'visitante', 'guard_name' => 'web']
        );
        if (! $visitanteRole->hasPermissionTo('tickets.view_own')) {
            $visitanteRole->syncPermissions(['tickets.view_own']);
        }
        $user->syncRoles([$visitanteRole]);

        $this->createOrUpdateEmployeeProfile($user, $validated, $request);

        return $user->fresh(['employeeProfile', 'campaign', 'area', 'position', 'sede']);
    }

    /**
     * Restaura un usuario existente (reingreso) y actualiza datos y perfil.
     */
    private function restoreAndUpdateReingreso(User $existingUser, array $validated, Request $request): User
    {
        if ($existingUser->trashed()) {
            $existingUser->restore();
        }

        $existingUser->update([
            'first_name' => $validated['first_name'],
            'paternal_last_name' => $validated['paternal_last_name'],
            'maternal_last_name' => $validated['maternal_last_name'] ?? null,
            'email' => $validated['email'] ?? null,
            'employee_number' => $validated['employee_number'],
            'phone' => $validated['phone'] ?? null,
            'sede_id' => $validated['sede_id'],
            'area_id' => $validated['area_id'] ?? null,
            'campaign_id' => $validated['campaign_id'] ?? null,
            'position_id' => $validated['position_id'] ?? null,
            'status' => 'pending_admin',
        ]);
        $existingUser->syncNameColumn();
        $existingUser->save();

        $visitanteRole = Role::firstOrCreate(
            ['name' => 'visitante', 'guard_name' => 'web'],
            ['name' => 'visitante', 'slug' => 'visitante', 'guard_name' => 'web']
        );
        if (! $visitanteRole->hasPermissionTo('tickets.view_own')) {
            $visitanteRole->syncPermissions(['tickets.view_own']);
        }
        $existingUser->syncRoles([$visitanteRole]);

        $this->createOrUpdateEmployeeProfile($existingUser, $validated, $request);

        return $existingUser->fresh(['employeeProfile', 'campaign', 'area', 'position', 'sede']);
    }

    /**
     * Crea o actualiza EmployeeProfile y documentos para un usuario.
     */
    private function createOrUpdateEmployeeProfile(User $user, array $validated, Request $request): void
    {
        $profileData = [
            'manager_id' => $validated['manager_id'] ?? null,
            'hire_date' => isset($validated['hire_date']) ? $validated['hire_date'] : null,
            'employee_status_id' => $validated['employee_status_id'] ?? null,
            'hire_type_id' => $validated['hire_type_id'] ?? null,
            'recruitment_source_id' => $validated['recruitment_source_id'] ?? null,
            'curp' => isset($validated['curp']) ? trim($validated['curp']) : null,
            'nss' => isset($validated['nss']) ? trim($validated['nss']) : null,
            'address' => isset($validated['address']) ? trim($validated['address']) : null,
            'has_csf' => filter_var($validated['has_csf'] ?? false, FILTER_VALIDATE_BOOLEAN),
        ];

        $profile = EmployeeProfile::updateOrCreate(
            ['user_id' => $user->id],
            array_merge($profileData, ['user_id' => $user->id])
        );

        $docUpdates = [];
        $baseDir = 'employee_docs/'.$user->id;
        if ($request->hasFile('ine_file')) {
            $docUpdates['ine_file_path'] = $request->file('ine_file')->store($baseDir, 'local');
        }
        if ($request->hasFile('csf_file')) {
            $docUpdates['csf_file_path'] = $request->file('csf_file')->store($baseDir, 'local');
        }
        if ($request->hasFile('address_proof_file')) {
            $docUpdates['address_proof_path'] = $request->file('address_proof_file')->store($baseDir, 'local');
        }
        if ($request->hasFile('studies_proof_file')) {
            $docUpdates['studies_proof_path'] = $request->file('studies_proof_file')->store($baseDir, 'local');
        }
        if (! empty($docUpdates)) {
            $profile->update($docUpdates);
        }

        if (! empty($validated['schedule_id'])) {
            $today = now()->format('Y-m-d');
            ScheduleAssignment::create([
                'schedule_id' => $validated['schedule_id'],
                'scheduleable_type' => User::class,
                'scheduleable_id' => $user->id,
                'valid_from' => $today,
                'valid_until' => null,
            ]);
        }
    }

    /**
     * Procesar baja laboral (RH). Actualiza expediente con motivo y fecha; opcionalmente lista negra.
     * NO ejecuta SoftDelete: solo prepara el expediente para que IT pueda ejecutar la baja técnica después.
     * Solo Recursos Humanos puede decidir si el usuario va a la Lista Negra.
     */
    public function terminateEmployees(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:users,id',
            'termination_reason_id' => 'required|exists:termination_reasons,id',
            'termination_date' => 'required|date',
            'reason' => 'nullable|string|max:65535',
            'add_to_blacklist' => 'boolean',
        ]);

        $addToBlacklist = filter_var($validated['add_to_blacklist'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $bajaStatus = EmployeeStatus::active()->whereRaw('LOWER(name) = ?', ['baja'])->first();

        DB::transaction(function () use ($validated, $addToBlacklist, $bajaStatus) {
            foreach ($validated['ids'] as $userId) {
                $user = User::find($userId);
                if (! $user) {
                    continue;
                }

                $profileData = [
                    'termination_reason_id' => $validated['termination_reason_id'],
                    'termination_date' => $validated['termination_date'],
                ];
                if ($bajaStatus) {
                    $profileData['employee_status_id'] = $bajaStatus->id;
                }

                $user->employeeProfile()->updateOrCreate(
                    ['user_id' => $user->id],
                    array_merge($profileData, ['user_id' => $user->id])
                );

                if ($addToBlacklist) {
                    $user->update(['is_blacklisted' => true]);
                    DB::table('blacklist_logs')->insert([
                        'user_id' => $user->id,
                        'admin_id' => Auth::id(),
                        'action' => 'ADDED',
                        'reason' => $validated['reason'] ?? 'Baja laboral procesada por RH.',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        });

        return response()->json([
            'message' => count($validated['ids']) === 1
                ? 'Baja laboral registrada. IT podrá ejecutar la baja técnica cuando corresponda.'
                : 'Bajas laborales registradas. IT podrá ejecutar la baja técnica cuando corresponda.',
        ]);
    }

    /**
     * Envía el correo de nuevo empleado pendiente de aprobación a quienes tienen users.manage.
     */
    private function notifyAdminsNewEmployee(User $newEmployee): void
    {
        $admins = User::permission('users.manage')
            ->whereNotNull('email')
            ->where('email', '!=', '')
            ->get();

        foreach ($admins as $admin) {
            try {
                Mail::to($admin->email)->send(new NewEmployeePendingApprovalMail($newEmployee));
            } catch (\Throwable $e) {
                Log::channel('single')->warning('Error enviando notificación de nuevo empleado a administrador', [
                    'admin_id' => $admin->id,
                    'new_employee_id' => $newEmployee->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }
}
