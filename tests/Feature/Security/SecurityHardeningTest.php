<?php

namespace Tests\Feature\Security;

use Tests\TestCase;

class SecurityHardeningTest extends TestCase
{
    public function test_unauthenticated_responses_include_baseline_security_headers(): void
    {
        $this->get('/login')->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'SAMEORIGIN')
            ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
            ->assertHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
    }

    public function test_https_responses_include_hsts(): void
    {
        $this->get('https://tikara.test/login')
            ->assertHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    public function test_public_disk_diagnostic_route_is_not_registered(): void
    {
        $this->get('/test-disco')->assertNotFound();
    }
}
