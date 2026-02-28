<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Schedule;
use App\Models\ScheduleAssignment;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * Dashboard y datos del submódulo TimeDesk (horarios y asistencias).
 * Requiere permiso: attendances.manage o attendances.view_all
 */
class TimeDeskController extends Controller
{
    /**
     * Estadísticas para el Dashboard de TimeDesk (tarjetas resumen).
     */
    public function dashboard(Request $request): JsonResponse
    {
        $today = Carbon::now(config('app.timezone', 'UTC'))->format('Y-m-d');

        $schedulesActive = Schedule::where('is_active', true)->count();

        $assignmentsActiveToday = ScheduleAssignment::query()
            ->where('valid_from', '<=', $today)
            ->where(function ($q) use ($today) {
                $q->whereNull('valid_until')->orWhere('valid_until', '>=', $today);
            })
            ->count();

        $employeesWithAssignedSchedule = ScheduleAssignment::query()
            ->where('scheduleable_type', User::class)
            ->where('valid_from', '<=', $today)
            ->where(function ($q) use ($today) {
                $q->whereNull('valid_until')->orWhere('valid_until', '>=', $today);
            })
            ->distinct('scheduleable_id')
            ->count('scheduleable_id');

        $attendancesToday = Attendance::query()
            ->where('work_date', $today)
            ->count();

        return response()->json([
            'schedules_active' => $schedulesActive,
            'assignments_active_today' => $assignmentsActiveToday,
            'employees_with_assigned_schedule' => $employeesWithAssignedSchedule,
            'attendances_today' => $attendancesToday,
        ]);
    }
}
