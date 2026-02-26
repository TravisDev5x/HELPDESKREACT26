<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sigua_cross_matches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('import_id')->nullable()->constrained('sigua_imports')->nullOnDelete();
            $table->enum('tipo_cruce', ['rh_vs_ad', 'rh_vs_neotel', 'ad_vs_neotel', 'completo']);
            $table->dateTime('fecha_ejecucion');
            $table->unsignedInteger('total_analizados')->default(0);
            $table->unsignedInteger('coincidencias')->default(0);
            $table->unsignedInteger('sin_match')->default(0);
            $table->json('resultado_json')->nullable();
            $table->foreignId('ejecutado_por')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
        });

        Schema::table('sigua_cross_matches', function (Blueprint $table) {
            $table->index(['tipo_cruce', 'fecha_ejecucion']);
            $table->index('import_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sigua_cross_matches');
    }
};
