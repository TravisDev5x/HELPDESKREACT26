<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'ui_density')) {
                $table->string('ui_density')->default('normal')->after('theme');
            }
            if (!Schema::hasColumn('users', 'sidebar_state')) {
                $after = Schema::hasColumn('users', 'ui_density') ? 'ui_density' : 'theme';
                $table->string('sidebar_state')->default('expanded')->after($after);
            }
            if (!Schema::hasColumn('users', 'sidebar_hover_preview')) {
                $table->boolean('sidebar_hover_preview')->default(false)->after('sidebar_state');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'sidebar_hover_preview')) {
                $table->dropColumn('sidebar_hover_preview');
            }
            if (Schema::hasColumn('users', 'sidebar_state')) {
                $table->dropColumn('sidebar_state');
            }
            if (Schema::hasColumn('users', 'ui_density')) {
                $table->dropColumn('ui_density');
            }
        });
    }
};
