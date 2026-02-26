<?php

namespace Database\Seeders;

use App\Models\Area;
use App\Models\Campaign;
use App\Models\Permission;
use App\Models\Position;
use App\Models\Priority;
use App\Models\Sede;
use App\Models\Ticket;
use App\Models\TicketHistory;
use App\Models\TicketState;
use App\Models\TicketType;
use App\Models\Ubicacion;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Seeder completo: catálogos + 5 usuarios tipo (credenciales fijas) + usuarios Faker + 200+ tickets.
 *
 * LOS 5 USUARIOS TIPO (contraseña para todos: Password123!)
 * ---------------------------------
 * 1. admin@demo.com       — Admin Global (todos los permisos, área Sistemas/IT)
 * 2. soporte@demo.com    — Agente Soporte (view_area, comment, change_status, assign; área Soporte)
 * 3. supervisor@demo.com — Supervisor (assign, escalate, view_area; área Soporte)
 * 4. usuario@demo.com    — Solicitante (solo create, view_own; área Sistemas/IT)
 * 5. consultor@demo.com  — Consultor / Vista (view_area sin área asignada; para probar aviso "asigna tu área")
 */
class FullDemoSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('FullDemoSeeder: catálogos, roles, 5 usuarios tipo, usuarios Faker, 200+ tickets.');
        DB::transaction(function () {
            $this->seedCatalogs();
            $this->seedRolesAndPermissions();
            $usersByType = $this->seedFixedUsers();
            $fakerUsers = $this->seedFakerUsers();
            $allRequesters = collect($usersByType)->merge($fakerUsers['requesters'])->values()->all();
            $allAgents = collect($usersByType)->merge($fakerUsers['agents'])->values()->all();
            $this->seedTickets($allRequesters, $allAgents);
        });
        $this->command->info('FullDemoSeeder finalizado.');
    }

    private function seedCatalogs(): void
    {
        foreach (['Interna', 'Cliente A', 'Cliente B', 'Soporte Técnico', 'Retención'] as $name) {
            Campaign::firstOrCreate(['name' => $name], ['is_active' => true]);
        }

        $areas = [
            'Soporte', 'Infraestructura', 'Telecomunicaciones', 'Sistemas / TI',
            'Aplicaciones', 'Redes', 'Seguridad', 'Recursos Humanos', 'Operaciones',
        ];
        foreach ($areas as $name) {
            Area::firstOrCreate(['name' => $name], ['is_active' => true]);
        }

        $positions = [
            'Usuario Final', 'Soporte N1', 'Soporte N2', 'Infraestructura', 'Supervisor',
            'Analista Apps', 'Analista Redes', 'Gerente', 'Agente Telefónico',
        ];
        foreach ($positions as $name) {
            Position::firstOrCreate(['name' => $name], ['is_active' => true]);
        }

        $sedes = [
            ['name' => 'Sede Centro', 'code' => 'SC', 'type' => 'physical'],
            ['name' => 'Sede Norte', 'code' => 'SN', 'type' => 'physical'],
            ['name' => 'Remoto', 'code' => 'REMOTO', 'type' => 'virtual'],
        ];
        foreach ($sedes as $s) {
            Sede::firstOrCreate(
                ['name' => $s['name']],
                ['code' => $s['code'], 'type' => $s['type'], 'is_active' => true]
            );
        }

        $sedeCentro = Sede::where('code', 'SC')->first();
        $sedeNorte = Sede::where('code', 'SN')->first();
        if ($sedeCentro) {
            foreach (['Piso 1', 'Piso 2', 'Piso 3'] as $name) {
                Ubicacion::firstOrCreate(
                    ['sede_id' => $sedeCentro->id, 'name' => $name],
                    ['is_active' => true]
                );
            }
        }
        if ($sedeNorte) {
            foreach (['Edificio A', 'Edificio B'] as $name) {
                Ubicacion::firstOrCreate(
                    ['sede_id' => $sedeNorte->id, 'name' => $name],
                    ['is_active' => true]
                );
            }
        }

        $priorities = [
            ['name' => 'Crítica', 'level' => 1],
            ['name' => 'Alta', 'level' => 2],
            ['name' => 'Media', 'level' => 3],
            ['name' => 'Baja', 'level' => 4],
        ];
        foreach ($priorities as $p) {
            Priority::firstOrCreate(['name' => $p['name']], ['level' => $p['level'], 'is_active' => true]);
        }

        $states = [
            ['name' => 'Abierto', 'code' => 'abierto', 'is_final' => false],
            ['name' => 'En progreso', 'code' => 'en_progreso', 'is_final' => false],
            ['name' => 'En espera', 'code' => 'en_espera', 'is_final' => false],
            ['name' => 'Resuelto', 'code' => 'resuelto', 'is_final' => false],
            ['name' => 'Cerrado', 'code' => 'cerrado', 'is_final' => true],
            ['name' => 'Cancelado', 'code' => 'cancelado', 'is_final' => true],
        ];
        foreach ($states as $s) {
            TicketState::firstOrCreate(
                ['name' => $s['name']],
                ['code' => $s['code'], 'is_active' => true, 'is_final' => $s['is_final']]
            );
        }

        $typeAreas = [
            'Falla de red' => ['Infraestructura', 'Telecomunicaciones', 'Redes'],
            'Falla de equipo' => ['Soporte'],
            'Acceso a sistema' => ['Sistemas / TI', 'Soporte', 'Aplicaciones'],
            'Solicitud de software' => ['Sistemas / TI', 'Aplicaciones'],
            'Incidente de seguridad' => ['Seguridad'],
            'VPN / Acceso remoto' => ['Redes', 'Seguridad'],
            'Consultoría interna' => ['Sistemas / TI', 'Operaciones'],
            'Hardware / Periféricos' => ['Soporte', 'Infraestructura'],
        ];
        foreach ($typeAreas as $typeName => $areaNames) {
            $type = TicketType::firstOrCreate(
                ['name' => $typeName],
                ['code' => Str::slug($typeName, '_'), 'is_active' => true]
            );
            $areaIds = Area::whereIn('name', $areaNames)->pluck('id')->all();
            $type->areas()->sync($areaIds);
        }
    }

    private function seedRolesAndPermissions(): void
    {
        $perms = [
            'tickets.create', 'tickets.view_own', 'tickets.view_area', 'tickets.filter_by_sede',
            'tickets.assign', 'tickets.comment', 'tickets.change_status', 'tickets.escalate', 'tickets.manage_all',
            'users.manage', 'roles.manage', 'permissions.manage', 'catalogs.manage', 'notifications.manage',
            'incidents.create', 'incidents.view_own', 'incidents.view_area', 'incidents.manage_all',
            // SIGUA (también creados por SiguaPermissionsSeeder; aquí para que admin los tenga desde el seed completo)
            'sigua.dashboard', 'sigua.cuentas.view', 'sigua.cuentas.manage', 'sigua.ca01.view', 'sigua.ca01.manage',
            'sigua.ca01.firmar', 'sigua.bitacora.view', 'sigua.bitacora.registrar', 'sigua.bitacora.sede',
            'sigua.incidentes.view', 'sigua.incidentes.manage', 'sigua.importar', 'sigua.cruces', 'sigua.reportes',
        ];
        foreach (['web', 'sanctum'] as $guard) {
            foreach ($perms as $name) {
                DB::table('permissions')->insertOrIgnore([
                    'name' => $name,
                    'guard_name' => $guard,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        // Asegurar que permisos SIGUA existan vía Eloquent (por si la migración no los creó o caché está desactualizada)
        $siguaNames = [
            'sigua.dashboard', 'sigua.cuentas.view', 'sigua.cuentas.manage', 'sigua.ca01.view', 'sigua.ca01.manage',
            'sigua.ca01.firmar', 'sigua.bitacora.view', 'sigua.bitacora.registrar', 'sigua.bitacora.sede',
            'sigua.incidentes.view', 'sigua.incidentes.manage', 'sigua.importar', 'sigua.cruces', 'sigua.reportes',
        ];
        foreach (['web', 'sanctum'] as $guard) {
            foreach ($siguaNames as $name) {
                Permission::firstOrCreate(['name' => $name, 'guard_name' => $guard]);
            }
        }

        // Limpiar caché de Spatie para que findByName() vea los permisos
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

        // Usar nombres (no IDs) para evitar PermissionDoesNotExist cuando hay mismo nombre en guard web/sanctum
        $allPermNames = DB::table('permissions')->where('guard_name', 'web')->pluck('name')->all();
        $roles = [
            'admin' => $allPermNames,
            'agente_soporte' => ['tickets.view_area', 'tickets.comment', 'tickets.change_status', 'tickets.assign', 'tickets.filter_by_sede'],
            'supervisor_soporte' => ['tickets.view_area', 'tickets.assign', 'tickets.escalate', 'tickets.comment', 'tickets.change_status', 'tickets.filter_by_sede'],
            'usuario' => ['tickets.create', 'tickets.view_own'],
            'consultor' => ['tickets.view_area', 'tickets.view_own'],
        ];

        foreach ($roles as $roleName => $permNamesOrIds) {
            $role = \App\Models\Role::firstOrCreate(
                ['name' => $roleName, 'guard_name' => 'web'],
                ['slug' => $roleName]
            );
            $role->syncPermissions($permNamesOrIds);
        }
    }

    private function seedFixedUsers(): array
    {
        $campaign = Campaign::first();
        $areaSist = Area::where('name', 'Sistemas / TI')->first();
        $areaSoporte = Area::where('name', 'Soporte')->first();
        $posSup = Position::where('name', 'Supervisor')->first();
        $posN1 = Position::where('name', 'Soporte N1')->first();
        $posUsuario = Position::where('name', 'Usuario Final')->first();
        $sedeC = Sede::where('code', 'SC')->first();
        $sedeR = Sede::where('code', 'REMOTO')->first();
        $ubi1 = Ubicacion::where('name', 'Piso 1')->first();
        $password = 'Password123!';

        $create = function (array $attrs, string $roleName) use ($campaign, $password) {
            $user = User::updateOrCreate(
                ['email' => $attrs['email']],
                array_merge([
                    'name' => $attrs['name'],
                    'employee_number' => $attrs['employee_number'],
                    'phone' => $attrs['phone'] ?? null,
                    'password' => $password,
                    'campaign_id' => $campaign?->id,
                    'status' => 'active',
                    'email_verified_at' => now(),
                ], $attrs['extra'] ?? [])
            );
            $role = \App\Models\Role::where('name', $roleName)->where('guard_name', 'web')->first();
            if ($role) {
                $user->syncRoles([$role]);
            }
            return $user;
        };

        $users = [];
        $users['admin'] = $create([
            'name' => 'Admin Global',
            'email' => 'admin@demo.com',
            'employee_number' => 'A0001',
            'phone' => '5500000001',
            'extra' => [
                'area_id' => $areaSist?->id,
                'position_id' => $posSup?->id,
                'sede_id' => $sedeC?->id ?? $sedeR?->id,
                'ubicacion_id' => $ubi1?->id,
            ],
        ], 'admin');

        $users['soporte'] = $create([
            'name' => 'Carlos Soporte',
            'email' => 'soporte@demo.com',
            'employee_number' => 'S1001',
            'phone' => '5500000002',
            'extra' => [
                'area_id' => $areaSoporte?->id,
                'position_id' => $posN1?->id,
                'sede_id' => $sedeC?->id ?? $sedeR?->id,
                'ubicacion_id' => $ubi1?->id,
            ],
        ], 'agente_soporte');

        $users['supervisor'] = $create([
            'name' => 'Sofía Supervisor',
            'email' => 'supervisor@demo.com',
            'employee_number' => 'S1002',
            'phone' => '5500000003',
            'extra' => [
                'area_id' => $areaSoporte?->id,
                'position_id' => $posSup?->id,
                'sede_id' => $sedeC?->id ?? $sedeR?->id,
                'ubicacion_id' => $ubi1?->id,
            ],
        ], 'supervisor_soporte');

        $users['usuario'] = $create([
            'name' => 'Ana Usuario',
            'email' => 'usuario@demo.com',
            'employee_number' => 'U1001',
            'phone' => '5500000004',
            'extra' => [
                'area_id' => $areaSist?->id,
                'position_id' => $posUsuario?->id,
                'sede_id' => $sedeC?->id ?? $sedeR?->id,
                'ubicacion_id' => $ubi1?->id,
            ],
        ], 'usuario');

        $users['consultor'] = $create([
            'name' => 'Luis Consultor',
            'email' => 'consultor@demo.com',
            'employee_number' => 'C1001',
            'phone' => '5500000005',
            'extra' => [
                'area_id' => null,
                'position_id' => $posUsuario?->id,
                'sede_id' => $sedeR?->id ?? $sedeC?->id,
                'ubicacion_id' => null,
            ],
        ], 'consultor');

        return $users;
    }

    private function seedFakerUsers(): array
    {
        $campaign = Campaign::first();
        $areas = Area::all();
        $positions = Position::all();
        $sedes = Sede::all();
        $locations = Ubicacion::all();
        $roleAgente = \App\Models\Role::where('name', 'agente_soporte')->where('guard_name', 'web')->first();
        $roleUsuario = \App\Models\Role::where('name', 'usuario')->where('guard_name', 'web')->first();
        $roleSupervisor = \App\Models\Role::where('name', 'supervisor_soporte')->where('guard_name', 'web')->first();

        $requesters = [];
        $agents = [];
        $baseNum = (int) (microtime(true) % 90000);

        for ($i = 0; $i < 95; $i++) {
            $area = $areas->random();
            $sede = $sedes->random();
            $locForSede = $locations->where('sede_id', $sede->id);
            $ubicacion = $locForSede->isNotEmpty() ? $locForSede->random() : null;
            $isAgent = $i < 45;
            $role = $isAgent ? ($i % 5 === 0 ? $roleSupervisor : $roleAgente) : $roleUsuario;
            $user = User::create([
                'name' => fake()->name(),
                'email' => 'demo' . ($baseNum + $i) . '@demo.local',
                'employee_number' => 'D' . str_pad((string) ($baseNum + $i), 5, '0', STR_PAD_LEFT),
                'phone' => fake()->numerify('55########'),
                'password' => 'Password123!',
                'campaign_id' => $campaign?->id,
                'area_id' => $area->id,
                'position_id' => $positions->random()->id,
                'sede_id' => $sede->id,
                'ubicacion_id' => $ubicacion?->id,
                'status' => 'active',
                'email_verified_at' => now(),
            ]);
            if ($role) {
                $user->syncRoles([$role]);
            }
            if ($isAgent) {
                $agents[] = $user;
            } else {
                $requesters[] = $user;
            }
        }

        return ['requesters' => $requesters, 'agents' => $agents];
    }

    private function seedTickets(array $requesters, array $allAgents): void
    {
        $areas = Area::all();
        $sedes = Sede::all();
        $locations = Ubicacion::all();
        $states = TicketState::all()->keyBy('name');
        $priorities = Priority::all()->keyBy('name');
        $types = TicketType::with('areas')->get()->keyBy('name');

        $subjects = [
            'Equipo no enciende', 'Pantalla en negro', 'No hay conexión a red', 'Impresora no responde',
            'Solicitud de acceso a carpeta', 'VPN no conecta', 'Correo sospechoso', 'Software no abre',
            'Teclado falla', 'Solicitud de instalación', 'Internet lento', 'Alta de usuario en sistema',
            'Cambio de contraseña', 'Monitor parpadea', 'Solicitud de equipo nuevo', 'Falla en sala de juntas',
            'Problema con lector de huella', 'Acceso a portal', 'Error en aplicación', 'Backup no ejecutado',
        ];

        $descriptions = [
            'El equipo presenta la falla descrita desde esta mañana.',
            'No puedo continuar con mi trabajo hasta que se resuelva.',
            'Ya reinicié el equipo y persiste el problema.',
            'Urgente por corte de cierre.',
            'Solicito seguimiento.',
        ];

        for ($i = 0; $i < 210; $i++) {
            $requester = $requesters[array_rand($requesters)];
            $areaOrigin = $areas->random();
            $areaCurrent = $areaOrigin;
            $sede = $sedes->random();
            $locForSede = $locations->where('sede_id', $sede->id);
            $ubicacion = $locForSede->isNotEmpty() ? $locForSede->random() : null;
            $type = $types->random();
            $typeAreaIds = $type->areas->pluck('id')->all();
            if (!empty($typeAreaIds) && !in_array($areaOrigin->id, $typeAreaIds, true)) {
                $areaOrigin = Area::whereIn('id', $typeAreaIds)->inRandomOrder()->first();
                $areaCurrent = $areaOrigin;
            }
            $priority = $priorities->random();
            $stateNames = ['Abierto', 'En progreso', 'En espera', 'Resuelto', 'Cerrado', 'Cancelado'];
            $stateName = $stateNames[array_rand($stateNames)];
            $state = $states->get($stateName);
            if (!$state) {
                $state = $states->random();
            }

            $createdAt = Carbon::now()->subDays(rand(1, 90))->subHours(rand(0, 23));
            $dueAt = $createdAt->copy()->addHours(rand(24, 72));
            $resolvedAt = $state->is_final ? $createdAt->copy()->addHours(rand(2, 48)) : null;
            if ($resolvedAt && $resolvedAt->isFuture()) {
                $resolvedAt = $createdAt->copy()->addHours(rand(2, 24));
            }

            $assignedUser = null;
            $assignedAt = null;
            if (in_array($stateName, ['En progreso', 'Resuelto', 'Cerrado'], true)) {
                $candidates = array_values(array_filter($allAgents, function ($u) use ($areaCurrent) {
                    return $u->area_id === $areaCurrent->id;
                }));
                if (empty($candidates)) {
                    $candidates = $allAgents;
                }
                if (!empty($candidates)) {
                    $assignedUser = $candidates[array_rand($candidates)];
                    $assignedAt = $createdAt->copy()->addMinutes(rand(5, 120));
                }
            }

            $ticket = Ticket::create([
                'subject' => $subjects[array_rand($subjects)] . ' #' . ($i + 1),
                'description' => $descriptions[array_rand($descriptions)],
                'area_origin_id' => $areaOrigin->id,
                'area_current_id' => $areaCurrent->id,
                'sede_id' => $sede->id,
                'ubicacion_id' => $ubicacion?->id,
                'requester_id' => $requester->id,
                'requester_position_id' => $requester->position_id,
                'assigned_user_id' => $assignedUser?->id,
                'assigned_at' => $assignedAt,
                'ticket_type_id' => $type->id,
                'priority_id' => $priority->id,
                'ticket_state_id' => $state->id,
                'resolved_at' => $resolvedAt,
                'due_at' => $dueAt,
                'created_at' => $createdAt,
                'updated_at' => $resolvedAt ?? $createdAt,
            ]);

            TicketHistory::create([
                'ticket_id' => $ticket->id,
                'actor_id' => $requester->id,
                'from_area_id' => null,
                'to_area_id' => $areaCurrent->id,
                'ticket_state_id' => $state->id,
                'note' => 'Creación de ticket',
                'action' => null,
                'is_internal' => false,
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ]);

            try {
                DB::table('ticket_area_access')->insertOrIgnore([
                    'ticket_id' => $ticket->id,
                    'area_id' => $areaOrigin->id,
                    'reason' => 'created',
                    'created_at' => $createdAt,
                ]);
            } catch (\Throwable $e) {
                // ignore duplicate
            }
        }
    }
}
