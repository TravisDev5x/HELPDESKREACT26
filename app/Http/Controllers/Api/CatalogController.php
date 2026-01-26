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
            if ($user->can('tickets.manage_all')) {
                $areaUsers = DB::table('users')
                    ->whereNull('deleted_at')
                    ->orderBy('name')
                    ->get(['id', 'name', 'area_id', 'position_id']);
            } elseif ($user->area_id) {
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
            'sedes'     => DB::table('sedes')->where('is_active', true)->orderBy('name')->get(['id', 'name', 'type']),
            'ubicaciones' => DB::table('ubicaciones')
                ->join('sedes', 'sedes.id', '=', 'ubicaciones.sede_id')
                ->where('ubicaciones.is_active', true)
                ->orderBy('sedes.name')
                ->orderBy('ubicaciones.name')
                ->get([
                    'ubicaciones.id',
                    'ubicaciones.name',
                    'ubicaciones.code',
                    'ubicaciones.sede_id',
                    'sedes.name as sede_name',
                ]),
            'priorities' => DB::table('priorities')->orderBy('level')->orderBy('name')->get(['id','name','level','is_active']),
            'ticket_states' => DB::table('ticket_states')->orderBy('name')->get(['id','name','code','is_active','is_final']),
            'ticket_types' => DB::table('ticket_types')->orderBy('name')->get(['id','name','code','is_active']),
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
