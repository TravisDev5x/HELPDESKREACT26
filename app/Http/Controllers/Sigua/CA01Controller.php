<?php

namespace App\Http\Controllers\Sigua;

use App\Http\Controllers\Controller;
use App\Http\Requests\Sigua\StoreCA01Request;
use App\Models\Sigua\FormatoCA01;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CA01Controller extends Controller
{
    /**
     * Listado de formatos CA-01 con filtros.
     * Permiso: sigua.ca01.view
     */
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()?->can('sigua.ca01.view')) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        try {
            $query = FormatoCA01::with(['gerente:id,name,email', 'sede:id,name,code', 'sistema:id,name,slug', 'campaign:id,name', 'cuentas']);

            if ($request->filled('sede_id')) {
                $query->porSede((int) $request->input('sede_id'));
            }
            if ($request->filled('sistema_id')) {
                $query->where('system_id', $request->input('sistema_id'));
            }
            if ($request->filled('estado')) {
                $query->where('estado', $request->input('estado'));
            }
            if ($request->filled('gerente_user_id')) {
                $query->where('gerente_user_id', $request->input('gerente_user_id'));
            }

            $query->orderByDesc('fecha_firma');
            $items = $query->paginate($request->input('per_page', 15));

            return response()->json([
                'data' => $items->items(),
                'meta' => [
                    'current_page' => $items->currentPage(),
                    'last_page' => $items->lastPage(),
                    'per_page' => $items->perPage(),
                    'total' => $items->total(),
                ],
                'message' => 'OK',
            ]);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Error al listar CA-01: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Crear CA-01 y asociar cuentas. fecha_vencimiento = fecha_firma + 6 meses.
     * Permiso: sigua.ca01.manage
     */
    public function store(StoreCA01Request $request): JsonResponse
    {
        try {
            $data = $request->validated();
            $fechaFirma = Carbon::parse($data['fecha_firma']);
            $fechaVencimiento = $fechaFirma->copy()->addMonths(6);

            $ca01 = DB::transaction(function () use ($data, $fechaFirma, $fechaVencimiento, $request) {
                $ca01 = FormatoCA01::create([
                    'gerente_user_id' => $data['gerente_user_id'],
                    'campaign_id' => $data['campaign_id'],
                    'sede_id' => $data['sede_id'],
                    'system_id' => $data['sistema_id'],
                    'fecha_firma' => $fechaFirma,
                    'fecha_vencimiento' => $fechaVencimiento,
                    'estado' => 'vigente',
                    'observaciones' => $data['observaciones'] ?? null,
                    'created_by' => $request->user()->id,
                ]);

                $pivot = [];
                foreach ($data['cuentas'] as $c) {
                    $pivot[$c['cuenta_generica_id']] = ['justificacion' => $c['justificacion'] ?? null];
                }
                $ca01->cuentas()->attach($pivot);

                return $ca01->load(['gerente', 'sede', 'sistema', 'campaign', 'cuentas', 'createdByUser']);
            });

            return response()->json(['data' => $ca01, 'message' => 'CA-01 creado correctamente'], 201);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Error al crear CA-01: ' . $e->getMessage()], 422);
        }
    }

    /**
     * Ver un CA-01 con todas las relaciones.
     * Permiso: sigua.ca01.view
     */
    public function show(Request $request, FormatoCA01 $ca01): JsonResponse
    {
        if (! $request->user()?->can('sigua.ca01.view')) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $ca01->load(['gerente', 'sede', 'sistema', 'campaign', 'cuentas', 'createdByUser']);

        return response()->json(['data' => $ca01, 'message' => 'OK']);
    }

    /**
     * Actualizar solo observaciones y estado.
     * Permiso: sigua.ca01.manage
     */
    public function update(Request $request, FormatoCA01 $ca01): JsonResponse
    {
        if (! $request->user()?->can('sigua.ca01.manage')) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $data = $request->validate([
            'observaciones' => 'nullable|string|max:1000',
            'estado' => 'nullable|in:vigente,vencido,cancelado',
        ]);

        try {
            $ca01->update(array_filter($data));
            $ca01->load(['gerente', 'sede', 'sistema', 'campaign', 'cuentas']);

            return response()->json(['data' => $ca01, 'message' => 'CA-01 actualizado correctamente']);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Error al actualizar: ' . $e->getMessage()], 422);
        }
    }

    /**
     * Renovar: crea nuevo CA-01 basado en el anterior y da por vencido el anterior.
     * Permiso: sigua.ca01.manage
     */
    public function renovar(Request $request, FormatoCA01 $ca01): JsonResponse
    {
        if (! $request->user()?->can('sigua.ca01.manage')) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $anterior = $ca01->load('cuentas');

        $fechaFirma = $request->input('fecha_firma') ? Carbon::parse($request->input('fecha_firma')) : Carbon::today();
        $fechaVencimiento = $fechaFirma->copy()->addMonths(6);

        try {
            $nuevo = DB::transaction(function () use ($anterior, $fechaFirma, $fechaVencimiento, $request) {
                $anterior->update(['estado' => 'vencido']);

                $nuevo = FormatoCA01::create([
                    'gerente_user_id' => $anterior->gerente_user_id,
                    'campaign_id' => $anterior->campaign_id,
                    'sede_id' => $anterior->sede_id,
                    'system_id' => $anterior->system_id,
                    'fecha_firma' => $fechaFirma,
                    'fecha_vencimiento' => $fechaVencimiento,
                    'estado' => 'vigente',
                    'observaciones' => $anterior->observaciones,
                    'created_by' => $request->user()->id,
                ]);

                $pivot = $anterior->cuentas->mapWithKeys(fn ($c) => [$c->id => ['justificacion' => $c->pivot->justificacion ?? null]])->all();
                $nuevo->cuentas()->attach($pivot);

                return $nuevo->load(['gerente', 'sede', 'sistema', 'campaign', 'cuentas', 'createdByUser']);
            });

            return response()->json(['data' => $nuevo, 'message' => 'CA-01 renovado correctamente'], 201);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Error al renovar: ' . $e->getMessage()], 422);
        }
    }
}
