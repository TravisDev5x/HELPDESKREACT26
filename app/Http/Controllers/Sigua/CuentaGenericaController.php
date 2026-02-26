<?php

namespace App\Http\Controllers\Sigua;

use App\Http\Controllers\Controller;
use App\Http\Requests\Sigua\StoreCuentaGenericaRequest;
use App\Http\Requests\Sigua\UpdateCuentaGenericaRequest;
use App\Models\Sigua\CuentaGenerica;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CuentaGenericaController extends Controller
{
    /**
     * Listado de cuentas genéricas con filtros y paginado.
     * Permiso: sigua.cuentas.view
     */
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()?->can('sigua.cuentas.view')) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        try {
            $query = CuentaGenerica::with(['sistema:id,name,slug', 'sede:id,name,code', 'campaign:id,name', 'ca01Vigente']);

            if ($request->filled('sede_id')) {
                $query->porSede((int) $request->input('sede_id'));
            }
            if ($request->filled('sistema_id')) {
                $query->porSistema((int) $request->input('sistema_id'));
            }
            if ($request->filled('estado')) {
                $query->where('estado', $request->input('estado'));
            }
            if ($request->filled('campaign_id')) {
                $query->where('campaign_id', $request->input('campaign_id'));
            }
            if ($request->filled('search')) {
                $term = $request->input('search');
                $query->where(fn ($q) => $q->where('usuario_cuenta', 'like', "%{$term}%")
                    ->orWhere('nombre_cuenta', 'like', "%{$term}%"));
            }

            $query->orderBy('usuario_cuenta');
            $paginator = $query->paginate(25);

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
            return response()->json(['message' => 'Error al listar cuentas: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Crear cuenta genérica.
     * Permiso: sigua.cuentas.manage
     */
    public function store(StoreCuentaGenericaRequest $request): JsonResponse
    {
        try {
            $data = $request->validated();
            $data['system_id'] = $data['sistema_id'];
            unset($data['sistema_id']);
            $cuenta = CuentaGenerica::create($data);
            $cuenta->load(['sistema', 'sede', 'campaign', 'ca01Vigente']);

            return response()->json(['data' => $cuenta, 'message' => 'Cuenta creada correctamente'], 201);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Error al crear cuenta: ' . $e->getMessage()], 422);
        }
    }

    /**
     * Ver una cuenta genérica.
     * Permiso: sigua.cuentas.view
     */
    public function show(Request $request, CuentaGenerica $cuenta): JsonResponse
    {
        if (! $request->user()?->can('sigua.cuentas.view')) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $cuenta->load(['sistema', 'sede', 'campaign', 'ca01Vigente', 'formatosCA01']);

        return response()->json(['data' => $cuenta, 'message' => 'OK']);
    }

    /**
     * Actualizar cuenta genérica.
     * Permiso: sigua.cuentas.manage
     */
    public function update(UpdateCuentaGenericaRequest $request, CuentaGenerica $cuenta): JsonResponse
    {
        try {
            $data = $request->validated();
            $data['system_id'] = $data['sistema_id'];
            unset($data['sistema_id']);
            $cuenta->update($data);
            $cuenta->load(['sistema', 'sede', 'campaign', 'ca01Vigente']);

            return response()->json(['data' => $cuenta, 'message' => 'Cuenta actualizada correctamente']);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Error al actualizar: ' . $e->getMessage()], 422);
        }
    }

    /**
     * Eliminar (soft delete) cuenta genérica.
     * Permiso: sigua.cuentas.manage
     */
    public function destroy(Request $request, CuentaGenerica $cuenta): JsonResponse
    {
        if (! $request->user()?->can('sigua.cuentas.manage')) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        try {
            $cuenta->delete();

            return response()->json(['data' => null, 'message' => 'Cuenta eliminada correctamente']);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Error al eliminar: ' . $e->getMessage()], 422);
        }
    }

    /**
     * PATCH: Clasificar cuenta (tipo: nominal, generica, servicio, prueba, desconocida).
     * Permiso: sigua.cuentas.manage
     */
    public function clasificar(Request $request, CuentaGenerica $cuenta): JsonResponse
    {
        if (! $request->user()?->can('sigua.cuentas.manage')) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $data = $request->validate([
            'tipo' => 'required|in:nominal,generica,servicio,prueba,desconocida',
        ]);
        $cuenta->update(['tipo' => $data['tipo']]);
        $cuenta->load(['sistema', 'sede', 'campaign', 'empleadoRh', 'ca01Vigente']);

        return response()->json(['data' => $cuenta, 'message' => 'Tipo de cuenta actualizado']);
    }

    /**
     * PATCH: Vincular cuenta a empleado RH (empleado_rh_id) o desvincular (null).
     * Permiso: sigua.cuentas.manage
     */
    public function vincular(Request $request, CuentaGenerica $cuenta): JsonResponse
    {
        if (! $request->user()?->can('sigua.cuentas.manage')) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $data = $request->validate([
            'empleado_rh_id' => 'nullable|integer|exists:sigua_empleados_rh,id',
        ]);
        $cuenta->update(['empleado_rh_id' => $data['empleado_rh_id'] ?? null]);
        $cuenta->load(['sistema', 'sede', 'campaign', 'empleadoRh', 'ca01Vigente']);

        return response()->json(['data' => $cuenta, 'message' => 'Vinculación actualizada']);
    }

    /**
     * Cambiar estado de varias cuentas a la vez.
     * Permiso: sigua.cuentas.manage
     */
    public function bulkUpdateEstado(Request $request): JsonResponse
    {
        if (! $request->user()?->can('sigua.cuentas.manage')) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['integer', 'exists:sigua_accounts,id'],
            'estado' => ['required', 'in:activa,suspendida,baja'],
        ]);

        try {
            $updated = CuentaGenerica::whereIn('id', $request->input('ids'))
                ->update(['estado' => $request->input('estado')]);

            return response()->json([
                'data' => ['updated' => $updated],
                'message' => "Se actualizaron {$updated} cuenta(s) correctamente",
            ]);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Error al actualizar estados: ' . $e->getMessage()], 422);
        }
    }
}
