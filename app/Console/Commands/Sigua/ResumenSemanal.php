<?php

namespace App\Console\Commands\Sigua;

use App\Models\Sigua\Alerta;
use App\Models\Sigua\Bitacora;
use App\Models\Sigua\Cruce;
use App\Models\Sigua\FormatoCA01;
use App\Models\Sigua\Importacion;
use App\Models\Sigua\Incidente;
use App\Models\User;
use App\Services\Sigua\BitacoraService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class ResumenSemanal extends Command
{
    protected $signature = 'sigua:resumen-semanal
                            {--email= : Enviar por email además de mostrar en consola}';

    protected $description = 'Genera y envía resumen semanal de estado de SIGUA';

    public function handle(BitacoraService $bitacoraService): int
    {
        try {
            $desde = Carbon::today()->subWeek();
            $hasta = Carbon::today();

            $ca01Vigentes = FormatoCA01::vigentes()->count();
            $ca01VencidosSemana = FormatoCA01::where('estado', 'vencido')
                ->whereBetween('updated_at', [$desde, $hasta])
                ->count();
            $ca01Renovados = FormatoCA01::where('estado', 'vigente')
                ->whereBetween('created_at', [$desde, $hasta])
                ->count();

            $cumplimiento = $bitacoraService->obtenerCumplimiento($desde->format('Y-m-d'), $hasta->format('Y-m-d'));
            $totalDias = $cumplimiento['total_dias'] ?? 0;
            $porSede = $cumplimiento['por_sede'] ?? [];

            $importacionesSemana = Importacion::whereBetween('created_at', [$desde, $hasta])->count();
            $ultimaImportacionPorSistema = [];
            $tipos = Importacion::distinct()->pluck('tipo');
            foreach ($tipos as $tipo) {
                $ultima = Importacion::where('tipo', $tipo)->orderByDesc('created_at')->first();
                if ($ultima) {
                    $ultimaImportacionPorSistema[] = $tipo . ': ' . $ultima->created_at->format('d/m/Y H:i');
                }
            }

            $ultimoCruce = Cruce::orderByDesc('id')->first();
            $anomaliasPendientes = $ultimoCruce
                ? $ultimoCruce->resultados()->where('requiere_accion', true)->count()
                : 0;

            $incidentesAbiertos = Incidente::whereIn('estado', ['abierto', 'investigando'])->count();
            $incidentesResueltosSemana = Incidente::whereIn('estado', ['resuelto', 'cerrado_sin_bitacora'])
                ->whereBetween('updated_at', [$desde, $hasta])
                ->count();

            $alertasGeneradasSemana = Alerta::whereBetween('created_at', [$desde, $hasta])->count();
            $alertasResueltasSemana = Alerta::where('resuelta', true)->whereBetween('resuelta_en', [$desde, $hasta])->count();
            $alertasCriticasPendientes = Alerta::noResueltas()->criticas()->count();

            $filas = [
                ['CA-01 vigentes', (string) $ca01Vigentes],
                ['CA-01 vencidos esta semana', (string) $ca01VencidosSemana],
                ['CA-01 renovados esta semana', (string) $ca01Renovados],
                ['Bitácora total días período', (string) $totalDias],
                ['Importaciones esta semana', (string) $importacionesSemana],
                ['Último cruce', $ultimoCruce ? "#{$ultimoCruce->id} " . $ultimoCruce->fecha_ejecucion?->format('d/m/Y H:i') : '—'],
                ['Anomalías pendientes', (string) $anomaliasPendientes],
                ['Incidentes abiertos', (string) $incidentesAbiertos],
                ['Incidentes resueltos esta semana', (string) $incidentesResueltosSemana],
                ['Alertas generadas esta semana', (string) $alertasGeneradasSemana],
                ['Alertas resueltas esta semana', (string) $alertasResueltasSemana],
                ['Alertas críticas pendientes', (string) $alertasCriticasPendientes],
            ];

            $this->table(['Métrica', 'Valor'], $filas);

            if (! empty($ultimaImportacionPorSistema)) {
                $this->info('Última importación por tipo: ' . implode(' | ', $ultimaImportacionPorSistema));
            }

            $resumenTexto = $this->construirResumenTexto($filas, $ultimaImportacionPorSistema ?? []);

            $emailOpt = $this->option('email');
            if ($emailOpt !== null) {
                $users = User::permission('sigua.dashboard')->get();
                foreach ($users as $user) {
                    try {
                        $user->notify(new \App\Notifications\Sigua\SiguaResumenSemanalNotification($resumenTexto, $filas));
                    } catch (\Throwable $e) {
                        $this->warn("No se pudo notificar a {$user->email}: " . $e->getMessage());
                    }
                }
                $this->info("Resumen enviado por notificación in-app a usuarios con sigua.dashboard.");
            }

            \Illuminate\Support\Facades\Log::info('SIGUA: Resumen semanal generado.', ['metricas' => $filas]);

            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error('Error: ' . $e->getMessage());
            if ($this->output->isVerbose()) {
                $this->error($e->getTraceAsString());
            }
            \Illuminate\Support\Facades\Log::error('SIGUA resumen-semanal: ' . $e->getMessage(), ['exception' => $e]);

            return self::FAILURE;
        }
    }

    private function construirResumenTexto(array $filas, array $ultimaImport): string
    {
        $lineas = ['Resumen semanal SIGUA - ' . Carbon::today()->format('d/m/Y')];
        foreach ($filas as $f) {
            $lineas[] = $f[0] . ': ' . $f[1];
        }
        if (! empty($ultimaImport)) {
            $lineas[] = 'Última importación por tipo: ' . implode(' | ', $ultimaImport);
        }

        return implode("\n", $lineas);
    }
}
