<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SessionMonitorController extends Controller
{
    /**
     * Lista sesiones activas (usuarios con sesión abierta).
     * Solo expone: usuario, última actividad, IP, navegador. No expone session id ni payload.
     * Requiere permiso users.manage.
     */
    public function index(Request $request)
    {
        if (config('session.driver') !== 'database') {
            return response()->json([
                'sessions' => [],
                'total' => 0,
                'message' => 'El monitor de sesiones requiere SESSION_DRIVER=database.',
            ]);
        }

        $table = config('session.table', 'sessions');
        $lifetime = (int) config('session.lifetime', 120);
        $minActivity = now()->subMinutes($lifetime)->timestamp;

        $sessions = DB::table($table)
            ->whereNotNull('user_id')
            ->where('last_activity', '>=', $minActivity)
            ->join('users', $table . '.user_id', '=', 'users.id')
            ->select(
                'users.id as user_id',
                'users.first_name',
                'users.paternal_last_name',
                'users.maternal_last_name',
                'users.name as name_legacy',
                'users.email',
                'users.employee_number',
                'users.avatar_path',
                'users.availability',
                'users.last_login_at',
                $table . '.ip_address',
                $table . '.user_agent',
                $table . '.last_activity'
            )
            ->orderByDesc($table . '.last_activity')
            ->get();

        $list = $sessions->map(function ($row) {
            $lastLoginAt = $row->last_login_at ? \Illuminate\Support\Carbon::parse($row->last_login_at) : null;
            $fullName = trim(($row->first_name ?? '') . ' ' . ($row->paternal_last_name ?? '') . ' ' . ($row->maternal_last_name ?? ''));
            if ($fullName === '') {
                $fullName = (string) ($row->name_legacy ?? '');
            }
            return [
                'user_id' => $row->user_id,
                'name' => $fullName,
                'email' => $row->email ?? $row->employee_number,
                'employee_number' => $row->employee_number,
                'avatar_path' => $row->avatar_path ?? null,
                'availability' => $row->availability ?? 'disconnected',
                'last_activity' => (int) $row->last_activity,
                'last_activity_iso' => date('c', (int) $row->last_activity),
                'last_login_at' => $lastLoginAt ? $lastLoginAt->getTimestamp() : null,
                'last_login_iso' => $lastLoginAt ? $lastLoginAt->toIso8601String() : null,
                'ip_address' => $row->ip_address ?? '',
                'browser' => $this->parseBrowser($row->user_agent ?? ''),
            ];
        });

        return response()->json([
            'sessions' => $list,
            'total' => $list->count(),
        ]);
    }

    /**
     * Fuerza el cierre de sesión de un usuario eliminando sus sesiones de la tabla de sesiones.
     * No expone session IDs y requiere permiso users.manage (mismo grupo de rutas).
     */
    public function logoutUser(Request $request)
    {
        if (config('session.driver') !== 'database') {
            return response()->json([
                'message' => 'El cierre remoto de sesión requiere SESSION_DRIVER=database.',
            ], 400);
        }

        $validated = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        $table = config('session.table', 'sessions');

        DB::table($table)
            ->where('user_id', $validated['user_id'])
            ->delete();

        return response()->json([
            'message' => 'Sesiones del usuario cerradas',
        ]);
    }

    /**
     * Extrae nombre corto del navegador desde user_agent (sin exponer UA completo).
     */
    private function parseBrowser(?string $ua): string
    {
        if ($ua === null || $ua === '') {
            return '—';
        }
        $ua = trim($ua);
        if (stripos($ua, 'Edg/') !== false) {
            return 'Edge';
        }
        if (stripos($ua, 'Chrome') !== false && stripos($ua, 'Chromium') !== false) {
            return 'Chrome';
        }
        if (stripos($ua, 'Chrome') !== false) {
            return 'Chrome';
        }
        if (stripos($ua, 'Firefox') !== false || stripos($ua, 'FxiOS') !== false) {
            return 'Firefox';
        }
        if (stripos($ua, 'Safari') !== false && stripos($ua, 'Chrome') === false) {
            return 'Safari';
        }
        if (stripos($ua, 'Opera') !== false || stripos($ua, 'OPR/') !== false) {
            return 'Opera';
        }
        if (stripos($ua, 'MSIE') !== false || stripos($ua, 'Trident/') !== false) {
            return 'Internet Explorer';
        }
        return 'Otro';
    }
}
