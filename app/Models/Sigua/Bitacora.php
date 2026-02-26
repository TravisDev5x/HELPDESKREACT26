<?php

namespace App\Models\Sigua;

use App\Models\Campaign;
use App\Models\Sede;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Registro de bitácora CA-02 en SIGUA.
 *
 * @property int $id
 * @property int $account_id
 * @property int $system_id
 * @property int $sede_id
 * @property int|null $campaign_id
 * @property string $fecha
 * @property string $turno
 * @property string $agente_nombre
 * @property string|null $agente_num_empleado
 * @property string|null $hora_inicio
 * @property string|null $hora_fin
 * @property string|null $hora_cambio
 * @property int $supervisor_user_id
 * @property string|null $observaciones
 */
class Bitacora extends Model
{
    protected $table = 'sigua_logbook';

    public const TURNO_MATUTINO = 'matutino';
    public const TURNO_VESPERTINO = 'vespertino';
    public const TURNO_NOCTURNO = 'nocturno';
    public const TURNO_MIXTO = 'mixto';

    protected $fillable = [
        'account_id',
        'system_id',
        'sede_id',
        'campaign_id',
        'fecha',
        'turno',
        'agente_nombre',
        'agente_num_empleado',
        'hora_inicio',
        'hora_fin',
        'hora_cambio',
        'supervisor_user_id',
        'observaciones',
    ];

    protected $casts = [
        'fecha' => 'date',
        'turno' => 'string',
    ];

    protected $appends = ['turno_label'];

    /** @var array<string, string> */
    protected static array $turnoLabels = [
        'matutino' => 'Matutino',
        'vespertino' => 'Vespertino',
        'nocturno' => 'Nocturno',
        'mixto' => 'Mixto',
    ];

    public function account(): BelongsTo
    {
        return $this->belongsTo(CuentaGenerica::class, 'account_id');
    }

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

    public function supervisor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'supervisor_user_id');
    }

    /**
     * Scope: por fecha (date o Carbon).
     *
     * @param  Builder<Bitacora>  $query
     * @return Builder<Bitacora>
     */
    public function scopePorFecha(Builder $query, string|\DateTimeInterface $fecha): Builder
    {
        $date = $fecha instanceof \DateTimeInterface
            ? $fecha->format('Y-m-d')
            : \Carbon\Carbon::parse($fecha)->format('Y-m-d');

        return $query->whereDate('fecha', $date);
    }

    /**
     * Scope: por sede.
     *
     * @param  Builder<Bitacora>  $query
     * @return Builder<Bitacora>
     */
    public function scopePorSede(Builder $query, int $sedeId): Builder
    {
        return $query->where('sede_id', $sedeId);
    }

    /**
     * Scope: por turno.
     *
     * @param  Builder<Bitacora>  $query
     * @return Builder<Bitacora>
     */
    public function scopePorTurno(Builder $query, string $turno): Builder
    {
        return $query->where('turno', $turno);
    }

    /**
     * Scope: registros de hoy.
     *
     * @param  Builder<Bitacora>  $query
     * @return Builder<Bitacora>
     */
    public function scopeHoy(Builder $query): Builder
    {
        return $query->whereDate('fecha', now()->toDateString());
    }

    /**
     * Etiqueta legible del turno.
     */
    public function getTurnoLabelAttribute(): string
    {
        return self::$turnoLabels[$this->turno] ?? $this->turno;
    }
}
