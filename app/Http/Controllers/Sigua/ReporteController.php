<?php

namespace App\Http\Controllers\Sigua;

use App\Http\Controllers\Controller;
use App\Models\Sigua\Bitacora;
use App\Models\Sigua\CuentaGenerica;
use App\Models\Sigua\Cruce;
use App\Models\Sigua\FormatoCA01;
use App\Models\Sigua\Incidente;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReporteController extends Controller
{
    /**
     * GET: Resumen general para reporte completo (cuentas, CA-01, bitácora reciente, incidentes).
     * Permiso: sigua.reportes
     */
    public function resumenGeneral(Request $request): JsonResponse
    {
        if (! $request->user()?->can('sigua.reportes')) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        try {
            $sedeId = $request->input('sede_id');
            $sistemaId = $request->input('sistema_id');
            $fechaDesde = $request->input('fecha_desde');
            $fechaHasta = $request->input('fecha_hasta');

            $cuentasQuery = CuentaGenerica::with(['sistema:id,name', 'sede:id,name']);
            $ca01Query = FormatoCA01::with(['sede:id,name', 'sistema:id,name']);
            $bitacoraQuery = Bitacora::with(['account:id,usuario_cuenta,nombre_cuenta', 'sede:id,name']);
            $incidentesQuery = Incidente::with(['account:id,usuario_cuenta', 'sistema:id,name']);

            if ($sedeId) {
                $cuentasQuery->porSede($sedeId);
                $ca01Query->porSede($sedeId);
                $bitacoraQuery->porSede($sedeId);
                $incidentesQuery->whereHas('account', fn ($q) => $q->where('sede_id', $sedeId));
            }
            if ($sistemaId) {
                $cuentasQuery->porSistema($sistemaId);
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
                $incidentesQuery->where('fecha_incidente', '<=', $fechaHasta . ' 23:59:59');
            }

            $data = [
                'cuentas' => $cuentasQuery->orderBy('usuario_cuenta')->get(),
                'ca01' => $ca01Query->orderByDesc('fecha_firma')->get(),
                'bitacora' => $bitacoraQuery->orderByDesc('fecha')->limit(500)->get(),
                'incidentes' => $incidentesQuery->orderByDesc('fecha_incidente')->limit(200)->get(),
            ];

            return response()->json(['data' => $data, 'message' => 'OK']);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Error al generar resumen: ' . $e->getMessage()], 500);
        }
    }

    /**
     * GET: Descarga CSV del inventario de cuentas (filtros opcionales).
     * Permiso: sigua.reportes
     */
    public function exportarCuentas(Request $request): StreamedResponse|JsonResponse
    {
        if (! $request->user()?->can('sigua.reportes')) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        try {
            $query = CuentaGenerica::with(['sistema:id,name,slug', 'sede:id,name,code', 'campaign:id,name']);
            if ($request->filled('sede_id')) {
                $query->porSede($request->input('sede_id'));
            }
            if ($request->filled('sistema_id')) {
                $query->porSistema($request->input('sistema_id'));
            }
            if ($request->filled('estado')) {
                $query->where('estado', $request->input('estado'));
            }
            $cuentas = $query->orderBy('usuario_cuenta')->get();

            $filename = 'sigua_cuentas_' . date('Y-m-d_His') . '.csv';

            return response()->streamDownload(function () use ($cuentas) {
                $out = fopen('php://output', 'w');
                fputcsv($out, ['usuario_cuenta', 'nombre_cuenta', 'sistema', 'sede', 'campaña', 'estado', 'isla', 'perfil']);
                foreach ($cuentas as $c) {
                    fputcsv($out, [
                        $c->usuario_cuenta,
                        $c->nombre_cuenta,
                        $c->sistema?->name ?? '',
                        $c->sede?->name ?? '',
                        $c->campaign?->name ?? '',
                        $c->estado,
                        $c->isla ?? '',
                        $c->perfil ?? '',
                    ]);
                }
                fclose($out);
            }, $filename, [
                'Content-Type' => 'text/csv; charset=UTF-8',
                'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            ]);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Error al exportar: ' . $e->getMessage()], 500);
        }
    }

    /**
     * GET: Descarga CSV de bitácora filtrada.
     * Permiso: sigua.reportes
     */
    public function exportarBitacora(Request $request): StreamedResponse|JsonResponse
    {
        if (! $request->user()?->can('sigua.reportes')) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        try {
            $query = Bitacora::with(['account:id,usuario_cuenta,nombre_cuenta', 'sede:id,name', 'supervisor:id,name']);
            if ($request->filled('fecha')) {
                $query->porFecha($request->input('fecha'));
            }
            if ($request->filled('sede_id')) {
                $query->porSede($request->input('sede_id'));
            }
            if ($request->filled('sistema_id')) {
                $query->where('system_id', $request->input('sistema_id'));
            }
            if ($request->filled('fecha_desde')) {
                $query->whereDate('fecha', '>=', $request->input('fecha_desde'));
            }
            if ($request->filled('fecha_hasta')) {
                $query->whereDate('fecha', '<=', $request->input('fecha_hasta'));
            }
            $registros = $query->orderBy('fecha')->orderBy('id')->get();

            $filename = 'sigua_bitacora_' . date('Y-m-d_His') . '.csv';

            return response()->streamDownload(function () use ($registros) {
                $out = fopen('php://output', 'w');
                fputcsv($out, ['fecha', 'turno', 'cuenta', 'agente_nombre', 'agente_num_empleado', 'sede', 'supervisor', 'hora_inicio', 'hora_fin']);
                foreach ($registros as $r) {
                    fputcsv($out, [
                        $r->fecha?->format('Y-m-d') ?? '',
                        $r->turno ?? '',
                        $r->account?->usuario_cuenta ?? '',
                        $r->agente_nombre ?? '',
                        $r->agente_num_empleado ?? '',
                        $r->sede?->name ?? '',
                        $r->supervisor?->name ?? '',
                        $r->hora_inicio ?? '',
                        $r->hora_fin ?? '',
                    ]);
                }
                fclose($out);
            }, $filename, [
                'Content-Type' => 'text/csv; charset=UTF-8',
                'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            ]);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Error al exportar: ' . $e->getMessage()], 500);
        }
    }

    /**
     * GET: Descarga CSV del resultado de un cruce.
     * Permiso: sigua.reportes
     */
    public function exportarCruce(Request $request, Cruce $cruce): StreamedResponse|JsonResponse
    {
        if (! $request->user()?->can('sigua.reportes')) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        try {
            $resultado = $cruce->resultado_json ?? [];
            $rows = is_array($resultado) && isset($resultado['filas']) ? $resultado['filas'] : (is_array($resultado) ? [$resultado] : []);

            $filename = 'sigua_cruce_' . $cruce->id . '_' . date('Y-m-d_His') . '.csv';

            return response()->streamDownload(function () use ($cruce, $rows) {
                $out = fopen('php://output', 'w');
                fputcsv($out, ['tipo_cruce', 'fecha_ejecucion', 'total_analizados', 'coincidencias', 'sin_match']);
                fputcsv($out, [
                    $cruce->tipo_cruce,
                    $cruce->fecha_ejecucion?->format('Y-m-d H:i') ?? '',
                    $cruce->total_analizados,
                    $cruce->coincidencias,
                    $cruce->sin_match,
                ]);
                if (! empty($rows)) {
                    $headers = array_keys(is_array($rows[0] ?? []) ? $rows[0] : []);
                    if (! empty($headers)) {
                        fputcsv($out, $headers);
                        foreach ($rows as $row) {
                            $row = is_array($row) ? $row : [$row];
                            $values = [];
                            foreach ($headers as $h) {
                                $v = $row[$h] ?? '';
                                $values[] = is_array($v) || is_object($v) ? json_encode($v, JSON_UNESCAPED_UNICODE) : (string) $v;
                            }
                            fputcsv($out, $values);
                        }
                    }
                }
                fclose($out);
            }, $filename, [
                'Content-Type' => 'text/csv; charset=UTF-8',
                'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            ]);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Error al exportar: ' . $e->getMessage()], 500);
        }
    }
}
