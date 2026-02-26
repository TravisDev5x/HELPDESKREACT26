<?php

namespace App\Exceptions\Sigua;

use Exception;

/**
 * Excepción base para errores del módulo SIGUA.
 * Los services lanzan esta excepción (o subclases) cuando falla la lógica de negocio.
 */
class SiguaException extends Exception
{
    public function __construct(
        string $message = 'Error en el módulo SIGUA',
        int $code = 0,
        ?\Throwable $previous = null
    ) {
        parent::__construct($message, $code, $previous);
    }

    /**
     * Respuesta HTTP recomendada (422 para validación/negocio).
     */
    public function getStatusCode(): int
    {
        return 422;
    }
}
