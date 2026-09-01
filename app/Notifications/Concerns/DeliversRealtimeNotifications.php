<?php

namespace App\Notifications\Concerns;

trait DeliversRealtimeNotifications
{
    protected function notificationChannels(object $notifiable): array
    {
        $preferences = $notifiable->notification_preferences ?? [];
        $realtimeEnabled = $preferences['realtime'] ?? true;

        if (config('broadcasting.default') !== 'null' && $realtimeEnabled) {
            return ['database', 'broadcast'];
        }

        return ['database'];
    }

    protected function notificationQueues(): array
    {
        $queues = ['database' => 'notifications'];

        if (config('broadcasting.default') !== 'null') {
            $queues['broadcast'] = 'broadcasts';
        }

        return $queues;
    }

    protected function criticalNotificationQueues(): array
    {
        $queues = ['database' => 'critical'];

        if (config('broadcasting.default') !== 'null') {
            $queues['broadcast'] = 'critical';
        }

        return $queues;
    }
}
