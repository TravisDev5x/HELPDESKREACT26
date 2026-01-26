<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Carbon\Carbon;
use App\Models\{
    Area,
    Campaign,
    Position,
    Priority,
    Role,
    Sede,
    Ubicacion,
    TicketState,
    TicketType,
    User,
    Ticket,
    TicketHistory
};

class TicketDemoSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            $this->seedCatalogs();
            $this->seedRolesAndPermissions();
            $users = $this->seedUsers();
            $this->seedTickets($users);
        });
    }

    private function seedCatalogs(): void
    {
        // Campañas
        foreach (['Interna', 'Cliente A', 'Cliente B', 'Campaña D', 'Campaña E'] as $name) {
            Campaign::firstOrCreate(['name' => $name], ['is_active' => true]);
        }

        // Áreas
        $areas = [
            'Soporte',
            'Infraestructura',
            'Telecomunicaciones',
            'Sistemas / TI',
            'Aplicaciones',
            'Redes',
            'Seguridad',
        ];
        foreach ($areas as $name) {
            Area::firstOrCreate(['name' => $name], ['is_active' => true]);
        }

        // Posiciones
        foreach (['Usuario Final', 'Soporte N1', 'Soporte N2', 'Infraestructura', 'Supervisor', 'Analista Apps', 'Analista Redes'] as $name) {
            Position::firstOrCreate(['name' => $name], ['is_active' => true]);
        }

        // Sedes
        $sedes = [
            ['name' => 'Sede Física A', 'code' => 'SFA', 'type' => 'physical'],
            ['name' => 'Sede Física B', 'code' => 'SFB', 'type' => 'physical'],
            ['name' => 'Remoto',        'code' => 'REMOTO', 'type' => 'virtual'],
        ];
        foreach ($sedes as $s) {
            Sede::firstOrCreate(
                ['name' => $s['name']],
                ['code' => $s['code'], 'type' => $s['type'], 'is_active' => true]
            );
        }

        // Ubicaciones (solo sedes físicas)
        $sfa = Sede::where('code', 'SFA')->first();
        $sfb = Sede::where('code', 'SFB')->first();
        if ($sfa) {
            foreach (['Piso 1', 'Piso 2'] as $name) {
                Ubicacion::firstOrCreate(
                    ['name' => $name, 'sede_id' => $sfa->id],
                    ['is_active' => true]
                );
            }
        }
        if ($sfb) {
            foreach (['Edificio Norte', 'Edificio Sur'] as $name) {
                Ubicacion::firstOrCreate(
                    ['name' => $name, 'sede_id' => $sfb->id],
                    ['is_active' => true]
                );
            }
        }

        // Prioridades (menor nivel = más urgente)
        $priorities = [
            ['name' => 'Crítica', 'level' => 1],
            ['name' => 'Alta',    'level' => 2],
            ['name' => 'Media',   'level' => 3],
            ['name' => 'Baja',    'level' => 4],
        ];
        foreach ($priorities as $p) {
            Priority::firstOrCreate(['name' => $p['name']], ['level' => $p['level'], 'is_active' => true]);
        }

        // Estados de ticket
        foreach (['Abierto', 'En progreso', 'En espera', 'Resuelto', 'Cerrado', 'Cancelado'] as $name) {
            TicketState::firstOrCreate(
                ['name' => $name],
                ['code' => Str::slug($name, '_'), 'is_active' => true, 'is_final' => in_array($name, ['Cerrado', 'Cancelado'])]
            );
        }

        // Tipos de ticket con áreas responsables
        $types = [
            'Falla de red' => ['Infraestructura', 'Telecomunicaciones', 'Redes'],
            'Falla de equipo' => ['Soporte'],
            'Acceso a sistema' => ['Sistemas / TI', 'Soporte', 'Aplicaciones'],
            'Solicitud de software' => ['Sistemas / TI', 'Aplicaciones'],
            'Incidente de seguridad' => ['Seguridad'],
            'VPN / Acceso remoto' => ['Redes', 'Seguridad'],
        ];
        foreach ($types as $typeName => $areaNames) {
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
        $permList = [
            'tickets.create',
            'tickets.view_own',
            'tickets.view_area',
            'tickets.filter_by_sede',
            'tickets.assign',
            'tickets.comment',
            'tickets.change_status',
            'tickets.escalate',
            'tickets.manage_all',
        ];
        foreach (['web', 'sanctum'] as $guard) {
            foreach ($permList as $perm) {
                DB::table('permissions')->updateOrInsert(
                    ['name' => $perm, 'guard_name' => $guard],
                    ['created_at' => now(), 'updated_at' => now()]
                );
            }
        }

        $roles = [
            'admin' => ['tickets.manage_all'],
            'usuario' => ['tickets.create', 'tickets.view_own'],
            'agente_soporte' => ['tickets.view_area', 'tickets.comment', 'tickets.change_status', 'tickets.filter_by_sede'],
            'supervisor_soporte' => ['tickets.assign', 'tickets.escalate', 'tickets.view_area', 'tickets.filter_by_sede', 'tickets.change_status'],
            'agente_infraestructura' => ['tickets.view_area', 'tickets.comment', 'tickets.change_status', 'tickets.filter_by_sede'],
        ];

        foreach ($roles as $name => $perms) {
            $role = Role::firstOrCreate(['name' => $name, 'guard_name' => 'web'], ['slug' => $name]);
            $permIds = DB::table('permissions')->whereIn('name', $perms)->where('guard_name', 'web')->pluck('id')->all();
            $role->syncPermissions($permIds);
        }

        // Admin con todos los permisos por compatibilidad
        $adminRole = Role::where('name', 'admin')->where('guard_name', 'web')->first();
        if ($adminRole) {
            $allPerms = DB::table('permissions')->where('guard_name', 'web')->pluck('id')->all();
            $adminRole->syncPermissions($allPerms);
        }
    }

    private function seedUsers(): array
    {
        $campaign = Campaign::first();
        $areaSoporte = Area::where('name', 'Soporte')->first();
        $areaInfra = Area::where('name', 'Infraestructura')->first();
        $areaSist = Area::where('name', 'Sistemas / TI')->first();
        $areaApps = Area::where('name', 'Aplicaciones')->first();
        $areaRedes = Area::where('name', 'Redes')->first();
        $areaSeg = Area::where('name', 'Seguridad')->first();
        $posUsuario = Position::where('name', 'Usuario Final')->first();
        $posN1 = Position::where('name', 'Soporte N1')->first();
        $posN2 = Position::where('name', 'Soporte N2')->first();
        $posInfra = Position::where('name', 'Infraestructura')->first();
        $posSup = Position::where('name', 'Supervisor')->first();
        $posApps = Position::where('name', 'Analista Apps')->first();
        $posRedes = Position::where('name', 'Analista Redes')->first();
        $sedeA = Sede::where('code', 'SFA')->first();
        $sedeB = Sede::where('code', 'SFB')->first();
        $sedeRemoto = Sede::where('code', 'REMOTO')->first();
        $ubiA1 = Ubicacion::where('name', 'Piso 1')->first();
        $ubiA2 = Ubicacion::where('name', 'Piso 2')->first();
        $ubiB1 = Ubicacion::where('name', 'Edificio Norte')->first();

        $makeUser = function ($attrs, $roleName) use ($campaign) {
            $user = User::updateOrCreate(
                ['email' => $attrs['email']],
                array_merge([
                    'name' => $attrs['name'],
                    'employee_number' => $attrs['employee_number'],
                    'phone' => $attrs['phone'],
                    // Deja que el cast "hashed" aplique la configuraciÃ³n actual
                    'password' => 'Password123!',
                    'campaign_id' => $campaign?->id,
                    'status' => 'active',
                ], $attrs['extra'])
            );
            $role = Role::where('name', $roleName)->first();
            if ($role) $user->syncRoles([$role]);
            return $user;
        };

        $users = [];
        $users['admin'] = $makeUser([
            'name' => 'Admin Global',
            'email' => 'admin@demo.com',
            'employee_number' => 'A0001',
            'phone' => '5500000001',
            'extra' => [
                'area_id' => $areaSist?->id,
                'position_id' => $posSup?->id,
                'sede_id' => $sedeA?->id,
                'ubicacion_id' => $ubiA1?->id,
            ],
        ], 'admin');

        $users['usuario_fisico'] = $makeUser([
            'name' => 'Ana Usuario',
            'email' => 'ana@demo.com',
            'employee_number' => 'U1001',
            'phone' => '5511111111',
            'extra' => [
                'area_id' => $areaSist?->id,
                'position_id' => $posUsuario?->id,
                'sede_id' => $sedeA?->id,
                'ubicacion_id' => $ubiA2?->id,
            ],
        ], 'usuario');

        $users['usuario_remoto'] = $makeUser([
            'name' => 'Luis Remoto',
            'email' => 'luis@demo.com',
            'employee_number' => 'U1002',
            'phone' => '5511111112',
            'extra' => [
                'area_id' => $areaSist?->id,
                'position_id' => $posUsuario?->id,
                'sede_id' => $sedeRemoto?->id,
                'ubicacion_id' => null,
            ],
        ], 'usuario');

        $users['agente_soporte'] = $makeUser([
            'name' => 'Carlos Soporte',
            'email' => 'soporte@demo.com',
            'employee_number' => 'S2001',
            'phone' => '5511111113',
            'extra' => [
                'area_id' => $areaSoporte?->id,
                'position_id' => $posN1?->id,
                'sede_id' => $sedeA?->id,
                'ubicacion_id' => $ubiA1?->id,
            ],
        ], 'agente_soporte');

        $users['supervisor'] = $makeUser([
            'name' => 'Sofía Supervisor',
            'email' => 'supervisor@demo.com',
            'employee_number' => 'S2002',
            'phone' => '5511111114',
            'extra' => [
                'area_id' => $areaSoporte?->id,
                'position_id' => $posSup?->id,
                'sede_id' => $sedeA?->id,
                'ubicacion_id' => $ubiA2?->id,
            ],
        ], 'supervisor_soporte');

        $users['agente_infra'] = $makeUser([
            'name' => 'Ingrid Infra',
            'email' => 'infra@demo.com',
            'employee_number' => 'I3001',
            'phone' => '5511111115',
            'extra' => [
                'area_id' => $areaInfra?->id,
                'position_id' => $posInfra?->id,
                'sede_id' => $sedeB?->id,
                'ubicacion_id' => $ubiB1?->id,
            ],
        ], 'agente_infraestructura');

        $users['agente_redes'] = $makeUser([
            'name' => 'Rafael Redes',
            'email' => 'redes@demo.com',
            'employee_number' => 'R4001',
            'phone' => '5511111116',
            'extra' => [
                'area_id' => $areaRedes?->id,
                'position_id' => $posRedes?->id,
                'sede_id' => $sedeB?->id,
                'ubicacion_id' => $ubiB1?->id,
            ],
        ], 'agente_infraestructura');

        $users['agente_apps'] = $makeUser([
            'name' => 'Ana Apps',
            'email' => 'apps@demo.com',
            'employee_number' => 'A5001',
            'phone' => '5511111117',
            'extra' => [
                'area_id' => $areaApps?->id,
                'position_id' => $posApps?->id,
                'sede_id' => $sedeA?->id,
                'ubicacion_id' => $ubiA1?->id,
            ],
        ], 'agente_soporte');

        $users['agente_seg'] = $makeUser([
            'name' => 'Sergio Seguridad',
            'email' => 'seguridad@demo.com',
            'employee_number' => 'S6001',
            'phone' => '5511111118',
            'extra' => [
                'area_id' => $areaSeg?->id,
                'position_id' => $posSup?->id,
                'sede_id' => $sedeA?->id,
                'ubicacion_id' => $ubiA2?->id,
            ],
        ], 'supervisor_soporte');

        return $users;
    }

    private function seedTickets(array $users): void
    {
        $states = TicketState::pluck('id', 'name');
        $priorities = Priority::pluck('id', 'name');
        $types = TicketType::pluck('id', 'name');
        $areaSoporte = Area::where('name', 'Soporte')->first();
        $areaInfra = Area::where('name', 'Infraestructura')->first();
        $areaApps = Area::where('name', 'Aplicaciones')->first();
        $areaRedes = Area::where('name', 'Redes')->first();
        $areaSeg = Area::where('name', 'Seguridad')->first();
        $sedeA = Sede::where('code', 'SFA')->first();
        $sedeB = Sede::where('code', 'SFB')->first();
        $sedeRemoto = Sede::where('code', 'REMOTO')->first();
        $ubiA1 = Ubicacion::where('name', 'Piso 1')->first();
        $ubiA2 = Ubicacion::where('name', 'Piso 2')->first();
        $ubiB1 = Ubicacion::where('name', 'Edificio Norte')->first();

        // Helper para historial
        $addHistory = function (Ticket $ticket, User $actor, ?int $fromArea, ?int $toArea, ?int $stateId, ?string $note) {
            TicketHistory::create([
                'ticket_id' => $ticket->id,
                'actor_id' => $actor->id,
                'from_area_id' => $fromArea,
                'to_area_id' => $toArea,
                'ticket_state_id' => $stateId,
                'note' => $note,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ]);
        };

        // T1: usuario físico -> Soporte (abierto)
        $t1 = Ticket::create([
            'subject' => 'Laptop no enciende',
            'description' => 'El equipo no responde al presionar el botón.',
            'area_origin_id' => $areaSoporte->id,
            'area_current_id' => $areaSoporte->id,
            'sede_id' => $sedeA->id,
            'ubicacion_id' => $ubiA1->id,
            'requester_id' => $users['usuario_fisico']->id,
            'requester_position_id' => $users['usuario_fisico']->position_id,
            'ticket_type_id' => $types['Falla de equipo'],
            'priority_id' => $priorities['Media'],
            'ticket_state_id' => $states['Abierto'],
        ]);
        $addHistory($t1, $users['usuario_fisico'], null, $areaSoporte->id, $states['Abierto'], 'Creación de ticket');

        // T2: usuario remoto -> Soporte (en progreso)
        $t2 = Ticket::create([
            'subject' => 'Acceso VPN',
            'description' => 'No puedo conectarme a la VPN corporativa.',
            'area_origin_id' => $areaSoporte->id,
            'area_current_id' => $areaSoporte->id,
            'sede_id' => $sedeRemoto->id,
            'ubicacion_id' => null,
            'requester_id' => $users['usuario_remoto']->id,
            'requester_position_id' => $users['usuario_remoto']->position_id,
            'ticket_type_id' => $types['Acceso a sistema'],
            'priority_id' => $priorities['Alta'],
            'ticket_state_id' => $states['En progreso'],
        ]);
        $addHistory($t2, $users['usuario_remoto'], null, $areaSoporte->id, $states['Abierto'], 'Creación de ticket');
        $addHistory($t2, $users['agente_soporte'], $areaSoporte->id, $areaSoporte->id, $states['En progreso'], 'Atendiendo VPN');

        // T3: escalado a Infraestructura
        $t3 = Ticket::create([
            'subject' => 'Conectividad en sala de juntas',
            'description' => 'Red inestable en sala principal.',
            'area_origin_id' => $areaSoporte->id,
            'area_current_id' => $areaInfra->id,
            'sede_id' => $sedeA->id,
            'ubicacion_id' => $ubiA2->id,
            'requester_id' => $users['usuario_fisico']->id,
            'requester_position_id' => $users['usuario_fisico']->position_id,
            'ticket_type_id' => $types['Falla de red'],
            'priority_id' => $priorities['Alta'],
            'ticket_state_id' => $states['En progreso'],
        ]);
        $addHistory($t3, $users['usuario_fisico'], null, $areaSoporte->id, $states['Abierto'], 'Creación de ticket');
        $addHistory($t3, $users['agente_soporte'], $areaSoporte->id, $areaInfra->id, $states['En progreso'], 'Escalado a Infraestructura');

        // T4: resuelto y cerrado
        $t4 = Ticket::create([
            'subject' => 'Instalación de software contable',
            'description' => 'Solicito instalación de módulo contable.',
            'area_origin_id' => $areaSoporte->id,
            'area_current_id' => $areaSoporte->id,
            'sede_id' => $sedeB->id,
            'ubicacion_id' => $ubiB1->id,
            'requester_id' => $users['usuario_fisico']->id,
            'requester_position_id' => $users['usuario_fisico']->position_id,
            'ticket_type_id' => $types['Solicitud de software'],
            'priority_id' => $priorities['Media'],
            'ticket_state_id' => $states['Cerrado'],
        ]);
        $addHistory($t4, $users['usuario_fisico'], null, $areaSoporte->id, $states['Abierto'], 'Creación de ticket');
        $addHistory($t4, $users['agente_soporte'], $areaSoporte->id, $areaSoporte->id, $states['En progreso'], 'Instalando software');
        $addHistory($t4, $users['agente_soporte'], $areaSoporte->id, $areaSoporte->id, $states['Resuelto'], 'Instalación finalizada');
        $addHistory($t4, $users['usuario_fisico'], $areaSoporte->id, $areaSoporte->id, $states['Cerrado'], 'Confirmo cierre');

        // T5: en espera
        $t5 = Ticket::create([
            'subject' => 'Alta de usuario en ERP',
            'description' => 'Requiere acceso nuevo colaborador.',
            'area_origin_id' => $areaSoporte->id,
            'area_current_id' => $areaSoporte->id,
            'sede_id' => $sedeRemoto->id,
            'ubicacion_id' => null,
            'requester_id' => $users['usuario_remoto']->id,
            'requester_position_id' => $users['usuario_remoto']->position_id,
            'ticket_type_id' => $types['Acceso a sistema'],
            'priority_id' => $priorities['Baja'],
            'ticket_state_id' => $states['En espera'],
        ]);
        $addHistory($t5, $users['usuario_remoto'], null, $areaSoporte->id, $states['Abierto'], 'Creación de ticket');
        $addHistory($t5, $users['agente_soporte'], $areaSoporte->id, $areaSoporte->id, $states['En espera'], 'Esperando validación');

        // T6: Seguridad incidente remoto
        $t6 = Ticket::create([
            'subject' => 'Correo sospechoso',
            'description' => 'Phishing reportado por usuario remoto.',
            'area_origin_id' => $areaSeg->id ?? $areaSoporte->id,
            'area_current_id' => $areaSeg->id ?? $areaSoporte->id,
            'sede_id' => $sedeRemoto->id,
            'ubicacion_id' => null,
            'requester_id' => $users['usuario_remoto']->id,
            'requester_position_id' => $users['usuario_remoto']->position_id,
            'ticket_type_id' => $types['Incidente de seguridad'],
            'priority_id' => $priorities['Alta'],
            'ticket_state_id' => $states['En progreso'],
            'created_at' => Carbon::now()->subHours(30),
            'updated_at' => Carbon::now()->subHours(30),
        ]);
        $addHistory($t6, $users['usuario_remoto'], null, $t6->area_current_id, $states['Abierto'], 'Reporte phishing');
        $addHistory($t6, $users['agente_seg'] ?? $users['agente_soporte'], $t6->area_current_id, $t6->area_current_id, $states['En progreso'], 'Investigando');

        // T7: Apps solicitud software crítico
        $t7 = Ticket::create([
            'subject' => 'Parche urgente CRM',
            'description' => 'Actualizar módulo ventas antes de corte.',
            'area_origin_id' => $areaApps->id ?? $areaSist->id,
            'area_current_id' => $areaApps->id ?? $areaSist->id,
            'sede_id' => $sedeA->id,
            'ubicacion_id' => $ubiA1->id,
            'requester_id' => $users['usuario_fisico']->id,
            'requester_position_id' => $users['usuario_fisico']->position_id,
            'ticket_type_id' => $types['Solicitud de software'],
            'priority_id' => $priorities['Crítica'],
            'ticket_state_id' => $states['En progreso'],
            'created_at' => Carbon::now()->subHours(10),
            'updated_at' => Carbon::now()->subHours(10),
        ]);
        $addHistory($t7, $users['usuario_fisico'], null, $t7->area_current_id, $states['Abierto'], 'Creación de ticket');
        $addHistory($t7, $users['agente_apps'], $t7->area_current_id, $t7->area_current_id, $states['En progreso'], 'Aplicando parche');

        // T8: Redes VPN saturada
        $t8 = Ticket::create([
            'subject' => 'Latencia VPN',
            'description' => 'Usuarios remotos con latencia alta.',
            'area_origin_id' => $areaRedes->id ?? $areaInfra->id,
            'area_current_id' => $areaRedes->id ?? $areaInfra->id,
            'sede_id' => $sedeRemoto->id,
            'ubicacion_id' => null,
            'requester_id' => $users['usuario_remoto']->id,
            'requester_position_id' => $users['usuario_remoto']->position_id,
            'ticket_type_id' => $types['VPN / Acceso remoto'],
            'priority_id' => $priorities['Alta'],
            'ticket_state_id' => $states['En progreso'],
            'created_at' => Carbon::now()->subHours(80),
            'updated_at' => Carbon::now()->subHours(80),
        ]);
        $addHistory($t8, $users['usuario_remoto'], null, $t8->area_current_id, $states['Abierto'], 'Creación de ticket');
        $addHistory($t8, $users['agente_redes'], $t8->area_current_id, $t8->area_current_id, $states['En progreso'], 'Revisando túneles');

        // T9: Infraestructura hardware crítico cerrado
        $t9 = Ticket::create([
            'subject' => 'RAID degradado',
            'description' => 'Servidor de archivos en RAID degradado.',
            'area_origin_id' => $areaInfra->id,
            'area_current_id' => $areaInfra->id,
            'sede_id' => $sedeB->id,
            'ubicacion_id' => $ubiB1->id,
            'requester_id' => $users['usuario_fisico']->id,
            'requester_position_id' => $users['usuario_fisico']->position_id,
            'ticket_type_id' => $types['Falla de equipo'],
            'priority_id' => $priorities['Alta'],
            'ticket_state_id' => $states['Cerrado'],
            'created_at' => Carbon::now()->subHours(120),
            'updated_at' => Carbon::now()->subHours(5),
        ]);
        $addHistory($t9, $users['usuario_fisico'], null, $areaInfra->id, $states['Abierto'], 'Creación de ticket');
        $addHistory($t9, $users['agente_infra'], $areaInfra->id, $areaInfra->id, $states['Resuelto'], 'Reemplazo de disco');
        $addHistory($t9, $users['usuario_fisico'], $areaInfra->id, $areaInfra->id, $states['Cerrado'], 'Confirmo cierre');

        // T10: Soporte backlog (quemado)
        $t10 = Ticket::create([
            'subject' => 'Mouse no funciona',
            'description' => 'Mouse se desconecta al moverlo.',
            'area_origin_id' => $areaSoporte->id,
            'area_current_id' => $areaSoporte->id,
            'sede_id' => $sedeA->id,
            'ubicacion_id' => $ubiA2->id,
            'requester_id' => $users['usuario_fisico']->id,
            'requester_position_id' => $users['usuario_fisico']->position_id,
            'ticket_type_id' => $types['Falla de equipo'],
            'priority_id' => $priorities['Baja'],
            'ticket_state_id' => $states['Abierto'],
            'created_at' => Carbon::now()->subHours(100),
            'updated_at' => Carbon::now()->subHours(100),
        ]);
        $addHistory($t10, $users['usuario_fisico'], null, $areaSoporte->id, $states['Abierto'], 'Creación de ticket');
    }
}
