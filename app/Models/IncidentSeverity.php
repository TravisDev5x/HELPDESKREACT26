<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class IncidentSeverity extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'code', 'level', 'is_active'];

    protected $casts = [
        'level' => 'integer',
        'is_active' => 'boolean',
    ];

    public function incidents(): HasMany
    {
        return $this->hasMany(Incident::class);
    }
}
