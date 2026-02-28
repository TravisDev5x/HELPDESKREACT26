<?php

namespace Database\Seeders;

use App\Models\TerminationReason;
use Illuminate\Database\Seeder;

class TerminationReasonSeeder extends Seeder
{
    public function run(): void
    {
        $reasons = [
            ['name' => 'Renuncia', 'description' => 'Baja voluntaria del colaborador.', 'is_active' => true],
            ['name' => 'Abandono', 'description' => 'Abandono de puesto sin aviso formal.', 'is_active' => true],
            ['name' => 'Despido', 'description' => 'Terminación de relación laboral por parte del empleador.', 'is_active' => true],
            ['name' => 'Término de Contrato', 'description' => 'Fin del periodo contractual acordado.', 'is_active' => true],
            ['name' => 'Otro', 'description' => 'Otros motivos no clasificados.', 'is_active' => true],
        ];

        foreach ($reasons as $item) {
            TerminationReason::firstOrCreate(
                ['name' => $item['name']],
                $item
            );
        }
    }
}
