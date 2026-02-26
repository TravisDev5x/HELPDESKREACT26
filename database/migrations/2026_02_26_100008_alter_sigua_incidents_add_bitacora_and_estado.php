<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * SIGUA v2: ALTER sigua_incidents — bitacora_id, datos_log, estado 'cerrado_sin_bitacora'.
     */
    public function up(): void
    {
        Schema::table('sigua_incidents', function (Blueprint $table) {
            $table->foreignId('bitacora_id')->nullable()->after('ca01_id')
                ->constrained('sigua_logbook')->nullOnDelete();
            $table->json('datos_log')->nullable()->after('resolucion');
        });

        $this->agregarValorEnumEstado();
    }

    private function agregarValorEnumEstado(): void
    {
        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE sigua_incidents MODIFY COLUMN estado ENUM(
                'abierto','investigando','resuelto','escalado','cerrado_sin_bitacora'
            ) DEFAULT 'abierto'");
        } else {
            Schema::table('sigua_incidents', function (Blueprint $table) {
                $table->string('estado', 32)->default('abierto')->change();
            });
        }
    }

    public function down(): void
    {
        Schema::table('sigua_incidents', function (Blueprint $table) {
            $table->dropForeign(['bitacora_id']);
            $table->dropColumn(['bitacora_id', 'datos_log']);
        });

        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE sigua_incidents MODIFY COLUMN estado ENUM(
                'abierto','investigando','resuelto','escalado'
            ) DEFAULT 'abierto'");
        }
    }
};
