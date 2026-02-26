<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// --- SIGUA: tareas automáticas ---
Schedule::command('sigua:generar-alertas')
    ->dailyAt('08:00')
    ->withoutOverlapping()
    ->appendOutputTo(storage_path('logs/sigua-alertas.log'));

Schedule::command('sigua:verificar-ca01')
    ->dailyAt('08:15')
    ->withoutOverlapping()
    ->appendOutputTo(storage_path('logs/sigua-ca01.log'));

Schedule::command('sigua:verificar-bitacora --notificar')
    ->weeklyOn(1, '09:00')
    ->withoutOverlapping()
    ->appendOutputTo(storage_path('logs/sigua-bitacora.log'));

Schedule::command('sigua:cruce --tipo=completo')
    ->weeklyOn(3, '10:00')
    ->withoutOverlapping()
    ->appendOutputTo(storage_path('logs/sigua-cruces.log'));

Schedule::command('sigua:resumen-semanal')
    ->weeklyOn(5, '17:00')
    ->withoutOverlapping()
    ->appendOutputTo(storage_path('logs/sigua-resumen.log'));
