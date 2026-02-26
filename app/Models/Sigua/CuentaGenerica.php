<?php

namespace App\Models\Sigua;

use App\Models\Campaign;
use App\Models\Sede;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Cuenta genérica (inventario) en SIGUA.
 *
 * @property int $id
 * @property int $system_id
 * @property string $usuario_cuenta
 * @property string $nombre_cuenta
 * @property int $sede_id
 * @property string|null $isla
 * @property string|null $perfil
 * @property int|null $campaign_id
 * @property string $estado
 * @property string|null $ou_ad
 * @property int|null $empleado_rh_id
 * @property string $tipo
 * @property array|null $datos_extra
 * @property int|null $importacion_id
 */
class CuentaGenerica extends Model
{
    use SoftDeletes;

    protected $table = 'sigua_accounts';

    protected $fillable = [
        'system_id',
        'usuario_cuenta',
        'nombre_cuenta',
        'sede_id',
        'isla',
        'perfil',
        'campaign_id',
        'estado',
        'ou_ad',
        'empleado_rh_id',
        'tipo',
        'datos_extra',
        'importacion_id',
    ];

    protected $casts = [
        'estado' => 'string',
        'datos_extra' => 'array',
    ];

    protected $appends = ['nombre_completo', 'tiene_ca01_vigente'];

    public function sistema(): BelongsTo
    {
        return $this->belongsTo(Sistema::class, 'system_id');
    }

    public function sede(): BelongsTo
    {
        return $this->belongsTo(Sede::class, 'sede_id');
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class, 'campaign_id');
    }

    public function empleadoRh(): BelongsTo
    {
        return $this->belongsTo(EmpleadoRh::class, 'empleado_rh_id');
    }

    /**
     * Formatos CA-01 que incluyen esta cuenta (pivot sigua_ca01_accounts).
     *
     * @return BelongsToMany<FormatoCA01>
     */
    public function formatosCA01(): BelongsToMany
    {
        return $this->belongsToMany(FormatoCA01::class, 'sigua_ca01_accounts', 'account_id', 'ca01_id')
            ->withPivot('justificacion')
            ->withTimestamps();
    }

    /**
     * CA-01 vigente que incluye esta cuenta (el más reciente por fecha_vencimiento).
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsToMany<FormatoCA01>
     */
    public function ca01Vigente(): BelongsToMany
    {
        return $this->belongsToMany(FormatoCA01::class, 'sigua_ca01_accounts', 'account_id', 'ca01_id')
            ->where('sigua_ca01.estado', 'vigente')
            ->orderByDesc('sigua_ca01.fecha_vencimiento')
            ->limit(1)
            ->withPivot('justificacion')
            ->withTimestamps();
    }

    /**
     * Registros de bitácora de esta cuenta.
     *
     * @return HasMany<Bitacora>
     */
    public function bitacoras(): HasMany
    {
        return $this->hasMany(Bitacora::class, 'account_id');
    }

    /**
     * Registros de bitácora sin uso.
     *
     * @return HasMany<BitacoraSinUso>
     */
    public function bitacorasSinUso(): HasMany
    {
        return $this->hasMany(BitacoraSinUso::class, 'account_id');
    }

    /**
     * Incidentes sobre esta cuenta.
     *
     * @return HasMany<Incidente>
     */
    public function incidentes(): HasMany
    {
        return $this->hasMany(Incidente::class, 'account_id');
    }

    /**
     * Scope: solo cuentas en estado activa.
     *
     * @param  Builder<CuentaGenerica>  $query
     * @return Builder<CuentaGenerica>
     */
    public function scopeActivas(Builder $query): Builder
    {
        return $query->where('estado', 'activa');
    }

    /**
     * Scope: por sede.
     *
     * @param  Builder<CuentaGenerica>  $query
     * @return Builder<CuentaGenerica>
     */
    public function scopePorSede(Builder $query, int $sedeId): Builder
    {
        return $query->where('sede_id', $sedeId);
    }

    /**
     * Scope: por sistema.
     *
     * @param  Builder<CuentaGenerica>  $query
     * @return Builder<CuentaGenerica>
     */
    public function scopePorSistema(Builder $query, int $sistemaId): Builder
    {
        return $query->where('system_id', $sistemaId);
    }

    /**
     * Scope: cuentas genéricas (semántico; todas lo son).
     *
     * @param  Builder<CuentaGenerica>  $query
     * @return Builder<CuentaGenerica>
     */
    public function scopeGenericas(Builder $query): Builder
    {
        return $query;
    }

    public function scopeNominales(Builder $query): Builder
    {
        return $query->where('tipo', 'nominal');
    }

    public function scopeServicio(Builder $query): Builder
    {
        return $query->where('tipo', 'servicio');
    }

    /**
     * Sin empleado RH y tipo distinto de generica/servicio.
     *
     * @param  Builder<CuentaGenerica>  $query
     * @return Builder<CuentaGenerica>
     */
    public function scopeHuerfanas(Builder $query): Builder
    {
        return $query->whereNull('empleado_rh_id')
            ->whereNotIn('tipo', ['generica', 'servicio']);
    }

    public function scopeConCA01Vigente(Builder $query): Builder
    {
        return $query->whereHas('formatosCA01', fn (Builder $q) => $q->where('estado', 'vigente'));
    }

    public function scopeSinCA01(Builder $query): Builder
    {
        return $query->whereDoesntHave('formatosCA01');
    }

    /**
     * Nombre para mostrar: usuario_cuenta — nombre_cuenta.
     */
    public function getNombreCompletoAttribute(): string
    {
        return $this->usuario_cuenta . ' — ' . $this->nombre_cuenta;
    }

    public function getTieneCa01VigenteAttribute(): bool
    {
        return $this->formatosCA01()->where('estado', 'vigente')->exists();
    }
}
