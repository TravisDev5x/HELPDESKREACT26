<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class ScheduleAssignment extends Model
{
    protected $table = 'schedule_assignments';

    protected $fillable = [
        'schedule_id',
        'scheduleable_type',
        'scheduleable_id',
        'valid_from',
        'valid_until',
    ];

    protected function casts(): array
    {
        return [
            'valid_from' => 'date',
            'valid_until' => 'date',
        ];
    }

    public function schedule(): BelongsTo
    {
        return $this->belongsTo(Schedule::class);
    }

    public function scheduleable(): MorphTo
    {
        return $this->morphTo();
    }
}
