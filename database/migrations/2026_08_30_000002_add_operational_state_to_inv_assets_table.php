<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inv_assets', function (Blueprint $table) {
            $table->string('operational_state', 32)->default('AVAILABLE')->after('status_id');
            $table->index(['client_id', 'operational_state']);
        });

        DB::table('inv_assets')->select(['id', 'current_user_id'])->orderBy('id')->chunkById(500, function ($assets) {
            $ids = $assets->pluck('id')->all();
            $methods = DB::table('inv_disposals')
                ->whereIn('asset_id', $ids)
                ->orderByDesc('id')
                ->get(['asset_id', 'method'])
                ->unique('asset_id')
                ->pluck('method', 'asset_id');
            $maintenanceIds = DB::table('inv_maintenances')
                ->whereIn('asset_id', $ids)
                ->whereNull('end_date')
                ->pluck('asset_id')
                ->flip();

            $updates = $assets->map(function ($asset) use ($methods, $maintenanceIds) {
                $method = $methods->get($asset->id);
                $state = match ($method) {
                    'PERDIDA' => 'LOST',
                    'ROBO' => 'STOLEN',
                    default => $method ? 'RETIRED' : ($maintenanceIds->has($asset->id) ? 'MAINTENANCE' : ($asset->current_user_id ? 'ASSIGNED' : 'AVAILABLE')),
                };

                return ['id' => $asset->id, 'operational_state' => $state];
            })->all();

            // No usamos upsert: en PostgreSQL una migración pendiente sobre
            // datos históricos puede intentar insertar filas parciales si el
            // conflicto no se reconoce como se esperaba, violando NOT NULL.
            // Estas filas ya existen (proceden del select anterior), así que
            // update explícito es seguro, idempotente y no crea registros.
            foreach ($updates as $update) {
                DB::table('inv_assets')->where('id', $update['id'])
                    ->update(['operational_state' => $update['operational_state']]);
            }
        });
    }

    public function down(): void
    {
        Schema::table('inv_assets', function (Blueprint $table) {
            $table->dropIndex(['client_id', 'operational_state']);
            $table->dropColumn('operational_state');
        });
    }
};
