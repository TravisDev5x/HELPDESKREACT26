<?php

namespace App\Services\Sigua;

use App\Exceptions\Sigua\SiguaException;
use App\Models\Sigua\Bitacora;
use App\Models\Sigua\CuentaGenerica;
use App\Models\Sigua\Cruce;
use App\Models\Sigua\FormatoCA01;
use App\Models\Sigua\Incidente;
use Carbon\Carbon;
use Illuminate\Support\Facades\Storage;

/**
 * Servicio de reportes y exportación SIGUA.
 */
class ReporteService
{
    /**
     * Genera resumen general para dashboard/reporte con filtros.
     *
     * @param  array{sede_id?: int, sistema_id?: int, fecha_desde?: string, fecha_hasta?: string}  $filtros
     * @return array{cuentas: array, ca01: array, bitacora: array, incidentes: array, kpis: array}
     */
    public function generarResumenGeneral(array $filtros = []): array
    {
        $cuentasQuery = CuentaGenerica::with(['sistema:id,name', 'sede:id,name']);
        $ca01Query = FormatoCA01::with(['sede:id,name', 'sistema:id,name', 'gerente:id,name']);
        $bitacoraQuery = Bitacora::with(['account:id,usuario_cuenta,nombre_cuenta', 'sede:id,name']);
        $incidentesQuery = Incidente::with(['account:id,usuario_cuenta', 'sistema:id,name']);

        if (! empty($filtros['sede_id'])) {
            $cuentasQuery->porSede($filtros['sede_id']);
            $ca01Query->porSede($filtros['sede_id']);
            $bitacoraQuery->porSede($filtros['sede_id']);
            $incidentesQuery->whereHas('account', fn ($q) => $q->where('sede_id', $filtros['sede_id']));
        }
        if (! empty($filtros['sistema_id'])) {
            $cuentasQuery->porSistema($filtros['sistema_id']);
            $ca01Query->where('system_id', $filtros['sistema_id']);
            $bitacoraQuery->where('system_id', $filtros['sistema_id']);
            $incidentesQuery->where('system_id', $filtros['sistema_id']);
        }
        if (! empty($filtros['fecha_desde'])) {
            $bitacoraQuery->whereDate('fecha', '>=', $filtros['fecha_desde']);
            $incidentesQuery->where('fecha_incidente', '>=', $filtros['fecha_desde']);
        }
        if (! empty($filtros['fecha_hasta'])) {
            $bitacoraQuery->whereDate('fecha', '<=', $filtros['fecha_hasta']);
            $incidentesQuery->where('fecha_incidente', '<=', $filtros['fecha_hasta'] . ' 23:59:59');
        }

        $cuentas = $cuentasQuery->orderBy('usuario_cuenta')->get();
        $ca01 = $ca01Query->orderByDesc('fecha_firma')->get();
        $bitacora = $bitacoraQuery->orderByDesc('fecha')->limit(500)->get();
        $incidentes = $incidentesQuery->orderByDesc('fecha_incidente')->limit(200)->get();

        $kpis = [
            'total_cuentas' => $cuentas->count(),
            'ca01_vigentes' => FormatoCA01::vigentes()->count(),
            'ca01_vencidos' => FormatoCA01::vencidos()->count(),
            'incidentes_abiertos' => Incidente::abiertos()->count(),
        ];

        return [
            'cuentas' => $cuentas->toArray(),
            'ca01' => $ca01->toArray(),
            'bitacora' => $bitacora->toArray(),
            'incidentes' => $incidentes->toArray(),
            'kpis' => $kpis,
        ];
    }

    /**
     * Exporta inventario de cuentas a CSV y retorna path en disco.
     *
     * @param  array{sede_id?: int, sistema_id?: int, estado?: string}  $filtros
     * @throws SiguaException
     */
    public function exportarInventarioCuentas(array $filtros = []): string
    {
        $query = CuentaGenerica::with(['sistema:id,name', 'sede:id,name', 'campaign:id,name']);
        if (! empty($filtros['sede_id'])) {
            $query->porSede($filtros['sede_id']);
        }
        if (! empty($filtros['sistema_id'])) {
            $query->porSistema($filtros['sistema_id']);
        }
        if (! empty($filtros['estado'])) {
            $query->where('estado', $filtros['estado']);
        }
        $cuentas = $query->orderBy('usuario_cuenta')->get();

        $filename = 'sigua_cuentas_' . date('Y-m-d_His') . '.csv';
        $path = 'sigua/exports/' . $filename;
        $fullPath = Storage::disk('local')->path($path);
        $dir = dirname($fullPath);
        if (! is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        $out = fopen($fullPath, 'w');
        if ($out === false) {
            throw new SiguaException('No se pudo crear el archivo de exportación.');
        }
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

        return $fullPath;
    }

    /**
     * Exporta bitácora filtrada a CSV y retorna path.
     *
     * @param  array{fecha?: string, fecha_desde?: string, fecha_hasta?: string, sede_id?: int, sistema_id?: int}  $filtros
     * @throws SiguaException
     */
    public function exportarBitacora(array $filtros = []): string
    {
        $query = Bitacora::with(['account:id,usuario_cuenta,nombre_cuenta', 'sede:id,name', 'supervisor:id,name']);
        if (! empty($filtros['fecha'])) {
            $query->porFecha($filtros['fecha']);
        }
        if (! empty($filtros['fecha_desde'])) {
            $query->whereDate('fecha', '>=', $filtros['fecha_desde']);
        }
        if (! empty($filtros['fecha_hasta'])) {
            $query->whereDate('fecha', '<=', $filtros['fecha_hasta']);
        }
        if (! empty($filtros['sede_id'])) {
            $query->porSede($filtros['sede_id']);
        }
        if (! empty($filtros['sistema_id'])) {
            $query->where('system_id', $filtros['sistema_id']);
        }
        $registros = $query->orderBy('fecha')->orderBy('id')->get();

        $filename = 'sigua_bitacora_' . date('Y-m-d_His') . '.csv';
        $path = 'sigua/exports/' . $filename;
        $fullPath = Storage::disk('local')->path($path);
        $dir = dirname($fullPath);
        if (! is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        $out = fopen($fullPath, 'w');
        if ($out === false) {
            throw new SiguaException('No se pudo crear el archivo de exportación.');
        }
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

        return $fullPath;
    }

    /**
     * Exporta resultado de un cruce a CSV y retorna path.
     *
     * @throws SiguaException
     */
    public function exportarResultadoCruce(int $cruceId): string
    {
        $cruce = Cruce::find($cruceId);
        if (! $cruce) {
            throw new SiguaException('Cruce no encontrado.');
        }

        $resultado = $cruce->resultado_json ?? [];
        $filename = 'sigua_cruce_' . $cruceId . '_' . date('Y-m-d_His') . '.csv';
        $path = 'sigua/exports/' . $filename;
        $fullPath = Storage::disk('local')->path($path);
        $dir = dirname($fullPath);
        if (! is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        $out = fopen($fullPath, 'w');
        if ($out === false) {
            throw new SiguaException('No se pudo crear el archivo de exportación.');
        }
        fputcsv($out, ['tipo_cruce', 'fecha_ejecucion', 'total_analizados', 'coincidencias', 'sin_match']);
        fputcsv($out, [
            $cruce->tipo_cruce,
            $cruce->fecha_ejecucion?->format('Y-m-d H:i') ?? '',
            $cruce->total_analizados,
            $cruce->coincidencias,
            $cruce->sin_match,
        ]);
        $filas = $resultado['filas'] ?? $resultado['coincidencias'] ?? $resultado['en_ad_no_rh'] ?? [];
        if (! empty($filas)) {
            $headers = array_keys(is_array($filas[0] ?? []) ? $filas[0] : []);
            if (! empty($headers)) {
                fputcsv($out, $headers);
                foreach ($filas as $row) {
                    fputcsv($out, is_array($row) ? array_values($row) : [$row]);
                }
            }
        }
        fclose($out);

        return $fullPath;
    }
}
