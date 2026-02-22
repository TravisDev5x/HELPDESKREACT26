<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $incidentPerms = [
            'incidents.create',
            'incidents.view_own',
            'incidents.view_area',
            'incidents.manage_all',
        ];

        foreach (['web', 'sanctum'] as $guard) {
            foreach ($incidentPerms as $name) {
                DB::table('permissions')->insertOrIgnore([
                    'name' => $name,
                    'guard_name' => $guard,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        $adminRoleId = DB::table('roles')->where('name', 'admin')->where('guard_name', 'web')->value('id');
        if ($adminRoleId) {
            $newPermIds = DB::table('permissions')->whereIn('name', $incidentPerms)->where('guard_name', 'web')->pluck('id');
            foreach ($newPermIds as $pid) {
                DB::table('role_has_permissions')->insertOrIgnore([
                    'permission_id' => $pid,
                    'role_id' => $adminRoleId,
                ]);
            }
        }
    }

    public function down(): void
    {
        // Permissions remain; only role assignment could be reverted if needed
    }
};
