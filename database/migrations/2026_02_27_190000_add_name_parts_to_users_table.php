<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Añade columnas para nombre y apellidos.
     * La columna `name` se mantiene temporalmente para migración de datos
     * (el comando MigrateUsersNameToParts la rellenará y después se puede eliminar en otra migración).
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('first_name', 255)->nullable()->after('employee_number');
            $table->string('paternal_last_name', 255)->nullable()->after('first_name');
            $table->string('maternal_last_name', 255)->nullable()->after('paternal_last_name');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['first_name', 'paternal_last_name', 'maternal_last_name']);
        });
    }
};
