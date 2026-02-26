<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sigua_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('system_id')->constrained('sigua_systems')->cascadeOnDelete();
            $table->string('usuario_cuenta');
            $table->string('nombre_cuenta');
            $table->foreignId('sede_id')->constrained('sites')->cascadeOnDelete();
            $table->string('isla')->nullable();
            $table->string('perfil')->nullable();
            $table->foreignId('campaign_id')->nullable()->constrained('campaigns')->nullOnDelete();
            $table->enum('estado', ['activa', 'suspendida', 'baja'])->default('activa');
            $table->string('ou_ad')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::table('sigua_accounts', function (Blueprint $table) {
            $table->index(['system_id', 'estado']);
            $table->index('sede_id');
            $table->index('campaign_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sigua_accounts');
    }
};
