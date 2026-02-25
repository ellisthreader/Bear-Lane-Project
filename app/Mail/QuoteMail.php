<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class QuoteMail extends Mailable
{
    use Queueable, SerializesModels;

    public $name;
    public $items;
    public $total;

    /**
     * Create a new message instance.
     */
    public function __construct($name, $items, $total)
    {
        $this->name = $name;
        $this->items = $items;
        $this->total = $total;
    }

    /**
     * Build the message.
     */
    public function build()
    {
        return $this->from(config('mail.from.address'), config('mail.from.name'))
                    ->subject('Your Quote')
                    ->view('emails.quote'); // Blade template
    }
}
