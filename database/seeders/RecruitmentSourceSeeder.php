<?php

namespace Database\Seeders;

use App\Models\RecruitmentSource;
use Illuminate\Database\Seeder;

class RecruitmentSourceSeeder extends Seeder
{
    public function run(): void
    {
        $sources = [
            'Indeed',
            'Computrabajo',
            'LinkedIn',
            'Referido',
            'Bolsa de Trabajo Interna',
            'Redes Sociales',
            'Pauta Empresa',
        ];

        foreach ($sources as $name) {
            RecruitmentSource::firstOrCreate(
                ['name' => $name],
                ['is_active' => true]
            );
        }
    }
}
