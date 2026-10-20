<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Queue\SerializesModels;

/**
 * Generic Blade-rendered notification sent to admins (one per recipient).
 */
class AdminEventMail extends Mailable
{
    use Queueable, SerializesModels;

    public int $tries = 5;
    public int $timeout = 30;

    public function backoff(): array
    {
        return [60, 300, 900, 3600];
    }

    /**
     * @param array<string, mixed> $data
     */
    public function __construct(
        public string $eventKey,
        public string $subjectLine,
        public string $viewName,
        public array $data,
    ) {
    }

    public function envelope(): Envelope
    {
        $email = trim((string) ($this->data['email'] ?? $this->data['customerEmail'] ?? ''));

        return new Envelope(
            subject: $this->subjectLine,
            replyTo: filter_var($email, FILTER_VALIDATE_EMAIL) ? [new Address($email)] : [],
            using: filter_var($email, FILTER_VALIDATE_EMAIL)
                ? [static fn (\Symfony\Component\Mime\Email $message) => $message->replyTo($email)]
                : [],
        );
    }

    public function content(): Content
    {
        if ($this->viewName === 'emails.owner-notification') {
            return new Content(text: $this->viewName, with: $this->data);
        }

        return new Content(view: $this->viewName, with: $this->data);
    }
}
