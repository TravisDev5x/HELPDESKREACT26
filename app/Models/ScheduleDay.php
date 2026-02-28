<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScheduleDay extends Model
{
    protected $fillable = [
        'schedule_id',
        'day_of_week',
        'is_working_day',
        'expected_clock_in',
        'expected_lunch_start',
        'expected_lunch_end',
        'expected_clock_out',
        'tolerance_minutes',
    ];

    protected function casts(): array
    {
        return [
            'is_working_day' => 'boolean',
            'tolerance_minutes' => 'integer',
        ];
    }

    public function schedule(): BelongsTo
    {
        return $this->belongsTo(Schedule::class);
    }
}
