<?php

namespace App\Services\Sigua;

use App\Exceptions\Sigua\SiguaException;
use App\Models\Sigua\Configuracion;
use App\Models\Sigua\FormatoCA01;
use App\Models\Sigua\CuentaGenerica;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Servicio de formatos CA-01 (responsabilidad de cuentas genéricas).
 */
class CA01Service
{
    /**
     * Crea un CA-01. Valida que no exista otro vigente para sede+sistema+campaña.
     * Calcula fecha_vencimiento según ca01_vigencia_meses y asocia cuentas.
     *
     * @param  array{gerente_user_id: int, campaign_id: int, sede_id: int, system_id: int, fecha_firma?: string, observaciones?: string}  $data
     * @param  array<int>  $cuentaIds
     * @throws SiguaException
     */
    public function crear(array $data, array $cuentaIds, int $creadorId): FormatoCA01
    {
        $existe = FormatoCA01::vigentes()
            ->where('sede_id', $data['sede_id'])
            ->where('system_id', $data['system_id'])
            ->where('campaign_id', $data['campaign_id'])
            ->exists();

        if ($existe) {
            throw new SiguaException('Ya existe un CA-01 vigente para esta combinación sede/sistema/campaña. Renueve o cancele el anterior.');
        }

        $meses = Configuracion::getValor('ca01_vigencia_meses', 6);
        $fechaFirma = isset($data['fecha_firma']) ? Carbon::parse($data['fecha_firma']) : Carbon::today();
        $fechaVencimiento = $fechaFirma->copy()->addMonths($meses);

        return DB::transaction(function () use ($data, $cuentaIds, $creadorId, $fechaFirma, $fechaVencimiento) {
            $ca01 = FormatoCA01::create([
                'gerente_user_id' => $data['gerente_user_id'],
                'campaign_id' => $data['campaign_id'],
                'sede_id' => $data['sede_id'],
                'system_id' => $data['system_id'],
                'fecha_firma' => $fechaFirma,
                'fecha_vencimiento' => $fechaVencimiento,
                'archivo_firmado' => $data['archivo_firmado'] ?? null,
                'estado' => 'vigente',
                'observaciones' => $data['observaciones'] ?? null,
                'created_by' => $creadorId,
            ]);
            if (! empty($cuentaIds)) {
                $ca01->cuentas()->attach(array_unique($cuentaIds));
            }
            return $ca01->fresh('cuentas');
        });
    }

    /**
     * Renueva un CA-01: crea uno nuevo con las mismas cuentas y marca el anterior como vencido.
     *
     * @throws SiguaException
     */
    public function renovar(int $ca01Id, int $creadorId): FormatoCA01
    {
        $anterior = FormatoCA01::with('cuentas')->findOrFail($ca01Id);
        if ($anterior->estado !== 'vigente') {
            throw new SiguaException('Solo se puede renovar un CA-01 vigente.');
        }

        $meses = Configuracion::getValor('ca01_vigencia_meses', 6);
        $fechaFirma = Carbon::today();
        $fechaVencimiento = $fechaFirma->copy()->addMonths($meses);

        return DB::transaction(function () use ($anterior, $creadorId, $fechaFirma, $fechaVencimiento) {
            $anterior->update(['estado' => 'vencido']);
            $nuevo = FormatoCA01::create([
                'gerente_user_id' => $anterior->gerente_user_id,
                'campaign_id' => $anterior->campaign_id,
                'sede_id' => $anterior->sede_id,
                'system_id' => $anterior->system_id,
                'fecha_firma' => $fechaFirma,
                'fecha_vencimiento' => $fechaVencimiento,
                'estado' => 'vigente',
                'observaciones' => 'Renovación de CA-01 #' . $anterior->id,
                'created_by' => $creadorId,
            ]);
            $cuentaIds = $anterior->cuentas->pluck('id')->all();
            if (! empty($cuentaIds)) {
                $nuevo->cuentas()->attach($cuentaIds);
            }
            return $nuevo->fresh('cuentas');
        });
    }

    /**
     * Cancela un CA-01 (estado = cancelado).
     */
    public function cancelar(int $ca01Id): FormatoCA01
    {
        $ca01 = FormatoCA01::findOrFail($ca01Id);
        $ca01->update(['estado' => 'cancelado']);
        return $ca01->fresh();
    }

    /**
     * Verifica cobertura CA-01 por cuenta genérica activa: cubiertas, sin_cobertura, por_vencer.
     *
     * @return array{cubiertas: array, sin_cobertura: array, por_vencer: array}
     */
    public function verificarCobertura(?int $sedeId = null, ?int $sistemaId = null): array
    {
        $diasAlerta = Configuracion::getValor('ca01_dias_alerta_vencimiento', 15);
        $limitePorVencer = Carbon::today()->addDays($diasAlerta);

        $query = CuentaGenerica::where('estado', 'activa')->where('tipo', 'generica')->with('formatosCA01');
        if ($sedeId !== null) {
            $query->where('sede_id', $sedeId);
        }
        if ($sistemaId !== null) {
            $query->where('system_id', $sistemaId);
        }
        $cuentas = $query->get();

        $cubiertas = [];
        $sinCobertura = [];
        $porVencer = [];

        foreach ($cuentas as $c) {
            $vigentes = $c->formatosCA01->where('estado', 'vigente')->filter(function ($ca01) {
                return $ca01->fecha_vencimiento && $ca01->fecha_vencimiento->gte(Carbon::today());
            });
            if ($vigentes->isEmpty()) {
                $sinCobertura[] = ['cuenta_id' => $c->id, 'usuario_cuenta' => $c->usuario_cuenta, 'nombre_cuenta' => $c->nombre_cuenta];
                continue;
            }
            $ca01 = $vigentes->sortByDesc('fecha_vencimiento')->first();
            if ($ca01->fecha_vencimiento && $ca01->fecha_vencimiento->lte($limitePorVencer)) {
                $porVencer[] = [
                    'cuenta_id' => $c->id,
                    'usuario_cuenta' => $c->usuario_cuenta,
                    'nombre_cuenta' => $c->nombre_cuenta,
                    'ca01_id' => $ca01->id,
                    'fecha_vencimiento' => $ca01->fecha_vencimiento?->format('Y-m-d'),
                ];
            } else {
                $cubiertas[] = ['cuenta_id' => $c->id, 'usuario_cuenta' => $c->usuario_cuenta, 'nombre_cuenta' => $c->nombre_cuenta];
            }
        }

        return [
            'cubiertas' => $cubiertas,
            'sin_cobertura' => $sinCobertura,
            'por_vencer' => $porVencer,
        ];
    }
}
