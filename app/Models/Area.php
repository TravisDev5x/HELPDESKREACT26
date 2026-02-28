<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphToMany;

class Area extends Model
{
    /** @use HasFactory<\Database\Factories\AreaFactory> */
    use HasFactory;

    protected $fillable = [
        'name',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    /**
     * Un Área tiene muchos Usuarios.
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /**
     * Asignaciones de horario a esta área (tabla polimórfica schedule_assignments).
     */
    public function scheduleAssignments(): MorphToMany
    {
        return $this->morphToMany(Schedule::class, 'schedule_assignment', 'schedule_assignments')
            ->withPivot('valid_from', 'valid_until')
            ->withTimestamps();
    }
}