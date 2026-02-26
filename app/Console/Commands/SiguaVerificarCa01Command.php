<?php

namespace App\Console\Commands;

use App\Models\Sigua\FormatoCA01;
use App\Models\User;
use App\Notifications\Sigua\Ca01VencimientoNotification;
use App\Services\Sigua\AlertaService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class SiguaVerificarCa01Command extends Command
{
    protected $signature = 'sigua:verificar-ca01';

    protected $description = 'Busca CA-01 que vencen en 15 días, notifica a gerente y admin, marca como vencidos los ya pasados';

    public function handle(AlertaService $alertaService): int
    {
        $this->info('Verificando CA-01…');

        $hoy = Carbon::today();

        // 1) Marcar como vencidos los vigentes cuya fecha_vencimiento ya pasó
        $idsRecienVencidos = FormatoCA01::query()
            ->where('estado', 'vigente')
            ->whereDate('fecha_vencimiento', '<', $hoy)
            ->pluck('id');

        if ($idsRecienVencidos->isNotEmpty()) {
            FormatoCA01::whereIn('id', $idsRecienVencidos)->update(['estado' => 'vencido']);
            $this->info('Marcados como vencidos: ' . $idsRecienVencidos->count() . ' CA-01.');
            $ca01Vencidos = FormatoCA01::query()
                ->whereIn('id', $idsRecienVencidos)
                ->with(['gerente:id,name', 'sede:id,name', 'sistema:id,name'])
                ->get();
            foreach ($ca01Vencidos as $ca01) {
                if ($ca01->gerente_user_id) {
                    $ca01->gerente?->notify(new Ca01VencimientoNotification($ca01, 'ya_vencido'));
                }
            }
            $admins = User::permission('sigua.ca01.view')->get();
            foreach ($ca01Vencidos as $ca01) {
                foreach ($admins as $admin) {
                    if ($admin->id !== $ca01->gerente_user_id) {
                        $admin->notify(new Ca01VencimientoNotification($ca01, 'ya_vencido'));
                    }
                }
            }
        }

        // 2) Próximos 15 días: notificar gerente y admin
        $proximos = $alertaService->verificarCA01Vencidos(15);
        $gerentesNotified = [];
        foreach ($proximos as $ca01) {
            if ($ca01->gerente_user_id && ! isset($gerentesNotified[$ca01->gerente_user_id])) {
                $ca01->gerente?->notify(new Ca01VencimientoNotification($ca01, 'proximo_vencimiento'));
                $gerentesNotified[$ca01->gerente_user_id] = true;
            }
        }
        $admins = User::permission('sigua.ca01.view')->get();
        foreach ($proximos as $ca01) {
            foreach ($admins as $admin) {
                $admin->notify(new Ca01VencimientoNotification($ca01, 'proximo_vencimiento'));
            }
        }

        $this->info('CA-01 por vencer (15 días): ' . $proximos->count() . '. Notificaciones enviadas.');

        return self::SUCCESS;
    }
}
