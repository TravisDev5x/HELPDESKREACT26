<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\CampaignController;
use App\Http\Controllers\Api\AreaController;
use App\Http\Controllers\Api\PositionController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\UserRoleController;
use App\Http\Controllers\Api\CatalogController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\PasswordResetController;
use App\Http\Controllers\Api\AdminNotificationController;
use App\Http\Controllers\Api\PermissionController;
use App\Http\Controllers\Api\RolePermissionController;
use App\Http\Controllers\Api\SessionMonitorController;
use App\Http\Controllers\Api\UbicacionController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\ScheduleController;
use App\Http\Controllers\Api\ScheduleManagerController;
use App\Http\Controllers\Api\MyScheduleController;
use App\Http\Controllers\Api\TimeDeskController;
use App\Http\Controllers\Api\TerminationReasonController;
use App\Http\Controllers\Api\EmployeeImportExportController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
| AQUÍ NO SE VALIDAN SESIONES.
| Las rutas API usan autenticación por token (auth:sanctum / auth:api).
| La verificación de sesión (cookies) vive en rutas web: GET /check-auth.
| Si un endpoint intenta usar sesión para "verificar login", migrarlo a web.
| Principio: "Sesión y API no se cruzan. Si lo hacen, el 401 es el síntoma."
*/

// ==========================
// AUTH (login/logout por token o estado stateful; verificación de sesión → web /check-auth)
// ==========================

Route::post('login', [AuthController::class, 'login'])
    ->middleware(['throttle:login','locale']);
Route::post('register', [AuthController::class, 'register'])
    ->middleware(['throttle:register','locale']);
Route::get('register/verify', [AuthController::class, 'verifyEmail']);
Route::post('logout', [AuthController::class, 'logout'])
    ->middleware(['auth:sanctum','locale']);
Route::get('ping', [AuthController::class, 'ping'])
    ->middleware(['auth:sanctum','locale']);

// PASSWORD RESET
Route::post('password/forgot', [PasswordResetController::class, 'forgot'])
    ->middleware(['throttle:5,1','locale']);
Route::post('password/reset', [PasswordResetController::class, 'reset'])
    ->middleware(['throttle:10,1','locale']);


// ==========================
// USUARIOS
// ==========================

Route::middleware(['auth:sanctum','locale','perm:users.manage'])->group(function () {

    Route::get('sessions', [SessionMonitorController::class, 'index'])
        ->middleware('throttle:30,1');

    Route::post('sessions/logout-user', [SessionMonitorController::class, 'logoutUser'])
        ->middleware('throttle:10,1');

    Route::post('users/mass-delete', [UserController::class, 'massDestroy'])
        ->middleware('throttle:5,1');

    Route::post('users/blacklist', [UserController::class, 'toggleBlacklist'])
        ->middleware('throttle:5,1');

    Route::post('users/{id}/restore', [UserController::class, 'restore'])
        ->middleware('throttle:10,1');

    Route::delete('users/{id}/force', [UserController::class, 'forceDelete'])
        ->middleware('throttle:5,1');

    Route::apiResource('users', UserController::class)
        ->only(['index', 'store', 'update', 'destroy']);

});


// ==========================
// ROLES
// ==========================

// Roles: GET accesible con auth; mutaciones requieren roles.manage
Route::middleware(['auth:sanctum','locale'])->get('roles', [RoleController::class, 'index']);
Route::middleware(['auth:sanctum','locale','perm:roles.manage'])->group(function () {
    Route::apiResource('roles', RoleController::class)
        ->only(['store', 'update', 'destroy']);
    Route::post('roles/{role}/permissions', [RolePermissionController::class, 'sync']);
});

// ==========================
// PERMISOS
// ==========================

// Permisos: GET accesible con auth; mutaciones requieren permisos.manage o roles.manage
Route::middleware(['auth:sanctum','locale'])->get('permissions', [PermissionController::class, 'index']);
Route::middleware(['auth:sanctum','locale','perm:permissions.manage|roles.manage'])->group(function () {
    Route::apiResource('permissions', PermissionController::class)
        ->only(['store', 'update', 'destroy']);
});

// ==========================
// UBICACIONES (lectura para usuarios y catálogos)
// ==========================
// Listar ubicaciones: quien gestiona usuarios o catálogos puede ver el listado
Route::middleware(['auth:sanctum','locale','perm:users.manage|catalogs.manage'])->get('ubicaciones', [UbicacionController::class, 'index']);

// ==========================
// CAMPAÑAS
// ==========================

Route::middleware(['auth:sanctum','locale','perm:catalogs.manage'])->group(function () {
    Route::apiResource('campaigns', CampaignController::class)
        ->only(['index', 'store', 'update', 'destroy']);
    Route::apiResource('sedes', \App\Http\Controllers\Api\SedeController::class)
        ->only(['index', 'store', 'update', 'destroy']);
    Route::apiResource('ubicaciones', \App\Http\Controllers\Api\UbicacionController::class)
        ->only(['index', 'store', 'update', 'destroy']);
    Route::apiResource('priorities', \App\Http\Controllers\Api\PriorityController::class)
        ->only(['index', 'store', 'update', 'destroy']);
    Route::apiResource('ticket-states', \App\Http\Controllers\Api\TicketStateController::class)
        ->only(['index', 'store', 'update', 'destroy']);
    Route::apiResource('ticket-types', \App\Http\Controllers\Api\TicketTypeController::class)
        ->only(['index', 'store', 'update', 'destroy']);
    Route::apiResource('incident-types', \App\Http\Controllers\Api\IncidentTypeController::class)
        ->only(['index', 'store', 'update', 'destroy']);
    Route::apiResource('incident-severities', \App\Http\Controllers\Api\IncidentSeverityController::class)
        ->only(['index', 'store', 'update', 'destroy']);
    Route::apiResource('incident-statuses', \App\Http\Controllers\Api\IncidentStatusController::class)
        ->only(['index', 'store', 'update', 'destroy']);
    Route::apiResource('schedules', ScheduleController::class)
        ->only(['index', 'show', 'store', 'update', 'destroy']);
});

// Mis Tickets: solo solicitante (requester_id = user). Sin permisos operativos. Desacoplado del módulo Tickets.
Route::middleware(['auth:sanctum', 'locale'])->prefix('my-tickets')->group(function () {
    Route::get('/', [\App\Http\Controllers\Api\MyTicketsController::class, 'index']);
    Route::post('/', [\App\Http\Controllers\Api\MyTicketsController::class, 'store']);
    Route::get('{ticket}/attachments/{attachment}/download', [\App\Http\Controllers\Api\MyTicketsController::class, 'downloadAttachment']);
    Route::post('{ticket}/attachments', [\App\Http\Controllers\Api\MyTicketsController::class, 'storeAttachment']);
    Route::post('{ticket}/comments', [\App\Http\Controllers\Api\MyTicketsController::class, 'addComment']);
    Route::get('{ticket}', [\App\Http\Controllers\Api\MyTicketsController::class, 'show']);
    Route::post('{ticket}/alert', [\App\Http\Controllers\Api\MyTicketsController::class, 'sendAlert']);
    Route::post('{ticket}/cancel', [\App\Http\Controllers\Api\MyTicketsController::class, 'cancel']);
});

// Tickets: acceso con auth + permisos específicos (Policies refuerzan alcance) + rate limit
Route::middleware(['auth:sanctum','locale','throttle:tickets','perm:tickets.manage_all|tickets.view_area|tickets.view_own|tickets.create'])->group(function () {
    // Analytics debe declararse antes de los params {ticket} para evitar binding
    Route::get('tickets/analytics', \App\Http\Controllers\Api\TicketAnalyticsController::class)
        ->middleware('report.audit');
    Route::get('tickets/summary', [\App\Http\Controllers\Api\TicketController::class, 'summary'])
        ->middleware('report.audit');
    Route::get('tickets/export', [\App\Http\Controllers\Api\TicketController::class, 'export'])
        ->middleware('report.audit');
    Route::post('tickets/{ticket}/take', [\App\Http\Controllers\Api\TicketController::class, 'take']);
    Route::post('tickets/{ticket}/assign', [\App\Http\Controllers\Api\TicketController::class, 'assign']);
    Route::post('tickets/{ticket}/unassign', [\App\Http\Controllers\Api\TicketController::class, 'unassign']);
    Route::post('tickets/{ticket}/alert', [\App\Http\Controllers\Api\TicketController::class, 'sendAlert']);
    Route::post('tickets/{ticket}/cancel', [\App\Http\Controllers\Api\TicketController::class, 'cancel']);
    Route::post('tickets/{ticket}/escalate', [\App\Http\Controllers\Api\TicketController::class, 'escalate']);
    Route::post('tickets/{ticket}/attachments', [\App\Http\Controllers\Api\TicketAttachmentController::class, 'store']);
    Route::delete('tickets/{ticket}/attachments/{attachment}', [\App\Http\Controllers\Api\TicketAttachmentController::class, 'destroy']);
    Route::get('tickets/{ticket}/attachments/{attachment}/download', [\App\Http\Controllers\Api\TicketAttachmentController::class, 'download']);
    Route::apiResource('tickets', \App\Http\Controllers\Api\TicketController::class)
        ->only(['index', 'store', 'update', 'show']);
});

// Incidencias: acceso con auth + permisos especificos (Policies refuerzan alcance)
Route::middleware(['auth:sanctum','locale','perm:incidents.manage_all|incidents.view_area|incidents.view_own|incidents.create'])->group(function () {
    Route::post('incidents/{incident}/take', [\App\Http\Controllers\Api\IncidentController::class, 'take']);
    Route::post('incidents/{incident}/assign', [\App\Http\Controllers\Api\IncidentController::class, 'assign']);
    Route::post('incidents/{incident}/unassign', [\App\Http\Controllers\Api\IncidentController::class, 'unassign']);
    Route::post('incidents/{incident}/attachments', [\App\Http\Controllers\Api\IncidentAttachmentController::class, 'store']);
    Route::delete('incidents/{incident}/attachments/{attachment}', [\App\Http\Controllers\Api\IncidentAttachmentController::class, 'destroy']);
    Route::apiResource('incidents', \App\Http\Controllers\Api\IncidentController::class)
        ->only(['index', 'store', 'update', 'show']);
});

// Notificaciones (in-app, sólo lectura)
Route::middleware(['auth:sanctum','locale'])->group(function () {
    Route::get('notifications', [\App\Http\Controllers\Api\NotificationController::class, 'index']);
    Route::post('notifications/read-all', [\App\Http\Controllers\Api\NotificationController::class, 'readAll']);
    Route::post('notifications/{id}/read', [\App\Http\Controllers\Api\NotificationController::class, 'markRead']);
});

// ==========================
// AREAS
// ==========================

Route::middleware(['auth:sanctum','locale','perm:catalogs.manage'])->group(function () {
    Route::apiResource('areas', AreaController::class)
        ->only(['index', 'store', 'update', 'destroy']);
});

// ==========================
// PUESTOS
// ==========================

Route::middleware(['auth:sanctum','locale','perm:catalogs.manage'])->group(function () {
    Route::apiResource('positions', PositionController::class)
        ->only(['index', 'store', 'update', 'destroy']);
});


// ==========================
// ASIGNACIONES
// ==========================

Route::middleware(['auth:sanctum','locale','perm:users.manage'])->group(function () {
    Route::post('users/{user}/roles', [UserRoleController::class, 'sync']);
});


// ==========================
// CATÁLOGOS
// ==========================

// CatÃ¡logos leÃ­dos por la UI (solo lectura, cualquier usuario autenticado)
Route::get('catalogs', [CatalogController::class, 'index'])
    ->middleware(['auth:sanctum','locale']);


// ==========================
// PERFIL
// ==========================

Route::middleware(['auth:sanctum','locale'])->group(function () {

    Route::middleware('perm:attendances.record_own')->group(function () {
        Route::get('attendance/status', [AttendanceController::class, 'status']);
        Route::post('attendance/punch', [AttendanceController::class, 'registerPunch']);
    });

    // Mi horario (empleado): jerarquía Usuario > Área > Campaña > Por defecto
    Route::middleware('perm:attendances.view_own')->group(function () {
        Route::get('my-schedule', [MyScheduleController::class, 'show']);
    });

    // TimeDesk: submódulo de horarios y asistencias (attendances.manage o attendances.view_all)
    Route::middleware('perm:attendances.manage|attendances.view_all')->prefix('timedesk')->group(function () {
        Route::get('dashboard', [TimeDeskController::class, 'dashboard']);
        // Catálogo de motivos de baja (RH): listado para selects y vista de catálogo
        Route::get('termination-reasons', [TerminationReasonController::class, 'index']);
        // Directorio de empleados (mismo listado que users, para RH sin users.manage)
        Route::get('employees', [UserController::class, 'index']);
    });

    // TimeDesk: solo quien gestiona puede crear/editar/eliminar motivos de baja e importar/exportar
    Route::middleware('perm:attendances.manage')->prefix('timedesk')->group(function () {
        Route::post('termination-reasons', [TerminationReasonController::class, 'store']);
        Route::put('termination-reasons/{termination_reason}', [TerminationReasonController::class, 'update']);
        Route::delete('termination-reasons/{termination_reason}', [TerminationReasonController::class, 'destroy']);
        // Import/Export directorio empleados (formato maestro Excel/CSV)
        Route::post('employees/import', [EmployeeImportExportController::class, 'import']);
        Route::post('employees/import-errors-report', [EmployeeImportExportController::class, 'downloadImportErrors']);
        Route::get('employees/export/activos', [EmployeeImportExportController::class, 'exportActivos']);
        Route::get('employees/export/bajas', [EmployeeImportExportController::class, 'exportBajas']);
    });

    // Gestión de asignaciones de horarios (RH/Admin)
    Route::middleware('perm:attendances.manage')->prefix('schedule-manager')->group(function () {
        Route::get('catalogs', [ScheduleManagerController::class, 'catalogs']);
        Route::get('assignments', [ScheduleManagerController::class, 'index']);
        Route::post('assign', [ScheduleManagerController::class, 'assign']);
    });

    Route::get('profile', [ProfileController::class, 'show']);
    Route::post('profile', [ProfileController::class, 'update']);
    Route::put('profile/password', [ProfileController::class, 'updatePassword']);
    Route::put('profile/theme', [ProfileController::class, 'updateTheme']);
    Route::put('profile/density', [ProfileController::class, 'updateDensity']);
    Route::put('profile/sidebar', [ProfileController::class, 'updateSidebar']);
    Route::put('profile/preferences', [ProfileController::class, 'updatePreferences']);

    // Admin notifications (básico)
    Route::middleware('perm:notifications.manage')->group(function () {
        Route::get('admin/notifications', [AdminNotificationController::class, 'index']);
        Route::post('admin/notifications/{id}/read', [AdminNotificationController::class, 'markRead']);
        Route::post('admin/notifications/{id}/resolve-password', [AdminNotificationController::class, 'resolvePasswordReset']);
    });

});
