<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sites', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('code')->unique()->nullable();
            $table->enum('type', ['physical', 'virtual'])->default('physical');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        DB::table('sites')->insert([
            'name' => 'Remoto',
            'code' => 'REMOTO',
            'type' => 'virtual',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('sede_id')->after('position_id')->constrained('sites');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['sede_id']);
        });
        Schema::dropIfExists('sites');
    }
};
