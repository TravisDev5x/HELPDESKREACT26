<?php

namespace App\Http\Controllers\Sigua;

use App\Http\Controllers\Controller;
use App\Models\Sigua\Bitacora;
use App\Models\Sigua\CuentaGenerica;
use App\Models\Sigua\FormatoCA01;
use App\Models\Sigua\Incidente;
use App\Models\Sigua\Sistema;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class SiguaDashboardController extends Controller
{
    /**
     * KPIs del dashboard SIGUA con filtros opcionales.
     * Permiso: sigua.dashboard
     */
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()?->can('sigua.dashboard')) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        try {
            $sedeId = $request->input('sede_id');
            $sistemaId = $request->input('sistema_id');
            $fechaDesde = $request->input('fecha_desde') ? Carbon::parse($request->input('fecha_desde')) : null;
            $fechaHasta = $request->input('fecha_hasta') ? Carbon::parse($request->input('fecha_hasta')) : null;

            $cuentasQuery = CuentaGenerica::query();
            $ca01Query = FormatoCA01::query();
            $bitacoraQuery = Bitacora::query();
            $incidentesQuery = Incidente::query();

            if ($sedeId) {
                $cuentasQuery->where('sede_id', $sedeId);
                $ca01Query->where('sede_id', $sedeId);
                $bitacoraQuery->where('sede_id', $sedeId);
                $incidentesQuery->whereHas('account', fn ($q) => $q->where('sede_id', $sedeId));
            }
            if ($sistemaId) {
                $cuentasQuery->where('system_id', $sistemaId);
                $ca01Query->where('system_id', $sistemaId);
                $bitacoraQuery->where('system_id', $sistemaId);
                $incidentesQuery->where('system_id', $sistemaId);
            }
            if ($fechaDesde) {
                $bitacoraQuery->whereDate('fecha', '>=', $fechaDesde);
                $incidentesQuery->where('fecha_incidente', '>=', $fechaDesde);
            }
            if ($fechaHasta) {
                $bitacoraQuery->whereDate('fecha', '<=', $fechaHasta);
                $incidentesQuery->where('fecha_incidente', '<=', $fechaHasta->endOfDay());
            }

            $totalCuentasPorSistema = (clone $cuentasQuery)->selectRaw('system_id, count(*) as total')
                ->groupBy('system_id')
                ->with('sistema:id,name,slug')
                ->get()
                ->map(fn ($r) => ['sistema_id' => $r->system_id, 'sistema' => $r->sistema?->name ?? null, 'total' => (int) $r->total]);

            $ca01Vigentes = (clone $ca01Query)->vigentes()->count();
            $ca01Vencidos = (clone $ca01Query)->vencidos()->count();
            $bitacorasHoy = (clone $bitacoraQuery)->hoy()->count();
            $incidentesAbiertos = (clone $incidentesQuery)->abiertos()->count();

            $distribucionPorSede = CuentaGenerica::query()
                ->when($sedeId, fn ($q) => $q->where('sede_id', $sedeId))
                ->when($sistemaId, fn ($q) => $q->where('system_id', $sistemaId))
                ->selectRaw('sede_id, count(*) as total')
                ->groupBy('sede_id')
                ->with('sede:id,name,code')
                ->get()
                ->map(fn ($r) => ['sede_id' => $r->sede_id, 'sede' => $r->sede?->name ?? null, 'total' => (int) $r->total]);

            $data = [
                'total_cuentas_por_sistema' => $totalCuentasPorSistema,
                'ca01_vigentes' => $ca01Vigentes,
                'ca01_vencidos' => $ca01Vencidos,
                'bitacoras_hoy' => $bitacorasHoy,
                'incidentes_abiertos' => $incidentesAbiertos,
                'distribucion_por_sede' => $distribucionPorSede,
                'alertas_bajas' => Cache::get('sigua_alertas_bajas'),
            ];

            return response()->json(['data' => $data, 'message' => 'OK']);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Error al obtener el dashboard: ' . $e->getMessage()], 500);
        }
    }
}
