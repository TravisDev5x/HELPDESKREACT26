<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        if (!$user) return response()->json([], 401);

        $notifications = $user->notifications()
            ->orderByDesc('created_at')
            ->limit(20)
            ->get()
            ->map(function ($n) {
                return [
                    'id' => $n->id,
                    'data' => $n->data,
                    'read_at' => $n->read_at,
                    'created_at' => $n->created_at,
                ];
            });

        return response()->json($notifications);
    }

    public function readAll()
    {
        $user = Auth::user();
        if (!$user) return response()->json([], 401);
        $user->unreadNotifications->markAsRead();
        return response()->json(['ok' => true]);
    }
}
