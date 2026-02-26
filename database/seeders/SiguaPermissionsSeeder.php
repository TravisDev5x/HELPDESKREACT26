<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

/**
 * Permisos del módulo SIGUA y datos iniciales.
 * - Inserta permisos sigua.* en permissions (guard web + sanctum).
 * - Inserta sistemas iniciales: Neotel, Ahevaa en sigua_systems.
 * - Asigna todos los permisos sigua.* al rol Admin Global (admin).
 */
class SiguaPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('SiguaPermissionsSeeder: permisos SIGUA y datos iniciales.');

        DB::transaction(function () {
            $this->seedPermissions();
            $this->seedSystems();
            $this->assignPermissionsToAdmin();
        });

        Artisan::call('permission:cache-reset');
        $this->command->info('SiguaPermissionsSeeder finalizado. Caché de permisos limpiada.');
    }

    private function seedPermissions(): void
    {
        $perms = [
            'sigua.dashboard'          => 'Ver dashboard SIGUA',
            'sigua.cuentas.view'       => 'Ver inventario de cuentas genéricas',
            'sigua.cuentas.manage'     => 'CRUD cuentas genéricas',
            'sigua.ca01.view'           => 'Ver formatos CA-01',
            'sigua.ca01.manage'        => 'Crear/editar/cancelar CA-01',
            'sigua.ca01.firmar'        => 'Firmar CA-01 (para gerentes)',
            'sigua.bitacora.view'      => 'Ver bitácora',
            'sigua.bitacora.registrar' => 'Registrar en bitácora (para supervisores)',
            'sigua.bitacora.sede'      => 'Ver bitácora de su sede',
            'sigua.incidentes.view'    => 'Ver incidentes',
            'sigua.incidentes.manage'  => 'Gestionar incidentes',
            'sigua.importar'           => 'Importar archivos Excel',
            'sigua.cruces'             => 'Ejecutar cruces RH/AD/Neotel',
            'sigua.cruces.view'        => 'Ver página de cruces',
            'sigua.cruces.ejecutar'    => 'Ejecutar cruces RH/AD/Neotel',
            'sigua.reportes'           => 'Generar reportes y exportar',
        ];

        foreach (['web', 'sanctum'] as $guard) {
            foreach ($perms as $name => $description) {
                DB::table('permissions')->insertOrIgnore([
                    'name' => $name,
                    'guard_name' => $guard,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    private function seedSystems(): void
    {
        $systems = [
            [
                'name' => 'Neotel',
                'slug' => 'neotel',
                'description' => 'Sistema Neotel (controlado por ECD)',
                'es_externo' => false,
                'contacto_externo' => null,
            ],
            [
                'name' => 'Ahevaa',
                'slug' => 'ahevaa',
                'description' => 'Sistema Ahevaa (controlado por cliente PRB)',
                'es_externo' => true,
                'contacto_externo' => 'PRB — pendiente definir',
            ],
        ];

        foreach ($systems as $s) {
            DB::table('sigua_systems')->updateOrInsert(
                ['slug' => $s['slug']],
                array_merge($s, [
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );
        }
    }

    private function assignPermissionsToAdmin(): void
    {
        $role = Role::where('name', 'admin')->where('guard_name', 'web')->first();
        if (!$role) {
            $this->command->warn('Rol admin no encontrado. Omitiendo asignación de permisos SIGUA.');
            return;
        }

        $siguaPermIds = DB::table('permissions')
            ->where('guard_name', 'web')
            ->where('name', 'like', 'sigua.%')
            ->pluck('id')
            ->all();

        if (empty($siguaPermIds)) {
            return;
        }

        $existing = DB::table('role_has_permissions')
            ->where('role_id', $role->id)
            ->pluck('permission_id')
            ->all();

        $toAdd = array_diff($siguaPermIds, $existing);
        foreach ($toAdd as $permId) {
            DB::table('role_has_permissions')->insert([
                'permission_id' => $permId,
                'role_id' => $role->id,
            ]);
        }
    }
}
