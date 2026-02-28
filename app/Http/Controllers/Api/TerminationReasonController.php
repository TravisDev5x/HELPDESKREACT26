<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TerminationReason;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TerminationReasonController extends Controller
{
    /**
     * Listado de motivos de baja (para selects y CRUD).
     * Query param active=1 devuelve solo activos.
     */
    public function index(Request $request): JsonResponse
    {
        $query = TerminationReason::query()->orderBy('name');

        if ($request->boolean('active')) {
            $query->active();
        }

        $items = $query->get(['id', 'name', 'description', 'is_active', 'created_at']);
        return response()->json($items);
    }

    /**
     * Crear motivo de baja.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:65535',
            'is_active' => 'boolean',
        ]);

        $reason = TerminationReason::create([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json($reason, 201);
    }

    /**
     * Actualizar motivo de baja (incluye toggle is_active).
     */
    public function update(Request $request, TerminationReason $terminationReason): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string|max:65535',
            'is_active' => 'boolean',
        ]);

        $terminationReason->update(array_filter($validated, fn ($v) => $v !== null));
        return response()->json($terminationReason);
    }

    /**
     * Eliminar motivo de baja (solo si no está en uso por ningún employee_profile).
     */
    public function destroy(TerminationReason $terminationReason): JsonResponse
    {
        if ($terminationReason->employeeProfiles()->exists()) {
            return response()->json([
                'message' => 'No se puede eliminar: hay empleados dados de baja con este motivo.',
            ], 422);
        }

        $terminationReason->delete();
        return response()->json(['message' => 'Motivo eliminado']);
    }
}
