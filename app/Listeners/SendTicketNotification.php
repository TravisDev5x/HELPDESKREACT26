<?php

namespace App\Listeners;

use App\Events\TicketCreated;
use App\Events\TicketUpdated;
use App\Models\User;
use App\Notifications\TicketActivityNotification;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

class SendTicketNotification
{
    public function handle($event): void
    {
        $ticket = $event->ticket;
        $action = $event instanceof TicketCreated ? 'created' : 'updated';

        $recipients = $this->recipients($ticket->area_current_id);

        foreach ($recipients as $user) {
            try {
                $user->notify(new TicketActivityNotification($ticket, $action));
            } catch (\Throwable $e) {
                Log::warning('ticket notification failed', [
                    'user_id' => $user->id,
                    'ticket_id' => $ticket->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }

    private function recipients(?int $areaId): Collection
    {
        // Usuarios del área destino
        $areaUsers = $areaId ? User::where('area_id', $areaId)->get() : collect();

        // Usuarios con manage_all
        $globalUsers = User::permission('tickets.manage_all')->get();

        return $areaUsers->merge($globalUsers)->unique('id');
    }
}
