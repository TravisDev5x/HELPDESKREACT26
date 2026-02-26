<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sigua_ca01_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ca01_id')->constrained('sigua_ca01')->cascadeOnDelete();
            $table->foreignId('account_id')->constrained('sigua_accounts')->cascadeOnDelete();
            $table->string('justificacion')->nullable();
            $table->timestamps();
        });

        Schema::table('sigua_ca01_accounts', function (Blueprint $table) {
            $table->unique(['ca01_id', 'account_id']);
            $table->index('account_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sigua_ca01_accounts');
    }
};
