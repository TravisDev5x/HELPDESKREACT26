<?php

namespace App\Console\Commands\Sigua;

use App\Models\Sigua\Cruce;
use App\Models\User;
use App\Services\Sigua\CruceService;
use App\Services\Sigua\ReporteService;
use Illuminate\Console\Command;

class EjecutarCruce extends Command
{
    protected $signature = 'sigua:cruce
                            {--tipo=completo : completo o individual}
                            {--sistema_id= : ID del sistema (obligatorio si tipo=individual)}
                            {--comparar : Comparar con cruce anterior}
                            {--exportar= : Ruta para exportar resultado a Excel}';

    protected $description = 'Ejecuta cruce de empleados RH contra sistemas registrados en SIGUA';

    public function handle(CruceService $cruceService, ReporteService $reporteService): int
    {
        try {
            $tipo = $this->option('tipo') ?? 'completo';
            $sistemaIdOpt = $this->option('sistema_id');
            $comparar = $this->option('comparar');
            $exportarRuta = $this->option('exportar');

            if ($tipo === 'individual' && ($sistemaIdOpt === null || $sistemaIdOpt === '')) {
                $this->error('Para tipo=individual debe indicar --sistema_id=ID');
                return self::FAILURE;
            }

            $userId = User::permission('sigua.dashboard')->first()?->id ?? User::first()?->id ?? 1;

            $empleados = \App\Models\Sigua\EmpleadoRh::activos()->count()
                + \App\Models\Sigua\EmpleadoRh::whereIn('estatus', ['Baja', 'Baja probable'])->count();
            $sistemas = \App\Models\Sigua\Sistema::activos()->count();
            $this->info("Analizando {$empleados} empleados contra {$sistemas} sistemas...");

            if ($tipo === 'completo') {
                $cruce = $cruceService->ejecutarCruceCompleto(null, $userId);
            } else {
                $cruce = $cruceService->ejecutarCruceIndividual((int) $sistemaIdOpt, $userId);
            }

            $resumen = $cruceService->obtenerResumenCruce($cruce->id);
            $total = $resumen['total'] ?? 0;
            $categorias = $resumen['categorias'] ?? [];
            $porSistema = $resumen['por_sistema'] ?? [];
            $porSede = $resumen['por_sede'] ?? [];

            $acciones = $cruce->resultados()->where('requiere_accion', true)->count();

            $tablaCategorias = [];
            foreach ($categorias as $cat => $cant) {
                $pct = $total > 0 ? round($cant / $total * 100, 1) : 0;
                $tablaCategorias[] = [$cat, $cant, $pct . '%', $cat !== 'ok_completo' ? $cant : '—'];
            }
            if (! empty($tablaCategorias)) {
                $this->table(['Categoría', 'Cantidad', '%', 'Requieren acción'], $tablaCategorias);
            }

            $tablaSistema = [];
            foreach ($porSistema as $slug => $cant) {
                $tablaSistema[] = [$slug, '—', '—', '—', $cant];
            }
            if (! empty($tablaSistema)) {
                $this->table(['Sistema', 'Con cuenta', 'Sin cuenta', 'Genéricas', 'Anomalías'], $tablaSistema);
            }

            $tablaSede = [];
            foreach ($porSede as $sede => $cant) {
                $tablaSede[] = [$sede, '—', $cant, '—'];
            }
            if (! empty($tablaSede)) {
                $this->table(['Sede', 'OK', 'Pendientes', 'Críticos'], $tablaSede);
            }

            if ($comparar) {
                $comp = $cruceService->compararConCruceAnterior($cruce->id);
                $nuevas = count($comp['anomalias_nuevas']);
                $resueltas = count($comp['resueltas']);
                $sinCambio = count($comp['sin_cambio']);
                $this->info("vs cruce anterior: {$nuevas} nuevas anomalías, {$resueltas} resueltas, {$sinCambio} sin cambio.");
            }

            if ($exportarRuta !== null && $exportarRuta !== '') {
                $fullPath = $reporteService->exportarResultadoCruce($cruce->id);
                if (realpath($fullPath) !== realpath($exportarRuta)) {
                    $dir = dirname($exportarRuta);
                    if (! is_dir($dir)) {
                        mkdir($dir, 0755, true);
                    }
                    copy($fullPath, $exportarRuta);
                    $this->info("Exportado a: {$exportarRuta}");
                } else {
                    $this->info("Exportado a: {$fullPath}");
                }
            }

            $this->info("Cruce #{$cruce->id} completado. {$cruce->total_analizados} empleados analizados. {$acciones} requieren acción.");
            if ($acciones > 0) {
                $this->comment("Ejecute 'php artisan sigua:generar-alertas' para notificar a los responsables.");
            }

            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error('Error: ' . $e->getMessage());
            if ($this->output->isVerbose()) {
                $this->error($e->getTraceAsString());
            }
            \Illuminate\Support\Facades\Log::error('SIGUA cruce: ' . $e->getMessage(), ['exception' => $e]);

            return self::FAILURE;
        }
    }
}
