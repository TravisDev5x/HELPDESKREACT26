<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
        // Agregamos la columna 'avatar_path'
        // Debe ser nullable (porque al crear usuario no siempre subes foto)
        // La ponemos después del email para mantener orden
        $table->string('avatar_path', 2048)->nullable()->after('email');
    });

    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
       Schema::table('users', function (Blueprint $table) {
        $table->dropColumn('avatar_path');
    });
    }
};
