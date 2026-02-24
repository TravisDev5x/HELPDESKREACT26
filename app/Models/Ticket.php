<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Ticket extends Model
{
    use HasFactory;

    /** Límite máximo de tiempo para SLA (horas). */
    public const SLA_LIMIT_HOURS = 72;

    protected $fillable = [
        'subject',
        'description',
        'area_origin_id',
        'area_current_id',
        'sede_id',
        'ubicacion_id',
        'requester_id',
        'requester_position_id',
        'assigned_user_id',
        'assigned_at',
        'ticket_type_id',
        'priority_id',
        'ticket_state_id',
        'resolved_at',
        'due_at',
    ];

    protected $casts = [
        'resolved_at' => 'datetime',
        'due_at' => 'datetime',
        'assigned_at' => 'datetime',
    ];

    protected $appends = [
        'is_burned',
        'is_overdue',
        'sla_due_at',
        'sla_status_text',
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

    public function attachments(): HasMany
    {
        return $this->hasMany(TicketAttachment::class);
    }

    public function alerts(): HasMany
    {
        return $this->hasMany(TicketAlert::class);
    }

    /**
     * Fecha límite para SLA: due_at si existe, si no created_at + 72h.
     */
    public function getSlaDueAtAttribute(): ?Carbon
    {
        if ($this->due_at) {
            return $this->due_at;
        }
        if ($this->created_at) {
            return $this->created_at->copy()->addHours(self::SLA_LIMIT_HOURS);
        }
        return null;
    }

    /**
     * True si el ticket no está resuelto y ya pasó la fecha límite SLA.
     */
    public function getIsOverdueAttribute(): bool
    {
        $isFinal = (bool) ($this->state?->is_final ?? false);
        if ($isFinal) {
            return false;
        }
        $due = $this->sla_due_at;
        return $due ? now()->isAfter($due) : false;
    }

    /**
     * Texto corto para UI: "Vence en X h" / "Vencido hace X h" / "Cerrado".
     */
    public function getSlaStatusTextAttribute(): ?string
    {
        $isFinal = (bool) ($this->state?->is_final ?? false);
        if ($isFinal) {
            return null;
        }
        $due = $this->sla_due_at;
        if (!$due) {
            return null;
        }
        $now = now();
        if ($now->isAfter($due)) {
            $hours = (int) $now->diffInHours($due);
            return $hours <= 0 ? 'Vencido' : "Vencido hace {$hours} h";
        }
        $hours = (int) $now->diffInHours($due, false);
        return $hours <= 0 ? 'Vence pronto' : "Vence en {$hours} h";
    }

    /**
     * Deriva si el ticket está "quemado": pasó el límite SLA y no está cerrado.
     * Usa due_at si existe, si no 72h desde creación.
     */
    public function getIsBurnedAttribute(): bool
    {
        return $this->is_overdue;
    }
}
