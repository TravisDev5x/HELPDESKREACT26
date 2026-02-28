<?php

namespace Database\Seeders;

use App\Models\EmployeeStatus;
use Illuminate\Database\Seeder;

class EmployeeStatusSeeder extends Seeder
{
    public function run(): void
    {
        $items = [
            ['name' => 'Entrevista', 'description' => 'En proceso de entrevista.', 'is_active' => true],
            ['name' => 'Capacitación', 'description' => 'En periodo de capacitación.', 'is_active' => true],
            ['name' => 'Activo', 'description' => 'Empleado activo en operación.', 'is_active' => true],
            ['name' => 'Baja', 'description' => 'Dado de baja.', 'is_active' => true],
        ];

        foreach ($items as $item) {
            EmployeeStatus::firstOrCreate(
                ['name' => $item['name']],
                $item
            );
        }
    }
}
