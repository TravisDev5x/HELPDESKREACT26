<?php

namespace App\Http\Controllers\Webhook;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessInboundReply;
use App\Jobs\ProcessInboundTicket;
use App\Services\Email\InboundEmailService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class InboundMailController extends Controller
{
    public function __construct(
        private InboundEmailService $emailService
    ) {}

    public function handle(Request $request, string $provider): JsonResponse
    {
        $configuredProvider = (string) config('services.inbound_mail.provider');
        if ($provider !== $configuredProvider || $configuredProvider !== 'mailgun') {
            Log::warning('Tikara: proveedor de webhook no permitido', [
                'provider' => $provider,
                'ip' => $request->ip(),
            ]);

            return response()->json(['error' => 'Unsupported provider'], 404);
        }

        $payload = $request->all();

        if (! $this->emailService->verifyMailgunSignature($payload)) {
            Log::warning('Tikara: webhook signature inválida', [
                'provider' => $provider,
                'ip' => $request->ip(),
            ]);

            return response()->json(['error' => 'Invalid signature'], 401);
        }

        $parsedEmail = $this->emailService->parse($payload);

        $tenant = $this->emailService->resolveTenant($parsedEmail['to']);

        if (! $tenant) {
            Log::info('Tikara: email para dominio sin tenant', [
                'to' => $parsedEmail['to'],
            ]);

            return response()->json(['status' => 'ignored'], 200);
        }

        $folio = $this->emailService->detectFolio($parsedEmail);

        if ($folio) {
            ProcessInboundReply::dispatch($tenant->id, $folio, $parsedEmail);
        } else {
            ProcessInboundTicket::dispatch($tenant->id, $parsedEmail);
        }

        return response()->json(['status' => 'queued'], 200);
    }
}
