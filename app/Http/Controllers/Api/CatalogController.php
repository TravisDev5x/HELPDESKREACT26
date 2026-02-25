<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class CatalogController extends Controller
{
    /** TTL caché catálogos (segundos). */
    private const CATALOG_CACHE_TTL = 600; // 10 minutos

    public function index()
    {
        $user = Auth::user();
        $cacheKey = 'catalogs.v1.' . ($user ? $user->id : 'guest');

        $data = Cache::remember($cacheKey, self::CATALOG_CACHE_TTL, function () use ($user) {
            $guards = ['web', 'sanctum'];
            $areaUsers = collect();
            if ($user) {
                $canViewAllUsers = $user->can('tickets.manage_all') || $user->can('incidents.manage_all');
                $canViewAreaUsers = $user->can('tickets.view_area') || $user->can('incidents.view_area');
                if ($canViewAllUsers) {
                    $areaUsers = DB::table('users')
                        ->whereNull('deleted_at')
                        ->orderBy('name')
                        ->get(['id', 'name', 'area_id', 'position_id']);
                } elseif ($canViewAreaUsers && $user->area_id) {
                    $areaUsers = DB::table('users')
                        ->whereNull('deleted_at')
                        ->where('area_id', $user->area_id)
                        ->orderBy('name')
                        ->get(['id', 'name', 'area_id', 'position_id']);
                }
            }

            return [
                'campaigns' => DB::table('campaigns')->where('is_active', true)->orderBy('name')->get(['id', 'name']),
                'areas'     => DB::table('areas')->where('is_active', true)->orderBy('name')->get(['id', 'name']),
                'positions' => DB::table('positions')->where('is_active', true)->orderBy('name')->get(['id', 'name']),
                'sedes'     => DB::table('sites')->where('is_active', true)->orderBy('name')->get(['id', 'name', 'type']),
                'ubicaciones' => DB::table('locations')
                    ->join('sites', 'sites.id', '=', 'locations.sede_id')
                    ->where('locations.is_active', true)
                    ->orderBy('sites.name')
                    ->orderBy('locations.name')
                    ->get([
                        'locations.id',
                        'locations.name',
                        'locations.code',
                        'locations.sede_id',
                        'sites.name as sede_name',
                    ]),
                'priorities' => DB::table('priorities')->orderBy('level')->orderBy('name')->get(['id','name','level','is_active']),
                'ticket_states' => DB::table('ticket_states')->orderBy('name')->get(['id','name','code','is_active','is_final']),
                'ticket_types' => DB::table('ticket_types')->orderBy('name')->get(['id','name','code','is_active']),
                'incident_types' => DB::table('incident_types')->orderBy('name')->get(['id','name','code','is_active']),
                'incident_severities' => DB::table('incident_severities')->orderBy('level')->orderBy('name')->get(['id','name','code','level','is_active']),
                'incident_statuses' => DB::table('incident_statuses')->orderBy('name')->get(['id','name','code','is_active','is_final']),
                'roles'     => DB::table('roles')
                    ->whereNull('deleted_at')
                    ->whereIn('guard_name', $guards)
                    ->orderBy('name')
                    ->get(['id', 'name']),
                'permissions' => DB::table('permissions')
                    ->whereIn('guard_name', $guards)
                    ->orderBy('name')
                    ->get(['id', 'name']),
                'area_users' => $areaUsers,
            ];
        });

        return response()->json($data);
    }
}
