<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('roles', function (Blueprint $table) {
            // Ajustar unicidad para incluir guard_name (alineado con Spatie)
            $table->dropUnique('roles_name_unique');
            $table->dropUnique('roles_slug_unique');
            $table->unique(['name', 'guard_name'], 'roles_name_guard_unique');
            $table->unique(['slug', 'guard_name'], 'roles_slug_guard_unique');
        });
    }

    public function down(): void
    {
        Schema::table('roles', function (Blueprint $table) {
            $table->dropUnique('roles_name_guard_unique');
            $table->dropUnique('roles_slug_guard_unique');
            $table->unique('name', 'roles_name_unique');
            $table->unique('slug', 'roles_slug_unique');
        });
    }
};
