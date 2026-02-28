<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphToMany;

class Campaign extends Model
{
    /** @use HasFactory<\Database\Factories\CampaignFactory> */
    use HasFactory;

    protected $fillable = [
        'name',
        'is_active',
    ];

    /**
     * Convierte columnas automáticamente al tipo de dato correcto.
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    /**
     * Una Campaña tiene muchos Usuarios.
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /**
     * Asignaciones de horario a esta campaña (tabla polimórfica schedule_assignments).
     */
    public function scheduleAssignments(): MorphToMany
    {
        return $this->morphToMany(Schedule::class, 'schedule_assignment', 'schedule_assignments')
            ->withPivot('valid_from', 'valid_until')
            ->withTimestamps();
    }
}