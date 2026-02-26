<?php

namespace App\Notifications\Sigua;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class BajasPendientesNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public int $cantidad
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $message = $this->cantidad === 0
            ? 'Cruce RH vs AD: no hay usuarios en AD sin coincidencia en RH.'
            : "Cruce RH vs AD: {$this->cantidad} usuario(s) en AD que no están en RH (bajas pendientes). Revise el dashboard SIGUA.";

        return [
            'kind' => 'sigua_bajas_pendientes',
            'message' => $message,
            'cantidad' => $this->cantidad,
            'link' => '/sigua/cruces',
        ];
    }
}
