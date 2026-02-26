<?php

namespace Database\Seeders;

use App\Models\Campaign;
use App\Models\Sede;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Datos demo del módulo SIGUA.
 * Requiere: SiguaPermissionsSeeder (sigua_systems), FullDemoSeeder (users, sedes, campaigns).
 * - 30 cuentas genéricas (20 Neotel por sede, 10 Ahevaa/PRB)
 * - 3 CA-01 de ejemplo (1 por sede, firmados por usuarios demo)
 * - 50 registros de bitácora de la última semana
 * - 2 incidentes (1 resuelto, 1 abierto)
 */
class SiguaDemoSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('SiguaDemoSeeder: cuentas, CA-01, bitácora e incidentes demo.');

        $neotel = DB::table('sigua_systems')->where('slug', 'neotel')->first();
        $ahevaa = DB::table('sigua_systems')->where('slug', 'ahevaa')->first();
        if (!$neotel || !$ahevaa) {
            $this->command->error('Ejecuta antes SiguaPermissionsSeeder para crear sigua_systems (Neotel, Ahevaa).');
            return;
        }

        $sedeCentro = Sede::where('code', 'SC')->first();
        $sedeNorte = Sede::where('code', 'SN')->first();
        $sedeRemoto = Sede::where('code', 'REMOTO')->first();
        $sedes = array_filter([$sedeCentro, $sedeNorte, $sedeRemoto]);
        if (count($sedes) < 2) {
            $this->command->error('Se requieren al menos 2 sedes (FullDemoSeeder).');
            return;
        }

        $campaign = Campaign::first();
        $admin = User::where('email', 'admin@demo.com')->first();
        $supervisor = User::where('email', 'supervisor@demo.com')->first();
        $soporte = User::where('email', 'soporte@demo.com')->first();
        $supervisors = array_filter([$admin, $supervisor, $soporte]);
        if (empty($supervisors)) {
            $this->command->error('Se requieren usuarios demo (admin@demo.com, supervisor@demo.com, etc.).');
            return;
        }

        DB::transaction(function () use ($neotel, $ahevaa, $sedes, $campaign, $supervisors, $admin, $supervisor) {
            $accountIds = $this->seedAccounts($neotel->id, $ahevaa->id, $sedes, $campaign);
            $ca01Ids = $this->seedCa01($sedes, $campaign);
            $this->seedLogbook($accountIds, $sedes, $supervisors);
            $this->seedIncidents($accountIds, $neotel->id, $ahevaa->id, $ca01Ids, $admin, $supervisor);
        });

        $this->command->info('SiguaDemoSeeder finalizado.');
    }

    private function seedAccounts(int $neotelId, int $ahevaaId, array $sedes, $campaign): array
    {
        $now = now();
        $accountIds = [];

        // 20 Neotel: variadas por sede (aprox 8 SC, 6 SN, 6 Remoto si existen)
        $neotelSedeCount = ['SC' => 8, 'SN' => 6, 'REMOTO' => 6];
        $idx = 0;
        foreach ($sedes as $sede) {
            $code = $sede->code ?? 'REMOTO';
            $n = $neotelSedeCount[$code] ?? 6;
            for ($i = 0; $i < $n; $i++) {
                $idx++;
                $isla = ['Isla 2', 'Isla 3', 'Isla 4', 'Isla 5'][$i % 4];
                DB::table('sigua_accounts')->insert([
                    'system_id' => $neotelId,
                    'usuario_cuenta' => 'ECD-' . strtoupper(substr($code, 0, 2)) . str_pad((string) $idx, 2, '0', STR_PAD_LEFT),
                    'nombre_cuenta' => 'Neotel ' . $sede->name . ' - ' . $isla,
                    'sede_id' => $sede->id,
                    'isla' => $isla,
                    'perfil' => $i % 2 === 0 ? 'Agente' : 'Supervisor',
                    'campaign_id' => $campaign?->id,
                    'estado' => 'activa',
                    'ou_ad' => null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
                $accountIds[] = DB::getPdo()->lastInsertId();
            }
        }

        // 10 Ahevaa/PRB
        $sedePrimera = $sedes[0];
        for ($i = 1; $i <= 10; $i++) {
            DB::table('sigua_accounts')->insert([
                'system_id' => $ahevaaId,
                'usuario_cuenta' => 'PRB' . str_pad((string) $i, 2, '0', STR_PAD_LEFT),
                'nombre_cuenta' => 'Ahevaa PRB - Cuenta ' . $i,
                'sede_id' => $sedePrimera->id,
                'isla' => null,
                'perfil' => 'Operador',
                'campaign_id' => $campaign?->id,
                'estado' => $i <= 8 ? 'activa' : 'suspendida',
                'ou_ad' => $i <= 5 ? 'OU=PRB,DC=cliente,DC=local' : null,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $accountIds[] = DB::getPdo()->lastInsertId();
        }

        return $accountIds;
    }

    private function seedCa01(array $sedes, $campaign): array
    {
        $admin = User::where('email', 'admin@demo.com')->first();
        $supervisor = User::where('email', 'supervisor@demo.com')->first();
        $soporte = User::where('email', 'soporte@demo.com')->first();
        $managers = array_filter([$admin, $supervisor, $soporte]);
        $neotel = DB::table('sigua_systems')->where('slug', 'neotel')->first();
        $now = now();
        $ca01Ids = [];

        foreach (array_slice($sedes, 0, 3) as $i => $sede) {
            $gerente = $managers[$i % count($managers)] ?? $admin;
            $fechaFirma = Carbon::today()->subDays(rand(5, 60));
            $fechaVenc = $fechaFirma->copy()->addMonths(6);

            DB::table('sigua_ca01')->insert([
                'gerente_user_id' => $gerente->id,
                'campaign_id' => $campaign->id,
                'sede_id' => $sede->id,
                'system_id' => $neotel->id,
                'fecha_firma' => $fechaFirma->toDateString(),
                'fecha_vencimiento' => $fechaVenc->toDateString(),
                'archivo_firmado' => 'sigua/ca01/ca01_sede_' . $sede->code . '_' . $fechaFirma->format('Y-m-d') . '.pdf',
                'estado' => 'vigente',
                'observaciones' => null,
                'created_by' => $admin->id,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $ca01Id = DB::getPdo()->lastInsertId();
            $ca01Ids[] = $ca01Id;

            // Pivot: asignar 3–5 cuentas de esta sede a este CA-01
            $accountsInSede = DB::table('sigua_accounts')
                ->where('sede_id', $sede->id)
                ->where('system_id', $neotel->id)
                ->limit(5)
                ->pluck('id')
                ->all();
            foreach ($accountsInSede as $aid) {
                DB::table('sigua_ca01_accounts')->insert([
                    'ca01_id' => $ca01Id,
                    'account_id' => $aid,
                    'justificacion' => 'Uso operativo campaña.',
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }

        return $ca01Ids;
    }

    private function seedLogbook(array $accountIds, array $sedes, array $supervisors): void
    {
        $neotel = DB::table('sigua_systems')->where('slug', 'neotel')->first();
        $campaign = Campaign::first();
        $turnos = ['matutino', 'vespertino', 'nocturno', 'mixto'];
        $nombres = ['Juan Pérez', 'María García', 'Luis López', 'Ana Martínez', 'Pedro Sánchez', 'Laura Díaz', 'Carlos Ruiz', 'Sofía Torres'];

        for ($i = 0; $i < 50; $i++) {
            $fecha = Carbon::today()->subDays(rand(0, 6));
            $accountId = $accountIds[array_rand($accountIds)];
            $acc = DB::table('sigua_accounts')->where('id', $accountId)->first();
            if (!$acc) {
                continue;
            }
            $sedeId = $acc->sede_id;
            $sup = $supervisors[array_rand($supervisors)];

            $horaInicio = rand(6, 14);
            $horaFin = $horaInicio + rand(4, 8);
            $horaCambio = $horaInicio + rand(1, 3);

            DB::table('sigua_logbook')->insert([
                'account_id' => $accountId,
                'system_id' => $neotel->id,
                'sede_id' => $sedeId,
                'campaign_id' => $campaign?->id,
                'fecha' => $fecha->toDateString(),
                'turno' => $turnos[array_rand($turnos)],
                'agente_nombre' => $nombres[array_rand($nombres)],
                'agente_num_empleado' => (string) rand(1000, 9999),
                'hora_inicio' => sprintf('%02d:00:00', min($horaInicio, 23)),
                'hora_fin' => sprintf('%02d:00:00', min($horaFin, 23)),
                'hora_cambio' => sprintf('%02d:00:00', min($horaCambio, 23)),
                'supervisor_user_id' => $sup->id,
                'observaciones' => $i % 5 === 0 ? 'Turno completo sin incidencias.' : null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    private function seedIncidents(
        array $accountIds,
        int $neotelId,
        int $ahevaaId,
        array $ca01Ids,
        $admin,
        $supervisor
    ): void {
        $admin = $admin ?? User::where('email', 'admin@demo.com')->first();
        $supervisor = $supervisor ?? User::where('email', 'supervisor@demo.com')->first();
        if (!$admin || !$supervisor) {
            return;
        }
        $now = now();
        $accounts = DB::table('sigua_accounts')->whereIn('id', $accountIds)->get()->keyBy('id');
        $acc1 = $accounts->first();
        $acc2 = $accounts->skip(1)->first();
        if (!$acc1 || !$acc2) {
            return;
        }

        // Incidente resuelto (Neotel)
        DB::table('sigua_incidents')->insert([
            'account_id' => $acc1->id,
            'fecha_incidente' => Carbon::now()->subDays(3)->toDateTimeString(),
            'descripcion' => 'Uso de cuenta genérica fuera de horario detectado en log. Se verificó con supervisor.',
            'ip_origen' => '192.168.10.45',
            'system_id' => $neotelId,
            'ca01_id' => $ca01Ids[0] ?? null,
            'agente_identificado' => 'Juan Pérez (EMP-1001)',
            'resolucion' => 'Se impartió capacitación. Cambio de contraseña de cuenta genérica. Sin reincidencia.',
            'estado' => 'resuelto',
            'reportado_por' => $admin->id,
            'asignado_a' => $supervisor->id,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        // Incidente abierto (Ahevaa)
        DB::table('sigua_incidents')->insert([
            'account_id' => $acc2->id,
            'fecha_incidente' => Carbon::now()->subDay()->toDateTimeString(),
            'descripcion' => 'Múltiples intentos de acceso fallidos a cuenta PRB01. Posible intento de uso no autorizado.',
            'ip_origen' => null,
            'system_id' => $ahevaaId,
            'ca01_id' => null,
            'agente_identificado' => null,
            'resolucion' => null,
            'estado' => 'abierto',
            'reportado_por' => $supervisor->id,
            'asignado_a' => $admin->id,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }
}
