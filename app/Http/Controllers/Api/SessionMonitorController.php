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
                'users.name',
                'users.email',
                'users.employee_number',
                'users.avatar_path',
                'users.availability',
                $table . '.ip_address',
                $table . '.user_agent',
                $table . '.last_activity'
            )
            ->orderByDesc($table . '.last_activity')
            ->get();

        $list = $sessions->map(function ($row) {
            return [
                'user_id' => $row->user_id,
                'name' => $row->name,
                'email' => $row->email ?? $row->employee_number,
                'employee_number' => $row->employee_number,
                'avatar_path' => $row->avatar_path ?? null,
                'availability' => $row->availability ?? 'disconnected',
                'last_activity' => (int) $row->last_activity,
                'last_activity_iso' => date('c', (int) $row->last_activity),
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
