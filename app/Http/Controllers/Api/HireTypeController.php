<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HireType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * CRUD del catálogo de tipos de ingreso (RH). Cero hardcodeo.
 */
class HireTypeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = HireType::query()->orderBy('name');

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

        $item = HireType::create([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json($item, 201);
    }

    public function update(Request $request, HireType $hireType): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string|max:65535',
            'is_active' => 'boolean',
        ]);

        $hireType->update(array_filter($validated, fn ($v) => $v !== null));
        return response()->json($hireType);
    }

    public function destroy(HireType $hireType): JsonResponse
    {
        if ($hireType->employeeProfiles()->exists()) {
            return response()->json([
                'message' => 'No se puede eliminar: hay empleados con este tipo de ingreso.',
            ], 422);
        }

        $hireType->delete();
        return response()->json(['message' => 'Tipo de ingreso eliminado']);
    }
}
