<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sigua_logbook_unused', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained('sigua_accounts')->cascadeOnDelete();
            $table->date('fecha');
            $table->enum('turno', ['matutino', 'vespertino', 'nocturno', 'mixto']);
            $table->foreignId('sede_id')->constrained('sites')->cascadeOnDelete();
            $table->foreignId('supervisor_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('motivo')->nullable();
            $table->timestamps();
        });

        Schema::table('sigua_logbook_unused', function (Blueprint $table) {
            $table->index(['fecha', 'account_id']);
            $table->index('sede_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sigua_logbook_unused');
    }
};
