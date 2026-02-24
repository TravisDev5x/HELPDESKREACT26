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

        $limit = min(max((int) $request->input('limit', 20), 5), 50);
        $notifications = $user->notifications()
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get()
            ->map(function ($n) {
                return [
                    'id' => $n->id,
                    'data' => $n->data,
                    'read_at' => $n->read_at,
                    'created_at' => $n->created_at,
                ];
            });

        $unreadCount = $user->unreadNotifications()->count();

        return response()->json([
            'notifications' => $notifications,
            'unread_count' => $unreadCount,
        ]);
    }

    public function readAll()
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json([], 401);
        }
        $user->unreadNotifications->markAsRead();
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
        return response()->json(['ok' => true]);
    }
}
