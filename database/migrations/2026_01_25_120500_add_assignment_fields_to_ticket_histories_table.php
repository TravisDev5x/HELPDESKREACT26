<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ticket_histories', function (Blueprint $table) {
            $table->string('action')->nullable();
            $table->foreignId('from_assignee_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('to_assignee_id')->nullable()->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('ticket_histories', function (Blueprint $table) {
            $table->dropConstrainedForeignId('from_assignee_id');
            $table->dropConstrainedForeignId('to_assignee_id');
            $table->dropColumn('action');
        });
    }
};
