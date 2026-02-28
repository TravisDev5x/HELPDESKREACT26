<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed de datos mínimos de la aplicación.
     *
     * - Catálogos base (campañas, áreas, puestos, sedes, tickets).
     * - 4 roles principales y permisos de helpdesk.
     * - 1 usuario administrador.
     * - Permisos y configuración base de SIGUA.
     */
    public function run(): void
    {
        $this->call([
            FullDemoSeeder::class,             // Configuración mínima (catálogos, roles, admin)
            ScheduleSeeder::class,             // Horario "Por defecto" para asistencias
            AttendancePermissionsSeeder::class, // Permisos de asistencias y asignación a roles
            TerminationReasonSeeder::class,   // Catálogo de motivos de baja (RH/TimeDesk)
            EmployeeStatusSeeder::class,     // Catálogo estatus empleado (Entrevista, Capacitación, Activo, Baja)
            HireTypeSeeder::class,            // Catálogo tipo de ingreso (Nuevo Ingreso, Reingreso)
            RecruitmentSourceSeeder::class,  // Catálogo medios de contratación (RH)
            SiguaPermissionsSeeder::class,    // Permisos SIGUA y asignación al rol admin
            SiguaConfiguracionSeeder::class,  // Configuración base de SIGUA
        ]);
    }
}