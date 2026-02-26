<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sigua_imports', function (Blueprint $table) {
            $table->json('datos_importados')->nullable()->after('detalle_errores');
        });
    }

    public function down(): void
    {
        Schema::table('sigua_imports', function (Blueprint $table) {
            $table->dropColumn('datos_importados');
        });
    }
};
