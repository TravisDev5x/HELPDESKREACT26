<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'mysql') {
            return;
        }
        DB::statement("ALTER TABLE sigua_accounts MODIFY COLUMN estado ENUM(
            'activa','suspendida','baja','pendiente_revision'
        ) DEFAULT 'activa'");
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'mysql') {
            return;
        }
        DB::table('sigua_accounts')->where('estado', 'pendiente_revision')->update(['estado' => 'suspendida']);
        DB::statement("ALTER TABLE sigua_accounts MODIFY COLUMN estado ENUM(
            'activa','suspendida','baja'
        ) DEFAULT 'activa'");
    }
};
