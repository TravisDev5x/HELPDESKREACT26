<?php

namespace App\Console\Commands\Sigua;

use App\Models\Sigua\Configuracion;
use App\Services\Sigua\AlertaService;
use App\Services\Sigua\CA01Service;
use Illuminate\Console\Command;

class VerificarCA01 extends Command
{
    protected $signature = 'sigua:verificar-ca01
                            {--sede= : Filtrar por sede_id}
                            {--vencer : Solo marcar como vencidos, sin generar alertas}';

    protected $description = 'Verifica vigencia de formatos CA-01, vence los expirados y genera alertas';

    public function handle(AlertaService $alertaService, CA01Service $ca01Service): int
    {
        try {
            $sedeId = $this->option('sede') !== null ? (int) $this->option('sede') : null;
            $soloVencer = $this->option('vencer');

            $diasAlerta = Configuracion::getValor('ca01_dias_alerta_vencimiento', 15);

            if ($soloVencer) {
                $query = \App\Models\Sigua\FormatoCA01::vigentes()
                    ->whereNotNull('fecha_vencimiento')
                    ->where('fecha_vencimiento', '<', now()->toDateString());
                if ($sedeId !== null) {
                    $query->where('sede_id', $sedeId);
                }
                $vencidos = $query->get();
                foreach ($vencidos as $ca01) {
                    $ca01->update(['estado' => 'vencido']);
                }
                $count = $vencidos->count();
                $this->info("Vencidos: {$count} formatos CA-01 (solo marcados, sin alertas).");
                \Illuminate\Support\Facades\Log::info("SIGUA CA01: Marcados {$count} formatos como vencidos (solo --vencer).");

                return self::SUCCESS;
            }

            // PASO 1 — Vencer CA-01 expirados y crear alertas
            $vencidos = $alertaService->verificarCA01Vencidos($sedeId);
            $this->info("Vencidos: {$vencidos->count()} formatos CA-01.");

            // PASO 2 — Alertar próximos a vencer
            $porVencer = $alertaService->verificarCA01PorVencer($sedeId);
            $porVencer->each(fn ($ca01) => $this->invokeCrearAlertaCA01PorVencer($alertaService, $ca01));
            $this->info("Por vencer en {$diasAlerta} días: {$porVencer->count()} formatos.");

            // PASO 3 — Verificar cobertura (cuentas genéricas sin CA-01 vigente)
            $sedes = $sedeId !== null
                ? [['id' => $sedeId]]
                : \App\Models\Sede::where('is_active', true)->get()->map(fn ($s) => ['id' => $s->id])->all();

            $totalSinCobertura = 0;
            foreach ($sedes as $s) {
                $sid = is_array($s) ? $s['id'] : $s->id;
                $cobertura = $ca01Service->verificarCobertura($sid, null);
                $sinCobertura = $cobertura['sin_cobertura'] ?? [];
                foreach ($sinCobertura as $item) {
                    $cuenta = \App\Models\Sigua\CuentaGenerica::find($item['cuenta_id'] ?? 0);
                    if ($cuenta) {
                        $this->invokeCrearAlertaGenericaSinCA01($alertaService, $cuenta);
                        $totalSinCobertura++;
                    }
                }
            }
            $this->info("Cuentas genéricas sin CA-01: {$totalSinCobertura}.");

            $vencidos->load('sede');
            $porVencer->load('sede');
            $filas = [];
            foreach ($vencidos as $ca01) {
                $filas[] = ['CA-01 vencido', $ca01->id, $ca01->sede?->name ?? $ca01->sede_id, $ca01->fecha_vencimiento?->format('d/m/Y') ?? '—'];
            }
            foreach ($porVencer as $ca01) {
                $filas[] = ['CA-01 por vencer', $ca01->id, $ca01->sede?->name ?? $ca01->sede_id, $ca01->fecha_vencimiento?->format('d/m/Y') ?? '—'];
            }
            if (! empty($filas)) {
                $this->table(['Estado', 'CA-01 ID', 'Sede', 'Fecha vencimiento'], $filas);
            }

            \Illuminate\Support\Facades\Log::info('SIGUA CA01: Verificación completada.', [
                'vencidos' => $vencidos->count(),
                'por_vencer' => $porVencer->count(),
                'sin_cobertura' => $totalSinCobertura,
            ]);

            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error('Error: ' . $e->getMessage());
            if ($this->output->isVerbose()) {
                $this->error($e->getTraceAsString());
            }
            \Illuminate\Support\Facades\Log::error('SIGUA verificar-ca01: ' . $e->getMessage(), ['exception' => $e]);

            return self::FAILURE;
        }
    }

    private function invokeCrearAlertaCA01PorVencer(AlertaService $alertaService, $ca01): void
    {
        $ref = new \ReflectionMethod($alertaService, 'crearAlertaCA01PorVencer');
        $ref->setAccessible(true);
        $ref->invoke($alertaService, $ca01);
    }

    private function invokeCrearAlertaGenericaSinCA01(AlertaService $alertaService, $cuenta): void
    {
        $ref = new \ReflectionMethod($alertaService, 'crearAlertaGenericaSinCA01');
        $ref->setAccessible(true);
        $ref->invoke($alertaService, $cuenta);
    }
}
