<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Ticket extends Model
{
    use HasFactory;

    protected $fillable = [
        'subject',
        'description',
        'area_origin_id',
        'area_current_id',
        'sede_id',
        'ubicacion_id',
        'requester_id',
        'requester_position_id',
        'ticket_type_id',
        'priority_id',
        'ticket_state_id',
    ];

    protected $appends = [
        'is_burned',
    ];

    public function areaOrigin(): BelongsTo { return $this->belongsTo(\App\Models\Area::class, 'area_origin_id'); }
    public function areaCurrent(): BelongsTo { return $this->belongsTo(\App\Models\Area::class, 'area_current_id'); }
    public function sede(): BelongsTo { return $this->belongsTo(\App\Models\Sede::class, 'sede_id'); }
    public function ubicacion(): BelongsTo { return $this->belongsTo(\App\Models\Ubicacion::class, 'ubicacion_id'); }
    public function requester(): BelongsTo { return $this->belongsTo(\App\Models\User::class, 'requester_id'); }
    public function requesterPosition(): BelongsTo { return $this->belongsTo(\App\Models\Position::class, 'requester_position_id'); }
    public function assignedUser(): BelongsTo { return $this->belongsTo(\App\Models\User::class, 'assigned_user_id'); }
    public function ticketType(): BelongsTo { return $this->belongsTo(\App\Models\TicketType::class, 'ticket_type_id'); }
    public function priority(): BelongsTo { return $this->belongsTo(\App\Models\Priority::class, 'priority_id'); }
    public function state(): BelongsTo { return $this->belongsTo(\App\Models\TicketState::class, 'ticket_state_id'); }

    public function histories(): HasMany
    {
        return $this->hasMany(TicketHistory::class);
    }

    /**
     * Deriva si el ticket está "quemado": >72h desde creación y no está Cerrado.
     */
    public function getIsBurnedAttribute(): bool
    {
        if (!$this->created_at) return false;

        $ageHours = now()->diffInHours($this->created_at);
        if ($ageHours <= 72) return false;

        $stateName = strtolower($this->state->name ?? '');
        return !str_contains($stateName, 'cerrad');
    }
}
