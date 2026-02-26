<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Notifications\Sigua\BitacoraFaltanteNotification;
use App\Services\Sigua\AlertaService;
use Illuminate\Console\Command;

class SiguaVerificarBitacoraCommand extends Command
{
    protected $signature = 'sigua:verificar-bitacora';

    protected $description = 'Busca sedes/campañas sin bitácora en los últimos 5 días hábiles y notifica al gerente responsable';

    public function handle(AlertaService $alertaService): int
    {
        $this->info('Verificando bitácoras faltantes (últimos 5 días hábiles como tolerancia)…');

        $faltantes = $alertaService->verificarBitacorasFaltantes(5);

        if ($faltantes->isEmpty()) {
            $this->info('No hay contextos sin bitácora reciente.');
            return self::SUCCESS;
        }

        $users = User::permission(['sigua.bitacora.view', 'sigua.dashboard'])->get()->unique('id');

        foreach ($faltantes as $ctx) {
            foreach ($users as $user) {
                $user->notify(new BitacoraFaltanteNotification($ctx));
            }
        }

        $this->info('Contextos sin bitácora reciente: ' . $faltantes->count() . '. Notificaciones enviadas a ' . $users->count() . ' usuario(s).');

        return self::SUCCESS;
    }
}
