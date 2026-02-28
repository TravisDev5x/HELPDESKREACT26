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
use Illuminate\Database\Eloquent\Relations\MorphToMany;
use Illuminate\Support\Carbon;
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
     * Asignaciones de horario a este usuario (tabla polimórfica schedule_assignments).
     */
    public function scheduleAssignments(): MorphToMany
    {
        return $this->morphToMany(Schedule::class, 'schedule_assignment', 'schedule_assignments')
            ->withPivot('valid_from', 'valid_until')
            ->withTimestamps();
    }

    /**
     * Resuelve el horario vigente para una fecha según jerarquía: Usuario > Área > Campaña > Por defecto.
     * Mitigación N+1: una sola consulta de asignaciones y horario por defecto cacheado en request.
     */
    public function getTodaySchedule(?Carbon $date = null): Schedule
    {
        $date = $date ?? Carbon::now(config('app.timezone'))->startOfDay();
        $dateStr = $date->format('Y-m-d');

        $candidates = [];
        if (true) {
            $candidates[] = [self::class, $this->id];
        }
        if ($this->area_id) {
            $candidates[] = [Area::class, $this->area_id];
        }
        if ($this->campaign_id) {
            $candidates[] = [Campaign::class, $this->campaign_id];
        }

        $assignment = ScheduleAssignment::query()
            ->where('valid_from', '<=', $dateStr)
            ->where(function ($q) use ($dateStr) {
                $q->whereNull('valid_until')->orWhere('valid_until', '>=', $dateStr);
            })
            ->where(function ($q) use ($candidates) {
                foreach ($candidates as [$type, $id]) {
                    $q->orWhere(fn ($q2) => $q2->where('scheduleable_type', $type)->where('scheduleable_id', $id));
                }
            })
            ->with(['schedule.scheduleDays'])
            ->get()
            ->sortBy(function (ScheduleAssignment $a) use ($candidates) {
                $key = array_search([$a->scheduleable_type, $a->scheduleable_id], $candidates);
                return $key === false ? 999 : $key;
            })
            ->first();

        if ($assignment && $assignment->schedule) {
            return $assignment->schedule;
        }

        return static::getDefaultSchedule();
    }

    /**
     * Horario "Por defecto" cuando no hay asignación vigente. Cache en request para evitar N+1.
     */
    public static function getDefaultSchedule(): Schedule
    {
        return cache()->remember('schedule.default', 3600, function () {
            $schedule = Schedule::where('name', 'Por defecto')
                ->where('is_active', true)
                ->with('scheduleDays')
                ->first();
            if (!$schedule) {
                throw new \RuntimeException('No existe el horario "Por defecto". Ejecute: php artisan db:seed --class=ScheduleSeeder');
            }
            return $schedule;
        });
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class)->orderByDesc('work_date');
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

    /**
     * Perfil de empleado (RH): fecha ingreso, motivo y fecha de baja.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasOne<\App\Models\EmployeeProfile>
     */
    public function employeeProfile(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(EmployeeProfile::class);
    }

    /**
     * Subordinados (empleados que tienen a este usuario como jefe inmediato).
     *
     * @return HasMany<\App\Models\EmployeeProfile>
     */
    public function subordinates(): HasMany
    {
        return $this->hasMany(EmployeeProfile::class, 'manager_id');
    }
}
