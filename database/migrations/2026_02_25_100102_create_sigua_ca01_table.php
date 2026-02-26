<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sigua_ca01', function (Blueprint $table) {
            $table->id();
            $table->foreignId('gerente_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('campaign_id')->constrained('campaigns')->cascadeOnDelete();
            $table->foreignId('sede_id')->constrained('sites')->cascadeOnDelete();
            $table->foreignId('system_id')->constrained('sigua_systems')->cascadeOnDelete();
            $table->date('fecha_firma');
            $table->date('fecha_vencimiento');
            $table->string('archivo_firmado')->nullable();
            $table->enum('estado', ['vigente', 'vencido', 'cancelado'])->default('vigente');
            $table->text('observaciones')->nullable();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::table('sigua_ca01', function (Blueprint $table) {
            $table->index(['estado', 'fecha_vencimiento']);
            $table->index(['sede_id', 'system_id']);
            $table->index('campaign_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sigua_ca01');
    }
};
