<?php

namespace App\Models\Sigua;

use App\Models\Campaign;
use App\Models\Sede;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Formato de responsabilidad CA-01 en SIGUA.
 *
 * @property int $id
 * @property int $gerente_user_id
 * @property int $campaign_id
 * @property int $sede_id
 * @property int $system_id
 * @property string $fecha_firma
 * @property string $fecha_vencimiento
 * @property string|null $archivo_firmado
 * @property string $estado
 * @property string|null $observaciones
 * @property int $created_by
 */
class FormatoCA01 extends Model
{
    use SoftDeletes;

    protected $table = 'sigua_ca01';

    protected $fillable = [
        'gerente_user_id',
        'campaign_id',
        'sede_id',
        'system_id',
        'fecha_firma',
        'fecha_vencimiento',
        'archivo_firmado',
        'estado',
        'observaciones',
        'created_by',
    ];

    protected $casts = [
        'fecha_firma' => 'date',
        'fecha_vencimiento' => 'date',
        'estado' => 'string',
    ];

    protected $appends = ['esta_vigente'];

    public function gerente(): BelongsTo
    {
        return $this->belongsTo(User::class, 'gerente_user_id');
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class, 'campaign_id');
    }

    public function sede(): BelongsTo
    {
        return $this->belongsTo(Sede::class, 'sede_id');
    }

    public function sistema(): BelongsTo
    {
        return $this->belongsTo(Sistema::class, 'system_id');
    }

    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Cuentas genéricas cubiertas por este CA-01 (pivot sigua_ca01_accounts).
     *
     * @return BelongsToMany<CuentaGenerica>
     */
    public function cuentas(): BelongsToMany
    {
        return $this->belongsToMany(CuentaGenerica::class, 'sigua_ca01_accounts', 'ca01_id', 'account_id')
            ->withPivot('justificacion')
            ->withTimestamps();
    }

    /**
     * Scope: solo formatos vigentes.
     *
     * @param  Builder<FormatoCA01>  $query
     * @return Builder<FormatoCA01>
     */
    public function scopeVigentes(Builder $query): Builder
    {
        return $query->where('estado', 'vigente');
    }

    /**
     * Scope: solo formatos vencidos.
     *
     * @param  Builder<FormatoCA01>  $query
     * @return Builder<FormatoCA01>
     */
    public function scopeVencidos(Builder $query): Builder
    {
        return $query->where('estado', 'vencido');
    }

    /**
     * Scope: por sede.
     *
     * @param  Builder<FormatoCA01>  $query
     * @return Builder<FormatoCA01>
     */
    public function scopePorSede(Builder $query, int $sedeId): Builder
    {
        return $query->where('sede_id', $sedeId);
    }

    /**
     * Indica si el CA-01 está vigente según fecha_vencimiento y estado (hoy cuenta como vigente).
     */
    public function getEstaVigenteAttribute(): bool
    {
        if ($this->estado !== 'vigente') {
            return false;
        }

        return $this->fecha_vencimiento && $this->fecha_vencimiento->gte(\Carbon\Carbon::today());
    }
}
