<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

/**
 * Corrige permisos SIGUA para que el rol Admin pueda acceder a las páginas de SIGUA.
 *
 * - Asegura que todos los permisos sigua.* existan con guard_name = 'web' (igual que tickets.*, etc.).
 * - Crea los permisos que usa el frontend: sigua.cruces.view, sigua.cruces.ejecutar.
 * - Asigna todos los permisos sigua.* (guard web) al rol admin (name='admin' o id=1).
 * - No modifica permisos con guard sanctum (se mantienen para API si se usan).
 */
return new class extends Migration
{
    /** Lista completa de permisos SIGUA usados en rutas y frontend (guard web). */
    private const SIGUA_PERMISSIONS = [
        'sigua.dashboard',
        'sigua.cuentas.view',
        'sigua.cuentas.manage',
        'sigua.ca01.view',
        'sigua.ca01.manage',
        'sigua.ca01.firmar',
        'sigua.bitacora.view',
        'sigua.bitacora.registrar',
        'sigua.bitacora.sede',
        'sigua.incidentes.view',
        'sigua.incidentes.manage',
        'sigua.importar',
        'sigua.cruces',
        'sigua.cruces.view',       // Usado en SiguaCruces.tsx y SiguaDashboard.tsx
        'sigua.cruces.ejecutar',   // Usado en SiguaCruces.tsx
        'sigua.reportes',
    ];

    public function up(): void
    {
        $guardWeb = 'web';

        // 1) Crear permisos sigua.* que falten con guard_name = 'web'
        foreach (self::SIGUA_PERMISSIONS as $name) {
            DB::table('permissions')->insertOrIgnore([
                'name' => $name,
                'guard_name' => $guardWeb,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // 2) Opcional: corregir guard de permisos sigua.* si existían con otro guard (api)
        //    No los borramos; solo nos aseguramos de que existan con 'web'. Si había duplicado con 'api',
        //    el usuario web usa los de guard 'web'.

        // 3) Buscar el rol admin: name='admin' y guard_name='web', o el rol con id=1
        $adminRole = DB::table('roles')
            ->where('guard_name', $guardWeb)
            ->where('name', 'admin')
            ->first();

        if (! $adminRole) {
            $adminRole = DB::table('roles')->where('id', 1)->first();
        }
        if (! $adminRole || $adminRole->guard_name !== $guardWeb) {
            return;
        }

        // 4) IDs de todos los permisos sigua.* con guard web
        $siguaPermIds = DB::table('permissions')
            ->where('guard_name', $guardWeb)
            ->where('name', 'like', 'sigua.%')
            ->pluck('id')
            ->all();

        if (empty($siguaPermIds)) {
            return;
        }

        // 5) Asignar al rol admin los que no tenga
        $existing = DB::table('role_has_permissions')
            ->where('role_id', $adminRole->id)
            ->pluck('permission_id')
            ->all();

        $toAdd = array_diff($siguaPermIds, $existing);
        foreach ($toAdd as $permissionId) {
            DB::table('role_has_permissions')->insertOrIgnore([
                'permission_id' => $permissionId,
                'role_id' => $adminRole->id,
            ]);
        }

        // 6) Limpiar caché de permisos para que el usuario admin vea los cambios de inmediato
        Artisan::call('permission:cache-reset');
    }

    public function down(): void
    {
        // No eliminamos permisos ni asignaciones; solo se revierte ejecutando el seeder de nuevo si se desea.
    }
};
