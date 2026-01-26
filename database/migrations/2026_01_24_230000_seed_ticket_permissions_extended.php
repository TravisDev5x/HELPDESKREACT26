<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $perms = [
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
            foreach ($perms as $perm) {
                DB::table('permissions')->updateOrInsert(
                    ['name' => $perm, 'guard_name' => $guard],
                    ['created_at' => now(), 'updated_at' => now()]
                );
            }
        }

        // asignar todos a admin
        $adminRoles = DB::table('roles')->where('name', 'admin')->get();
        $permIds = DB::table('permissions')->whereIn('name', $perms)->pluck('id');
        foreach ($adminRoles as $role) {
            foreach ($permIds as $pid) {
                DB::table('role_has_permissions')->updateOrInsert([
                    'role_id' => $role->id,
                    'permission_id' => $pid,
                ], []);
            }
        }
    }

    public function down(): void
    {
        // no rollback para mantener consistencia de permisos
    }
};
