<?php

namespace App\Http\Controllers\Api;

use App\Events\TicketCreated;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTicketRequest;
use App\Models\Ticket;
use App\Models\TicketAreaAccess;
use App\Models\TicketAttachment;
use App\Models\TicketHistory;
use App\Policies\RequesterTicketPolicy;
use App\Services\RequesterTicketService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Módulo "Mis Tickets": solo tickets donde el usuario es solicitante.
 * No comparte lógica con TicketController (operativo). Queries y políticas propias.
 */
class MyTicketsController extends Controller
{
    public function __construct(
        protected RequesterTicketService $requesterTicketService
    ) {}

    /**
     * Lista únicamente tickets creados por el usuario autenticado como solicitante.
     * Filtros básicos: estado, prioridad, fecha, tipo/categoría.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        if (! $user) {
            return response()->json(['message' => 'No autorizado'], 401);
        }

        $policy = app(RequesterTicketPolicy::class);
        if (! $policy->viewAny($user)) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $query = Ticket::query()
            ->requesterOnly($user->id)
            ->with([
                'areaOrigin:id,name',
                'areaCurrent:id,name',
                'sede:id,name',
                'ticketType:id,name',
                'priority:id,name,level',
                'state:id,name,code',
            ]);

        $this->applyRequesterFilters($request, $query);

        $query->orderByDesc('id');

        $perPage = (int) $request->input('per_page', 10);
        $perPage = in_array($perPage, [10, 25, 50, 100], true) ? $perPage : 10;

        return $query->paginate($perPage);
    }

    /**
     * Detalle de un ticket propio (solo solicitante). Oculta notas internas.
     */
    public function show(Ticket $ticket)
    {
        $user = Auth::user();
        if (! $user) {
            return response()->json(['message' => 'No autorizado'], 401);
        }

        $policy = app(RequesterTicketPolicy::class);
        if (! $policy->view($user, $ticket)) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $ticket->load([
            'areaOrigin:id,name',
            'areaCurrent:id,name',
            'sede:id,name',
            'ubicacion:id,name,sede_id',
            'requester:id,name,email',
            'assignedUser:id,name,position_id',
            'ticketType:id,name',
            'priority:id,name,level',
            'state:id,name,code,is_final',
            'histories' => function ($q) {
                $q->orderByDesc('created_at');
                $q->with(['actor:id,name,email', 'state:id,name,code']);
            },
            'attachments' => function ($q) {
                $q->orderByDesc('created_at');
                $q->with('uploader:id,name');
            },
        ]);

        $ticket->setRelation(
            'histories',
            $ticket->histories->reject(fn ($h) => $h->action === 'comment' && $h->is_internal)->values()
        );

        return $this->withRequesterAbilities($ticket);
    }

    /**
     * Crear ticket (el usuario será siempre requester).
     */
    public function store(StoreTicketRequest $request)
    {
        $user = Auth::user();
        if (! $user) {
            return response()->json(['message' => 'No autorizado'], 401);
        }

        $policy = app(RequesterTicketPolicy::class);
        if (! $policy->create($user)) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $data = $request->validated();
        $data['requester_id'] = $user->id;
        $data['requester_position_id'] = $user->position_id ?? null;
        $clientCreatedAt = Carbon::parse($data['created_at'])->timezone(config('app.timezone'));
        unset($data['created_at']);

        return DB::transaction(function () use ($data, $user, $clientCreatedAt) {
            $ticket = new Ticket($data);
            $ticket->created_at = $clientCreatedAt;
            if (! empty($data['due_at'])) {
                $ticket->due_at = Carbon::parse($data['due_at'])->timezone(config('app.timezone'));
            } else {
                $ticket->due_at = $clientCreatedAt->copy()->addHours(Ticket::SLA_LIMIT_HOURS);
            }
            $ticket->save();

            foreach ([$ticket->area_origin_id, $ticket->area_current_id] as $areaId) {
                try {
                    TicketAreaAccess::firstOrCreate(
                        ['ticket_id' => $ticket->id, 'area_id' => $areaId],
                        ['reason' => 'created', 'created_at' => now()]
                    );
                } catch (\Throwable $e) {
                    // fallo silencioso
                }
            }

            TicketHistory::create([
                'ticket_id' => $ticket->id,
                'actor_id' => $user->id,
                'from_area_id' => null,
                'to_area_id' => $ticket->area_current_id,
                'ticket_state_id' => $ticket->ticket_state_id,
                'note' => 'Creación de ticket',
                'is_internal' => false,
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

            return response()->json($this->withRequesterAbilities($ticket), 201);
        });
    }

    /**
     * Enviar alerta/observación como solicitante.
     */
    public function sendAlert(Request $request, Ticket $ticket)
    {
        $user = Auth::user();
        if (! $user) {
            return response()->json(['message' => 'No autorizado'], 401);
        }

        $policy = app(RequesterTicketPolicy::class);
        if (! $policy->alert($user, $ticket)) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $data = $request->validate([
            'message' => 'nullable|string|max:1000',
        ]);

        $result = $this->requesterTicketService->sendAlert(
            $ticket,
            $user,
            $data['message'] ?? null
        );

        $ticket = $result['ticket'];
        $ticket->load([
            'areaOrigin:id,name',
            'areaCurrent:id,name',
            'sede:id,name',
            'ubicacion:id,name',
            'requester:id,name,email',
            'assignedUser:id,name,position_id',
            'ticketType:id,name',
            'priority:id,name,level',
            'state:id,name,code',
        ]);

        return response()->json([
            'alert' => $result['alert'],
            'ticket' => $this->withRequesterAbilities($ticket),
        ], 201);
    }

    /**
     * Añadir comentario como solicitante (visible en el historial).
     */
    public function addComment(Request $request, Ticket $ticket)
    {
        $user = Auth::user();
        if (! $user) {
            return response()->json(['message' => 'No autorizado'], 401);
        }

        $policy = app(RequesterTicketPolicy::class);
        if (! $policy->comment($user, $ticket)) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $data = $request->validate([
            'note' => 'required|string|max:10000',
        ]);

        try {
            $history = $this->requesterTicketService->addComment($ticket, $user, $data['note']);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $ticket->load([
            'histories' => function ($q) {
                $q->orderByDesc('created_at');
                $q->with(['actor:id,name,email', 'state:id,name,code']);
            },
        ]);

        return response()->json([
            'history' => $history->load(['actor:id,name,email', 'state:id,name,code']),
            'ticket' => $this->withRequesterAbilities($ticket),
        ], 201);
    }

    /**
     * Subir adjuntos al ticket como solicitante.
     */
    public function storeAttachment(Request $request, Ticket $ticket)
    {
        $user = Auth::user();
        if (! $user) {
            return response()->json(['message' => 'No autorizado'], 401);
        }

        $policy = app(RequesterTicketPolicy::class);
        if (! $policy->attach($user, $ticket)) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $data = $request->validate([
            'attachments' => 'required|array',
            'attachments.*' => 'file|max:10240',
        ]);

        $saved = [];
        foreach ($request->file('attachments', []) as $file) {
            $path = $file->store("tickets/{$ticket->id}", ['disk' => 'public']);
            $attachment = TicketAttachment::create([
                'ticket_id' => $ticket->id,
                'uploaded_by' => $user->id,
                'original_name' => $file->getClientOriginalName(),
                'file_name' => basename($path),
                'file_path' => $path,
                'mime_type' => $file->getClientMimeType(),
                'size' => $file->getSize(),
                'disk' => 'public',
            ]);
            $saved[] = $attachment;
        }

        return response()->json($saved, 201);
    }

    /**
     * Cancelar ticket como solicitante (solo antes de que soporte lo tome).
     */
    public function cancel(Ticket $ticket)
    {
        $user = Auth::user();
        if (! $user) {
            return response()->json(['message' => 'No autorizado'], 401);
        }

        $policy = app(RequesterTicketPolicy::class);
        if (! $policy->cancel($user, $ticket)) {
            $message = $ticket->assigned_user_id
                ? 'Solo puedes cancelar antes de que soporte tome el ticket.'
                : 'No puedes cancelar este ticket.';
            return response()->json(['message' => $message], 403);
        }

        try {
            $ticket = $this->requesterTicketService->cancel($ticket, $user);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $ticket->load([
            'areaOrigin:id,name',
            'areaCurrent:id,name',
            'sede:id,name',
            'ubicacion:id,name',
            'requester:id,name,email',
            'assignedUser:id,name,position_id',
            'ticketType:id,name',
            'priority:id,name,level',
            'state:id,name,code',
            'histories' => function ($q) {
                $q->orderByDesc('created_at');
                $q->with(['actor:id,name,email', 'state:id,name,code']);
            },
        ]);

        return response()->json($this->withRequesterAbilities($ticket));
    }

    /**
     * Descargar adjunto de un ticket propio (solo solicitante).
     */
    public function downloadAttachment(Ticket $ticket, TicketAttachment $attachment)
    {
        $user = Auth::user();
        if (! $user) {
            return response()->json(['message' => 'No autorizado'], 401);
        }

        $policy = app(RequesterTicketPolicy::class);
        if (! $policy->view($user, $ticket)) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        if ((int) $attachment->ticket_id !== (int) $ticket->id) {
            return response()->json(['message' => 'Adjunto no válido'], 404);
        }

        if (! $attachment->file_path || ! Storage::disk($attachment->disk ?: 'public')->exists($attachment->file_path)) {
            return response()->json(['message' => 'Archivo no encontrado'], 404);
        }

        return Storage::disk($attachment->disk ?: 'public')->download(
            $attachment->file_path,
            $attachment->original_name,
            ['Content-Type' => $attachment->mime_type]
        );
    }

    /**
     * Filtros básicos solo sobre tickets del solicitante.
     */
    protected function applyRequesterFilters(Request $request, $query): void
    {
        if ($request->filled('ticket_state_id')) {
            $query->where('ticket_state_id', $request->input('ticket_state_id'));
        }
        if ($request->filled('priority_id')) {
            $query->where('priority_id', $request->input('priority_id'));
        }
        if ($request->filled('ticket_type_id')) {
            $query->where('ticket_type_id', $request->input('ticket_type_id'));
        }
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->input('date_from'));
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->input('date_to'));
        }
    }

    /**
     * Abilities solo para contexto solicitante. Sin acciones operativas (assign, escalate, etc.).
     */
    protected function withRequesterAbilities(Ticket $ticket): Ticket
    {
        $user = Auth::user();
        $policy = app(RequesterTicketPolicy::class);

        $ticket->setAttribute('abilities', [
            'alert' => $user && $policy->alert($user, $ticket),
            'comment' => $user && $policy->comment($user, $ticket),
            'attach' => $user && $policy->attach($user, $ticket),
            'cancel' => $user && $policy->cancel($user, $ticket),
        ]);

        return $ticket;
    }
}
