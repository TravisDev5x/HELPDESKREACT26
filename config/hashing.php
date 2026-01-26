<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Hash Driver
    |--------------------------------------------------------------------------
    |
    | Algoritmo por defecto para hashear contraseñas.
    | Recomendado en 2026: ARGON2ID
    |
    | Supported: "bcrypt", "argon", "argon2id"
    |
    */

    'driver' => env('HASH_DRIVER', 'argon2id'),

    /*
    |--------------------------------------------------------------------------
    | Bcrypt Options
    |--------------------------------------------------------------------------
    |
    | Se mantiene por compatibilidad con hashes antiguos.
    | No se usará si HASH_DRIVER=argon2id.
    |
    */

    'bcrypt' => [
        'rounds' => env('BCRYPT_ROUNDS', 12),
        'verify' => env('HASH_VERIFY', true),
        'limit' => env('BCRYPT_LIMIT', null),
    ],

    /*
    |--------------------------------------------------------------------------
    | Argon / Argon2id Options
    |--------------------------------------------------------------------------
    |
    | Parámetros seguros y balanceados para servidores modernos.
    | Ajustables según carga del sistema.
    |
    */

    'argon' => [
        'memory' => env('ARGON_MEMORY', 65536), // 64 MB
        'threads' => env('ARGON_THREADS', 4),
        'time' => env('ARGON_TIME', 4),
        'verify' => env('HASH_VERIFY', true),
    ],

    /*
    |--------------------------------------------------------------------------
    | Rehash On Login
    |--------------------------------------------------------------------------
    |
    | Rehashea automáticamente contraseñas antiguas al iniciar sesión.
    | Permite migrar bcrypt → argon2id sin forzar resets.
    |
    */

    'rehash_on_login' => true,

];
