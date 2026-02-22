<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Incident extends Model
{
    use HasFactory;

    protected $fillable = [
        'subject',
        'description',
        'occurred_at',
        'enabled_at',
        'reporter_id',
        'involved_user_id',
        'assigned_user_id',
        'area_id',
        'sede_id',
        'incident_type_id',
        'incident_severity_id',
        'incident_status_id',
        'closed_at',
    ];

    protected $casts = [
        'occurred_at' => 'datetime',
        'enabled_at' => 'datetime',
        'closed_at' => 'datetime',
    ];

    public function reporter(): BelongsTo { return $this->belongsTo(User::class, 'reporter_id'); }
    public function involvedUser(): BelongsTo { return $this->belongsTo(User::class, 'involved_user_id'); }
    public function assignedUser(): BelongsTo { return $this->belongsTo(User::class, 'assigned_user_id'); }
    public function area(): BelongsTo { return $this->belongsTo(Area::class, 'area_id'); }
    public function sede(): BelongsTo { return $this->belongsTo(Sede::class, 'sede_id'); }
    public function incidentType(): BelongsTo { return $this->belongsTo(IncidentType::class, 'incident_type_id'); }
    public function incidentSeverity(): BelongsTo { return $this->belongsTo(IncidentSeverity::class, 'incident_severity_id'); }
    public function incidentStatus(): BelongsTo { return $this->belongsTo(IncidentStatus::class, 'incident_status_id'); }

    public function attachments(): HasMany
    {
        return $this->hasMany(IncidentAttachment::class);
    }

    public function histories(): HasMany
    {
        return $this->hasMany(IncidentHistory::class);
    }
}
