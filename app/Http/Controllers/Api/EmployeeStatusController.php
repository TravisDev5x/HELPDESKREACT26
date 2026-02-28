<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmployeeStatus;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * CRUD del catálogo de estatus de empleado (RH). Cero hardcodeo.
 */
class EmployeeStatusController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = EmployeeStatus::query()->orderBy('name');

        if ($request->boolean('active')) {
            $query->active();
        }

        $items = $query->get(['id', 'name', 'description', 'is_active', 'created_at']);
        return response()->json($items);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:65535',
            'is_active' => 'boolean',
        ]);

        $item = EmployeeStatus::create([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json($item, 201);
    }

    public function update(Request $request, EmployeeStatus $employeeStatus): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string|max:65535',
            'is_active' => 'boolean',
        ]);

        $employeeStatus->update(array_filter($validated, fn ($v) => $v !== null));
        return response()->json($employeeStatus);
    }

    public function destroy(EmployeeStatus $employeeStatus): JsonResponse
    {
        if ($employeeStatus->employeeProfiles()->exists()) {
            return response()->json([
                'message' => 'No se puede eliminar: hay empleados con este estatus.',
            ], 422);
        }

        $employeeStatus->delete();
        return response()->json(['message' => 'Estatus eliminado']);
    }
}
