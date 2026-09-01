<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['notifications' => [], 'unread_count' => 0], 401);
        }

        $limit = min(max((int) $request->input('limit', 20), 5), 100);
        $filter = $request->string('filter', 'all')->toString();

        $query = $user->notifications()->orderByDesc('created_at');

        if ($filter === 'unread') {
            $query->whereNull('read_at');
        }

        if (in_array($filter, ['action_required', 'critical', 'security'], true)) {
            $kinds = match ($filter) {
                'action_required' => [
                    'ticket_assigned', 'ticket_reassigned', 'ticket_escalated',
                    'ticket_requester_alert', 'ticket_requester_comment',
                    'pending_ticket_request', 'client_self_service_request',
                    'tenant_boundary_violation', 'oauth_auto_link',
                ],
                'critical' => ['ticket_escalated', 'tenant_boundary_violation'],
                'security' => ['tenant_boundary_violation', 'oauth_auto_link'],
            };

            $query->where(function ($notificationQuery) use ($kinds) {
                foreach ($kinds as $kind) {
                    $notificationQuery->orWhere('data', 'like', '%"kind":"'.$kind.'"%');
                }
            });
        }

        $notifications = $query
            ->limit($limit)
            ->get()
            ->map(fn ($notification) => $this->present($notification))
            ->values();

        $unreadCount = $user->unreadNotifications()->count();

        return response()->json([
            'notifications' => $notifications,
            'unread_count' => $unreadCount,
            'filter' => $filter,
        ]);
    }

    public function readAll()
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json([], 401);
        }
        $user->unreadNotifications()->update(['read_at' => now()]);
        return response()->json(['ok' => true, 'unread_count' => 0]);
    }

    public function markRead(string $id)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json([], 401);
        }
        $notification = $user->notifications()->where('id', $id)->first();
        if (!$notification) {
            return response()->json(['message' => 'Notificación no encontrada'], 404);
        }
        $notification->markAsRead();

        return response()->json([
            'ok' => true,
            'notification' => $this->present($notification->fresh()),
        ]);
    }

    /**
     * Contrato estable para campana, centro de notificaciones y broadcasts.
     * La metadata se deriva aquí para que las clases legacy sigan compatibles.
     */
    private function present($notification): array
    {
        $data = $notification->data ?? [];
        $kind = $data['kind'] ?? 'general';
        $ticketId = $data['ticket_id'] ?? null;

        $severity = match ($kind) {
            'ticket_escalated', 'tenant_boundary_violation' => 'critical',
            'ticket_assigned', 'ticket_reassigned', 'ticket_requester_alert',
            'ticket_requester_comment', 'pending_ticket_request',
            'client_self_service_request', 'oauth_auto_link' => 'action_required',
            default => 'information',
        };

        $href = $data['href'] ?? ($ticketId ? "/resolbeb/tickets/{$ticketId}" : match ($kind) {
            'oauth_auto_link' => '/profile',
            'tenant_boundary_violation' => '/audit-command',
            'client_self_service_request' => '/clients',
            default => null,
        });

        return [
            'id' => $notification->id,
            'type' => $notification->type,
            'data' => $data,
            'read_at' => $notification->read_at,
            'created_at' => $notification->created_at,
            'meta' => [
                'kind' => $kind,
                'severity' => $severity,
                'href' => $href,
                'action_label' => $href ? ($ticketId ? 'Ver ticket' : 'Abrir') : null,
            ],
        ];
    }
}
