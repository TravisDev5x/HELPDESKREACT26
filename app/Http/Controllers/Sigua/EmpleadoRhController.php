<?php

namespace App\Http\Controllers\Sigua;

use App\Http\Controllers\Controller;
use App\Models\Sigua\EmpleadoRh;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmpleadoRhController extends Controller
{
    /**
     * GET: Listado de empleados RH con filtros (sede_id, campaign_id, estatus, search).
     * Permiso: sigua.dashboard o similar (ajustar según permisos v2).
     */
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()?->can('sigua.dashboard') && ! $request->user()?->can('sigua.cuentas.view')) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $query = EmpleadoRh::with(['sede:id,name,code', 'campaign:id,name']);

        if ($request->filled('sede_id')) {
            $query->porSede((int) $request->input('sede_id'));
        }
        if ($request->filled('campaign_id')) {
            $query->porCampana((int) $request->input('campaign_id'));
        }
        if ($request->filled('estatus')) {
            $query->where('estatus', $request->input('estatus'));
        }
        if ($request->filled('sistema_id')) {
            $sistemaId = (int) $request->input('sistema_id');
            if ($request->boolean('con_cuenta')) {
                $query->conCuentaEn($sistemaId);
            } else {
                $query->sinCuentaEn($sistemaId);
            }
        }
        if ($request->filled('search')) {
            $term = $request->input('search');
            $query->where(fn ($q) => $q->where('num_empleado', 'like', "%{$term}%")
                ->orWhere('nombre_completo', 'like', "%{$term}%"));
        }

        $query->orderBy('nombre_completo');
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
     * GET: Detalle de empleado RH con cuentas agrupadas por sistema.
     */
    public function show(Request $request, int $id): JsonResponse
    {
        if (! $request->user()?->can('sigua.dashboard') && ! $request->user()?->can('sigua.cuentas.view')) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $empleado = EmpleadoRh::with(['sede:id,name,code', 'campaign:id,name'])
            ->with(['cuentas' => fn ($q) => $q->with('sistema:id,name,slug')])
            ->findOrFail($id);

        $cuentasPorSistema = $empleado->cuentas->groupBy('system_id')->map(fn ($cuentas, $systemId) => [
            'sistema_id' => (int) $systemId,
            'sistema' => $cuentas->first()?->sistema,
            'cuentas' => $cuentas->values()->all(),
        ])->values()->all();

        return response()->json([
            'data' => [
                'empleado' => $empleado,
                'cuentas_por_sistema' => $cuentasPorSistema,
            ],
            'message' => 'OK',
        ]);
    }
}
