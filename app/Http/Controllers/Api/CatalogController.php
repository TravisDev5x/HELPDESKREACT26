<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CatalogController extends Controller
{
    public function index()
    {
        $guard = config('auth.defaults.guard', 'web');
        $user = Auth::user();
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

        // Return all catalogs in one request
        return response()->json([
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
                ->where('guard_name', $guard)
                ->orderBy('name')
                ->get(['id', 'name']),
            'permissions' => DB::table('permissions')
                ->where('guard_name', $guard)
                ->orderBy('name')
                ->get(['id', 'name']),
            'area_users' => $areaUsers,
        ]);
    }
}
