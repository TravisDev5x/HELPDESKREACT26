<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('priorities', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->unsignedTinyInteger('level')->default(1); // menor número = más urgente
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('ticket_states', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('code')->unique();
            $table->boolean('is_active')->default(true);
            $table->boolean('is_final')->default(false);
            $table->timestamps();
        });

        Schema::create('ticket_types', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('code')->unique();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('area_ticket_type', function (Blueprint $table) {
            $table->id();
            $table->foreignId('area_id')->constrained('areas')->cascadeOnDelete();
            $table->foreignId('ticket_type_id')->constrained('ticket_types')->cascadeOnDelete();
            $table->unique(['area_id', 'ticket_type_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('area_ticket_type');
        Schema::dropIfExists('ticket_types');
        Schema::dropIfExists('ticket_states');
        Schema::dropIfExists('priorities');
    }
};
