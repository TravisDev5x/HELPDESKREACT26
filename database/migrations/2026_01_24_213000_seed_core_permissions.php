<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $guards = collect([config('auth.defaults.guard', 'web'), 'web', 'sanctum'])->unique();

        $core = [
            'users.manage',
            'roles.manage',
            'permissions.manage',
            'catalogs.manage',
            'notifications.manage',
        ];

        foreach ($guards as $guard) {
            foreach ($core as $perm) {
                DB::table('permissions')->updateOrInsert(
                    ['name' => $perm, 'guard_name' => $guard],
                    ['created_at' => now(), 'updated_at' => now()]
                );
            }
        }
    }

    public function down(): void
    {
        // No se borran para evitar perder asignaciones si ya existen.
    }
};
