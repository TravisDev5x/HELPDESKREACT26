<?php

namespace App\Models\Sigua;

use App\Models\Sede;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Alerta automática SIGUA v2.
 *
 * @property int $id
 * @property string $tipo
 * @property string $titulo
 * @property string $descripcion
 * @property string $severidad
 * @property int|null $sede_id
 * @property int|null $sistema_id
 * @property int|null $dirigida_a
 * @property bool $leida
 * @property bool $resuelta
 * @property int|null $resuelta_por
 * @property \Carbon\Carbon|null $resuelta_en
 */
class Alerta extends Model
{
    protected $table = 'sigua_alertas';

    protected $fillable = [
        'tipo',
        'titulo',
        'descripcion',
        'severidad',
        'entidad_tipo',
        'entidad_id',
        'sede_id',
        'sistema_id',
        'dirigida_a',
        'leida',
        'resuelta',
        'resuelta_por',
        'resuelta_en',
    ];

    protected $casts = [
        'leida' => 'boolean',
        'resuelta' => 'boolean',
        'resuelta_en' => 'datetime',
    ];

    protected $appends = ['severidad_color', 'icono'];

    public function sede(): BelongsTo
    {
        return $this->belongsTo(Sede::class, 'sede_id');
    }

    public function sistema(): BelongsTo
    {
        return $this->belongsTo(Sistema::class, 'sistema_id');
    }

    public function dirigidaA(): BelongsTo
    {
        return $this->belongsTo(User::class, 'dirigida_a');
    }

    public function resueltaPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resuelta_por');
    }

    public function scopeNoLeidas(Builder $query): Builder
    {
        return $query->where('leida', false);
    }

    public function scopeNoResueltas(Builder $query): Builder
    {
        return $query->where('resuelta', false);
    }

    public function scopeCriticas(Builder $query): Builder
    {
        return $query->where('severidad', 'critical');
    }

    public function scopeParaUsuario(Builder $query, int $userId): Builder
    {
        return $query->where('dirigida_a', $userId);
    }

    public function scopePorSede(Builder $query, int $sedeId): Builder
    {
        return $query->where('sede_id', $sedeId);
    }

    public function getSeveridadColorAttribute(): string
    {
        return match ($this->severidad) {
            'critical' => '#dc2626',
            'warning' => '#d97706',
            default => '#2563eb',
        };
    }

    public function getIconoAttribute(): string
    {
        return match ($this->tipo) {
            'ca01_por_vencer', 'ca01_vencido' => 'file-text',
            'bitacora_faltante' => 'book-open',
            'baja_pendiente' => 'user-x',
            'cuenta_sin_responsable' => 'user-question',
            'anomalia_cruce' => 'git-merge',
            'sistema_sin_importacion' => 'database',
            default => 'bell',
        };
    }
}
