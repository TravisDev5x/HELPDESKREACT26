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
            $table->unsignedTinyInteger('level')->default(1);
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

        Schema::create('tickets', function (Blueprint $table) {
            $table->id();
            $table->string('subject');
            $table->text('description')->nullable();
            $table->foreignId('area_origin_id')->constrained('areas');
            $table->foreignId('area_current_id')->constrained('areas');
            $table->foreignId('sede_id')->constrained('sites');
            $table->foreignId('ubicacion_id')->nullable()->constrained('locations');
            $table->foreignId('requester_id')->constrained('users');
            $table->foreignId('requester_position_id')->nullable()->constrained('positions');
            $table->foreignId('assigned_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('assigned_at')->nullable();
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
            $table->string('action')->nullable();
            $table->foreignId('from_assignee_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('to_assignee_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('note')->nullable();
            $table->timestamps();
        });

        Schema::create('ticket_area_access', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ticket_id')->constrained('tickets')->cascadeOnDelete();
            $table->foreignId('area_id')->constrained('areas')->cascadeOnDelete();
            $table->string('reason')->nullable();
            $table->timestamp('created_at');
            $table->unique(['ticket_id', 'area_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ticket_area_access');
        Schema::dropIfExists('ticket_histories');
        Schema::dropIfExists('tickets');
        Schema::dropIfExists('area_ticket_type');
        Schema::dropIfExists('ticket_types');
        Schema::dropIfExists('ticket_states');
        Schema::dropIfExists('priorities');
    }
};
