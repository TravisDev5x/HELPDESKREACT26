<?php

namespace App\Console\Commands\Sigua;

use App\Models\Sigua\Alerta;
use App\Models\Sigua\FormatoCA01;
use App\Models\User;
use App\Notifications\Sigua\SiguaAlertaNotification;
use App\Services\Sigua\AlertaService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class GenerarAlertas extends Command
{
    protected $signature = 'sigua:generar-alertas
                            {--tipo= : Tipo específico (ca01, bitacora, bajas, genericas, sistemas). Si no se pasa, ejecuta todas}
                            {--dry-run : Solo mostrar qué alertas se generarían sin crearlas}';

    protected $description = 'Ejecuta todas las verificaciones de SIGUA y genera alertas automáticas';

    public function handle(AlertaService $alertaService): int
    {
        try {
            $dryRun = $this->option('dry-run');
            $tipo = $this->option('tipo');

            if ($dryRun) {
                $this->warn('Modo dry-run: no se crearán alertas ni notificaciones.');
            }

            $tiposValidos = ['ca01', 'bitacora', 'bajas', 'genericas', 'sistemas'];
            if ($tipo !== null && $tipo !== '' && ! in_array($tipo, $tiposValidos, true)) {
                $this->error("Tipo inválido: {$tipo}. Use: " . implode(', ', $tiposValidos));
                return self::FAILURE;
            }

            if ($dryRun) {
                $this->mostrarDryRun($alertaService, $tipo);

                return self::SUCCESS;
            }

            $since = Carbon::now();

            if ($tipo !== null && $tipo !== '') {
                $alertaService->ejecutarTipo($tipo);
            } else {
                $alertaService->generarAlertas();
            }

            $alertas = Alerta::where('created_at', '>=', $since)->with(['sede', 'dirigidaA'])->get();

            foreach ($alertas as $alerta) {
                if ($alerta->dirigida_a) {
                    $user = User::find($alerta->dirigida_a);
                    if ($user) {
                        $user->notify(new SiguaAlertaNotification($alerta));
                    }
                } else {
                    $users = User::permission('sigua.dashboard')->get();
                    foreach ($users as $user) {
                        $user->notify(new SiguaAlertaNotification($alerta));
                    }
                }
            }

            $filas = $alertas->map(fn (Alerta $a) => [
                $a->tipo,
                $a->severidad,
                $a->titulo,
                $a->dirigidaA?->name ?? ($a->dirigida_a ? "User #{$a->dirigida_a}" : 'Todos (sigua.dashboard)'),
                $a->sede?->name ?? ($a->sede_id ?? '—'),
            ])->all();

            if (! empty($filas)) {
                $this->table(['Tipo', 'Severidad', 'Título', 'Dirigida a', 'Sede'], $filas);
            }

            $criticas = $alertas->where('severidad', 'critical')->count();
            $warnings = $alertas->where('severidad', 'warning')->count();
            $info = $alertas->where('severidad', 'info')->count();
            $total = $alertas->count();

            $this->info("Se generaron {$total} alertas ({$criticas} críticas, {$warnings} warnings, {$info} info).");

            \Illuminate\Support\Facades\Log::info("SIGUA: Generadas {$total} alertas automáticas");

            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error('Error: ' . $e->getMessage());
            if ($this->output->isVerbose()) {
                $this->error($e->getTraceAsString());
            }
            \Illuminate\Support\Facades\Log::error('SIGUA generar-alertas: ' . $e->getMessage(), ['exception' => $e]);

            return self::FAILURE;
        }
    }

    private function mostrarDryRun(AlertaService $alertaService, ?string $tipo): void
    {
        $tipos = $tipo ? [$tipo] : ['ca01', 'bitacora', 'bajas', 'genericas', 'sistemas'];

        foreach ($tipos as $t) {
            switch ($t) {
                case 'ca01':
                    $porVencer = $alertaService->verificarCA01PorVencer();
                    $vencidosCount = FormatoCA01::vigentes()
                        ->whereNotNull('fecha_vencimiento')
                        ->where('fecha_vencimiento', '<', Carbon::today())
                        ->count();
                    $this->info("CA01: por vencer {$porVencer->count()}, vencidos (a marcar) {$vencidosCount}");
                    break;
                case 'bitacora':
                    $this->info('Bitácoras faltantes: ' . $alertaService->verificarBitacorasFaltantes()->count());
                    break;
                case 'bajas':
                    $this->info('Bajas pendientes: ' . $alertaService->verificarBajasPendientes()->count());
                    break;
                case 'genericas':
                    $this->info('Genéricas sin CA-01: ' . $alertaService->verificarGenericasSinCA01()->count());
                    break;
                case 'sistemas':
                    $this->info('Sistemas sin importación reciente: ' . $alertaService->verificarSistemasSinImportacion()->count());
                    break;
            }
        }
        $this->info('Dry-run finalizado. Ejecute sin --dry-run para crear alertas.');
    }
}
