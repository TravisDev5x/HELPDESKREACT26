<?php

namespace App\Console\Commands\Sigua;

use App\Models\Sigua\Alerta;
use App\Models\Sigua\Bitacora;
use App\Models\Sigua\Configuracion;
use App\Models\Sigua\CuentaGenerica;
use App\Models\Sigua\FormatoCA01;
use App\Models\Sigua\Sistema;
use App\Notifications\Sigua\BitacoraFaltanteNotification;
use App\Services\Sigua\AlertaService;
use App\Services\Sigua\BitacoraService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class VerificarBitacora extends Command
{
    protected $signature = 'sigua:verificar-bitacora
                            {--dias= : Días de tolerancia (default: de configuración)}
                            {--sede= : Filtrar por sede_id}
                            {--notificar : Enviar notificaciones además de generar alertas}';

    protected $description = 'Detecta sedes y campañas sin bitácora en los últimos N días hábiles';

    public function handle(BitacoraService $bitacoraService, AlertaService $alertaService): int
    {
        try {
            $diasOpt = $this->option('dias');
            $tolerancia = $diasOpt !== null && $diasOpt !== ''
                ? (int) $diasOpt
                : Configuracion::getValor('bitacora_dias_tolerancia', 5);
            $sedeId = $this->option('sede') !== null ? (int) $this->option('sede') : null;
            $notificar = $this->option('notificar');

            $sedes = \App\Models\Sede::when($sedeId !== null, fn ($q) => $q->where('id', $sedeId))
                ->where(function ($q) {
                    $q->where('is_active', true)->orWhereNull('is_active');
                })
                ->get();

            $filas = [];
            $alertasCreadas = 0;
            $criticas = 0;

            foreach ($sedes as $sede) {
                $sistemasEnSede = CuentaGenerica::where('sede_id', $sede->id)
                    ->where('estado', 'activa')
                    ->distinct()
                    ->pluck('system_id')
                    ->all();

                foreach ($sistemasEnSede as $systemId) {
                    $sistema = Sistema::find($systemId);
                    if (! $sistema || ! $sistema->activo) {
                        continue;
                    }

                    $ultimaBitacora = Bitacora::where('sede_id', $sede->id)
                        ->where('system_id', $systemId)
                        ->where('tipo_registro', '!=', Bitacora::TIPO_SIN_USO)
                        ->orderByDesc('fecha')
                        ->first();

                    $ultimaFecha = $ultimaBitacora?->fecha;
                    $diasSinBitacora = $this->diasHabilesSinRegistro($ultimaFecha);

                    if ($diasSinBitacora < $tolerancia) {
                        continue;
                    }

                    $severidad = $diasSinBitacora >= 10 ? 'critical' : 'warning';
                    if ($severidad === 'critical') {
                        $criticas++;
                    }

                    $ca01 = FormatoCA01::vigentes()
                        ->where('sede_id', $sede->id)
                        ->where('system_id', $systemId)
                        ->first();
                    $gerenteUserId = $ca01?->gerente_user_id;

                    $this->crearAlertaBitacoraFaltanteSedeSistema($alertaService, $sede, $sistema, $diasSinBitacora, $ultimaFecha, $gerenteUserId);
                    $alertasCreadas++;

                    $filas[] = [
                        $sede->name,
                        $sistema->name,
                        '—',
                        $ultimaFecha ? Carbon::parse($ultimaFecha)->format('d/m/Y') : 'Nunca',
                        $diasSinBitacora,
                        $gerenteUserId ? (\App\Models\User::find($gerenteUserId)?->name ?? "User #{$gerenteUserId}") : 'Admins',
                        $severidad,
                    ];

                    if ($notificar) {
                        $mensaje = sprintf(
                            'SIGUA: La bitácora de %s / %s no se ha actualizado en %d días hábiles. Último registro: %s.',
                            $sede->name,
                            $sistema->name,
                            $diasSinBitacora,
                            $ultimaFecha ? Carbon::parse($ultimaFecha)->format('d/m/Y') : 'N/A'
                        );
                        $ctx = (object) [
                            'sede_id' => $sede->id,
                            'sede_nombre' => $sede->name,
                            'sistema_id' => $sistema->id,
                            'sistema_nombre' => $sistema->name,
                            'campaign_id' => null,
                            'campaign_nombre' => null,
                            'dias_sin_registro' => $diasSinBitacora,
                            'ultima_fecha' => $ultimaFecha ? Carbon::parse($ultimaFecha)->format('Y-m-d') : null,
                            'mensaje' => $mensaje,
                        ];
                        if ($gerenteUserId) {
                            $user = \App\Models\User::find($gerenteUserId);
                            if ($user) {
                                $user->notify(new BitacoraFaltanteNotification($ctx));
                            }
                        } else {
                            $users = \App\Models\User::permission('sigua.dashboard')->get();
                            foreach ($users as $user) {
                                $user->notify(new BitacoraFaltanteNotification($ctx));
                            }
                        }
                    }
                }
            }

            if (! empty($filas)) {
                $this->table(
                    ['Sede', 'Sistema', 'Campaña', 'Último registro', 'Días sin bitácora', 'Responsable', 'Severidad'],
                    $filas
                );
            }

            $this->info("Encontradas {$alertasCreadas} sedes sin bitácora al día ({$criticas} críticas).");

            $desde = Carbon::today()->subDays(30)->format('Y-m-d');
            $hasta = Carbon::today()->format('Y-m-d');
            $cumplimiento = $bitacoraService->obtenerCumplimiento($desde, $hasta, $sedeId);
            $this->info('Cumplimiento últimos 30 días: ' . json_encode($cumplimiento, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

            \Illuminate\Support\Facades\Log::info("SIGUA Bitácora: {$alertasCreadas} alertas generadas ({$criticas} críticas).");

            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error('Error: ' . $e->getMessage());
            if ($this->output->isVerbose()) {
                $this->error($e->getTraceAsString());
            }
            \Illuminate\Support\Facades\Log::error('SIGUA verificar-bitacora: ' . $e->getMessage(), ['exception' => $e]);

            return self::FAILURE;
        }
    }

    private function diasHabilesSinRegistro($ultimaFecha): int
    {
        if (! $ultimaFecha) {
            return 999;
        }
        $fecha = Carbon::parse($ultimaFecha)->startOfDay();
        $hoy = Carbon::today();
        if ($fecha->gte($hoy)) {
            return 0;
        }
        $dias = 0;
        $cursor = $fecha->copy()->addDay();
        while ($cursor->lte($hoy)) {
            $w = (int) $cursor->format('N');
            if ($w >= 1 && $w <= 5) {
                $dias++;
            }
            $cursor->addDay();
        }

        return $dias;
    }

    private function crearAlertaBitacoraFaltanteSedeSistema(AlertaService $alertaService, $sede, $sistema, int $diasSinBitacora, $ultimaFecha, ?int $dirigidaA): void
    {
        $desc = $ultimaFecha
            ? "Sede {$sede->name} / Sistema {$sistema->name} sin bitácora en {$diasSinBitacora} días hábiles. Último registro: " . Carbon::parse($ultimaFecha)->format('d/m/Y')
            : "Sede {$sede->name} / Sistema {$sistema->name} sin registros de bitácora.";
        $severidad = $diasSinBitacora >= 10 ? 'critical' : 'warning';

        $existe = Alerta::noResueltas()
            ->where('tipo', 'bitacora_faltante')
            ->where('entidad_tipo', 'sede')
            ->where('entidad_id', $sede->id)
            ->where('sistema_id', $sistema->id)
            ->exists();

        if (! $existe) {
            Alerta::create([
                'tipo' => 'bitacora_faltante',
                'titulo' => 'Bitácora faltante',
                'descripcion' => $desc,
                'severidad' => $severidad,
                'entidad_tipo' => 'sede',
                'entidad_id' => $sede->id,
                'sede_id' => $sede->id,
                'sistema_id' => $sistema->id,
                'dirigida_a' => $dirigidaA,
            ]);
        }
    }
}
