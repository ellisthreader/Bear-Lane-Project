<?php

namespace Tests\Feature;

use App\Mail\AdminEventMail;
use App\Mail\InstantQuoteMail;
use App\Mail\PrintSpecialistRequestMail;
use App\Models\ProductVariant;
use App\Models\StoreSetting;
use App\Models\User;
use App\Services\AdminNotificationService;
use App\Services\OpenAiModerationService;
use App\Services\StoreSettingsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class OwnerContactTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        config(['services.recaptcha.secret' => null, 'services.recaptcha.site_key' => null]);
        $this->mock(OpenAiModerationService::class, function ($mock) {
            $mock->shouldReceive('moderate')->andReturn(['blocked' => false]);
            $mock->shouldReceive('detectPublicPageViolations')->andReturn([]);
        });
        $events = array_fill_keys(AdminNotificationService::REQUIRED_EVENTS, ['email' => false, 'in_app' => false]);
        StoreSetting::create(['key' => StoreSettingsService::KEY_ADMIN_NOTIFICATION_SETTINGS, 'value' => ['events' => $events]]);
    }

    private function assertOwnerEmail(string $event, ?string $replyTo = null, ?string $contains = null): void
    {
        Mail::assertQueued(AdminEventMail::class, function ($mail) use ($event, $replyTo, $contains) {
            return $mail->eventKey === $event && $mail->hasTo('bearlane01@gmail.com')
                && count($mail->to) === 1 && $mail->connection === 'database'
                && $mail->tries === 5 && (!$replyTo || $mail->envelope()->replyTo[0]->address === $replyTo)
                && (!$contains || str_contains($mail->data['messageBody'] ?? '', $contains));
        });
    }

    public function test_guest_support_request_reaches_owner_without_admin_accounts_or_optional_toggles(): void
    {
        $this->postJson('/support/messages', [
            'name' => 'Customer', 'email' => 'customer@example.com', 'subject' => 'Print question', 'message' => 'Can you print our team shirts?',
        ])->assertOk();
        $this->assertDatabaseHas('support_messages', ['email' => 'customer@example.com', 'subject' => 'Print question']);
        $this->assertOwnerEmail('support_message_submitted', 'customer@example.com', 'Can you print our team shirts?');
    }

    public function test_faq_includes_customer_email_and_details(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->postJson('/help/faq-requests', ['question' => 'Can I collect?', 'details' => 'I would like to collect next week.'])->assertOk();
        $this->assertOwnerEmail('faq_request_submitted', $user->email, 'I would like to collect next week.');
    }

    public function test_print_specialist_and_instant_quotes_keep_customer_confirmations_and_notify_owner(): void
    {
        $this->postJson('/api/quote-request', [
            'name' => 'Customer', 'email' => 'customer@example.com', 'phone' => '01234567890',
            'details' => 'Please quote for shirts.', 'budget' => '100',
        ])->assertCreated();
        $this->assertOwnerEmail('quote_request_submitted', 'customer@example.com');
        Mail::assertSent(PrintSpecialistRequestMail::class, fn ($mail) => $mail->hasTo('customer@example.com'));

        $this->postJson('/api/instant-quote', [
            'name' => 'Customer', 'email' => 'customer@example.com', 'quoteNumber' => '12345',
            'items' => [['quantity' => 2, 'productType' => 'Shirt', 'price' => 30]], 'total' => 30,
        ])->assertOk();
        $this->assertOwnerEmail('instant_quote_generated', 'customer@example.com');
        Mail::assertSent(InstantQuoteMail::class, fn ($mail) => $mail->hasTo('customer@example.com'));
    }

    public function test_legacy_quote_endpoint_also_notifies_owner(): void
    {
        $this->postJson('/api/send-quote', [
            'name' => 'Customer', 'email' => 'customer@example.com', 'quoteNumber' => 12345,
            'items' => [['quantity' => 1, 'productType' => 'Shirt', 'price' => 15]], 'total' => 15,
        ])->assertOk();
        $this->assertOwnerEmail('instant_quote_generated', 'customer@example.com');
    }

    public function test_chat_messages_and_ai_handover_are_emailed_with_content(): void
    {
        Event::fake([\App\Events\MessageSent::class]);
        $response = $this->postJson('/livechat/message', ['guest_id' => 'contact-test-guest', 'message' => 'Please help with my order.'])->assertCreated();
        $this->assertOwnerEmail('customer_chat_message', contains: 'Please help with my order.');
        $this->postJson('/livechat/message', [
            'chat_id' => $response->json('chat_id'), 'guest_id' => 'contact-test-guest',
            'message' => "[AI HANDOVER REQUEST]\nReason: Customer needs an agent\n- Please help",
        ])->assertCreated();
        $this->assertOwnerEmail('customer_chat_message', contains: 'Customer needs an agent');
    }

    public function test_restock_request_notifies_owner(): void
    {
        $variant = ProductVariant::factory()->for(\App\Models\Product::factory()->state(["category_id" => null]))->create(['stock' => 0]);
        $user = User::factory()->create();
        $this->actingAs($user)->postJson('/product/'.$variant->product->slug.'/notify-restock', [
            'colour' => $variant->colour, 'size' => $variant->size,
        ])->assertOk();
        $this->assertOwnerEmail('restock_requested', $user->email);
    }

    public function test_newsletter_request_is_validated_saved_and_emailed_once(): void
    {
        $this->postJson('/newsletter/requests', ['email' => 'customer@example.com'])->assertUnprocessable();
        $payload = ['email' => 'customer@example.com', 'consent' => true];
        $this->postJson('/newsletter/requests', $payload)->assertOk();
        $this->postJson('/newsletter/requests', $payload)->assertOk();
        $this->assertDatabaseHas('support_messages', ['email' => 'customer@example.com', 'source_type' => 'newsletter_request']);
        $this->assertOwnerEmail('newsletter_requested', 'customer@example.com');
        Mail::assertQueued(AdminEventMail::class, 1);
    }

    public function test_public_contact_address_cannot_drift_from_request_destination(): void
    {
        StoreSetting::create(['key' => StoreSettingsService::KEY_SITE_SETTINGS, 'value' => ['support_email' => 'old@example.com']]);
        $this->get('/support')->assertInertia(fn ($page) => $page->where('storeSettings.site.support_email', 'bearlane01@gmail.com'));
        $settings = app(StoreSettingsService::class);
        $this->assertSame('bearlane01@gmail.com', $settings->saveSiteSettings(['support_email' => 'other@example.com'])['support_email']);
    }

    public function test_plain_email_has_customer_reply_to_only_and_preserves_message_text(): void
    {
        Mail::swap(new \Illuminate\Mail\MailManager($this->app));
        $mail = new AdminEventMail('support_message_submitted', 'Support request', 'emails.owner-notification', [
            'heading' => 'Customer request', 'messageBody' => 'Please print A & B <team>',
            'email' => 'customer@example.com', 'adminUrl' => 'https://bear-lane.com/admin/support',
        ]);
        $sent = Mail::mailer('array')->to('bearlane01@gmail.com')->send($mail);
        $message = $sent->getSymfonySentMessage()->getOriginalMessage();
        $this->assertSame(['customer@example.com'], array_map(fn ($address) => $address->getAddress(), $message->getReplyTo()));
        $this->assertStringContainsString('Please print A & B <team>', $message->getTextBody());
        $this->assertNull($message->getHtmlBody());
    }
}
