<?php

namespace App\Mail;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OrderConfirmedMail extends Mailable
{
    use Queueable, SerializesModels;

    public Order $order;
    public ?string $invoiceUrl;
    public string $logoUrl;
    public string $reviewUrl;

    public function __construct(Order $order)
    {
        $this->order = $order;
        $this->invoiceUrl = $order->invoice_path ? asset('storage/' . $order->invoice_path) : null;
        $this->logoUrl = asset('images/BLText.png');
        $this->reviewUrl = url('/profile');
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Order Confirmed: ' . $this->order->order_number,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.order-confirmed',
            with: [
                'order' => $this->order,
                'invoiceUrl' => $this->invoiceUrl,
                'logoUrl' => $this->logoUrl,
                'reviewUrl' => $this->reviewUrl,
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
