<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class IncidentStatus extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'code', 'is_active', 'is_final'];

    protected $casts = [
        'is_active' => 'boolean',
        'is_final' => 'boolean',
    ];

    public function incidents(): HasMany
    {
        return $this->hasMany(Incident::class);
    }
}
