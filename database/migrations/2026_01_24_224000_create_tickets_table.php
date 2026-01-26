<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tickets', function (Blueprint $table) {
            $table->id();
            $table->string('subject');
            $table->text('description')->nullable();
            $table->foreignId('area_origin_id')->constrained('areas');
            $table->foreignId('area_current_id')->constrained('areas');
            $table->foreignId('sede_id')->constrained('sedes');
            $table->foreignId('ubicacion_id')->nullable()->constrained('ubicaciones');
            $table->foreignId('requester_id')->constrained('users');
            $table->foreignId('requester_position_id')->nullable()->constrained('positions');
            $table->foreignId('ticket_type_id')->constrained('ticket_types');
            $table->foreignId('priority_id')->constrained('priorities');
            $table->foreignId('ticket_state_id')->constrained('ticket_states');
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
            $table->index(['area_current_id', 'ticket_state_id', 'priority_id']);
        });

        Schema::create('ticket_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ticket_id')->constrained('tickets')->cascadeOnDelete();
            $table->foreignId('actor_id')->constrained('users');
            $table->foreignId('from_area_id')->nullable()->constrained('areas');
            $table->foreignId('to_area_id')->nullable()->constrained('areas');
            $table->foreignId('ticket_state_id')->nullable()->constrained('ticket_states');
            $table->text('note')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ticket_histories');
        Schema::dropIfExists('tickets');
    }
};
