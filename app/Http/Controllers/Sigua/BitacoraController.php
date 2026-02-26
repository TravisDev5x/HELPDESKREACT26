<?php

namespace App\Http\Controllers\Sigua;

use App\Http\Controllers\Controller;
use App\Http\Requests\Sigua\StoreBitacoraBulkRequest;
use App\Http\Requests\Sigua\StoreBitacoraRequest;
use App\Models\Sigua\Bitacora;
use App\Models\Sigua\BitacoraSinUso;
use App\Models\Sigua\CuentaGenerica;
use App\Services\Sigua\BitacoraService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BitacoraController extends Controller
{
    public function __construct(
        protected BitacoraService $bitacoraService
    ) {}
    /**
     * Listado de registros de bitácora con filtros.
     * Permiso: sigua.bitacora.view o sigua.bitacora.sede (por sede del usuario)
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'No autorizado'], 401);
        }
        if (! $user->can('sigua.bitacora.view') && ! $user->can('sigua.bitacora.sede')) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        try {
            $query = Bitacora::with(['account:id,usuario_cuenta,nombre_cuenta,sede_id,system_id', 'supervisor:id,name,email', 'sede:id,name,code']);

            if ($user->can('sigua.bitacora.sede') && ! $user->can('sigua.bitacora.view') && $user->sede_id) {
                $query->porSede($user->sede_id);
            }
            if ($request->filled('fecha')) {
                $query->porFecha($request->input('fecha'));
            }
            if ($request->filled('fecha_desde')) {
                $query->whereDate('fecha', '>=', $request->input('fecha_desde'));
            }
            if ($request->filled('fecha_hasta')) {
                $query->whereDate('fecha', '<=', $request->input('fecha_hasta'));
            }
            if ($request->filled('sede_id')) {
                $query->porSede($request->input('sede_id'));
            }
            if ($request->filled('sistema_id')) {
                $query->where('system_id', $request->input('sistema_id'));
            }
            if ($request->filled('turno')) {
                $query->porTurno($request->input('turno'));
            }
            if ($request->filled('campaign_id')) {
                $query->where('campaign_id', $request->input('campaign_id'));
            }
            if ($request->filled('cuenta_generica_id')) {
                $query->where('account_id', $request->input('cuenta_generica_id'));
            }

            $query->orderByDesc('fecha')->orderByDesc('id');
            $paginator = $query->paginate(50);

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
            return response()->json(['message' => 'Error al listar bitácora: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Registrar un registro de bitácora. Sistema, sede y supervisor se completan automáticamente.
     * Permiso: sigua.bitacora.registrar
     */
    public function store(StoreBitacoraRequest $request): JsonResponse
    {
        try {
            $cuenta = CuentaGenerica::find($request->input('cuenta_generica_id'));
            if (! $cuenta) {
                return response()->json(['message' => 'Cuenta no encontrada'], 404);
            }

            $registro = Bitacora::create([
                'account_id' => $cuenta->id,
                'system_id' => $cuenta->system_id,
                'sede_id' => $cuenta->sede_id,
                'campaign_id' => $cuenta->campaign_id,
                'fecha' => $request->input('fecha'),
                'turno' => $request->input('turno'),
                'agente_nombre' => $request->input('agente_nombre'),
                'agente_num_empleado' => $request->input('agente_num_empleado'),
                'hora_inicio' => $request->input('hora_inicio'),
                'hora_fin' => $request->input('hora_fin'),
                'hora_cambio' => $request->input('hora_cambio'),
                'supervisor_user_id' => $request->user()->id,
                'observaciones' => $request->input('observaciones'),
            ]);

            $registro->load(['account', 'supervisor', 'sede']);

            return response()->json(['data' => $registro, 'message' => 'Registro de bitácora creado'], 201);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Error al registrar: ' . $e->getMessage()], 422);
        }
    }

    /**
     * Registrar múltiples entradas de bitácora (un turno completo).
     * Permiso: sigua.bitacora.registrar
     */
    public function storeBulk(StoreBitacoraBulkRequest $request): JsonResponse
    {
        try {
            $creados = [];
            foreach ($request->input('registros') as $r) {
                $cuenta = CuentaGenerica::find($r['cuenta_generica_id']);
                if (! $cuenta) {
                    continue;
                }
                $reg = Bitacora::create([
                    'account_id' => $cuenta->id,
                    'system_id' => $cuenta->system_id,
                    'sede_id' => $cuenta->sede_id,
                    'campaign_id' => $cuenta->campaign_id,
                    'fecha' => $r['fecha'],
                    'turno' => $r['turno'],
                    'agente_nombre' => $r['agente_nombre'],
                    'agente_num_empleado' => $r['agente_num_empleado'] ?? null,
                    'hora_inicio' => $r['hora_inicio'] ?? null,
                    'hora_fin' => $r['hora_fin'] ?? null,
                    'hora_cambio' => $r['hora_cambio'] ?? null,
                    'supervisor_user_id' => $request->user()->id,
                    'observaciones' => $r['observaciones'] ?? null,
                ]);
                $creados[] = $reg;
            }

            return response()->json([
                'data' => $creados,
                'message' => count($creados) . ' registro(s) de bitácora creado(s)',
            ], 201);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Error al registrar en lote: ' . $e->getMessage()], 422);
        }
    }

    /**
     * Bitácoras filtradas por sede.
     * Permiso: sigua.bitacora.view o sigua.bitacora.sede
     */
    public function porSede(Request $request, int $sedeId): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'No autorizado'], 401);
        }
        if (! $user->can('sigua.bitacora.view') && (! $user->can('sigua.bitacora.sede') || (int) $user->sede_id !== $sedeId)) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $query = Bitacora::with(['account', 'supervisor', 'sede'])->porSede($sedeId)->orderByDesc('fecha')->orderByDesc('id');
        $paginator = $query->paginate(50);

        return response()->json([
            'data' => $paginator->items(),
            'meta' => ['current_page' => $paginator->currentPage(), 'last_page' => $paginator->lastPage(), 'per_page' => $paginator->perPage(), 'total' => $paginator->total()],
            'message' => 'OK',
        ]);
    }

    /**
     * Registros de bitácora de hoy.
     * Permiso: sigua.bitacora.view o sigua.bitacora.sede
     */
    public function hoy(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'No autorizado'], 401);
        }
        if (! $user->can('sigua.bitacora.view') && ! $user->can('sigua.bitacora.sede')) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $query = Bitacora::with(['account', 'supervisor', 'sede'])->hoy();
        if ($user->can('sigua.bitacora.sede') && ! $user->can('sigua.bitacora.view') && $user->sede_id) {
            $query->porSede($user->sede_id);
        }
        $items = $query->orderByDesc('id')->get();

        return response()->json(['data' => $items, 'message' => 'OK']);
    }

    /**
     * Listar registros SIN USO.
     * Permiso: sigua.bitacora.view
     */
    public function sinUso(Request $request): JsonResponse
    {
        if (! $request->user()?->can('sigua.bitacora.view')) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $query = BitacoraSinUso::with(['account', 'sede', 'supervisor']);
        if ($request->filled('fecha')) {
            $query->whereDate('fecha', $request->input('fecha'));
        }
        if ($request->filled('sede_id')) {
            $query->where('sede_id', $request->input('sede_id'));
        }
        $items = $query->orderByDesc('fecha')->paginate(50);

        return response()->json([
            'data' => $items->items(),
            'meta' => ['current_page' => $items->currentPage(), 'last_page' => $items->lastPage(), 'per_page' => $items->perPage(), 'total' => $items->total()],
            'message' => 'OK',
        ]);
    }

    /**
     * Marcar cuenta como sin uso en una fecha/turno.
     * Permiso: sigua.bitacora.registrar
     */
    public function storeSinUso(Request $request): JsonResponse
    {
        if (! $request->user()?->can('sigua.bitacora.registrar')) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $data = $request->validate([
            'cuenta_generica_id' => 'required|exists:sigua_accounts,id',
            'fecha' => 'required|date',
            'turno' => 'required|in:matutino,vespertino,nocturno,mixto',
            'motivo' => 'nullable|string|max:500',
        ]);

        $cuenta = CuentaGenerica::find($data['cuenta_generica_id']);
        if (! $cuenta) {
            return response()->json(['message' => 'Cuenta no encontrada'], 404);
        }

        try {
            $reg = BitacoraSinUso::create([
                'account_id' => $cuenta->id,
                'fecha' => $data['fecha'],
                'turno' => $data['turno'],
                'sede_id' => $cuenta->sede_id,
                'supervisor_user_id' => $request->user()->id,
                'motivo' => $data['motivo'] ?? null,
            ]);
            $reg->load(['account', 'sede', 'supervisor']);

            return response()->json(['data' => $reg, 'message' => 'Registro sin uso creado'], 201);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Error al registrar: ' . $e->getMessage()], 422);
        }
    }

    /**
     * GET: Cumplimiento de bitácora en un rango de fechas. Query: fecha_desde, fecha_hasta, sede_id (opcional).
     * Permiso: sigua.bitacora.view
     */
    public function cumplimiento(Request $request): JsonResponse
    {
        if (! $request->user()?->can('sigua.bitacora.view')) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $data = $request->validate([
            'fecha_desde' => 'required|date',
            'fecha_hasta' => 'required|date|after_or_equal:fecha_desde',
            'sede_id' => 'nullable|integer|exists:sites,id',
        ]);

        $result = $this->bitacoraService->obtenerCumplimiento(
            $data['fecha_desde'],
            $data['fecha_hasta'],
            $data['sede_id'] ?? null
        );

        return response()->json(['data' => $result, 'message' => 'OK']);
    }
}
