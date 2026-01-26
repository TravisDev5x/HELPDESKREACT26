<?php
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CatalogSeeder extends Seeder
{
    public function run(): void
    {
        // Campañas
        $campaigns = ['Soporte Técnico', 'Ventas Globales', 'Atención a Clientes', 'Retención'];
        foreach ($campaigns as $c) DB::table('campaigns')->insertOrIgnore(['name' => $c, 'created_at' => now(), 'updated_at' => now()]);

        // Áreas
        $areas = ['Tecnología (TI)', 'Recursos Humanos', 'Operaciones', 'Finanzas', 'Legal'];
        foreach ($areas as $a) DB::table('areas')->insertOrIgnore(['name' => $a, 'created_at' => now(), 'updated_at' => now()]);

        // Puestos
        $positions = ['Agente Telefónico', 'Supervisor', 'Gerente de Operaciones', 'Desarrollador Full Stack', 'Reclutador', 'Analista de Calidad'];
        foreach ($positions as $p) DB::table('positions')->insertOrIgnore(['name' => $p, 'created_at' => now(), 'updated_at' => now()]);
    }
}