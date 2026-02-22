<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IncidentHistory extends Model
{
    use HasFactory;

    protected $fillable = [
        'incident_id',
        'actor_id',
        'action',
        'from_status_id',
        'to_status_id',
        'from_assigned_user_id',
        'to_assigned_user_id',
        'note',
        'created_at',
    ];

    public function incident(): BelongsTo { return $this->belongsTo(Incident::class); }
    public function actor(): BelongsTo { return $this->belongsTo(User::class, 'actor_id'); }
    public function fromStatus(): BelongsTo { return $this->belongsTo(IncidentStatus::class, 'from_status_id'); }
    public function toStatus(): BelongsTo { return $this->belongsTo(IncidentStatus::class, 'to_status_id'); }
    public function fromAssignee(): BelongsTo { return $this->belongsTo(User::class, 'from_assigned_user_id'); }
    public function toAssignee(): BelongsTo { return $this->belongsTo(User::class, 'to_assigned_user_id'); }
}
