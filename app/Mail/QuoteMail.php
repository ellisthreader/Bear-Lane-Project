<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

/**
 * Legacy mailable kept for backwards compatibility. Renders the redesigned
 * customer quote template.
 */
class QuoteMail extends Mailable
{
    use Queueable, SerializesModels;

    public $name;
    public $items;
    public $total;
    public $quoteNumber;

    public function __construct($name, $items, $total, $quoteNumber = '')
    {
        $this->name = $name;
        $this->items = $items;
        $this->total = $total;
        $this->quoteNumber = $quoteNumber;
    }

    public function build()
    {
        return $this->from(config('mail.from.address'), config('mail.from.name'))
            ->subject('Your Bear Lane quote' . ($this->quoteNumber !== '' ? ' #' . $this->quoteNumber : ''))
            ->view('emails.quotes.instant-customer', [
                'name' => (string) $this->name,
                'items' => (array) $this->items,
                'total' => (float) $this->total,
                'quoteNumber' => (string) $this->quoteNumber,
                'quoteDate' => now(),
            ]);
    }
}
