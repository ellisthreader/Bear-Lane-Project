<?php

namespace App\Services;

use App\Mail\AdminEventMail;
use Illuminate\Support\Facades\Mail;

class AdminNotificationService
{
    public const REQUIRED_EVENTS = [
        'support_message_submitted', 'faq_request_submitted', 'quote_request_submitted',
        'instant_quote_generated', 'new_live_chat', 'customer_chat_message',
        'return_request_submitted', 'return_evidence_submitted', 'return_parcel_sent',
        'restock_requested', 'newsletter_requested', 'new_order',
    ];

    public function __construct(private readonly StoreSettingsService $settings)
    {
    }

    public function inAppEnabled(string $eventKey): bool
    {
        return $this->settings->isAdminInAppNotificationEnabled($eventKey);
    }

    public function emailEnabled(string $eventKey): bool
    {
        return in_array($eventKey, self::REQUIRED_EVENTS, true)
            || $this->settings->isAdminEmailNotificationEnabled($eventKey);
    }

    public function sendAdminEventEmail(
        string $eventKey,
        string $subject,
        string $heading,
        string $messageBody,
        ?int $excludeUserId = null,
        ?string $replyTo = null,
    ): void {
        $this->sendAdminEventView($eventKey, $subject, 'emails.owner-notification', [
            'heading' => $heading,
            'messageBody' => $messageBody,
            'email' => $replyTo,
        ], $excludeUserId);
    }

    public function sendAdminEventView(
        string $eventKey,
        string $subject,
        string $view,
        array $data,
        ?int $excludeUserId = null,
    ): void {
        if (!$this->emailEnabled($eventKey)) {
            return;
        }

        // Persist on the database queue. The worker retries provider failures;
        // exhausted attempts remain in failed_jobs instead of disappearing.
        Mail::to(config('mail.owner.address'))->queue(
            (new AdminEventMail($eventKey, $subject, $view, [
                ...$data,
                'adminName' => 'Bear Lane',
                'logoUrl' => asset('images/BLText.png'),
                'adminUrl' => url('/admin/support'),
            ]))->onConnection('database')->afterCommit()
        );
    }
}
