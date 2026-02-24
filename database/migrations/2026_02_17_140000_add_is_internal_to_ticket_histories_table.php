<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ticket_histories', function (Blueprint $table) {
            $table->boolean('is_internal')->default(true)->after('note');
        });
    }

    public function down(): void
    {
        Schema::table('ticket_histories', function (Blueprint $table) {
            $table->dropColumn('is_internal');
        });
    }
};
