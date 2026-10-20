<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PrintSpecialistRequestMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $name,
        public string $email,
        public string $phone,
        public string $budget,
        public string $details,
        public string $reference,
        public string $invoiceReference = '',
        public int $imageCount = 0,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your print specialist request ' . $this->reference,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.quotes.request-customer',
            with: [
                'name' => $this->name,
                'email' => $this->email,
                'phone' => $this->phone,
                'budget' => $this->budget,
                'details' => $this->details,
                'reference' => $this->reference,
                'invoiceReference' => $this->invoiceReference,
                'imageCount' => $this->imageCount,
            ],
        );
    }
}
