<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $guard = config('auth.defaults.guard', 'web');

        $roleId = DB::table('roles')->where('name', 'admin')->where('guard_name', $guard)->value('id');
        if (!$roleId) {
            return;
        }

        $permIds = DB::table('permissions')
            ->where('guard_name', $guard)
            ->whereIn('name', [
                'users.manage',
                'roles.manage',
                'permissions.manage',
                'catalogs.manage',
                'notifications.manage',
            ])
            ->pluck('id')
            ->all();

        foreach ($permIds as $pid) {
            DB::table('role_has_permissions')->updateOrInsert([
                'role_id' => $roleId,
                'permission_id' => $pid,
            ], []);
        }
    }

    public function down(): void
    {
        // No se desasignan para no romper ambientes existentes.
    }
};
