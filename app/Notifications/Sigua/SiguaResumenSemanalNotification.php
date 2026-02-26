<?php

namespace App\Notifications\Sigua;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class SiguaResumenSemanalNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public string $resumenTexto,
        public array $metricas = []
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'kind' => 'sigua_resumen_semanal',
            'message' => 'Resumen semanal SIGUA generado.',
            'resumen' => $this->resumenTexto,
            'metricas' => $this->metricas,
            'link' => '/sigua',
        ];
    }
}
