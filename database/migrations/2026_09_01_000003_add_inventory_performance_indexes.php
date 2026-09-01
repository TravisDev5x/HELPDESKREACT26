<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Índices para filtros tenant-scoped y lecturas históricas de Inventario. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inv_assets', function (Blueprint $table) {
            $table->index(['client_id', 'operational_state'], 'inv_assets_client_state_idx');
            $table->index(['client_id', 'current_user_id'], 'inv_assets_client_user_idx');
            $table->index(['client_id', 'location_id'], 'inv_assets_client_location_idx');
        });
        Schema::table('inv_movements', function (Blueprint $table) {
            $table->index(['asset_id', 'date'], 'inv_movements_asset_date_idx');
            $table->index(['client_id', 'type', 'date'], 'inv_movements_client_type_date_idx');
        });
        Schema::table('inv_maintenances', function (Blueprint $table) {
            $table->index(['client_id', 'end_date', 'start_date'], 'inv_maintenances_client_open_date_idx');
        });
        Schema::table('inv_warranties', function (Blueprint $table) {
            $table->index(['client_id', 'ends_at'], 'inv_warranties_client_end_idx');
        });
    }

    public function down(): void
    {
        Schema::table('inv_warranties', fn (Blueprint $table) => $table->dropIndex('inv_warranties_client_end_idx'));
        Schema::table('inv_maintenances', fn (Blueprint $table) => $table->dropIndex('inv_maintenances_client_open_date_idx'));
        Schema::table('inv_movements', function (Blueprint $table) {
            $table->dropIndex('inv_movements_asset_date_idx');
            $table->dropIndex('inv_movements_client_type_date_idx');
        });
        Schema::table('inv_assets', function (Blueprint $table) {
            $table->dropIndex('inv_assets_client_state_idx');
            $table->dropIndex('inv_assets_client_user_idx');
            $table->dropIndex('inv_assets_client_location_idx');
        });
    }
};
