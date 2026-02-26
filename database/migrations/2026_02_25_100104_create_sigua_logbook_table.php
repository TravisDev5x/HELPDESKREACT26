<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sigua_logbook', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained('sigua_accounts')->cascadeOnDelete();
            $table->foreignId('system_id')->constrained('sigua_systems')->cascadeOnDelete();
            $table->foreignId('sede_id')->constrained('sites')->cascadeOnDelete();
            $table->foreignId('campaign_id')->nullable()->constrained('campaigns')->nullOnDelete();
            $table->date('fecha');
            $table->enum('turno', ['matutino', 'vespertino', 'nocturno', 'mixto']);
            $table->string('agente_nombre');
            $table->string('agente_num_empleado')->nullable();
            $table->time('hora_inicio')->nullable();
            $table->time('hora_fin')->nullable();
            $table->time('hora_cambio')->nullable();
            $table->foreignId('supervisor_user_id')->constrained('users')->cascadeOnDelete();
            $table->text('observaciones')->nullable();
            $table->timestamps();
        });

        Schema::table('sigua_logbook', function (Blueprint $table) {
            $table->index(['fecha', 'sede_id', 'system_id', 'account_id']);
            $table->index('fecha');
            $table->index('sede_id');
            $table->index('system_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sigua_logbook');
    }
};
