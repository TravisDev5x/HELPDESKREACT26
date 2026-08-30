<?php

namespace Tests\Feature\Email;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InboundMailWebhookTest extends TestCase
{
    use RefreshDatabase;

    public function test_webhook_rejects_unknown_provider_without_processing_payload(): void
    {
        $response = $this->postJson('/api/webhook/inbound-mail/fake', [
            'recipient' => 'soporte@tenant.tikara.mx',
            'sender' => 'usuario@empresa.com',
            'subject' => 'Intento sin firma',
        ]);

        $response->assertNotFound()->assertJson(['error' => 'Unsupported provider']);
    }

    public function test_webhook_rejects_invalid_signature_with_401(): void
    {
        config(['services.mailgun.webhook_signing_key' => 'a-real-signing-key']);

        $response = $this->postJson('/api/webhook/inbound-mail/mailgun', [
            'timestamp' => (string) time(),
            'token' => 'abc123token',
            'signature' => 'not-the-right-signature',
            'recipient' => 'soporte@nadie.tikara.mx',
            'sender' => 'usuario@empresa.com',
            'subject' => 'Hola',
            'body-plain' => 'Prueba',
        ]);

        $response->assertStatus(401)->assertJson(['error' => 'Invalid signature']);
    }

    public function test_webhook_rejects_missing_signature_with_401(): void
    {
        config(['services.mailgun.webhook_signing_key' => 'a-real-signing-key']);

        $response = $this->postJson('/api/webhook/inbound-mail/mailgun', [
            'recipient' => 'soporte@nadie.tikara.mx',
            'sender' => 'usuario@empresa.com',
            'subject' => 'Hola',
            'body-plain' => 'Prueba',
        ]);

        $response->assertStatus(401)->assertJson(['error' => 'Invalid signature']);
    }

    public function test_webhook_accepts_valid_signature(): void
    {
        config(['services.mailgun.webhook_signing_key' => 'a-real-signing-key']);

        $timestamp = (string) time();
        $token = 'abc123token';
        $signature = hash_hmac('sha256', $timestamp.$token, 'a-real-signing-key');

        $response = $this->postJson('/api/webhook/inbound-mail/mailgun', [
            'timestamp' => $timestamp,
            'token' => $token,
            'signature' => $signature,
            // Dominio sin tenant registrado: el flujo debe seguir hasta "ignored",
            // no fallar en la verificación de firma.
            'recipient' => 'soporte@nadie.tikara.mx',
            'sender' => 'usuario@empresa.com',
            'subject' => 'Hola',
            'body-plain' => 'Prueba',
        ]);

        $response->assertStatus(200)->assertJson(['status' => 'ignored']);
    }

    public function test_webhook_rejects_a_replayed_valid_delivery(): void
    {
        config(['services.mailgun.webhook_signing_key' => 'a-real-signing-key']);

        $timestamp = (string) time();
        $token = 'single-use-token';
        $payload = [
            'timestamp' => $timestamp,
            'token' => $token,
            'signature' => hash_hmac('sha256', $timestamp.$token, 'a-real-signing-key'),
            'recipient' => 'soporte@nadie.tikara.mx',
            'sender' => 'usuario@empresa.com',
        ];

        $this->postJson('/api/webhook/inbound-mail/mailgun', $payload)->assertOk();
        $this->postJson('/api/webhook/inbound-mail/mailgun', $payload)->assertUnauthorized();
    }

    public function test_webhook_rejects_a_signature_outside_the_configured_time_window(): void
    {
        config([
            'services.mailgun.webhook_signing_key' => 'a-real-signing-key',
            'services.mailgun.webhook_max_age_seconds' => 60,
        ]);

        $timestamp = (string) (time() - 61);
        $token = 'expired-token';

        $this->postJson('/api/webhook/inbound-mail/mailgun', [
            'timestamp' => $timestamp,
            'token' => $token,
            'signature' => hash_hmac('sha256', $timestamp.$token, 'a-real-signing-key'),
        ])->assertUnauthorized();
    }
}
