<?php

namespace App\Enums;

enum InvMovementType: string
{
    case CHECKOUT = 'CHECKOUT'; case CHECKIN = 'CHECKIN'; case REASSIGN = 'REASSIGN'; case TRANSFER = 'TRASLADO';
    case RETIRE = 'RETIRE'; case MARK_LOST = 'MARK_LOST'; case MARK_STOLEN = 'MARK_STOLEN';
    case MAINTENANCE_START = 'MAINTENANCE_START'; case MAINTENANCE_END = 'MAINTENANCE_END';

    public function label(): string
    {
        return match ($this) {
            self::CHECKOUT => 'Asignación', self::CHECKIN => 'Devolución', self::REASSIGN => 'Reasignación', self::TRANSFER => 'Traslado',
            self::RETIRE => 'Baja', self::MARK_LOST => 'Marcado como perdido', self::MARK_STOLEN => 'Marcado como robado',
            self::MAINTENANCE_START => 'Inicio de mantenimiento', self::MAINTENANCE_END => 'Cierre de mantenimiento',
        };
    }
}
