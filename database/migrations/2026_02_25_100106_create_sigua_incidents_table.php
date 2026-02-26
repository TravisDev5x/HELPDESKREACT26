<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sigua_incidents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained('sigua_accounts')->cascadeOnDelete();
            $table->dateTime('fecha_incidente');
            $table->text('descripcion');
            $table->string('ip_origen')->nullable();
            $table->foreignId('system_id')->constrained('sigua_systems')->cascadeOnDelete();
            $table->foreignId('ca01_id')->nullable()->constrained('sigua_ca01')->nullOnDelete();
            $table->string('agente_identificado')->nullable();
            $table->text('resolucion')->nullable();
            $table->enum('estado', ['abierto', 'investigando', 'resuelto', 'escalado'])->default('abierto');
            $table->foreignId('reportado_por')->constrained('users')->cascadeOnDelete();
            $table->foreignId('asignado_a')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::table('sigua_incidents', function (Blueprint $table) {
            $table->index(['estado', 'fecha_incidente']);
            $table->index('account_id');
            $table->index('system_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sigua_incidents');
    }
};
