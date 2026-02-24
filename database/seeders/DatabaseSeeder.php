<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     * Usa FullDemoSeeder: catálogos + 5 usuarios tipo + 95 usuarios Faker + 210 tickets.
     * Ver USUARIOS_DEMO.md para credenciales de los 5 usuarios tipo.
     */
    public function run(): void
    {
        $this->call([
            FullDemoSeeder::class,
        ]);
    }
}