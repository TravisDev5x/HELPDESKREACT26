<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Campaign;
use App\Models\Area;
use App\Models\Position;
use App\Models\Sede;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    /**
     * Crea un usuario con rol administrador para acceso al panel.
     * Ejecutar: php artisan db:seed --class=AdminUserSeeder
     */
    public function run(): void
    {
        $email = 'admin@helpdesk.local';
        $password = 'AdminHelpdesk2025!';
        $employeeNumber = 'ADMIN001';

        $user = User::where('email', $email)->orWhere('employee_number', $employeeNumber)->first();
        if ($user) {
            $user->update(['password' => Hash::make($password)]);
            $user->syncRoles(['admin']);
            $this->command->info("Usuario admin ya existía. Contraseña actualizada.");
            $this->printCredentials($email, $password, $employeeNumber);
            return;
        }

        $sede = Sede::where('code', 'REMOTO')->orWhere('name', 'Remoto')->first();
        if (!$sede) {
            $sede = Sede::first();
        }
        if (!$sede) {
            $this->command->error('No hay ninguna sede. Ejecuta las migraciones primero.');
            return;
        }

        $campaign = Campaign::first();
        $area = Area::first();
        $position = Position::first();

        $user = User::create([
            'employee_number' => $employeeNumber,
            'name' => 'Administrador',
            'email' => $email,
            'phone' => null,
            'password' => Hash::make($password),
            'status' => 'active',
            'email_verified_at' => now(),
            'sede_id' => $sede->id,
            'campaign_id' => $campaign?->id,
            'area_id' => $area?->id,
            'position_id' => $position?->id,
        ]);

        $user->syncRoles(['admin']);

        $this->command->info('Usuario administrador creado correctamente.');
        $this->printCredentials($email, $password, $employeeNumber);
    }

    private function printCredentials(string $email, string $password, string $employeeNumber): void
    {
        $this->command->newLine();
        $this->command->line('--- Credenciales de administrador ---');
        $this->command->line('Correo o número de empleado: ' . $email . ' (o ' . $employeeNumber . ')');
        $this->command->line('Contraseña: ' . $password);
        $this->command->line('--------------------------------------');
        $this->command->newLine();
    }
}
