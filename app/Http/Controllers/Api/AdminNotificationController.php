<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AdminNotificationController extends Controller
{
    public function index()
    {
        $items = DB::table('admin_notifications')
            ->orderByDesc('created_at')
            ->limit(50)
            ->get()
            ->map(function ($row) {
                $row->payload = $row->payload ? json_decode($row->payload, true) : [];
                // Enriquecer con datos de usuario sugerido si existe
                $uid = $row->payload['user_id'] ?? $row->payload['userId'] ?? null;
                if ($uid) {
                    $user = User::find($uid);
                    if ($user) {
                        $row->payload['user_name'] = $user->name;
                        $row->payload['user_email'] = $user->email;
                        $row->payload['user_employee_number'] = $user->employee_number;
                    }
                }
                return $row;
            });

        return response()->json(['notifications' => $items]);
    }

    public function markRead($id)
    {
        DB::table('admin_notifications')->where('id', $id)->update(['read_at' => now()]);
        return response()->json(['message' => 'Notificación marcada como leída']);
    }

    public function resolvePasswordReset(Request $request, $id)
    {
        $data = $request->validate([
            'user_id' => 'required|exists:users,id',
            'password' => [
                'required', 'min:12',
                'regex:/[a-z]/', 'regex:/[A-Z]/', 'regex:/[0-9]/', 'regex:/[^A-Za-z0-9]/',
            ],
            'comment' => 'nullable|string|max:500',
        ]);

        $user = User::findOrFail($data['user_id']);
        $user->password = Hash::make($data['password']);
        $user->force_password_change = true;
        $user->save();

        DB::table('admin_notifications')->where('id', $id)->update([
            'read_at' => now(),
            'updated_at' => now(),
            'payload' => DB::raw("JSON_SET(COALESCE(payload, JSON_OBJECT()), '$.comment', " . DB::getPdo()->quote($data['comment'] ?? '') . ")")
        ]);

        return response()->json(['message' => 'Contraseña temporal asignada y marcada para cambio obligatorio']);
    }
}
