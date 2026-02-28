<?php

namespace Database\Seeders;

use App\Models\Schedule;
use App\Models\ScheduleDay;
use Illuminate\Database\Seeder;

class ScheduleSeeder extends Seeder
{
    /**
     * Inserta el horario "Por defecto": L-V 09:00 a 18:00, comida 14:00 a 15:00.
     */
    public function run(): void
    {
        $schedule = Schedule::firstOrCreate(
            ['name' => 'Por defecto'],
            ['is_active' => true]
        );

        $days = [
            ['day_of_week' => 0, 'is_working_day' => false], // Domingo
            ['day_of_week' => 1, 'is_working_day' => true],  // Lunes
            ['day_of_week' => 2, 'is_working_day' => true],  // Martes
            ['day_of_week' => 3, 'is_working_day' => true],  // Miércoles
            ['day_of_week' => 4, 'is_working_day' => true],  // Jueves
            ['day_of_week' => 5, 'is_working_day' => true],  // Viernes
            ['day_of_week' => 6, 'is_working_day' => false], // Sábado
        ];

        foreach ($days as $day) {
            ScheduleDay::updateOrCreate(
                [
                    'schedule_id' => $schedule->id,
                    'day_of_week' => $day['day_of_week'],
                ],
                [
                    'is_working_day' => $day['is_working_day'],
                    'expected_clock_in' => $day['is_working_day'] ? '09:00' : null,
                    'expected_lunch_start' => $day['is_working_day'] ? '14:00' : null,
                    'expected_lunch_end' => $day['is_working_day'] ? '15:00' : null,
                    'expected_clock_out' => $day['is_working_day'] ? '18:00' : null,
                    'tolerance_minutes' => 15,
                ]
            );
        }
    }
}
