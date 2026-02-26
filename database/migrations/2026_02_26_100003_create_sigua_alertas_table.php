<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * SIGUA v2: alertas automáticas.
     */
    public function up(): void
    {
        Schema::create('sigua_alertas', function (Blueprint $table) {
            $table->id();
            $table->enum('tipo', [
                'ca01_por_vencer',
                'ca01_vencido',
                'bitacora_faltante',
                'baja_pendiente',
                'cuenta_sin_responsable',
                'anomalia_cruce',
                'sistema_sin_importacion',
            ]);
            $table->string('titulo');
            $table->text('descripcion');
            $table->enum('severidad', ['info', 'warning', 'critical']);
            $table->string('entidad_tipo')->nullable();
            $table->unsignedBigInteger('entidad_id')->nullable();
            $table->foreignId('sede_id')->nullable()->constrained('sites')->nullOnDelete();
            $table->foreignId('sistema_id')->nullable()->constrained('sigua_systems')->nullOnDelete();
            $table->foreignId('dirigida_a')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('leida')->default(false);
            $table->boolean('resuelta')->default(false);
            $table->foreignId('resuelta_por')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('resuelta_en')->nullable();
            $table->timestamps();
        });

        Schema::table('sigua_alertas', function (Blueprint $table) {
            $table->index(['tipo', 'resuelta']);
            $table->index('dirigida_a');
            $table->index('sede_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sigua_alertas');
    }
};
