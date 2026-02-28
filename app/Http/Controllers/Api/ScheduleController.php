<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Schedule;
use App\Models\ScheduleDay;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ScheduleController extends Controller
{
    public function index(): JsonResponse
    {
        $schedules = Schedule::withCount('scheduleDays')
            ->orderBy('name')
            ->get();

        return response()->json($schedules);
    }

    public function show(Schedule $schedule): JsonResponse
    {
        $schedule->load('scheduleDays');
        return response()->json($schedule);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:schedules,name'],
            'is_active' => ['boolean'],
            'days' => ['required', 'array', 'size:7'],
            'days.*.day_of_week' => ['required', 'integer', 'min:0', 'max:6'],
            'days.*.is_working_day' => ['boolean'],
            'days.*.expected_clock_in' => ['nullable', 'string', 'regex:/^\d{1,2}:\d{2}$/'],
            'days.*.expected_lunch_start' => ['nullable', 'string', 'regex:/^\d{1,2}:\d{2}$/'],
            'days.*.expected_lunch_end' => ['nullable', 'string', 'regex:/^\d{1,2}:\d{2}$/'],
            'days.*.expected_clock_out' => ['nullable', 'string', 'regex:/^\d{1,2}:\d{2}$/'],
            'days.*.tolerance_minutes' => ['integer', 'min:0', 'max:120'],
        ]);

        $schedule = Schedule::create([
            'name' => $data['name'],
            'is_active' => $data['is_active'] ?? true,
        ]);

        foreach ($data['days'] as $day) {
            $schedule->scheduleDays()->create([
                'day_of_week' => $day['day_of_week'],
                'is_working_day' => $day['is_working_day'] ?? false,
                'expected_clock_in' => $this->normalizeTime($day['expected_clock_in'] ?? null),
                'expected_lunch_start' => $this->normalizeTime($day['expected_lunch_start'] ?? null),
                'expected_lunch_end' => $this->normalizeTime($day['expected_lunch_end'] ?? null),
                'expected_clock_out' => $this->normalizeTime($day['expected_clock_out'] ?? null),
                'tolerance_minutes' => $day['tolerance_minutes'] ?? 15,
            ]);
        }

        $schedule->load('scheduleDays');
        return response()->json($schedule, 201);
    }

    public function update(Request $request, Schedule $schedule): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:schedules,name,' . $schedule->id],
            'is_active' => ['boolean'],
            'days' => ['sometimes', 'array', 'size:7'],
            'days.*.day_of_week' => ['required', 'integer', 'min:0', 'max:6'],
            'days.*.is_working_day' => ['boolean'],
            'days.*.expected_clock_in' => ['nullable', 'string', 'regex:/^\d{1,2}:\d{2}$/'],
            'days.*.expected_lunch_start' => ['nullable', 'string', 'regex:/^\d{1,2}:\d{2}$/'],
            'days.*.expected_lunch_end' => ['nullable', 'string', 'regex:/^\d{1,2}:\d{2}$/'],
            'days.*.expected_clock_out' => ['nullable', 'string', 'regex:/^\d{1,2}:\d{2}$/'],
            'days.*.tolerance_minutes' => ['integer', 'min:0', 'max:120'],
        ]);

        $schedule->update([
            'name' => $data['name'],
            'is_active' => $data['is_active'] ?? $schedule->is_active,
        ]);

        if (isset($data['days'])) {
            foreach ($data['days'] as $day) {
                ScheduleDay::updateOrCreate(
                    [
                        'schedule_id' => $schedule->id,
                        'day_of_week' => $day['day_of_week'],
                    ],
                    [
                        'is_working_day' => $day['is_working_day'] ?? false,
                        'expected_clock_in' => $this->normalizeTime($day['expected_clock_in'] ?? null),
                        'expected_lunch_start' => $this->normalizeTime($day['expected_lunch_start'] ?? null),
                        'expected_lunch_end' => $this->normalizeTime($day['expected_lunch_end'] ?? null),
                        'expected_clock_out' => $this->normalizeTime($day['expected_clock_out'] ?? null),
                        'tolerance_minutes' => $day['tolerance_minutes'] ?? 15,
                    ]
                );
            }
        }

        $schedule->load('scheduleDays');
        return response()->json($schedule);
    }

    public function destroy(Schedule $schedule): JsonResponse
    {
        if ($schedule->name === 'Por defecto') {
            return response()->json(
                ['message' => 'No se puede eliminar el horario "Por defecto".'],
                422
            );
        }

        $schedule->delete();
        return response()->noContent();
    }

    private function normalizeTime(?string $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (preg_match('/^(\d{1,2}):(\d{2})$/', $value, $m)) {
            return sprintf('%02d:%02d:00', (int) $m[1], (int) $m[2]);
        }
        return $value;
    }
}
