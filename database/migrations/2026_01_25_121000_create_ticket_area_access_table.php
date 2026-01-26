<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ticket_area_access', function (Blueprint $table) {
            $table->bigIncrements('id');
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
    }
};
