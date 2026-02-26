<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * SIGUA v2: ALTER sigua_cross_matches — nombre, sistemas_incluidos, tipo_cruce 'individual'.
     */
    public function up(): void
    {
        Schema::table('sigua_cross_matches', function (Blueprint $table) {
            $table->string('nombre')->nullable()->after('tipo_cruce');
            $table->json('sistemas_incluidos')->nullable()->after('nombre');
        });

        $this->agregarTipoIndividual();
    }

    private function agregarTipoIndividual(): void
    {
        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE sigua_cross_matches MODIFY COLUMN tipo_cruce ENUM(
                'rh_vs_ad','rh_vs_neotel','ad_vs_neotel','completo','individual'
            ) NOT NULL");
        }
    }

    public function down(): void
    {
        Schema::table('sigua_cross_matches', function (Blueprint $table) {
            $table->dropColumn(['nombre', 'sistemas_incluidos']);
        });

        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE sigua_cross_matches MODIFY COLUMN tipo_cruce ENUM(
                'rh_vs_ad','rh_vs_neotel','ad_vs_neotel','completo'
            ) NOT NULL");
        }
    }
};
