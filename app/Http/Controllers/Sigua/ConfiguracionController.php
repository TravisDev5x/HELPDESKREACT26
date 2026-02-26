<?php

namespace App\Http\Controllers\Sigua;

use App\Http\Controllers\Controller;
use App\Models\Sigua\Configuracion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConfiguracionController extends Controller
{
    /**
     * GET: Listado de parámetros de configuración SIGUA.
     * Permiso: sigua.dashboard (o permiso admin/config si existe).
     */
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()?->can('sigua.dashboard')) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $items = Configuracion::orderBy('clave')->get();
        return response()->json(['data' => $items, 'message' => 'OK']);
    }

    /**
     * PUT/PATCH: Actualizar uno o más valores. Body: { clave: valor } o { clave1: v1, clave2: v2 }.
     */
    public function update(Request $request): JsonResponse
    {
        if (! $request->user()?->can('sigua.dashboard')) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $data = $request->validate([
            'clave' => 'required_without:claves|string|exists:sigua_configuracion,clave',
            'valor' => 'required_with:clave',
            'claves' => 'required_without:clave|array',
            'claves.*.clave' => 'required|string|exists:sigua_configuracion,clave',
            'claves.*.valor' => 'required',
        ]);

        if (isset($data['clave'])) {
            Configuracion::setValor($data['clave'], $data['valor']);
            $item = Configuracion::where('clave', $data['clave'])->first();
            return response()->json(['data' => $item, 'message' => 'Configuración actualizada']);
        }

        $updated = [];
        foreach ($data['claves'] as $row) {
            Configuracion::setValor($row['clave'], $row['valor']);
            $updated[] = Configuracion::where('clave', $row['clave'])->first();
        }
        return response()->json(['data' => $updated, 'message' => count($updated) . ' valor(es) actualizado(s)']);
    }
}
