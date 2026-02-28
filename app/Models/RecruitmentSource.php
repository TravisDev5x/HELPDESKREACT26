<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RecruitmentSource extends Model
{
    protected $fillable = ['name', 'is_active'];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function employeeProfiles(): HasMany
    {
        return $this->hasMany(EmployeeProfile::class, 'recruitment_source_id');
    }
}
