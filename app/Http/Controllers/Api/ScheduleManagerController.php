<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Area;
use App\Models\Campaign;
use App\Models\Schedule;
use App\Models\ScheduleAssignment;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * Gestión de asignaciones de horarios (RH/Admin).
 * Requiere permiso: attendances.manage
 */
class ScheduleManagerController extends Controller
{
    /**
     * Catálogos para los selects del frontend: horarios, áreas, campañas, usuarios activos.
     */
    public function catalogs(): JsonResponse
    {
        $schedules = Schedule::where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name']);

        $areas = Area::where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name']);

        $campaigns = Campaign::where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name']);

        $users = User::whereNull('deleted_at')
            ->where('status', 'active')
            ->orderBy('name')
            ->get(['id', 'name', 'email'])
            ->map(fn ($u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
            ]);

        return response()->json([
            'schedules' => $schedules,
            'areas' => $areas,
            'campaigns' => $campaigns,
            'users' => $users,
        ]);
    }

    /**
     * Asignar un horario a una entidad (User, Area o Campaign).
     * Body: schedule_id, scheduleable_type (User|Area|Campaign), scheduleable_id, valid_from, valid_until (opcional).
     */
    public function assign(Request $request): JsonResponse
    {
        $data = $request->validate([
            'schedule_id' => ['required', 'integer', 'exists:schedules,id'],
            'scheduleable_type' => ['required', 'string', 'in:User,Area,Campaign'],
            'scheduleable_id' => ['required', 'integer'],
            'valid_from' => ['required', 'date'],
            'valid_until' => ['nullable', 'date', 'after_or_equal:valid_from'],
        ]);

        $type = $data['scheduleable_type'];
        $id = (int) $data['scheduleable_id'];

        $modelClass = match ($type) {
            'User' => User::class,
            'Area' => Area::class,
            'Campaign' => Campaign::class,
        };

        $entity = $modelClass::find($id);
        if (!$entity) {
            return response()->json(
                ['message' => 'La entidad seleccionada no existe.'],
                422
            );
        }

        $scheduleableType = $modelClass; // FQCN para morph
        $validFrom = Carbon::parse($data['valid_from'])->startOfDay();
        $validUntil = isset($data['valid_until'])
            ? Carbon::parse($data['valid_until'])->endOfDay()
            : null;

        $assignment = ScheduleAssignment::create([
            'schedule_id' => $data['schedule_id'],
            'scheduleable_type' => $scheduleableType,
            'scheduleable_id' => $id,
            'valid_from' => $validFrom,
            'valid_until' => $validUntil,
        ]);

        $assignment->load(['schedule:id,name', 'scheduleable']);

        return response()->json([
            'message' => 'Horario asignado correctamente.',
            'assignment' => [
                'id' => $assignment->id,
                'schedule_id' => $assignment->schedule_id,
                'schedule_name' => $assignment->schedule->name,
                'scheduleable_type' => $assignment->scheduleable_type,
                'scheduleable_id' => $assignment->scheduleable_id,
                'scheduleable_label' => $this->scheduleableLabel($assignment),
                'valid_from' => $assignment->valid_from->format('Y-m-d'),
                'valid_until' => $assignment->valid_until?->format('Y-m-d'),
            ],
        ], 201);
    }

    /**
     * Listar asignaciones activas (vigentes hoy).
     */
    public function index(Request $request): JsonResponse
    {
        $today = Carbon::now(config('app.timezone'))->format('Y-m-d');

        $assignments = ScheduleAssignment::query()
            ->where('valid_from', '<=', $today)
            ->where(function ($q) use ($today) {
                $q->whereNull('valid_until')->orWhere('valid_until', '>=', $today);
            })
            ->with(['schedule:id,name', 'scheduleable'])
            ->orderBy('scheduleable_type')
            ->orderBy('scheduleable_id')
            ->get()
            ->map(fn (ScheduleAssignment $a) => [
                'id' => $a->id,
                'schedule_id' => $a->schedule_id,
                'schedule_name' => $a->schedule->name ?? null,
                'scheduleable_type' => $a->scheduleable_type,
                'scheduleable_id' => $a->scheduleable_id,
                'scheduleable_label' => $this->scheduleableLabel($a),
                'valid_from' => $a->valid_from->format('Y-m-d'),
                'valid_until' => $a->valid_until?->format('Y-m-d'),
            ]);

        return response()->json(['assignments' => $assignments]);
    }

    private function scheduleableLabel(ScheduleAssignment $a): string
    {
        $s = $a->scheduleable;
        if (!$s) {
            return "{$a->scheduleable_type}#{$a->scheduleable_id}";
        }
        return $s->name ?? "{$a->scheduleable_type}#{$a->scheduleable_id}";
    }
}
