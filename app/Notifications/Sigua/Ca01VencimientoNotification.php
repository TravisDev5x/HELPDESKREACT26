<?php

namespace App\Notifications\Sigua;

use App\Models\Sigua\FormatoCA01;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class Ca01VencimientoNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public FormatoCA01 $ca01,
        public string $tipo = 'proximo_vencimiento' // proximo_vencimiento | ya_vencido
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $fecha = $this->ca01->fecha_vencimiento?->format('d/m/Y') ?? 'N/A';
        $sede = $this->ca01->sede?->name ?? "Sede #{$this->ca01->sede_id}";
        $sistema = $this->ca01->sistema?->name ?? "Sistema #{$this->ca01->system_id}";

        if ($this->tipo === 'ya_vencido') {
            $message = "El CA-01 #{$this->ca01->id} ({$sede} – {$sistema}) venció el {$fecha}. Debe renovarse.";
        } else {
            $message = "El CA-01 #{$this->ca01->id} ({$sede} – {$sistema}) vence el {$fecha}. Revise su renovación.";
        }

        return [
            'kind' => 'sigua_ca01_vencimiento',
            'ca01_id' => $this->ca01->id,
            'tipo' => $this->tipo,
            'message' => $message,
            'fecha_vencimiento' => $this->ca01->fecha_vencimiento?->toIso8601String(),
            'sede' => $sede,
            'sistema' => $sistema,
            'link' => '/sigua/ca01/' . $this->ca01->id,
        ];
    }
}
