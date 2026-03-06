<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Models\Traits\SiguaRelations;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Casts\Attribute;
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
     * name no es fillable: se obtiene por accessor desde first_name + apellidos.
     */
    protected $fillable = [
        'first_name',
        'paternal_last_name',
        'maternal_last_name',
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
        'is_blacklisted',
    ];

    /**
     * The attributes that should be hidden for serialization.
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Accessors que se incluyen en la serialización JSON (ej. para el frontend).
     */
    protected $appends = [
        'avatar_url',
    ];

    /**
     * Get the attributes that should be cast.
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (User $user) {
            $user->syncNameColumn();
        });
    }

    /**
     * Sincroniza la columna `name` con first_name + apellidos para consultas raw (ej. catálogos).
     */
    public function syncNameColumn(): void
    {
        $first = trim((string) ($this->first_name ?? ''));
        $paternal = trim((string) ($this->paternal_last_name ?? ''));
        $maternal = trim((string) ($this->maternal_last_name ?? ''));
        $this->attributes['name'] = trim($first . ' ' . $paternal . ' ' . $maternal) ?: null;
    }

    /**
     * URL pública del avatar (para que el frontend cargue la imagen desde el servidor correcto).
     */
    protected function avatarUrl(): Attribute
    {
        return Attribute::make(
            get: function () {
                $path = $this->attributes['avatar_path'] ?? null;
                if (! is_string($path) || trim($path) === '') {
                    return null;
                }
                $path = ltrim($path, '/');
                $base = rtrim(config('app.url'), '/');

                return $base.'/storage/'.$path;
            },
        );
    }

    /**
     * Nombre completo: primero + apellido paterno + apellido materno.
     * Si los nuevos campos están vacíos, se usa la columna legacy `name` (tras migración de datos).
     */
    protected function name(): Attribute
    {
        return Attribute::make(
            get: function () {
                $first = trim((string) ($this->attributes['first_name'] ?? ''));
                $paternal = trim((string) ($this->attributes['paternal_last_name'] ?? ''));
                $maternal = trim((string) ($this->attributes['maternal_last_name'] ?? ''));
                $computed = trim($first . ' ' . $paternal . ' ' . $maternal);
                if ($computed !== '') {
                    return $computed;
                }
                return (string) ($this->attributes['name'] ?? '');
            },
        );
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
