<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * SIGUA v2: ALTER sigua_imports — registros_sin_cambio, mapeo_usado, tipo 'sistema'.
     */
    public function up(): void
    {
        Schema::table('sigua_imports', function (Blueprint $table) {
            $table->unsignedInteger('registros_sin_cambio')->default(0)->after('registros_actualizados');
            $table->json('mapeo_usado')->nullable();
        });

        $this->agregarTipoSistema();
    }

    private function agregarTipoSistema(): void
    {
        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE sigua_imports MODIFY COLUMN tipo ENUM(
                'rh_activos','ad_usuarios','neotel_isla2','neotel_isla3','neotel_isla4','bajas_rh','sistema'
            ) NOT NULL");
        }
    }

    public function down(): void
    {
        Schema::table('sigua_imports', function (Blueprint $table) {
            $table->dropColumn(['registros_sin_cambio', 'mapeo_usado']);
        });

        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE sigua_imports MODIFY COLUMN tipo ENUM(
                'rh_activos','ad_usuarios','neotel_isla2','neotel_isla3','neotel_isla4','bajas_rh'
            ) NOT NULL");
        }
    }
};
