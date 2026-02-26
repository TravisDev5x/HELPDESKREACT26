<?php

namespace App\Notifications\Sigua;

use App\Models\Sigua\Alerta;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class SiguaAlertaNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public Alerta $alerta
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'kind' => 'sigua_alerta',
            'alerta_id' => $this->alerta->id,
            'tipo' => $this->alerta->tipo,
            'severidad' => $this->alerta->severidad,
            'message' => $this->alerta->titulo,
            'descripcion' => $this->alerta->descripcion,
            'sede_id' => $this->alerta->sede_id,
            'sistema_id' => $this->alerta->sistema_id,
            'link' => '/sigua/alertas',
        ];
    }
}
