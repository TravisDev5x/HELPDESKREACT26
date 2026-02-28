<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RecruitmentSource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * CRUD del catálogo de orígenes / medios de contratación (RH). Cero hardcodeo.
 */
class RecruitmentSourceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = RecruitmentSource::query()->orderBy('name');

        if ($request->boolean('active')) {
            $query->active();
        }

        $items = $query->get(['id', 'name', 'is_active', 'created_at']);

        return response()->json($items);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:recruitment_sources,name',
            'is_active' => 'boolean',
        ]);

        $item = RecruitmentSource::create([
            'name' => $validated['name'],
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json($item, 201);
    }

    public function update(Request $request, RecruitmentSource $recruitment_source): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255|unique:recruitment_sources,name,'.$recruitment_source->id,
            'is_active' => 'boolean',
        ]);

        $recruitment_source->update(array_filter($validated, fn ($v) => $v !== null));

        return response()->json($recruitment_source);
    }

    public function destroy(RecruitmentSource $recruitment_source): JsonResponse
    {
        if ($recruitment_source->employeeProfiles()->exists()) {
            return response()->json([
                'message' => 'No se puede eliminar: hay empleados con este origen de contratación.',
            ], 422);
        }

        $recruitment_source->delete();

        return response()->json(['message' => 'Origen eliminado']);
    }
}
