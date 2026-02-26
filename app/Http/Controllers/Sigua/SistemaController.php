<?php

namespace App\Http\Controllers\Sigua;

use App\Http\Controllers\Controller;
use App\Models\Sigua\Sistema;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SistemaController extends Controller
{
    /**
     * GET: Listado de sistemas (activos por defecto). Filtros: activo, externo.
     */
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()?->can('sigua.dashboard') && ! $request->user()?->can('sigua.cuentas.view')) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $query = Sistema::query()->orderBy('orden')->orderBy('name');
        if ($request->boolean('activo', true)) {
            $query->activos();
        }
        if ($request->filled('es_externo')) {
            $query->where('es_externo', $request->boolean('es_externo'));
        }
        $items = $query->get();
        return response()->json(['data' => $items, 'message' => 'OK']);
    }

    /**
     * POST: Crear sistema. Permiso: sigua.cuentas.manage o admin.
     */
    public function store(Request $request): JsonResponse
    {
        if (! $request->user()?->can('sigua.cuentas.manage')) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $data = $request->validate([
            'name' => 'required|string|max:100',
            'slug' => 'required|string|max:50|unique:sigua_systems,slug',
            'description' => 'nullable|string',
            'es_externo' => 'boolean',
            'contacto_externo' => 'nullable|string|max:255',
            'campos_mapeo' => 'nullable|array',
            'campo_id_empleado' => 'nullable|string|max:100',
            'regex_id_empleado' => 'nullable|string|max:255',
            'activo' => 'boolean',
            'icono' => 'nullable|string|max:50',
            'color' => 'nullable|string|max:7',
            'orden' => 'integer',
        ]);
        $data['es_externo'] = $data['es_externo'] ?? false;
        $data['activo'] = $data['activo'] ?? true;
        $data['orden'] = $data['orden'] ?? 0;

        $sistema = Sistema::create($data);
        return response()->json(['data' => $sistema, 'message' => 'Sistema creado'], 201);
    }

    /**
     * GET: Detalle de un sistema.
     */
    public function show(Request $request, Sistema $sistema): JsonResponse
    {
        if (! $request->user()?->can('sigua.dashboard') && ! $request->user()?->can('sigua.cuentas.view')) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        return response()->json(['data' => $sistema, 'message' => 'OK']);
    }

    /**
     * PUT/PATCH: Actualizar sistema.
     */
    public function update(Request $request, Sistema $sistema): JsonResponse
    {
        if (! $request->user()?->can('sigua.cuentas.manage')) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $data = $request->validate([
            'name' => 'sometimes|string|max:100',
            'slug' => 'sometimes|string|max:50|unique:sigua_systems,slug,' . $sistema->id,
            'description' => 'nullable|string',
            'es_externo' => 'boolean',
            'contacto_externo' => 'nullable|string|max:255',
            'campos_mapeo' => 'nullable|array',
            'campo_id_empleado' => 'nullable|string|max:100',
            'regex_id_empleado' => 'nullable|string|max:255',
            'activo' => 'boolean',
            'icono' => 'nullable|string|max:50',
            'color' => 'nullable|string|max:7',
            'orden' => 'integer',
        ]);

        $sistema->update($data);
        return response()->json(['data' => $sistema->fresh(), 'message' => 'Sistema actualizado']);
    }

    /**
     * DELETE: Eliminar sistema (solo si no tiene cuentas/registros asociados o soft).
     */
    public function destroy(Request $request, Sistema $sistema): JsonResponse
    {
        if (! $request->user()?->can('sigua.cuentas.manage')) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        if ($sistema->cuentas()->exists()) {
            return response()->json(['message' => 'No se puede eliminar un sistema con cuentas asociadas'], 422);
        }
        $sistema->delete();
        return response()->json(['data' => null, 'message' => 'Sistema eliminado']);
    }
}
