<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $guards = ['web', 'sanctum'];

        $core = [
            'users.manage',
            'roles.manage',
            'permissions.manage',
            'catalogs.manage',
            'notifications.manage',
        ];

        $ticketPerms = [
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

        $incidentPerms = [
            'incidents.create',
            'incidents.view_own',
            'incidents.view_area',
            'incidents.manage_all',
        ];

        $siguaPerms = [
            'sigua.dashboard',
            'sigua.cuentas.view',
            'sigua.cuentas.manage',
            'sigua.ca01.view',
            'sigua.ca01.manage',
            'sigua.ca01.firmar',
            'sigua.bitacora.view',
            'sigua.bitacora.registrar',
            'sigua.bitacora.sede',
            'sigua.incidentes.view',
            'sigua.incidentes.manage',
            'sigua.importar',
            'sigua.cruces',
            'sigua.cruces.view',
            'sigua.cruces.ejecutar',
            'sigua.reportes',
        ];

        $allPerms = array_unique(array_merge($core, $ticketPerms, $incidentPerms, $siguaPerms));

        foreach ($guards as $guard) {
            foreach ($allPerms as $name) {
                DB::table('permissions')->insertOrIgnore([
                    'name' => $name,
                    'guard_name' => $guard,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        $adminRoleId = DB::table('roles')->insertGetId([
            'name' => 'admin',
            'slug' => 'admin',
            'guard_name' => 'web',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $permIds = DB::table('permissions')->where('guard_name', 'web')->pluck('id');
        foreach ($permIds as $pid) {
            DB::table('role_has_permissions')->insert([
                'permission_id' => $pid,
                'role_id' => $adminRoleId,
            ]);
        }
    }

    public function down(): void
    {
        DB::table('role_has_permissions')->whereIn('role_id', DB::table('roles')->where('name', 'admin')->pluck('id'))->delete();
        DB::table('roles')->where('name', 'admin')->delete();
        DB::table('permissions')->delete();
    }
};
