<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Campaign;
use App\Models\Area;
use App\Models\Position;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // ---------------------------------------------------------
        // PASO 1: CREAR LOS CATÁLOGOS (Requerido para las Foreign Keys)
        // ---------------------------------------------------------

        // Campañas
        $campaigns = ['Ventas Tarjetas', 'Atención a Clientes', 'Cobranza', 'Soporte Técnico', 'Retención', 'Seguros'];
        foreach ($campaigns as $name) {
            Campaign::firstOrCreate(['name' => $name], ['is_active' => true]);
        }

        // Áreas
        $areas = ['Operaciones', 'Recursos Humanos', 'Sistemas/IT', 'Calidad', 'Administración'];
        foreach ($areas as $name) {
            Area::firstOrCreate(['name' => $name], ['is_active' => true]);
        }

        // Puestos
        $positions = ['Agente Telefónico', 'Supervisor', 'Team Leader', 'Gerente', 'Analista de Calidad', 'Desarrollador'];
        foreach ($positions as $name) {
            Position::firstOrCreate(['name' => $name], ['is_active' => true]);
        }

        // ---------------------------------------------------------
        // PASO 2: GENERAR 400 USUARIOS FALSOS (FACTORY)
        // ---------------------------------------------------------
        
        $this->command->info('Generando 400 usuarios falsos, espera un momento...');
        User::factory(400)->create();


        // ---------------------------------------------------------
        // PASO 3: CREAR TU USUARIO ADMIN (Para pruebas)
        // ---------------------------------------------------------
        
        // Buscamos IDs reales para asignarlos al admin
        $adminCampaign = Campaign::where('name', 'Soporte Técnico')->first();
        $adminArea = Area::where('name', 'Sistemas/IT')->first();
        $adminPosition = Position::where('name', 'Gerente')->first();

        User::factory()->create([
            'name' => 'Admin Sistema',
            'email' => 'admin@empresa.com',
            'password' => Hash::make('password123'),
            'employee_number' => '00001',
            'phone' => '5512345678',
            // Asignamos las relaciones
            'campaign_id' => $adminCampaign->id,
            'area_id' => $adminArea->id,
            'position_id' => $adminPosition->id,
        ]);
        
        $this->command->info('¡Base de datos poblada con éxito!');
    }
}