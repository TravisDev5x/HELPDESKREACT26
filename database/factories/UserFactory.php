<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
// Importamos los modelos para sacar los IDs
use App\Models\Campaign;
use App\Models\Area;
use App\Models\Position;
use App\Models\Sede;
use App\Models\Ubicacion;

class UserFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            
            // Generamos un número de empleado tipo "19674"
            'employee_number' => '19' . fake()->unique()->numberBetween(100, 9999),
            
            'phone' => fake()->numerify('##########'),

            // --- CORRECCIÓN AQUÍ ---
            // Usamos '_id' y buscamos un ID existente en la BD
            'campaign_id' => Campaign::inRandomOrder()->first()?->id ?? Campaign::first()?->id,
            'area_id' => Area::inRandomOrder()->first()?->id ?? Area::first()?->id,
            'position_id' => Position::inRandomOrder()->first()?->id ?? Position::first()?->id,
            'sede_id' => Sede::inRandomOrder()->first()?->id ?? Sede::first()?->id,
            'ubicacion_id' => Ubicacion::inRandomOrder()->first()?->id,
            // -----------------------

            'email_verified_at' => now(),
            'status' => 'active',
            'password' => Hash::make('password123'),
            'remember_token' => Str::random(10),
        ];
    }
}
