<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
public function up(): void
{
    // 1. Modificar tabla users
    Schema::table('users', function (Blueprint $table) {
        $table->text('deletion_reason')->nullable()->after('deleted_at'); // Motivo de baja
        $table->boolean('is_blacklisted')->default(false)->after('deletion_reason'); // Estado Lista Negra
    });

    // 2. Crear tabla de auditoría (Log de Lista Negra)
    Schema::create('blacklist_logs', function (Blueprint $table) {
        $table->id();
        $table->foreignId('user_id')->constrained(); // El empleado afectado
        $table->foreignId('admin_id')->nullable()->constrained('users'); // Quién lo hizo
        $table->string('action'); // 'ADDED' o 'REMOVED'
        $table->text('reason'); // El motivo escrito en el modal
        $table->timestamps();
    });
}

public function down(): void
{
    Schema::dropIfExists('blacklist_logs');
    Schema::table('users', function (Blueprint $table) {
        $table->dropColumn(['deletion_reason', 'is_blacklisted']);
    });
}

};
