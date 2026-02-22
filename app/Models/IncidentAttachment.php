<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class IncidentAttachment extends Model
{
    use HasFactory;

    protected $fillable = [
        'incident_id',
        'uploaded_by',
        'original_name',
        'file_name',
        'file_path',
        'mime_type',
        'size',
        'disk',
    ];

    protected $appends = ['url'];

    public function incident(): BelongsTo { return $this->belongsTo(Incident::class); }
    public function uploader(): BelongsTo { return $this->belongsTo(User::class, 'uploaded_by'); }

    public function getUrlAttribute(): ?string
    {
        if (!$this->file_path) {
            return null;
        }
        $disk = $this->disk ?: 'public';
        return Storage::disk($disk)->url($this->file_path);
    }
}
