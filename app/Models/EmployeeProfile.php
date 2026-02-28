<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmployeeProfile extends Model
{
    protected $fillable = [
        'user_id',
        'manager_id',
        'hire_date',
        'employee_status_id',
        'hire_type_id',
        'recruitment_source_id',
        'curp',
        'nss',
        'address',
        'has_csf',
        'ine_file_path',
        'csf_file_path',
        'address_proof_path',
        'studies_proof_path',
        'termination_reason_id',
        'termination_date',
    ];

    protected function casts(): array
    {
        return [
            'hire_date' => 'date',
            'termination_date' => 'date',
            'has_csf' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Jefe inmediato (usuario que es manager de este empleado).
     *
     * @return BelongsTo<\App\Models\User>
     */
    public function manager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'manager_id');
    }

    public function terminationReason(): BelongsTo
    {
        return $this->belongsTo(TerminationReason::class);
    }

    public function employeeStatus(): BelongsTo
    {
        return $this->belongsTo(EmployeeStatus::class);
    }

    public function hireType(): BelongsTo
    {
        return $this->belongsTo(HireType::class);
    }

    public function recruitmentSource(): BelongsTo
    {
        return $this->belongsTo(RecruitmentSource::class);
    }
}
