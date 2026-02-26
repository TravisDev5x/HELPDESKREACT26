<?php

namespace App\Http\Controllers\Sigua;

use App\Http\Controllers\Controller;
use App\Models\Sigua\Cruce;
use App\Models\Sigua\Importacion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CruceController extends Controller
{
    /**
     * POST: Ejecutar cruce RH vs AD vs Neotel. Guarda resultado en sigua_cruces.
     * Permiso: sigua.cruces
     */
    public function ejecutar(Request $request): JsonResponse
    {
        if (! $request->user()?->can('sigua.cruces')) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $data = $request->validate([
            'tipo_cruce' => 'required|in:rh_vs_ad,rh_vs_neotel,ad_vs_neotel,completo',
            'import_id' => 'nullable|exists:sigua_imports,id',
        ]);

        try {
            $resultadoJson = []; // Aquí iría la lógica real de cruce (datos de importaciones, comparación, etc.)
            $cruce = Cruce::create([
                'import_id' => $data['import_id'] ?? null,
                'tipo_cruce' => $data['tipo_cruce'],
                'fecha_ejecucion' => now(),
                'total_analizados' => 0,
                'coincidencias' => 0,
                'sin_match' => 0,
                'resultado_json' => $resultadoJson,
                'ejecutado_por' => $request->user()->id,
            ]);

            $cruce->load('ejecutadoPor');

            return response()->json([
                'data' => $cruce,
                'message' => 'Cruce ejecutado. Implemente la lógica de comparación en el servicio correspondiente.',
            ], 201);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Error al ejecutar cruce: ' . $e->getMessage()], 422);
        }
    }

    /**
     * GET: Historial de cruces.
     * Permiso: sigua.cruces
     */
    public function historial(Request $request): JsonResponse
    {
        if (! $request->user()?->can('sigua.cruces')) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        try {
            $query = Cruce::with(['ejecutadoPor:id,name,email', 'importacion'])->orderByDesc('fecha_ejecucion');
            if ($request->filled('tipo_cruce')) {
                $query->where('tipo_cruce', $request->input('tipo_cruce'));
            }
            $paginator = $query->paginate($request->input('per_page', 25));

            return response()->json([
                'data' => $paginator->items(),
                'meta' => [
                    'current_page' => $paginator->currentPage(),
                    'last_page' => $paginator->lastPage(),
                    'per_page' => $paginator->perPage(),
                    'total' => $paginator->total(),
                ],
                'message' => 'OK',
            ]);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Error al obtener historial: ' . $e->getMessage()], 500);
        }
    }

    /**
     * GET: Detalle de un cruce.
     * Permiso: sigua.cruces
     */
    public function detalle(Request $request, Cruce $cruce): JsonResponse
    {
        if (! $request->user()?->can('sigua.cruces')) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $cruce->load(['ejecutadoPor', 'importacion']);

        return response()->json(['data' => $cruce, 'message' => 'OK']);
    }
}
