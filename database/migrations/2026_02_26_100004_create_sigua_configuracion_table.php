<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * SIGUA v2: parámetros editables.
     */
    public function up(): void
    {
        Schema::create('sigua_configuracion', function (Blueprint $table) {
            $table->id();
            $table->string('clave')->unique();
            $table->text('valor')->nullable();
            $table->enum('tipo', ['int', 'string', 'bool', 'json']);
            $table->string('descripcion')->nullable();
            $table->timestamps();
        });

        $this->seedValoresIniciales();
    }

    private function seedValoresIniciales(): void
    {
        $now = now();
        $rows = [
            ['ca01_vigencia_meses', '6', 'int', 'Vigencia en meses del formato CA-01'],
            ['bitacora_dias_tolerancia', '5', 'int', 'Días de tolerancia para bitácora faltante'],
            ['ca01_dias_alerta_vencimiento', '15', 'int', 'Días antes del vencimiento para alerta CA-01'],
            ['importacion_auto_clasificar', 'true', 'bool', 'Clasificar automáticamente cuentas en importación'],
            ['cruce_auto_sugerir_acciones', 'true', 'bool', 'Sugerir acciones automáticamente en cruces'],
        ];
        foreach ($rows as [$clave, $valor, $tipo, $descripcion]) {
            \Illuminate\Support\Facades\DB::table('sigua_configuracion')->updateOrInsert(
                ['clave' => $clave],
                ['valor' => $valor, 'tipo' => $tipo, 'descripcion' => $descripcion, 'created_at' => $now, 'updated_at' => $now]
            );
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('sigua_configuracion');
    }
};
