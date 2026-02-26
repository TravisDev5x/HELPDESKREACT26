<?php

namespace App\Services\Sigua;

use App\Exceptions\Sigua\SiguaException;
use App\Models\Sigua\Bitacora;
use App\Models\Sigua\BitacoraSinUso;
use App\Models\Sigua\CuentaGenerica;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Servicio de bitácora SIGUA: registro masivo, sin uso y resumen diario.
 */
class BitacoraService
{
    /**
     * Registra múltiples entradas de bitácora (un turno completo).
     * Completa sistema_id, sede_id, campaign_id desde la cuenta; supervisor_user_id del parámetro.
     *
     * @param  array<int, array{cuenta_generica_id: int, fecha: string, turno: string, agente_nombre: string, agente_num_empleado?: string, hora_inicio?: string, hora_fin?: string, hora_cambio?: string, observaciones?: string}>  $registros
     * @return Collection<int, Bitacora>
     * @throws SiguaException
     */
    public function registrarTurno(array $registros, int $supervisorId): Collection
    {
        if (empty($registros)) {
            throw new SiguaException('Debe incluir al menos un registro.');
        }

        return DB::transaction(function () use ($registros, $supervisorId) {
            $creados = new Collection;
            foreach ($registros as $r) {
                $cuentaId = $r['cuenta_generica_id'] ?? $r['account_id'] ?? null;
                if (! $cuentaId) {
                    throw new SiguaException('Cada registro debe tener cuenta_generica_id.');
                }
                $cuenta = CuentaGenerica::find($cuentaId);
                if (! $cuenta) {
                    throw new SiguaException("Cuenta genérica {$cuentaId} no encontrada.");
                }
                $reg = Bitacora::create([
                    'account_id' => $cuenta->id,
                    'system_id' => $cuenta->system_id,
                    'sede_id' => $cuenta->sede_id,
                    'campaign_id' => $cuenta->campaign_id,
                    'fecha' => $r['fecha'] ?? now()->toDateString(),
                    'turno' => $r['turno'] ?? 'mixto',
                    'agente_nombre' => $r['agente_nombre'] ?? '',
                    'agente_num_empleado' => $r['agente_num_empleado'] ?? null,
                    'hora_inicio' => $r['hora_inicio'] ?? null,
                    'hora_fin' => $r['hora_fin'] ?? null,
                    'hora_cambio' => $r['hora_cambio'] ?? null,
                    'supervisor_user_id' => $supervisorId,
                    'observaciones' => $r['observaciones'] ?? null,
                ]);
                $creados->push($reg);
            }
            return $creados;
        });
    }

    /**
     * Marca una cuenta como sin uso en una fecha/turno.
     *
     * @throws SiguaException
     */
    public function marcarSinUso(
        int $cuentaId,
        string $fecha,
        string $turno,
        int $supervisorId,
        ?string $motivo = null
    ): BitacoraSinUso {
        $cuenta = CuentaGenerica::find($cuentaId);
        if (! $cuenta) {
            throw new SiguaException('Cuenta genérica no encontrada.');
        }
        if (! in_array($turno, ['matutino', 'vespertino', 'nocturno', 'mixto'], true)) {
            throw new SiguaException('Turno no válido.');
        }

        return DB::transaction(function () use ($cuenta, $fecha, $turno, $supervisorId, $motivo) {
            return BitacoraSinUso::create([
                'account_id' => $cuenta->id,
                'fecha' => $fecha,
                'turno' => $turno,
                'sede_id' => $cuenta->sede_id,
                'supervisor_user_id' => $supervisorId,
                'motivo' => $motivo,
            ]);
        });
    }

    /**
     * Resumen diario de bitácora por sede (conteos por sede/sistema/turno).
     *
     * @return array{sedes: array, total_registros: int, por_turno: array}
     */
    public function obtenerResumenDiario(string $fecha, ?int $sedeId = null): array
    {
        $query = Bitacora::query()
            ->whereDate('fecha', $fecha)
            ->with(['sede:id,name,code', 'sistema:id,name']);

        if ($sedeId !== null) {
            $query->where('sede_id', $sedeId);
        }

        $registros = $query->get();
        $porSede = $registros->groupBy('sede_id')->map(function ($items, $sid) {
            return [
                'sede_id' => (int) $sid,
                'sede' => $items->first()->sede?->name ?? null,
                'total' => $items->count(),
                'por_turno' => $items->groupBy('turno')->map->count()->all(),
                'por_sistema' => $items->groupBy('system_id')->map->count()->all(),
            ];
        })->values()->all();

        $porTurno = $registros->groupBy('turno')->map->count()->all();

        return [
            'fecha' => $fecha,
            'sedes' => $porSede,
            'total_registros' => $registros->count(),
            'por_turno' => $porTurno,
        ];
    }
}
