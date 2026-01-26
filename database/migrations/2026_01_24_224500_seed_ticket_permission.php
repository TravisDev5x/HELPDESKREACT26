<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['web', 'sanctum'] as $guard) {
            DB::table('permissions')->updateOrInsert(
                ['name' => 'tickets.manage', 'guard_name' => $guard],
                ['created_at' => now(), 'updated_at' => now()]
            );
        }

        $adminRoles = DB::table('roles')->whereIn('name', ['admin'])->get();
        $permIds = DB::table('permissions')->where('name', 'tickets.manage')->pluck('id');

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
        // No rollback to keep permissions stable
    }
};
