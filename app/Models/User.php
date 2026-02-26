<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Models\Traits\SiguaRelations;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, SoftDeletes, HasRoles, SiguaRelations;

    protected $guard_name = 'web';

    /**
     * The attributes that are mass assignable.
     *
     * IMPORTANT: Use *_id because these are foreign keys.
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'employee_number',
        'phone',
        'campaign_id',
        'area_id',
        'position_id',
        'sede_id',
        'ubicacion_id',
        'avatar_path',
        'status',
        'theme',
        'ui_density',
        'sidebar_state',
        'sidebar_hover_preview',
        'sidebar_position',
        'locale',
        'availability',
    ];

    /**
     * The attributes that should be hidden for serialization.
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }

    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
    }

    public function position(): BelongsTo
    {
        return $this->belongsTo(Position::class);
    }

    public function sede(): BelongsTo
    {
        return $this->belongsTo(Sede::class);
    }

    public function ubicacion(): BelongsTo
    {
        return $this->belongsTo(Ubicacion::class);
    }

    /**
     * Formatos CA-01 donde este usuario es gerente (SIGUA).
     *
     * @return HasMany<\App\Models\Sigua\FormatoCA01>
     */
    public function cuentasResponsables(): HasMany
    {
        return $this->hasMany(\App\Models\Sigua\FormatoCA01::class, 'gerente_user_id');
    }

    /**
     * Registros de bitácora donde este usuario es supervisor (SIGUA).
     *
     * @return HasMany<\App\Models\Sigua\Bitacora>
     */
    public function registrosBitacora(): HasMany
    {
        return $this->hasMany(\App\Models\Sigua\Bitacora::class, 'supervisor_user_id');
    }
}
