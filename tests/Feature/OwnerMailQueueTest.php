<?php

namespace Tests\Feature;

use App\Services\AdminNotificationService;
use Illuminate\Mail\Events\MessageSending;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class OwnerMailQueueTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('migrate:fresh', ['--force' => true])->assertSuccessful();
    }

    protected function tearDown(): void
    {
        \Illuminate\Foundation\Testing\RefreshDatabaseState::$migrated = false;
        parent::tearDown();
    }

    public function test_provider_failure_keeps_request_queued_and_a_retry_delivers_it(): void
    {
        config(['mail.default' => 'array']);
        app(AdminNotificationService::class)->sendAdminEventEmail(
            'support_message_submitted', 'Queue delivery test', 'Support request', 'A saved customer request',
            replyTo: 'customer@example.com',
        );
        $this->assertDatabaseCount('jobs', 1);
        Event::listen(MessageSending::class, fn () => throw new \RuntimeException('Temporary provider failure'));
        $this->artisan('queue:work', ['connection' => 'database', '--once' => true, '--sleep' => 0])->assertSuccessful();
        $this->assertDatabaseCount('jobs', 1);
        $this->assertDatabaseCount('failed_jobs', 0);
        $this->assertSame(1, DB::table('jobs')->value('attempts'));
        Event::forget(MessageSending::class);
        $this->travel(61)->seconds();
        $this->artisan('queue:work', ['connection' => 'database', '--once' => true, '--sleep' => 0])->assertSuccessful();
        $this->assertDatabaseCount('jobs', 0);
        $sent = Mail::mailer('array')->getSymfonyTransport()->messages();
        $this->assertCount(1, $sent);
        $this->assertSame('bearlane01@gmail.com', $sent->first()->getOriginalMessage()->getTo()[0]->getAddress());
    }
}
