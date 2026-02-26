<?php

namespace App\Models\Traits;

use App\Models\Sigua\Alerta;
use App\Models\Sigua\EmpleadoRh;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * Relaciones SIGUA del usuario (empleado RH, alertas recibidas).
 * Vincular empleadoRh por num_empleado = User.employee_number.
 */
trait SiguaRelations
{
    /**
     * Empleado en snapshot RH (vínculo por número de empleado).
     *
     * @return HasOne<EmpleadoRh>
     */
    public function empleadoRh(): HasOne
    {
        return $this->hasOne(EmpleadoRh::class, 'num_empleado', 'employee_number');
    }

    /**
     * Alertas SIGUA dirigidas a este usuario.
     *
     * @return HasMany<Alerta>
     */
    public function alertasRecibidas(): HasMany
    {
        return $this->hasMany(Alerta::class, 'dirigida_a');
    }
}
