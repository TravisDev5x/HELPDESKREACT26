<?php

namespace Database\Seeders;

use App\Models\HireType;
use Illuminate\Database\Seeder;

class HireTypeSeeder extends Seeder
{
    public function run(): void
    {
        $items = [
            ['name' => 'Nuevo Ingreso', 'description' => 'Primer ingreso a la organización.', 'is_active' => true],
            ['name' => 'Reingreso', 'description' => 'Empleado que regresa a la organización.', 'is_active' => true],
        ];

        foreach ($items as $item) {
            HireType::firstOrCreate(
                ['name' => $item['name']],
                $item
            );
        }
    }
}
