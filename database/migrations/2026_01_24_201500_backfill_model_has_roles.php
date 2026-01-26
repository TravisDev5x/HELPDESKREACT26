<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $tableNames = config('permission.table_names');

        if (!Schema::hasTable('role_user') || !Schema::hasTable($tableNames['model_has_roles'])) {
            return;
        }

        $rows = DB::table('role_user')->get(['role_id', 'user_id']);
        if ($rows->isEmpty()) {
            return;
        }

        $modelType = App\Models\User::class;
        $payload = [];

        foreach ($rows as $row) {
            $payload[] = [
                'role_id' => $row->role_id,
                'model_type' => $modelType,
                'model_id' => $row->user_id,
            ];
        }

        DB::table($tableNames['model_has_roles'])->insertOrIgnore($payload);
    }

    public function down(): void
    {
        // Intentionally left empty to avoid removing assignments created after migration.
    }
};
