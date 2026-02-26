<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * SIGUA v2: snapshot de empleados activos RH (multi-sistema dinámico).
     * Upgrade: solo crea la nueva tabla, no modifica tablas existentes.
     */
    public function up(): void
    {
        Schema::create('sigua_empleados_rh', function (Blueprint $table) {
            $table->id();
            $table->string('num_empleado')->unique();
            $table->string('nombre_completo');
            $table->foreignId('sede_id')->nullable()->constrained('sites')->nullOnDelete();
            $table->foreignId('campaign_id')->nullable()->constrained('campaigns')->nullOnDelete();
            $table->string('area')->nullable();
            $table->string('puesto')->nullable();
            $table->string('jefe_inmediato')->nullable();
            $table->string('horario')->nullable();
            $table->string('tipo_ingreso')->nullable();
            $table->date('fecha_ingreso')->nullable();
            $table->string('estatus')->default('Activo');
            $table->foreignId('importacion_id')->nullable()->constrained('sigua_imports')->nullOnDelete();
            $table->timestamps();
        });

        Schema::table('sigua_empleados_rh', function (Blueprint $table) {
            $table->index('sede_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sigua_empleados_rh');
    }
};
