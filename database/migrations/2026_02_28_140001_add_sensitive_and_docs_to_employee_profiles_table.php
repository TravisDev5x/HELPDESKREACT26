<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Datos sensibles y expediente digital exclusivos de employee_profiles (RH).
     * No exponer a IT/Usuarios globales.
     */
    public function up(): void
    {
        Schema::table('employee_profiles', function (Blueprint $table) {
            $table->foreignId('recruitment_source_id')->nullable()->after('hire_type_id')->constrained('recruitment_sources')->nullOnDelete();
            $table->string('curp', 18)->nullable()->unique()->after('recruitment_source_id');
            $table->string('nss', 11)->nullable()->unique()->after('curp');
            $table->text('address')->nullable()->after('nss');
            $table->boolean('has_csf')->default(false)->after('address');
            $table->string('ine_file_path')->nullable()->after('has_csf');
            $table->string('csf_file_path')->nullable()->after('ine_file_path');
            $table->string('address_proof_path')->nullable()->after('csf_file_path');
            $table->string('studies_proof_path')->nullable()->after('address_proof_path');
        });
    }

    public function down(): void
    {
        Schema::table('employee_profiles', function (Blueprint $table) {
            $table->dropForeign(['recruitment_source_id']);
            $table->dropColumn([
                'recruitment_source_id',
                'curp',
                'nss',
                'address',
                'has_csf',
                'ine_file_path',
                'csf_file_path',
                'address_proof_path',
                'studies_proof_path',
            ]);
        });
    }
};
