<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * SIGUA v2: ALTER sigua_logbook — tipo_registro, empleado_rh_id.
     * Migrar registros con observación "SIN USO" → tipo_registro = 'sin_uso'.
     */
    public function up(): void
    {
        Schema::table('sigua_logbook', function (Blueprint $table) {
            $table->enum('tipo_registro', ['asignacion', 'cambio', 'sin_uso', 'cierre'])
                ->default('asignacion')
                ->after('observaciones');
            $table->foreignId('empleado_rh_id')->nullable()->after('tipo_registro')
                ->constrained('sigua_empleados_rh')->nullOnDelete();
        });

        DB::table('sigua_logbook')
            ->whereNotNull('observaciones')
            ->where('observaciones', 'like', '%SIN USO%')
            ->update(['tipo_registro' => 'sin_uso']);
    }

    public function down(): void
    {
        Schema::table('sigua_logbook', function (Blueprint $table) {
            $table->dropForeign(['empleado_rh_id']);
            $table->dropColumn(['tipo_registro', 'empleado_rh_id']);
        });
    }
};
