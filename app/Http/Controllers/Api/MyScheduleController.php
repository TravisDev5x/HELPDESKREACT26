<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * Horario actual del usuario autenticado (jerarquía: Usuario > Área > Campaña > Por defecto).
 * Requiere permiso: attendances.view_own
 */
class MyScheduleController extends Controller
{
    /**
     * Devuelve el horario vigente para hoy con el detalle de los días (schedule_days).
     */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->load(['campaign', 'area']);
        $date = Carbon::now(config('app.timezone', 'UTC'))->startOfDay();

        $schedule = $user->getTodaySchedule($date);

        $scheduleDays = $schedule->scheduleDays
            ->sortBy('day_of_week')
            ->values()
            ->map(fn ($day) => [
                'day_of_week' => $day->day_of_week,
                'day_name' => $this->dayName($day->day_of_week),
                'is_working_day' => $day->is_working_day,
                'expected_clock_in' => $day->expected_clock_in ? substr($day->expected_clock_in, 0, 5) : null,
                'expected_lunch_start' => $day->expected_lunch_start ? substr($day->expected_lunch_start, 0, 5) : null,
                'expected_lunch_end' => $day->expected_lunch_end ? substr($day->expected_lunch_end, 0, 5) : null,
                'expected_clock_out' => $day->expected_clock_out ? substr($day->expected_clock_out, 0, 5) : null,
                'tolerance_minutes' => $day->tolerance_minutes ?? 0,
            ])
            ->all();

        return response()->json([
            'schedule' => [
                'id' => $schedule->id,
                'name' => $schedule->name,
                'is_default' => $schedule->name === 'Por defecto',
                'schedule_days' => $scheduleDays,
            ],
            'resolved_for_date' => $date->format('Y-m-d'),
        ]);
    }

    private function dayName(int $dayOfWeek): string
    {
        $names = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        return $names[$dayOfWeek] ?? '';
    }
}
