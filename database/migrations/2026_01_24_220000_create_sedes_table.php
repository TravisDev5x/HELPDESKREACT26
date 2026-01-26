<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sedes', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('code')->unique()->nullable();
            $table->enum('type', ['physical', 'virtual'])->default('physical');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Crear sede virtual "Remoto"
        DB::table('sedes')->insert([
            'name' => 'Remoto',
            'code' => 'REMOTO',
            'type' => 'virtual',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Agregar FK en users con valor por defecto Remoto
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('sede_id')
                ->after('position_id')
                ->nullable()
                ->constrained('sedes');
        });

        // Establecer la sede remota como valor para registros existentes
        $remoteId = DB::table('sedes')->where('code', 'REMOTO')->value('id');
        if ($remoteId) {
            DB::table('users')->update(['sede_id' => $remoteId]);
        }

        // Hacerla obligatoria
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('sede_id')->nullable(false)->change();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['sede_id']);
            $table->dropColumn('sede_id');
        });
        Schema::dropIfExists('sedes');
    }
};
