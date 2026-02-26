<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Notifications\Sigua\BajasPendientesNotification;
use App\Services\Sigua\AlertaService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;

class SiguaVerificarBajasCommand extends Command
{
    protected $signature = 'sigua:verificar-bajas';

    protected $description = 'Compara último cruce: usuarios AD activos que no están en RH; genera alerta en dashboard y notifica';

    public function handle(AlertaService $alertaService): int
    {
        $this->info('Verificando bajas pendientes (AD sin match en RH)…');

        $bajas = $alertaService->verificarBajasPendientes();
        $cantidad = $bajas->count();

        Cache::put('sigua_alertas_bajas', [
            'cantidad' => $cantidad,
            'updated_at' => now()->toIso8601String(),
            'message' => $cantidad > 0
                ? "{$cantidad} usuario(s) en AD que no están en RH (bajas pendientes)."
                : 'Sin bajas pendientes en el último cruce.',
        ], now()->addDays(7));

        $users = User::permission(['sigua.cruces.view', 'sigua.dashboard'])->get()->unique('id');

        foreach ($users as $user) {
            $user->notify(new BajasPendientesNotification($cantidad));
        }

        $this->info("Bajas pendientes: {$cantidad}. Alerta guardada en cache y notificaciones enviadas.");

        return self::SUCCESS;
    }
}
