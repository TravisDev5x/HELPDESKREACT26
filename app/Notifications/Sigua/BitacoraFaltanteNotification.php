<?php

namespace App\Notifications\Sigua;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class BitacoraFaltanteNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * @param  object{ sede_id: int, sede_nombre: string, campaign_id: int|null, campaign_nombre: string|null, sistema_id: int, sistema_nombre: string, ultima_fecha: string|null }  $contexto
     */
    public function __construct(
        public object $contexto
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $sede = $this->contexto->sede_nombre ?? 'N/A';
        $sistema = $this->contexto->sistema_nombre ?? 'N/A';
        $campaign = $this->contexto->campaign_nombre ?? 'N/A';
        $message = "Sin bitácora reciente para: {$sede} – {$sistema}" . ($campaign !== 'N/A' ? " (Campaña: {$campaign})" : '');

        return [
            'kind' => 'sigua_bitacora_faltante',
            'message' => $message,
            'sede_id' => $this->contexto->sede_id,
            'sistema_id' => $this->contexto->sistema_id,
            'campaign_id' => $this->contexto->campaign_id,
            'ultima_fecha' => $this->contexto->ultima_fecha,
            'link' => '/sigua/bitacora',
        ];
    }
}
