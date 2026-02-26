<?php

namespace App\Models\Sigua;

use App\Models\Sede;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Registro de bitácora "sin uso" en SIGUA.
 *
 * @property int $id
 * @property int $account_id
 * @property string $fecha
 * @property string $turno
 * @property int $sede_id
 * @property int $supervisor_user_id
 * @property string|null $motivo
 */
class BitacoraSinUso extends Model
{
    protected $table = 'sigua_logbook_unused';

    protected $fillable = [
        'account_id',
        'fecha',
        'turno',
        'sede_id',
        'supervisor_user_id',
        'motivo',
    ];

    protected $casts = [
        'fecha' => 'date',
        'turno' => 'string',
    ];

    public function account(): BelongsTo
    {
        return $this->belongsTo(CuentaGenerica::class, 'account_id');
    }

    public function sede(): BelongsTo
    {
        return $this->belongsTo(Sede::class, 'sede_id');
    }

    public function supervisor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'supervisor_user_id');
    }
}
