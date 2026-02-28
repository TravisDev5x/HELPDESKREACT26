<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('schedule_days', function (Blueprint $table) {
            $table->id();
            $table->foreignId('schedule_id')->constrained('schedules')->cascadeOnDelete();
            $table->unsignedTinyInteger('day_of_week'); // 0 = Sunday, 1 = Monday, ... 6 = Saturday
            $table->boolean('is_working_day')->default(true);
            $table->time('expected_clock_in')->nullable();
            $table->time('expected_lunch_start')->nullable();
            $table->time('expected_lunch_end')->nullable();
            $table->time('expected_clock_out')->nullable();
            $table->unsignedSmallInteger('tolerance_minutes')->default(15);
            $table->timestamps();

            $table->unique(['schedule_id', 'day_of_week']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('schedule_days');
    }
};
