<?php

namespace App\Models\Sigua;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Incidente de investigación sobre cuenta genérica en SIGUA.
 *
 * @property int $id
 * @property int $account_id
 * @property \Carbon\Carbon $fecha_incidente
 * @property string $descripcion
 * @property string|null $ip_origen
 * @property int $system_id
 * @property int|null $ca01_id
 * @property string|null $agente_identificado
 * @property string|null $resolucion
 * @property string $estado
 * @property int $reportado_por
 * @property int|null $asignado_a
 */
class Incidente extends Model
{
    protected $table = 'sigua_incidents';

    protected $fillable = [
        'account_id',
        'fecha_incidente',
        'descripcion',
        'ip_origen',
        'system_id',
        'ca01_id',
        'agente_identificado',
        'resolucion',
        'estado',
        'reportado_por',
        'asignado_a',
    ];

    protected $casts = [
        'fecha_incidente' => 'datetime',
        'estado' => 'string',
    ];

    public function account(): BelongsTo
    {
        return $this->belongsTo(CuentaGenerica::class, 'account_id');
    }

    public function sistema(): BelongsTo
    {
        return $this->belongsTo(Sistema::class, 'system_id');
    }

    public function ca01(): BelongsTo
    {
        return $this->belongsTo(FormatoCA01::class, 'ca01_id');
    }

    public function reportadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reportado_por');
    }

    public function asignadoA(): BelongsTo
    {
        return $this->belongsTo(User::class, 'asignado_a');
    }

    /**
     * Scope: solo incidentes abiertos (no resueltos ni escalados).
     *
     * @param  Builder<Incidente>  $query
     * @return Builder<Incidente>
     */
    public function scopeAbiertos(Builder $query): Builder
    {
        return $query->whereIn('estado', ['abierto', 'investigando']);
    }

    /**
     * Scope: por sistema.
     *
     * @param  Builder<Incidente>  $query
     * @return Builder<Incidente>
     */
    public function scopePorSistema(Builder $query, int $sistemaId): Builder
    {
        return $query->where('system_id', $sistemaId);
    }
}
