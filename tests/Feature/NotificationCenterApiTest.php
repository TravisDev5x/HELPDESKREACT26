<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class NotificationCenterApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_only_gets_their_notifications_with_action_metadata(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $id = $this->insertNotification($user, 'ticket_escalated', ['ticket_id' => 41]);
        $otherId = $this->insertNotification($otherUser, 'tenant_boundary_violation');

        $response = $this->actingAs($user, 'web')->getJson('/api/notifications?filter=critical');

        $response->assertOk()
            ->assertJsonPath('unread_count', 1)
            ->assertJsonCount(1, 'notifications')
            ->assertJsonPath('notifications.0.id', $id)
            ->assertJsonPath('notifications.0.meta.severity', 'critical')
            ->assertJsonPath('notifications.0.meta.href', '/resolbeb/tickets/41');

        $this->assertNotEquals($otherId, $response->json('notifications.0.id'));
    }

    public function test_user_can_mark_only_their_notification_as_read(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $ownId = $this->insertNotification($user, 'oauth_auto_link');
        $otherId = $this->insertNotification($otherUser, 'oauth_auto_link');

        $this->actingAs($user, 'web')->postJson("/api/notifications/{$ownId}/read")
            ->assertOk()
            ->assertJsonPath('notification.meta.href', '/profile');

        $this->assertNotNull(DB::table('notifications')->where('id', $ownId)->value('read_at'));

        $this->actingAs($user, 'web')->postJson("/api/notifications/{$otherId}/read")
            ->assertNotFound();
        $this->assertNull(DB::table('notifications')->where('id', $otherId)->value('read_at'));
    }

    public function test_notification_preferences_are_saved_for_the_current_user(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'web')->putJson('/api/profile/preferences', [
            'notification_preferences' => [
                'realtime' => false,
                'informational' => false,
            ],
        ])->assertOk();

        $this->assertSame([
            'realtime' => false,
            'informational' => false,
        ], $user->fresh()->notification_preferences);
    }

    private function insertNotification(User $user, string $kind, array $extra = []): string
    {
        $id = (string) Str::uuid();
        $now = now();

        DB::table('notifications')->insert([
            'id' => $id,
            'type' => 'Tests\\Notifications\\Example',
            'notifiable_type' => User::class,
            'notifiable_id' => $user->id,
            'data' => json_encode(array_merge([
                'kind' => $kind,
                'message' => 'Aviso de prueba',
            ], $extra)),
            'read_at' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return $id;
    }
}
