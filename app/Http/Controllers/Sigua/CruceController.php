<?php

namespace App\Http\Controllers\Sigua;

use App\Http\Controllers\Controller;
use App\Models\Sigua\Cruce;
use App\Services\Sigua\CruceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CruceController extends Controller
{
    public function __construct(
        protected CruceService $cruceService
    ) {}

    /**
     * POST: Ejecutar cruce completo o individual. Body: sistema_ids (array opcional), tipo: completo|individual, sistema_id (si individual).
     * Permiso: sigua.cruces
     */
    public function ejecutar(Request $request): JsonResponse
    {
        if (! $request->user()?->can('sigua.cruces')) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $data = $request->validate([
            'tipo_cruce' => 'nullable|in:completo,individual',
            'sistema_ids' => 'nullable|array',
            'sistema_ids.*' => 'integer|exists:sigua_systems,id',
            'sistema_id' => 'required_if:tipo_cruce,individual|nullable|integer|exists:sigua_systems,id',
        ]);

        try {
            $userId = $request->user()->id;
            if (($data['tipo_cruce'] ?? '') === 'individual' && ! empty($data['sistema_id'])) {
                $cruce = $this->cruceService->ejecutarCruceIndividual((int) $data['sistema_id'], $userId);
            } else {
                $sistemaIds = isset($data['sistema_ids']) && is_array($data['sistema_ids'])
                    ? array_map('intval', $data['sistema_ids'])
                    : null;
                $cruce = $this->cruceService->ejecutarCruceCompleto($sistemaIds, $userId);
            }

            $cruce->load(['ejecutadoPor', 'resultados']);

            return response()->json(['data' => $cruce, 'message' => 'Cruce ejecutado'], 201);
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
     * GET: Detalle de un cruce (con resultados).
     * Permiso: sigua.cruces
     */
    public function detalle(Request $request, Cruce $cruce): JsonResponse
    {
        if (! $request->user()?->can('sigua.cruces')) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $cruce->load(['ejecutadoPor', 'importacion', 'resultados']);

        return response()->json(['data' => $cruce, 'message' => 'OK']);
    }

    /**
     * GET: Comparar cruce con el anterior (anomalías nuevas, resueltas, sin cambio).
     */
    public function comparar(Request $request, Cruce $cruce): JsonResponse
    {
        if (! $request->user()?->can('sigua.cruces')) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $result = $this->cruceService->compararConCruceAnterior($cruce->id);
        return response()->json(['data' => $result, 'message' => 'OK']);
    }
}
