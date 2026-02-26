<?php

namespace App\Http\Controllers\Sigua;

use App\Http\Controllers\Controller;
use App\Models\Sigua\Sistema;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SiguaCatalogController extends Controller
{
    /**
     * Listado de sistemas (Neotel, Ahevaa, etc.) para filtros y formularios.
     * Permiso: sigua.dashboard o sigua.cuentas.view
     */
    public function sistemas(Request $request): JsonResponse
    {
        if (! $request->user()?->can('sigua.dashboard') && ! $request->user()?->can('sigua.cuentas.view')) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $items = Sistema::query()
            ->orderBy('name')
            ->get(['id', 'name', 'slug', 'es_externo']);

        return response()->json(['data' => $items, 'message' => 'OK']);
    }
}
