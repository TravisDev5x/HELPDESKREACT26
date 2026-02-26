<?php

namespace App\Services\Sigua;

use App\Models\Sigua\Bitacora;
use App\Models\Sigua\CuentaGenerica;
use App\Models\Sigua\EmpleadoRh;
use Carbon\Carbon;
use Illuminate\Support\Collection;

/**
 * Servicio de bitácora SIGUA (CA-02).
 */
class BitacoraService
{
    /**
     * Registra turnos. Por cada elemento del array intenta resolver empleado_rh_id por agente_num_empleado.
     *
     * @param  array<int, array{cuenta_id: int, agente_nombre: string, agente_num_empleado?: string, turno: string, fecha?: string, hora_inicio?: string, hora_fin?: string, hora_cambio?: string, sede_id?: int, campaign_id?: int}>  $registros
     * @return Collection<int, Bitacora>
     */
    public function registrarTurno(array $registros, int $supervisorId): Collection
    {
        $out = new Collection;
        foreach ($registros as $reg) {
            $cuenta = CuentaGenerica::find($reg['cuenta_id'] ?? 0);
            if (! $cuenta) {
                continue;
            }
            $empleadoRhId = null;
            if (! empty($reg['agente_num_empleado'])) {
                $emp = EmpleadoRh::where('num_empleado', trim($reg['agente_num_empleado']))->first();
                $empleadoRhId = $emp?->id;
            }
            $fecha = isset($reg['fecha']) ? Carbon::parse($reg['fecha'])->format('Y-m-d') : now()->toDateString();
            $turno = $reg['turno'] ?? Bitacora::TURNO_MATUTINO;
            if (! in_array($turno, [Bitacora::TURNO_MATUTINO, Bitacora::TURNO_VESPERTINO, Bitacora::TURNO_NOCTURNO, Bitacora::TURNO_MIXTO], true)) {
                $turno = Bitacora::TURNO_MATUTINO;
            }
            $bitacora = Bitacora::create([
                'account_id' => $cuenta->id,
                'system_id' => $cuenta->system_id,
                'sede_id' => $reg['sede_id'] ?? $cuenta->sede_id,
                'campaign_id' => $reg['campaign_id'] ?? $cuenta->campaign_id,
                'fecha' => $fecha,
                'turno' => $turno,
                'agente_nombre' => $reg['agente_nombre'] ?? '',
                'agente_num_empleado' => $reg['agente_num_empleado'] ?? null,
                'hora_inicio' => $reg['hora_inicio'] ?? null,
                'hora_fin' => $reg['hora_fin'] ?? null,
                'hora_cambio' => $reg['hora_cambio'] ?? null,
                'supervisor_user_id' => $supervisorId,
                'observaciones' => $reg['observaciones'] ?? null,
                'tipo_registro' => Bitacora::TIPO_ASIGNACION,
                'empleado_rh_id' => $empleadoRhId,
            ]);
            $out->push($bitacora);
        }
        return $out;
    }

    /**
     * Marca una cuenta como sin uso en una fecha/turno (crea registro en sigua_logbook con tipo_registro sin_uso).
     */
    public function marcarSinUso(int $cuentaId, string $fecha, string $turno, int $supervisorId, ?string $motivo = null): Bitacora
    {
        $cuenta = CuentaGenerica::findOrFail($cuentaId);
        $fechaNorm = Carbon::parse($fecha)->format('Y-m-d');
        $turnoNorm = in_array($turno, [Bitacora::TURNO_MATUTINO, Bitacora::TURNO_VESPERTINO, Bitacora::TURNO_NOCTURNO, Bitacora::TURNO_MIXTO], true)
            ? $turno : Bitacora::TURNO_MATUTINO;

        return Bitacora::create([
            'account_id' => $cuenta->id,
            'system_id' => $cuenta->system_id,
            'sede_id' => $cuenta->sede_id,
            'campaign_id' => $cuenta->campaign_id,
            'fecha' => $fechaNorm,
            'turno' => $turnoNorm,
            'agente_nombre' => 'Sin uso',
            'agente_num_empleado' => null,
            'supervisor_user_id' => $supervisorId,
            'observaciones' => $motivo ?? 'SIN USO',
            'tipo_registro' => Bitacora::TIPO_SIN_USO,
            'empleado_rh_id' => null,
        ]);
    }

    /**
     * Resumen diario: cuentas activas vs registradas vs sin uso.
     *
     * @return array{cuentas_activas: int, registradas: int, sin_uso: int, detalle: array}
     */
    public function obtenerResumenDiario(string $fecha, ?int $sedeId = null, ?int $sistemaId = null): array
    {
        $fechaNorm = Carbon::parse($fecha)->toDateString();
        $query = CuentaGenerica::where('estado', 'activa');
        if ($sedeId !== null) {
            $query->where('sede_id', $sedeId);
        }
        if ($sistemaId !== null) {
            $query->where('system_id', $sistemaId);
        }
        $cuentasActivas = $query->count();

        $regQuery = Bitacora::porFecha($fechaNorm)->where('tipo_registro', '!=', Bitacora::TIPO_SIN_USO);
        if ($sedeId !== null) {
            $regQuery->where('sede_id', $sedeId);
        }
        if ($sistemaId !== null) {
            $regQuery->where('system_id', $sistemaId);
        }
        $registradas = $regQuery->get()->pluck('account_id')->unique()->count();

        $sinUsoQuery = Bitacora::porFecha($fechaNorm)->sinUso();
        if ($sedeId !== null) {
            $sinUsoQuery->where('sede_id', $sedeId);
        }
        if ($sistemaId !== null) {
            $sinUsoQuery->where('system_id', $sistemaId);
        }
        $sinUso = $sinUsoQuery->count();

        return [
            'cuentas_activas' => $cuentasActivas,
            'registradas' => $registradas,
            'sin_uso' => $sinUso,
            'detalle' => [
                'fecha' => $fechaNorm,
                'sede_id' => $sedeId,
                'sistema_id' => $sistemaId,
            ],
        ];
    }

    /**
     * Cumplimiento de bitácora por sede/sistema/campaña en un rango de fechas.
     *
     * @return array{por_sede: array, por_sistema: array, por_campana: array, total_dias: int}
     */
    public function obtenerCumplimiento(string $fechaDesde, string $fechaHasta, ?int $sedeId = null): array
    {
        $desde = Carbon::parse($fechaDesde)->startOfDay();
        $hasta = Carbon::parse($fechaHasta)->endOfDay();
        $totalDias = $desde->diffInDays($hasta) + 1;
        if ($totalDias <= 0) {
            return ['por_sede' => [], 'por_sistema' => [], 'por_campana' => [], 'total_dias' => 0];
        }

        $query = Bitacora::whereBetween('fecha', [$desde, $hasta])->where('tipo_registro', '!=', Bitacora::TIPO_SIN_USO);
        if ($sedeId !== null) {
            $query->where('sede_id', $sedeId);
        }
        $registros = $query->get();

        $porSede = $registros->groupBy('sede_id')->map(fn ($items) => [
            'registros' => $items->count(),
            'dias_con_registro' => $items->pluck('fecha')->map(fn ($d) => $d instanceof \DateTimeInterface ? $d->format('Y-m-d') : $d)->unique()->count(),
        ])->all();
        $porSistema = $registros->groupBy('system_id')->map(fn ($items) => [
            'registros' => $items->count(),
            'dias_con_registro' => $items->pluck('fecha')->map(fn ($d) => $d instanceof \DateTimeInterface ? $d->format('Y-m-d') : $d)->unique()->count(),
        ])->all();
        $porCampana = $registros->groupBy('campaign_id')->map(fn ($items) => [
            'registros' => $items->count(),
            'dias_con_registro' => $items->pluck('fecha')->map(fn ($d) => $d instanceof \DateTimeInterface ? $d->format('Y-m-d') : $d)->unique()->count(),
        ])->all();

        return [
            'por_sede' => $porSede,
            'por_sistema' => $porSistema,
            'por_campana' => $porCampana,
            'total_dias' => $totalDias,
        ];
    }

    /**
     * ¿Quién estaba usando esta cuenta en esta fecha? (primer registro del día que no sea sin uso).
     */
    public function buscarAgente(string $fecha, int $cuentaId): ?Bitacora
    {
        $fechaNorm = Carbon::parse($fecha)->toDateString();
        return Bitacora::porFecha($fechaNorm)
            ->where('account_id', $cuentaId)
            ->where('tipo_registro', '!=', Bitacora::TIPO_SIN_USO)
            ->orderBy('hora_inicio')
            ->first();
    }
}
