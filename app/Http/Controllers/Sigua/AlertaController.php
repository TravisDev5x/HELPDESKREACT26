<?php

namespace App\Http\Controllers\Sigua;

use App\Http\Controllers\Controller;
use App\Services\Sigua\AlertaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AlertaController extends Controller
{
    public function __construct(
        protected AlertaService $alertaService
    ) {}

    /**
     * GET: Mis alertas (dirigidas al usuario) o todas si tiene permiso. Filtros: leida, resuelta, tipo.
     * Permiso: sigua.dashboard (o permiso específico alertas si existe).
     */
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()?->can('sigua.dashboard')) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $user = $request->user();
        $query = \App\Models\Sigua\Alerta::with(['sede:id,name', 'sistema:id,name,slug']);

        // Por defecto solo las dirigidas al usuario; si tiene permiso amplio podría ver todas
        if (! $request->boolean('todas')) {
            $query->paraUsuario($user->id);
        }
        if ($request->filled('leida')) {
            $query->where('leida', $request->boolean('leida'));
        }
        if ($request->filled('resuelta')) {
            $query->where('resuelta', $request->boolean('resuelta'));
        }
        if ($request->filled('tipo')) {
            $query->where('tipo', $request->input('tipo'));
        }
        if ($request->filled('severidad')) {
            $query->where('severidad', $request->input('severidad'));
        }

        $query->orderByDesc('created_at');
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
    }

    /**
     * PATCH: Marcar alerta como leída.
     */
    public function marcarLeida(Request $request, int $id): JsonResponse
    {
        if (! $request->user()?->can('sigua.dashboard')) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $alerta = $this->alertaService->marcarAlertaLeida($id, $request->user()->id);
        return response()->json(['data' => $alerta, 'message' => 'Alerta marcada como leída']);
    }

    /**
     * PATCH: Resolver alerta.
     */
    public function resolver(Request $request, int $id): JsonResponse
    {
        if (! $request->user()?->can('sigua.dashboard')) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $alerta = $this->alertaService->resolverAlerta($id, $request->user()->id);
        return response()->json(['data' => $alerta, 'message' => 'Alerta resuelta']);
    }
}
