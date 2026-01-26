<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('theme')->default('light')->after('status');
            $table->string('ui_density')->default('normal')->after('theme');
            $table->string('sidebar_state')->default('expanded')->after('ui_density');
            $table->boolean('sidebar_hover_preview')->default(false)->after('sidebar_state');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['theme', 'ui_density', 'sidebar_state', 'sidebar_hover_preview']);
        });
    }
};
