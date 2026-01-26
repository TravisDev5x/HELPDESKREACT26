<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('roles')) {
            return;
        }

        // 1) Ensure admin role exists
        $roleId = DB::table('roles')->where('name', 'admin')->value('id');
        if (!$roleId) {
            $roleId = DB::table('roles')->insertGetId([
                'name' => 'admin',
                'slug' => 'admin',
                'guard_name' => 'web',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // 2) Assign to primary user(s)
        $targetUsers = collect([
            DB::table('users')->where('email', 'admin@empresa.com')->value('id'),
            DB::table('users')->orderBy('id')->value('id'), // fallback: first user
        ])->filter()->unique();

        foreach ($targetUsers as $userId) {
            $exists = DB::table('model_has_roles')
                ->where('model_type', 'App\\Models\\User')
                ->where('model_id', $userId)
                ->where('role_id', $roleId)
                ->exists();

            if (!$exists) {
                DB::table('model_has_roles')->insert([
                    'role_id' => $roleId,
                    'model_type' => 'App\\Models\\User',
                    'model_id' => $userId,
                ]);
            }
        }
    }

    public function down(): void
    {
        // Keep data; no rollback to avoid removing admin roles already in use.
    }
};
