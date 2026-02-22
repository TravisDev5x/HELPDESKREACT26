<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('incident_types', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('code')->unique();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('incident_severities', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('code')->unique();
            $table->unsignedTinyInteger('level')->default(1);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('incident_statuses', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('code')->unique();
            $table->boolean('is_active')->default(true);
            $table->boolean('is_final')->default(false);
            $table->timestamps();
        });

        Schema::create('incidents', function (Blueprint $table) {
            $table->id();
            $table->string('subject');
            $table->text('description')->nullable();
            $table->timestamp('occurred_at')->nullable();
            $table->timestamp('enabled_at')->nullable();
            $table->foreignId('reporter_id')->constrained('users');
            $table->foreignId('involved_user_id')->nullable()->constrained('users');
            $table->foreignId('assigned_user_id')->nullable()->constrained('users');
            $table->foreignId('area_id')->constrained('areas');
            $table->foreignId('sede_id')->constrained('sites');
            $table->foreignId('incident_type_id')->constrained('incident_types');
            $table->foreignId('incident_severity_id')->constrained('incident_severities');
            $table->foreignId('incident_status_id')->constrained('incident_statuses');
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();
            $table->index(['incident_status_id', 'incident_severity_id', 'area_id', 'sede_id'], 'incidents_status_severity_area_site_idx');
            $table->index(['reporter_id', 'created_at']);
            $table->index('occurred_at');
        });

        Schema::create('incident_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('incident_id')->constrained('incidents')->cascadeOnDelete();
            $table->foreignId('uploaded_by')->constrained('users');
            $table->string('original_name');
            $table->string('file_name');
            $table->string('file_path');
            $table->string('mime_type')->nullable();
            $table->unsignedBigInteger('size')->default(0);
            $table->string('disk')->default('public');
            $table->timestamps();
        });

        Schema::create('incident_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('incident_id')->constrained('incidents')->cascadeOnDelete();
            $table->foreignId('actor_id')->constrained('users');
            $table->foreignId('from_status_id')->nullable()->constrained('incident_statuses');
            $table->foreignId('to_status_id')->nullable()->constrained('incident_statuses');
            $table->foreignId('from_assigned_user_id')->nullable()->constrained('users');
            $table->foreignId('to_assigned_user_id')->nullable()->constrained('users');
            $table->string('action')->nullable();
            $table->text('note')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('incident_histories');
        Schema::dropIfExists('incident_attachments');
        Schema::dropIfExists('incidents');
        Schema::dropIfExists('incident_statuses');
        Schema::dropIfExists('incident_severities');
        Schema::dropIfExists('incident_types');
    }
};
