<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Valores iniciales de sigua_configuracion.
 */
class SiguaConfiguracionSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();
        $rows = [
            [
                'clave' => 'ca01_vigencia_meses',
                'valor' => '6',
                'tipo' => 'int',
                'descripcion' => 'Vigencia en meses del formato CA-01',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'clave' => 'bitacora_dias_tolerancia',
                'valor' => '5',
                'tipo' => 'int',
                'descripcion' => 'Días de tolerancia para bitácora faltante',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'clave' => 'ca01_dias_alerta_vencimiento',
                'valor' => '15',
                'tipo' => 'int',
                'descripcion' => 'Días antes del vencimiento para alerta CA-01',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'clave' => 'importacion_auto_clasificar',
                'valor' => 'true',
                'tipo' => 'bool',
                'descripcion' => 'Clasificar automáticamente cuentas en importación',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'clave' => 'cruce_auto_sugerir_acciones',
                'valor' => 'true',
                'tipo' => 'bool',
                'descripcion' => 'Sugerir acciones automáticamente en cruces',
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ];

        foreach ($rows as $row) {
            DB::table('sigua_configuracion')->updateOrInsert(
                ['clave' => $row['clave']],
                $row
            );
        }
    }
}
