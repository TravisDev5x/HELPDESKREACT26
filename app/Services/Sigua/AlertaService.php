<?php

namespace App\Services\Sigua;

use App\Models\Sigua\Bitacora;
use App\Models\Sigua\FormatoCA01;
use App\Models\Sigua\Importacion;
use App\Models\Sigua\Sistema;
use Carbon\Carbon;
use Illuminate\Support\Collection;

/**
 * Servicio de alertas SIGUA: CA-01 vencidos, bitácoras faltantes, bajas pendientes.
 * Pensado para uso en commands (schedule) o dashboard.
 */
class AlertaService
{
    /**
     * CA-01 que vencen en los próximos N días (por defecto 15).
     *
     * @return Collection<int, FormatoCA01>
     */
    public function verificarCA01Vencidos(int $dias = 15): Collection
    {
        $limite = Carbon::today()->addDays($dias);

        return FormatoCA01::query()
            ->where('estado', 'vigente')
            ->whereDate('fecha_vencimiento', '<=', $limite)
            ->whereDate('fecha_vencimiento', '>=', Carbon::today())
            ->with(['gerente:id,name,email', 'sede:id,name', 'sistema:id,name', 'campaign:id,name'])
            ->orderBy('fecha_vencimiento')
            ->get();
    }

    /**
     * Sedes/campañas sin registro de bitácora en los últimos N días (tolerancia por defecto 5).
     * Retorna combinaciones (sede_id, campaign_id, sistema_id) que no tienen bitácora reciente.
     *
     * @return Collection<int, object{sede_id: int, sede_nombre: string, campaign_id: int|null, campaign_nombre: string|null, sistema_id: int, sistema_nombre: string, ultima_fecha: string|null}>
     */
    public function verificarBitacorasFaltantes(int $diasTolerancia = 5): Collection
    {
        $desde = Carbon::today()->subDays($diasTolerancia);
        $conBitacora = Bitacora::query()
            ->whereDate('fecha', '>=', $desde)
            ->selectRaw('sede_id, campaign_id, system_id, max(fecha) as ultima_fecha')
            ->groupBy('sede_id', 'campaign_id', 'system_id')
            ->get()
            ->keyBy(fn ($r) => "{$r->sede_id}_{$r->campaign_id}_{$r->system_id}");

        $sedes = \App\Models\Sede::select('id', 'name')->get()->keyBy('id');
        $campaigns = \App\Models\Campaign::select('id', 'name')->get()->keyBy('id');
        $sistemas = Sistema::select('id', 'name')->get()->keyBy('id');

        $cuentasPorContexto = \App\Models\Sigua\CuentaGenerica::query()
            ->where('estado', 'activa')
            ->select('sede_id', 'campaign_id', 'system_id')
            ->distinct()
            ->get();

        $faltantes = new Collection;
        foreach ($cuentasPorContexto as $c) {
            $key = "{$c->sede_id}_{$c->campaign_id}_{$c->system_id}";
            $registro = $conBitacora->get($key);
            $ultima = $registro?->ultima_fecha;
            if ($ultima === null || Carbon::parse($ultima)->lt(Carbon::today()->subDays($diasTolerancia - 1))) {
                $faltantes->push((object) [
                    'sede_id' => $c->sede_id,
                    'sede_nombre' => $sedes->get($c->sede_id)?->name ?? 'N/A',
                    'campaign_id' => $c->campaign_id,
                    'campaign_nombre' => $c->campaign_id ? ($campaigns->get($c->campaign_id)?->name ?? null) : null,
                    'sistema_id' => $c->system_id,
                    'sistema_nombre' => $sistemas->get($c->system_id)?->name ?? 'N/A',
                    'ultima_fecha' => $ultima,
                ]);
            }
        }

        return $faltantes;
    }

    /**
     * Usuarios en AD que no están en RH (bajas pendientes) según últimas importaciones.
     * Requiere que las importaciones tengan datos_importados con la estructura usada en CruceService.
     *
     * @return Collection<int, array>
     */
    public function verificarBajasPendientes(): Collection
    {
        $ultimaRh = Importacion::where('tipo', 'rh_activos')->orderByDesc('id')->first();
        $ultimaAd = Importacion::where('tipo', 'ad_usuarios')->orderByDesc('id')->first();
        if (! $ultimaRh || ! $ultimaAd) {
            return new Collection;
        }

        $crucer = new CruceService;
        try {
            $resultado = $crucer->cruceRhVsAd($ultimaRh->id, $ultimaAd->id);
            $enAdNoRh = $resultado['en_ad_no_rh'] ?? [];
            return collect($enAdNoRh);
        } catch (\Throwable $e) {
            return new Collection;
        }
    }
}
