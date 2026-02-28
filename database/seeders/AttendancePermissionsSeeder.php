<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

/**
 * Permisos del módulo de Asistencias (horarios y punches).
 * - attendances.view_own: Ver su propia asistencia/horario
 * - attendances.record_own: Registrar sus propios punches
 * - attendances.view_all: Ver asistencias de todos (supervisores)
 * - attendances.manage: Asignar horarios, editar registros (RH/Admin)
 */
class AttendancePermissionsSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('AttendancePermissionsSeeder: creando permisos de asistencias.');

        DB::transaction(function () {
            $this->seedPermissions();
            $this->assignPermissionsToRoles();
        });

        Artisan::call('permission:cache-reset');
        $this->command->info('AttendancePermissionsSeeder finalizado. Caché de permisos limpiada.');
    }

    private function seedPermissions(): void
    {
        $permissions = [
            'attendances.view_own'   => 'Ver su propia asistencia/horario',
            'attendances.record_own' => 'Registrar sus propios punches',
            'attendances.view_all'   => 'Ver asistencias de todos',
            'attendances.manage'      => 'Asignar horarios y editar registros manualmente',
        ];

        foreach (['web', 'sanctum'] as $guard) {
            foreach ($permissions as $name => $description) {
                Permission::firstOrCreate(
                    ['name' => $name, 'guard_name' => $guard],
                    ['name' => $name, 'guard_name' => $guard]
                );
            }
        }
    }

    private function assignPermissionsToRoles(): void
    {
        $roles = Role::whereIn('guard_name', ['web', 'sanctum'])->get();

        $agentPermNames = ['attendances.view_own', 'attendances.record_own'];
        $adminPermNames = ['attendances.view_own', 'attendances.record_own', 'attendances.view_all', 'attendances.manage'];

        foreach ($roles as $role) {
            $permNames = [];
            if (in_array(strtolower($role->name), ['usuario', 'agente', 'soporte'], true)) {
                $permNames = $agentPermNames;
            }
            if (strtolower($role->name) === 'admin') {
                $permNames = $adminPermNames;
            }

            if (empty($permNames)) {
                continue;
            }

            $permIds = Permission::where('guard_name', $role->guard_name)
                ->whereIn('name', $permNames)
                ->pluck('id')
                ->all();

            if (empty($permIds)) {
                continue;
            }

            $existing = DB::table('role_has_permissions')
                ->where('role_id', $role->id)
                ->pluck('permission_id')
                ->all();

            $toAdd = array_diff($permIds, $existing);
            foreach ($toAdd as $permId) {
                DB::table('role_has_permissions')->insert([
                    'permission_id' => $permId,
                    'role_id' => $role->id,
                ]);
            }
        }
    }
}
