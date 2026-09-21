<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Generic Blade-rendered notification sent to admins (one per recipient).
 */
class AdminEventMail extends Mailable
{
    use Queueable, SerializesModels;

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
        return new Envelope(subject: $this->subjectLine);
    }

    public function content(): Content
    {
        return new Content(view: $this->viewName, with: $this->data);
    }
}
