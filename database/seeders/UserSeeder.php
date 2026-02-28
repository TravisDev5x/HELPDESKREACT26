<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Crea 400 usuarios
        User::factory(400)->create();
        
        // Opcional: Crear un usuario ADMIN específico para ti
        User::factory()->create([
            'employee_number' => '00001',
            'first_name' => 'Admin',
            'paternal_last_name' => 'Sistema',
            'maternal_last_name' => null,
            'email' => 'admin@empresa.com',
            'password' => bcrypt('password123'),
            'campaign' => 'Corporativo',
            'area' => 'Sistemas/IT',
            'position' => 'Administrador',
            'phone' => '5512345678',
        ]);
    }
}