<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TicketHistory extends Model
{
    use HasFactory;

    protected $fillable = [
        'ticket_id',
        'actor_id',
        'action',
        'from_area_id',
        'to_area_id',
        'ticket_state_id',
        'note',
        'from_assignee_id',
        'to_assignee_id',
        'created_at',
    ];

    public function ticket(): BelongsTo { return $this->belongsTo(Ticket::class); }
    public function actor(): BelongsTo { return $this->belongsTo(\App\Models\User::class, 'actor_id'); }
    public function fromAssignee(): BelongsTo { return $this->belongsTo(\App\Models\User::class, 'from_assignee_id'); }
    public function toAssignee(): BelongsTo { return $this->belongsTo(\App\Models\User::class, 'to_assignee_id'); }
    public function toArea(): BelongsTo { return $this->belongsTo(\App\Models\Area::class, 'to_area_id'); }
    public function fromArea(): BelongsTo { return $this->belongsTo(\App\Models\Area::class, 'from_area_id'); }
    public function state(): BelongsTo { return $this->belongsTo(\App\Models\TicketState::class, 'ticket_state_id'); }
}
