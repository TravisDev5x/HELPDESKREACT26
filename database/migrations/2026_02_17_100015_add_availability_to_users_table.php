<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Estado de disponibilidad para futuro chat interno.
     * available = disponible, busy = ocupado, disconnected = desconectado.
     */
    public function up(): void
    {
        if (Schema::hasColumn('users', 'availability')) {
            return;
        }
        Schema::table('users', function (Blueprint $table) {
            $table->string('availability', 20)->default('disconnected')->after('locale');
        });
    }

    public function down(): void
    {
        if (!Schema::hasColumn('users', 'availability')) {
            return;
        }
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('availability');
        });
    }
};
