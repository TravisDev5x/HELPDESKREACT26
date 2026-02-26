<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * SIGUA v2: detalle por empleado/cuenta de cada cruce.
     * Upgrade: solo crea la nueva tabla.
     */
    public function up(): void
    {
        Schema::create('sigua_cruce_resultados', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cruce_id')->constrained('sigua_cross_matches')->cascadeOnDelete();
            $table->foreignId('empleado_rh_id')->nullable()->constrained('sigua_empleados_rh')->nullOnDelete();
            $table->string('num_empleado')->nullable();
            $table->string('nombre_empleado')->nullable();
            $table->string('sede')->nullable();
            $table->string('campana')->nullable();
            $table->json('resultados_por_sistema')->nullable();
            $table->enum('categoria', [
                'ok_completo',
                'sin_cuenta_sistema',
                'cuenta_sin_rh',
                'generico_con_responsable',
                'generico_sin_responsable',
                'cuenta_baja_pendiente',
                'cuenta_servicio',
                'anomalia',
            ]);
            $table->boolean('requiere_accion')->default(false);
            $table->string('accion_sugerida')->nullable();
            $table->string('accion_tomada')->nullable();
            $table->foreignId('accion_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::table('sigua_cruce_resultados', function (Blueprint $table) {
            $table->index('cruce_id');
            $table->index('categoria');
            $table->index('requiere_accion');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sigua_cruce_resultados');
    }
};
