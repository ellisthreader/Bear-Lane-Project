<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class InstantQuoteMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param array<int, array<string, mixed>> $items
     */
    public function __construct(
        public string $name,
        public string $email,
        public string $quoteNumber,
        public array $items,
        public float $total,
        public ?\DateTimeInterface $quoteDate = null,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your Bear Lane quote #' . $this->quoteNumber,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.quotes.instant-customer',
            with: [
                'name' => $this->name,
                'email' => $this->email,
                'quoteNumber' => $this->quoteNumber,
                'items' => $this->items,
                'total' => $this->total,
                'quoteDate' => $this->quoteDate ?? now(),
            ],
        );
    }
}
