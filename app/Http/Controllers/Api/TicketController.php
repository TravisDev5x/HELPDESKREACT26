<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ticket;
use App\Models\TicketHistory;
use App\Models\TicketAreaAccess;
use App\Models\TicketState;
use App\Models\User;
use App\Notifications\Tickets\TicketAssignedNotification;
use App\Notifications\Tickets\TicketReassignedNotification;
use App\Notifications\Tickets\TicketEscalatedNotification;
use App\Events\TicketCreated;
use App\Events\TicketUpdated;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class TicketController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['message' => 'No autorizado'], 401);
        }

        // Mensaje claro si falta área para permisos de área (no aplica a manage_all)
        if (!$user->can('tickets.manage_all') && $user->can('tickets.view_area') && !$user->area_id) {
            Log::warning('tickets.view_area sin area_id', ['user_id' => $user->id]);
            return response()->json(['message' => 'Asigna tu área para acceder a tickets'], 403);
        }

        Gate::authorize('viewAny', Ticket::class);

        $query = Ticket::with([
            'areaOrigin:id,name',
            'areaCurrent:id,name',
            'sede:id,name',
            'ubicacion:id,name,sede_id',
            'requester:id,name,email',
            'assignedUser:id,name,position_id',
            'ticketType:id,name',
            'priority:id,name,level',
            'state:id,name,code',
        ]);

        // Alcance base via Policy (mismo comportamiento que antes)
        $policy = app(\App\Policies\TicketPolicy::class);
        $query = $policy->scopeFor($user, $query);

        $filters = [
            'area_current_id' => 'area_current_id',
            'area_origin_id' => 'area_origin_id',
            'sede_id' => 'sede_id',
            'ubicacion_id' => 'ubicacion_id',
            'ticket_type_id' => 'ticket_type_id',
            'priority_id' => 'priority_id',
            'ticket_state_id' => 'ticket_state_id',
        ];
        foreach ($filters as $param => $column) {
            if ($request->filled($param)) {
                if ($param === 'sede_id' && !$user->can('tickets.filter_by_sede') && !$user->can('tickets.manage_all')) {
                    continue;
                }
                $query->where($column, $request->input($param));
            }
        }

        $assignedTo = $request->input('assigned_to');
        $assignedStatus = $request->input('assigned_status');
        if ($assignedTo === 'me') {
            $query->where('assigned_user_id', $user->id);
        } elseif ($assignedStatus === 'unassigned') {
            $query->whereNull('assigned_user_id');
        } elseif ($request->filled('assigned_user_id')) {
            $assigneeId = (int) $request->input('assigned_user_id');
            $allowed = true;
            if (!$user->can('tickets.manage_all')) {
                $allowed = DB::table('users')
                    ->where('id', $assigneeId)
                    ->where('area_id', $user->area_id)
                    ->exists();
            }
            if ($allowed) {
                $query->where('assigned_user_id', $assigneeId);
            }
        }

        $assignedTo = $request->input('assigned_to');
        $assignedStatus = $request->input('assigned_status');
        if ($assignedTo === 'me') {
            $query->where('assigned_user_id', $user->id);
        } elseif ($assignedStatus === 'unassigned') {
            $query->whereNull('assigned_user_id');
        } elseif ($request->filled('assigned_user_id')) {
            $assigneeId = (int) $request->input('assigned_user_id');
            $allowed = true;
            if (!$user->can('tickets.manage_all')) {
                $allowed = DB::table('users')
                    ->where('id', $assigneeId)
                    ->where('area_id', $user->area_id)
                    ->exists();
            }
            if ($allowed) {
                $query->where('assigned_user_id', $assigneeId);
            }
        }

        $query->orderByDesc('id');

        // Paginación segura
        $allowedPerPage = [10, 25, 50, 100];
        $perPage = (int) $request->input('per_page', 10);
        if (!in_array($perPage, $allowedPerPage, true)) {
            $perPage = 10;
        }

        return $query->paginate($perPage);
    }

    /**
     * Exporta tickets visibles para el usuario en CSV.
     */
    public function export(Request $request)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['message' => 'No autorizado'], 401);
        }
        Gate::authorize('viewAny', Ticket::class);

        $query = Ticket::with([
            'areaOrigin:id,name',
            'areaCurrent:id,name',
            'sede:id,name',
            'ticketType:id,name',
            'priority:id,name',
            'state:id,name',
        ]);

        $policy = app(\App\Policies\TicketPolicy::class);
        $query = $policy->scopeFor($user, $query);

        $filters = [
            'area_current_id' => 'area_current_id',
            'area_origin_id' => 'area_origin_id',
            'sede_id' => 'sede_id',
            'ubicacion_id' => 'ubicacion_id',
            'ticket_type_id' => 'ticket_type_id',
            'priority_id' => 'priority_id',
            'ticket_state_id' => 'ticket_state_id',
        ];
        foreach ($filters as $param => $column) {
            if ($request->filled($param)) {
                if ($param === 'sede_id' && !$user->can('tickets.filter_by_sede') && !$user->can('tickets.manage_all')) {
                    continue;
                }
                $query->where($column, $request->input($param));
            }
        }

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="tickets.csv"',
        ];

        $callback = function () use ($query) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['id', 'created_at', 'area_origen', 'area_actual', 'sede', 'tipo', 'prioridad', 'estado']);
            $query->chunk(500, function ($tickets) use ($out) {
                foreach ($tickets as $t) {
                    fputcsv($out, [
                        $t->id,
                        $t->created_at,
                        $t->areaOrigin->name ?? '',
                        $t->areaCurrent->name ?? '',
                        $t->sede->name ?? '',
                        $t->ticketType->name ?? '',
                        $t->priority->name ?? '',
                        $t->state->name ?? '',
                    ]);
                }
            });
            fclose($out);
        };

        return response()->stream($callback, 200, $headers);
    }

    public function show(Ticket $ticket)
    {
        $user = Auth::user();
        if ($user && !$user->can('tickets.manage_all') && $user->can('tickets.view_area') && !$user->area_id) {
            Log::warning('tickets.show sin area_id', ['user_id' => $user->id, 'ticket_id' => $ticket->id]);
            return response()->json(['message' => 'Asigna tu área para acceder a tickets'], 403);
        }
        Gate::authorize('view', $ticket);
        $ticket->load([
            'areaOrigin:id,name',
            'areaCurrent:id,name',
            'sede:id,name',
            'ubicacion:id,name,sede_id',
            'requester:id,name,email',
            'requesterPosition:id,name',
            'assignedUser:id,name,position_id',
            'assignedUser.position:id,name',
            'ticketType:id,name',
            'priority:id,name,level',
            'state:id,name,code',
            'histories' => function ($q) {
                $q->orderByDesc('created_at');
                $q->with([
                    'actor:id,name,email',
                    'fromAssignee:id,name,position_id',
                    'toAssignee:id,name,position_id',
                    'fromArea:id,name',
                    'toArea:id,name',
                    'state:id,name,code',
                ]);
            },
        ]);
        return $this->withAbilities($ticket);
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'No autorizado'], 401);
        Gate::authorize('create', Ticket::class);
        if (!$user->can('tickets.create') && !$user->can('tickets.manage_all')) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $data = $request->validate([
            'subject' => 'required|string|max:255',
            'description' => 'nullable|string',
            'area_origin_id' => 'required|exists:areas,id',
            'area_current_id' => 'required|exists:areas,id',
            'sede_id' => 'required|exists:sedes,id',
            'ubicacion_id' => 'nullable|exists:ubicaciones,id',
            'ticket_type_id' => 'required|exists:ticket_types,id',
            'priority_id' => 'required|exists:priorities,id',
            'ticket_state_id' => 'required|exists:ticket_states,id',
            'created_at' => 'required|date|before_or_equal:now',
        ]);

        $data['requester_id'] = $user->id;
        $data['requester_position_id'] = $user->position_id ?? null;
        $clientCreatedAt = Carbon::parse($data['created_at'])->timezone(config('app.timezone'));
        unset($data['created_at']);

        return DB::transaction(function () use ($data, $user, $clientCreatedAt) {
            $ticket = new Ticket($data);
            $ticket->created_at = $clientCreatedAt;
            $ticket->save();

            try {
                TicketAreaAccess::firstOrCreate(
                    ['ticket_id' => $ticket->id, 'area_id' => $ticket->area_origin_id],
                    ['reason' => 'created', 'created_at' => now()]
                );
            } catch (\Throwable $e) {
                // fallos silenciosos para no afectar la creacion del ticket
            }
            try {
                TicketAreaAccess::firstOrCreate(
                    ['ticket_id' => $ticket->id, 'area_id' => $ticket->area_current_id],
                    ['reason' => 'created', 'created_at' => now()]
                );
            } catch (\Throwable $e) {
                // fallos silenciosos para no afectar la creacion del ticket
            }

            TicketHistory::create([
                'ticket_id' => $ticket->id,
                'actor_id' => $user->id,
                'from_area_id' => null,
                'to_area_id' => $ticket->area_current_id,
                'ticket_state_id' => $ticket->ticket_state_id,
                'note' => 'Creación de ticket',
                'created_at' => $ticket->created_at,
            ]);

            TicketCreated::dispatch($ticket);

            $ticket->load(
                'areaOrigin:id,name',
                'areaCurrent:id,name',
                'sede:id,name',
                'ubicacion:id,name',
                'ticketType:id,name',
                'priority:id,name,level',
                'state:id,name'
            );
            return response()->json($this->withAbilities($ticket), 201);
        });
    }

    public function update(Request $request, Ticket $ticket)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'No autorizado'], 401);
        if (!$user->can('tickets.manage_all') && $user->can('tickets.view_area') && !$user->area_id) {
            Log::warning('tickets.update sin area_id', ['user_id' => $user->id, 'ticket_id' => $ticket->id]);
            return response()->json(['message' => 'Asigna tu área para acceder a tickets'], 403);
        }
        Gate::authorize('update', $ticket);

        $data = $request->validate([
            'ticket_state_id' => 'nullable|exists:ticket_states,id',
            'priority_id' => 'nullable|exists:priorities,id',
            'area_current_id' => 'nullable|exists:areas,id',
            'note' => 'nullable|string|max:1000',
        ]);

        return DB::transaction(function () use ($data, $ticket, $user) {
            $fromArea = $ticket->area_current_id;
            $toArea = null;
            $fromAssignee = $ticket->assigned_user_id;
            $didEscalate = false;

            if (isset($data['ticket_state_id'])) {
                Gate::authorize('changeStatus', $ticket);
                $ticket->ticket_state_id = $data['ticket_state_id'];
            }
            if (isset($data['priority_id'])) {
                Gate::authorize('changeStatus', $ticket);
                $ticket->priority_id = $data['priority_id'];
            }
            if (isset($data['area_current_id'])) {
                Gate::authorize('changeArea', $ticket);
                $newArea = $data['area_current_id'];
                if ((int) $newArea !== (int) $ticket->area_current_id) {
                    $ticket->area_current_id = $newArea;
                    $toArea = $newArea;
                    $didEscalate = true;
                    $ticket->assigned_user_id = null;
                    $ticket->assigned_at = null;
                }
            }

            $noteProvided = array_key_exists('note', $data) && $data['note'];
            $noteAllowed = false;
            if ($noteProvided) {
                if (!Gate::allows('comment', $ticket)) {
                    Log::warning('tickets.comment sin permiso', ['user_id' => $user->id, 'ticket_id' => $ticket->id]);
                    abort(403, 'No puede comentar');
                }
                $noteAllowed = true;
            }

            $ticket->save();

            if ($toArea) {
                try {
                    TicketAreaAccess::firstOrCreate(
                        ['ticket_id' => $ticket->id, 'area_id' => $toArea],
                        ['reason' => 'escalated', 'created_at' => now()]
                    );
                } catch (\Throwable $e) {
                    // fallos silenciosos para no afectar la escalacion
                }
            }

            TicketHistory::create([
                'ticket_id' => $ticket->id,
                'actor_id' => $user->id,
                'from_area_id' => $fromArea,
                'to_area_id' => $ticket->area_current_id,
                'ticket_state_id' => $ticket->ticket_state_id,
                'note' => $noteAllowed ? ($data['note'] ?? null) : null,
                'action' => $didEscalate ? 'escalated' : null,
                'from_assignee_id' => $didEscalate ? $fromAssignee : null,
                'to_assignee_id' => $didEscalate ? null : null,
            ]);

            if ($didEscalate && $toArea) {
                $this->notifyEscalated($ticket, $user, (int) $toArea);
            }

            TicketUpdated::dispatch($ticket);

            $ticket->load(
                'areaOrigin:id,name',
                'areaCurrent:id,name',
                'sede:id,name',
                'ubicacion:id,name',
                'assignedUser:id,name,position_id',
                'assignedUser.position:id,name',
                'ticketType:id,name',
                'priority:id,name,level',
                'state:id,name',
                'histories.actor:id,name,email',
                'histories.fromAssignee:id,name,position_id',
                'histories.toAssignee:id,name,position_id',
                'histories.fromArea:id,name',
                'histories.toArea:id,name',
                'histories.state:id,name,code',
            );
            return response()->json($this->withAbilities($ticket));
        });
    }

    public function take(Ticket $ticket)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'No autorizado'], 401);

        Gate::authorize('assign', $ticket);

        if ($ticket->assigned_user_id) {
            return response()->json(['message' => 'Ticket ya asignado'], 409);
        }

        return DB::transaction(function () use ($ticket, $user) {
            $openStateId = TicketState::where('code', 'abierto')->value('id');
            if (!$openStateId) {
                $openStateId = TicketState::where('name', 'like', '%abiert%')->value('id');
            }
            $progressStateId = TicketState::where('code', 'en_progreso')->value('id');
            if (!$progressStateId) {
                $progressStateId = TicketState::where('name', 'like', '%progres%')->value('id');
            }

            $ticket->assigned_user_id = $user->id;
            $ticket->assigned_at = now();

            if ($openStateId && $progressStateId && (int) $ticket->ticket_state_id === (int) $openStateId) {
                $ticket->ticket_state_id = $progressStateId;
            }

            $ticket->save();

            TicketHistory::create([
                'ticket_id' => $ticket->id,
                'actor_id' => $user->id,
                'ticket_state_id' => $ticket->ticket_state_id,
                'action' => 'assigned',
                'from_assignee_id' => null,
                'to_assignee_id' => $user->id,
            ]);

            $this->notifyAssignment($ticket, $user, $user->id, 'assigned');

            $ticket->load(
                'areaOrigin:id,name',
                'areaCurrent:id,name',
                'sede:id,name',
                'ubicacion:id,name',
                'assignedUser:id,name,position_id',
                'assignedUser.position:id,name',
                'ticketType:id,name',
                'priority:id,name,level',
                'state:id,name',
                'histories.actor:id,name,email',
                'histories.fromAssignee:id,name,position_id',
                'histories.toAssignee:id,name,position_id',
                'histories.fromArea:id,name',
                'histories.toArea:id,name',
                'histories.state:id,name,code',
            );
            return response()->json($this->withAbilities($ticket));
        });
    }

    public function assign(Request $request, Ticket $ticket)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'No autorizado'], 401);

        Gate::authorize('assign', $ticket);

        $data = $request->validate([
            'assigned_user_id' => 'required|exists:users,id',
        ]);

        $newUser = User::findOrFail((int) $data['assigned_user_id']);

        if (!$user->can('tickets.manage_all')) {
            if (!$newUser->area_id || (int) $newUser->area_id !== (int) $ticket->area_current_id) {
                return response()->json(['message' => 'Responsable fuera del area actual'], 422);
            }
        }

        if ((int) $ticket->assigned_user_id === (int) $newUser->id) {
            return response()->json(['message' => 'Ticket ya asignado a ese usuario'], 409);
        }

        return DB::transaction(function () use ($ticket, $user, $newUser) {
            $prevAssignee = $ticket->assigned_user_id;

            $ticket->assigned_user_id = $newUser->id;
            $ticket->assigned_at = now();
            $ticket->save();

            TicketHistory::create([
                'ticket_id' => $ticket->id,
                'actor_id' => $user->id,
                'ticket_state_id' => $ticket->ticket_state_id,
                'action' => 'reassigned',
                'from_assignee_id' => $prevAssignee,
                'to_assignee_id' => $newUser->id,
            ]);

            $this->notifyAssignment($ticket, $user, $newUser->id, 'reassigned');

            $ticket->load(
                'areaOrigin:id,name',
                'areaCurrent:id,name',
                'sede:id,name',
                'ubicacion:id,name',
                'assignedUser:id,name,position_id',
                'assignedUser.position:id,name',
                'ticketType:id,name',
                'priority:id,name,level',
                'state:id,name',
                'histories.actor:id,name,email',
                'histories.fromAssignee:id,name,position_id',
                'histories.toAssignee:id,name,position_id',
                'histories.fromArea:id,name',
                'histories.toArea:id,name',
                'histories.state:id,name,code',
            );
            return response()->json($this->withAbilities($ticket));
        });
    }

    public function unassign(Ticket $ticket)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'No autorizado'], 401);

        Gate::authorize('assign', $ticket);

        if (!$ticket->assigned_user_id) {
            return response()->json(['message' => 'Ticket sin responsable'], 409);
        }

        return DB::transaction(function () use ($ticket, $user) {
            $prevAssignee = $ticket->assigned_user_id;

            $ticket->assigned_user_id = null;
            $ticket->assigned_at = null;
            $ticket->save();

            TicketHistory::create([
                'ticket_id' => $ticket->id,
                'actor_id' => $user->id,
                'ticket_state_id' => $ticket->ticket_state_id,
                'action' => 'unassigned',
                'from_assignee_id' => $prevAssignee,
                'to_assignee_id' => null,
            ]);

            $ticket->load(
                'areaOrigin:id,name',
                'areaCurrent:id,name',
                'sede:id,name',
                'ubicacion:id,name',
                'assignedUser:id,name,position_id',
                'assignedUser.position:id,name',
                'ticketType:id,name',
                'priority:id,name,level',
                'state:id,name',
                'histories.actor:id,name,email',
                'histories.fromAssignee:id,name,position_id',
                'histories.toAssignee:id,name,position_id',
                'histories.fromArea:id,name',
                'histories.toArea:id,name',
                'histories.state:id,name,code',
            );
            return response()->json($this->withAbilities($ticket));
        });
    }

    public function escalate(Request $request, Ticket $ticket)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'No autorizado'], 401);

        Gate::authorize('escalate', $ticket);

        $data = $request->validate([
            'area_destino_id' => 'required|exists:areas,id',
            'note' => 'nullable|string|max:1000',
        ]);

        $noteProvided = array_key_exists('note', $data) && $data['note'];
        if ($noteProvided && !Gate::allows('comment', $ticket)) {
            Log::warning('tickets.comment sin permiso', ['user_id' => $user->id, 'ticket_id' => $ticket->id]);
            abort(403, 'No puede comentar');
        }

        $newArea = (int) $data['area_destino_id'];
        if ($newArea === (int) $ticket->area_current_id) {
            return response()->json(['message' => 'Area destino igual a area actual'], 409);
        }

        return DB::transaction(function () use ($ticket, $user, $newArea, $data) {
            $fromArea = $ticket->area_current_id;
            $fromAssignee = $ticket->assigned_user_id;

            $ticket->area_current_id = $newArea;
            $ticket->assigned_user_id = null;
            $ticket->assigned_at = null;
            $ticket->save();

            try {
                TicketAreaAccess::firstOrCreate(
                    ['ticket_id' => $ticket->id, 'area_id' => $newArea],
                    ['reason' => 'escalated', 'created_at' => now()]
                );
            } catch (\Throwable $e) {
                // fallos silenciosos para no afectar la escalacion
            }

            TicketHistory::create([
                'ticket_id' => $ticket->id,
                'actor_id' => $user->id,
                'from_area_id' => $fromArea,
                'to_area_id' => $newArea,
                'ticket_state_id' => $ticket->ticket_state_id,
                'note' => $data['note'] ?? null,
                'action' => 'escalated',
                'from_assignee_id' => $fromAssignee,
                'to_assignee_id' => null,
            ]);

            $this->notifyEscalated($ticket, $user, $newArea);

            $ticket->load(
                'areaOrigin:id,name',
                'areaCurrent:id,name',
                'sede:id,name',
                'ubicacion:id,name',
                'assignedUser:id,name,position_id',
                'assignedUser.position:id,name',
                'ticketType:id,name',
                'priority:id,name,level',
                'state:id,name',
                'histories.actor:id,name,email',
                'histories.fromAssignee:id,name,position_id',
                'histories.toAssignee:id,name,position_id',
                'histories.fromArea:id,name',
                'histories.toArea:id,name',
                'histories.state:id,name,code',
            );
            return response()->json($this->withAbilities($ticket));
        });
    }

    protected function hasTicketPermission(User $user): bool
    {
        return $user->hasAnyPermission([
            'tickets.create',
            'tickets.view_own',
            'tickets.view_area',
            'tickets.filter_by_sede',
            'tickets.assign',
            'tickets.comment',
            'tickets.change_status',
            'tickets.escalate',
            'tickets.manage_all',
        ]);
    }

    protected function notifyAssignment(Ticket $ticket, User $actor, int $assigneeId, string $action): void
    {
        $recipientIds = collect([$assigneeId, $ticket->requester_id])
            ->filter()
            ->unique()
            ->values();

        if ($recipientIds->isEmpty()) {
            return;
        }

        $users = User::whereIn('id', $recipientIds)->get();
        foreach ($users as $u) {
            if (!$this->hasTicketPermission($u)) {
                continue;
            }

            $isAssignee = (int) $u->id === (int) $assigneeId;
            $message = $isAssignee
                ? "Ticket #{$ticket->id} " . ($action === 'assigned' ? 'asignado a ti' : 'reasignado a ti')
                : "Tu ticket #{$ticket->id} fue " . ($action === 'assigned' ? 'asignado' : 'reasignado');

            $notification = $action === 'assigned'
                ? new TicketAssignedNotification($ticket->id, $message, $actor->id)
                : new TicketReassignedNotification($ticket->id, $message, $actor->id);

            $this->safeNotify($u, $notification, $ticket->id, $action);
        }
    }

    protected function notifyEscalated(Ticket $ticket, User $actor, int $areaId): void
    {
        $recipients = User::permission('tickets.view_area')
            ->where('area_id', $areaId)
            ->get();

        $requester = $ticket->requester_id ? User::find($ticket->requester_id) : null;
        if ($requester && $recipients->where('id', $requester->id)->isEmpty()) {
            $recipients->push($requester);
        }

        $seen = [];
        foreach ($recipients as $u) {
            if (in_array($u->id, $seen, true)) {
                continue;
            }
            $seen[] = $u->id;

            if (!$this->hasTicketPermission($u)) {
                continue;
            }

            $isRequester = (int) $u->id === (int) $ticket->requester_id;
            $message = $isRequester
                ? "Tu ticket #{$ticket->id} fue escalado"
                : "Ticket #{$ticket->id} escalado a tu area";

            $notification = new TicketEscalatedNotification($ticket->id, $message, $actor->id);
            $this->safeNotify($u, $notification, $ticket->id, 'escalated');
        }
    }

    protected function safeNotify(User $user, $notification, int $ticketId, string $action): void
    {
        try {
            $user->notify($notification);
        } catch (\Throwable $e) {
            Log::warning('ticket notification failed', [
                'user_id' => $user->id,
                'ticket_id' => $ticketId,
                'action' => $action,
                'error' => $e->getMessage(),
            ]);
        }
    }

    protected function withAbilities(Ticket $ticket): Ticket
    {
        $ticket->setAttribute('abilities', [
            'assign' => Gate::allows('assign', $ticket),
            'escalate' => Gate::allows('escalate', $ticket),
            'comment' => Gate::allows('comment', $ticket),
            'change_status' => Gate::allows('changeStatus', $ticket),
            'change_area' => Gate::allows('changeArea', $ticket),
        ]);

        return $ticket;
    }
}
