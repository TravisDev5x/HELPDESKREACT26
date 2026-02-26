<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// --- SIGUA: tareas programadas ---
Schedule::command('sigua:verificar-ca01')->dailyAt('08:00');
Schedule::command('sigua:verificar-bitacora')->weeklyOn(1, '09:00'); // Lunes 9:00 AM
Schedule::command('sigua:verificar-bajas')->weeklyOn(3, '10:00');    // Miércoles 10:00 AM
