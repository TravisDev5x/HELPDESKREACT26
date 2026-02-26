<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sigua_imports', function (Blueprint $table) {
            $table->id();
            $table->enum('tipo', [
                'rh_activos',
                'ad_usuarios',
                'neotel_isla2',
                'neotel_isla3',
                'neotel_isla4',
                'bajas_rh'
            ]);
            $table->string('archivo');
            $table->unsignedInteger('registros_procesados')->default(0);
            $table->unsignedInteger('registros_nuevos')->default(0);
            $table->unsignedInteger('registros_actualizados')->default(0);
            $table->unsignedInteger('errores')->default(0);
            $table->json('detalle_errores')->nullable();
            $table->foreignId('importado_por')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
        });

        Schema::table('sigua_imports', function (Blueprint $table) {
            $table->index(['tipo', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sigua_imports');
    }
};
