<?php

namespace App\Http\Controllers\Sigua;

use App\Http\Controllers\Controller;
use App\Http\Requests\Sigua\StoreIncidenteRequest;
use App\Models\Sigua\CuentaGenerica;
use App\Models\Sigua\Incidente;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IncidenteController extends Controller
{
    /**
     * Listado de incidentes SIGUA con filtros.
     * Permiso: sigua.incidentes.view
     */
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()?->can('sigua.incidentes.view')) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        try {
            $query = Incidente::with(['account', 'sistema', 'ca01', 'reportadoPor', 'asignadoA']);

            if ($request->filled('estado')) {
                $query->where('estado', $request->input('estado'));
            }
            if ($request->filled('sistema_id')) {
                $query->porSistema((int) $request->input('sistema_id'));
            }
            if ($request->filled('cuenta_generica_id')) {
                $query->where('account_id', $request->input('cuenta_generica_id'));
            }

            $query->orderByDesc('fecha_incidente');
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
            return response()->json(['message' => 'Error al listar incidentes: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Crear incidente. sistema_id y reportado_por se completan automáticamente.
     * Permiso: sigua.incidentes.manage
     */
    public function store(StoreIncidenteRequest $request): JsonResponse
    {
        try {
            $cuenta = CuentaGenerica::find($request->input('cuenta_generica_id'));
            if (! $cuenta) {
                return response()->json(['message' => 'Cuenta no encontrada'], 404);
            }

            $incidente = Incidente::create([
                'account_id' => $cuenta->id,
                'system_id' => $cuenta->system_id,
                'fecha_incidente' => $request->input('fecha_incidente'),
                'descripcion' => $request->input('descripcion'),
                'ip_origen' => $request->input('ip_origen'),
                'estado' => 'abierto',
                'reportado_por' => $request->user()->id,
            ]);

            $incidente->load(['account', 'sistema', 'reportadoPor']);

            return response()->json(['data' => $incidente, 'message' => 'Incidente registrado correctamente'], 201);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Error al registrar incidente: ' . $e->getMessage()], 422);
        }
    }

    /**
     * Ver un incidente.
     * Permiso: sigua.incidentes.view
     */
    public function show(Request $request, Incidente $incidente): JsonResponse
    {
        if (! $request->user()?->can('sigua.incidentes.view')) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $incidente->load(['account', 'sistema', 'ca01', 'reportadoPor', 'asignadoA']);

        return response()->json(['data' => $incidente, 'message' => 'OK']);
    }

    /**
     * Actualizar incidente (estado, asignado_a, resolucion, etc.).
     * Permiso: sigua.incidentes.manage
     */
    public function update(Request $request, Incidente $incidente): JsonResponse
    {
        if (! $request->user()?->can('sigua.incidentes.manage')) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $data = $request->validate([
            'estado' => 'nullable|in:abierto,investigando,resuelto,escalado',
            'asignado_a' => 'nullable|exists:users,id',
            'resolucion' => 'nullable|string|max:5000',
            'agente_identificado' => 'nullable|string|max:255',
        ]);

        try {
            $incidente->update(array_filter($data));
            $incidente->load(['account', 'sistema', 'ca01', 'reportadoPor', 'asignadoA']);

            return response()->json(['data' => $incidente, 'message' => 'Incidente actualizado correctamente']);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Error al actualizar: ' . $e->getMessage()], 422);
        }
    }

    /**
     * PATCH: Cambiar a investigando y asignar responsable.
     * Permiso: sigua.incidentes.manage
     */
    public function investigar(Request $request, Incidente $incidente): JsonResponse
    {
        if (! $request->user()?->can('sigua.incidentes.manage')) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $data = $request->validate([
            'asignado_a' => 'required|exists:users,id',
        ]);

        try {
            $incidente->update(['estado' => 'investigando', 'asignado_a' => $data['asignado_a']]);
            $incidente->load(['account', 'sistema', 'reportadoPor', 'asignadoA']);

            return response()->json(['data' => $incidente, 'message' => 'Incidente en investigación']);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Error: ' . $e->getMessage()], 422);
        }
    }

    /**
     * PATCH: Cerrar con resolución.
     * Permiso: sigua.incidentes.manage
     */
    public function resolver(Request $request, Incidente $incidente): JsonResponse
    {
        if (! $request->user()?->can('sigua.incidentes.manage')) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $data = $request->validate([
            'resolucion' => 'required|string|max:5000',
            'agente_identificado' => 'nullable|string|max:255',
        ]);

        try {
            $incidente->update([
                'estado' => 'resuelto',
                'resolucion' => $data['resolucion'],
                'agente_identificado' => $data['agente_identificado'] ?? $incidente->agente_identificado,
            ]);
            $incidente->load(['account', 'sistema', 'reportadoPor', 'asignadoA']);

            return response()->json(['data' => $incidente, 'message' => 'Incidente resuelto']);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Error: ' . $e->getMessage()], 422);
        }
    }

    /**
     * PATCH: Escalar incidente.
     * Permiso: sigua.incidentes.manage
     */
    public function escalar(Request $request, Incidente $incidente): JsonResponse
    {
        if (! $request->user()?->can('sigua.incidentes.manage')) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        try {
            $incidente->update(['estado' => 'escalado']);
            $incidente->load(['account', 'sistema', 'reportadoPor', 'asignadoA']);

            return response()->json(['data' => $incidente, 'message' => 'Incidente escalado']);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Error: ' . $e->getMessage()], 422);
        }
    }
}
