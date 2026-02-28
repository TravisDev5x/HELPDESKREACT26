<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employee_profiles', function (Blueprint $table) {
            $table->foreignId('manager_id')->nullable()->after('user_id')->constrained('users')->nullOnDelete();
            $table->foreignId('employee_status_id')->nullable()->after('hire_date')->constrained('employee_statuses')->nullOnDelete();
            $table->foreignId('hire_type_id')->nullable()->after('employee_status_id')->constrained('hire_types')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('employee_profiles', function (Blueprint $table) {
            $table->dropForeign(['manager_id']);
            $table->dropForeign(['employee_status_id']);
            $table->dropForeign(['hire_type_id']);
        });
    }
};
