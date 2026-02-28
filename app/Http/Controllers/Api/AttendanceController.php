<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Schedule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class AttendanceController extends Controller
{
    private function appTimezone(): string
    {
        return config('app.timezone', 'UTC');
    }

    private function today(): Carbon
    {
        return Carbon::now($this->appTimezone())->startOfDay();
    }

    /**
     * Estado actual del usuario para hoy: horario esperado y punches registrados.
     */
    public function status(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->load(['campaign', 'area', 'position']);
        $date = $this->today();

        $schedule = $user->getTodaySchedule($date);
        $dayOfWeek = (int) $date->format('w'); // 0 = Sunday
        $scheduleDay = $schedule->scheduleDays->firstWhere('day_of_week', $dayOfWeek);

        $attendance = Attendance::firstOrCreate(
            [
                'user_id' => $user->id,
                'work_date' => $date,
            ],
            []
        );

        $nextAction = $this->resolveNextAction($attendance, $scheduleDay);

        $todaySchedule = null;
        if ($scheduleDay) {
            $todaySchedule = [
                'day_of_week' => $scheduleDay->day_of_week,
                'is_working_day' => $scheduleDay->is_working_day,
                'expected_clock_in' => $scheduleDay->expected_clock_in ? substr($scheduleDay->expected_clock_in, 0, 5) : null,
                'expected_lunch_start' => $scheduleDay->expected_lunch_start ? substr($scheduleDay->expected_lunch_start, 0, 5) : null,
                'expected_lunch_end' => $scheduleDay->expected_lunch_end ? substr($scheduleDay->expected_lunch_end, 0, 5) : null,
                'expected_clock_out' => $scheduleDay->expected_clock_out ? substr($scheduleDay->expected_clock_out, 0, 5) : null,
                'tolerance_minutes' => $scheduleDay->tolerance_minutes,
            ];
        }

        return response()->json([
            'schedule' => [
                'id' => $schedule->id,
                'name' => $schedule->name,
                'is_default' => $schedule->name === 'Por defecto',
                'today' => $todaySchedule,
            ],
            'campaign' => $user->campaign?->name,
            'area' => $user->area?->name,
            'position' => $user->position?->name,
            'attendance' => [
                'work_date' => $attendance->work_date->format('Y-m-d'),
                'clock_in' => $attendance->clock_in?->setTimezone($this->appTimezone())->toIso8601String(),
                'lunch_start' => $attendance->lunch_start?->setTimezone($this->appTimezone())->toIso8601String(),
                'lunch_end' => $attendance->lunch_end?->setTimezone($this->appTimezone())->toIso8601String(),
                'clock_out' => $attendance->clock_out?->setTimezone($this->appTimezone())->toIso8601String(),
            ],
            'next_action' => $nextAction,
            'can_skip_lunch' => $nextAction === 'lunch_start',
            'timezone' => $this->appTimezone(),
        ]);
    }

    /**
     * Registra un punch. La comida es opcional: el empleado puede registrar salida sin haber registrado comida.
     * Si no se envía "action", se registra la siguiente acción en orden (entrada → inicio comida → fin comida → salida).
     * Para omitir comida y registrar salida directamente, enviar body: { "action": "clock_out" }.
     */
    public function registerPunch(Request $request): JsonResponse
    {
        $user = $request->user();
        $date = $this->today();
        $now = Carbon::now($this->appTimezone());

        $attendance = Attendance::firstOrCreate(
            [
                'user_id' => $user->id,
                'work_date' => $date,
            ],
            []
        );

        $schedule = $user->getTodaySchedule($date);
        $dayOfWeek = (int) $date->format('w');
        $scheduleDay = $schedule->scheduleDays->firstWhere('day_of_week', $dayOfWeek);

        $requestedAction = $request->input('action');
        $nextAction = $requestedAction && in_array($requestedAction, ['clock_in', 'lunch_start', 'lunch_end', 'clock_out'], true)
            ? $this->resolveRequestedAction($attendance, $requestedAction)
            : $this->resolveNextAction($attendance, $scheduleDay);

        $updated = false;
        $field = null;

        switch ($nextAction) {
            case 'clock_in':
                $attendance->clock_in = $now;
                $field = 'clock_in';
                $updated = true;
                break;
            case 'lunch_start':
                $attendance->lunch_start = $now;
                $field = 'lunch_start';
                $updated = true;
                break;
            case 'lunch_end':
                $attendance->lunch_end = $now;
                $field = 'lunch_end';
                $updated = true;
                break;
            case 'clock_out':
                $attendance->clock_out = $now;
                $field = 'clock_out';
                $updated = true;
                break;
            default:
                return response()->json([
                    'message' => $requestedAction
                        ? 'No se puede registrar esa acción con el estado actual.'
                        : 'No hay ninguna acción pendiente de registro para hoy.',
                    'next_action' => null,
                ], 422);
        }

        if ($updated) {
            $attendance->save();
        }

        $attendance->refresh();
        $newNext = $this->resolveNextAction($attendance, $scheduleDay);

        return response()->json([
            'message' => $this->actionMessage($field),
            'attendance' => [
                'work_date' => $attendance->work_date->format('Y-m-d'),
                'clock_in' => $attendance->clock_in?->setTimezone($this->appTimezone())->toIso8601String(),
                'lunch_start' => $attendance->lunch_start?->setTimezone($this->appTimezone())->toIso8601String(),
                'lunch_end' => $attendance->lunch_end?->setTimezone($this->appTimezone())->toIso8601String(),
                'clock_out' => $attendance->clock_out?->setTimezone($this->appTimezone())->toIso8601String(),
            ],
            'next_action' => $newNext,
            'can_skip_lunch' => $newNext === 'lunch_start',
            'timezone' => $this->appTimezone(),
        ]);
    }

    /**
     * Siguiente acción en orden: entrada → inicio comida (opcional) → fin comida (opcional) → salida.
     */
    private function resolveNextAction(Attendance $attendance, ?object $scheduleDay): ?string
    {
        if (!$attendance->clock_in) {
            return 'clock_in';
        }
        if (!$attendance->lunch_start) {
            return 'lunch_start';
        }
        if (!$attendance->lunch_end) {
            return 'lunch_end';
        }
        if (!$attendance->clock_out) {
            return 'clock_out';
        }
        return null;
    }

    /**
     * Valida si la acción solicitada es válida con el estado actual (ej. permitir clock_out sin haber registrado comida).
     */
    private function resolveRequestedAction(Attendance $attendance, string $requested): ?string
    {
        switch ($requested) {
            case 'clock_in':
                return !$attendance->clock_in ? 'clock_in' : null;
            case 'lunch_start':
                return $attendance->clock_in && !$attendance->lunch_start ? 'lunch_start' : null;
            case 'lunch_end':
                return $attendance->lunch_start && !$attendance->lunch_end ? 'lunch_end' : null;
            case 'clock_out':
                return $attendance->clock_in && !$attendance->clock_out ? 'clock_out' : null;
            default:
                return null;
        }
    }

    private function actionMessage(string $field): string
    {
        return match ($field) {
            'clock_in' => 'Entrada registrada.',
            'lunch_start' => 'Inicio de comida registrado.',
            'lunch_end' => 'Fin de comida registrado.',
            'clock_out' => 'Salida registrada.',
            default => 'Registro actualizado.',
        };
    }
}
