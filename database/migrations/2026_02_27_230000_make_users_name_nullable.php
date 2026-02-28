<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Hace nullable la columna `name` para que los inserts que usan
     * first_name / paternal_last_name / maternal_last_name no fallen.
     * El modelo User sincroniza `name` al guardar para compatibilidad con consultas raw.
     */
    public function up(): void
    {
        DB::statement('ALTER TABLE users MODIFY name VARCHAR(255) NULL');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE users MODIFY name VARCHAR(255) NOT NULL');
    }
};
