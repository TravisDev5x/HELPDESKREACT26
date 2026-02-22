<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Log;

class AuditReportAccess
{
    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);

        if (!config('helpdesk.reports.audit_enabled', false)) {
            return $response;
        }

        try {
            $user = $request->user();
            $route = $request->route();

            $filters = Arr::only($request->query(), [
                'area_current_id',
                'area_origin_id',
                'sede_id',
                'ubicacion_id',
                'ticket_type_id',
                'priority_id',
                'ticket_state_id',
                'assigned_to',
                'assigned_status',
                'assigned_user_id',
                'date_from',
                'date_to',
                'per_page',
            ]);

            if ($request->filled('search')) {
                $filters['search_length'] = strlen((string) $request->query('search'));
            }

            $payload = [
                'user_id' => $user?->id,
                'route' => $route?->uri(),
                'name' => $route?->getName(),
                'method' => $request->method(),
                'status' => $response->getStatusCode(),
                'ip' => $request->ip(),
                'filters' => $filters,
            ];

            $channel = config('helpdesk.reports.audit_channel', 'reports');
            Log::channel($channel)->info('report.access', $payload);
        } catch (\Throwable $e) {
            Log::warning('report audit failed', ['error' => $e->getMessage()]);
        }

        return $response;
    }
}
