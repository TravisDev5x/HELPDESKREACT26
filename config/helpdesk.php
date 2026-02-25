<?php

return [
    'reports' => [
        'audit_enabled' => env('REPORT_AUDIT_ENABLED', true),
        'audit_channel' => env('REPORT_AUDIT_CHANNEL', 'reports'),
    ],
    'tickets' => [
        'audit_enabled' => env('TICKET_AUDIT_ENABLED', true),
        'audit_channel' => env('TICKET_AUDIT_CHANNEL', 'audit'),
    ],
];
