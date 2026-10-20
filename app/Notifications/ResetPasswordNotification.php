<?php

namespace App\Notifications;

use App\Mail\ResetPasswordMail;
use Illuminate\Notifications\Notification;

class ResetPasswordNotification extends Notification
{
    public $token;

    public function __construct($token)
    {
        $this->token = $token;
    }

    public function via($notifiable)
    {
        return ['mail'];
    }

    public function toMail($notifiable)
    {
        // Ensure the recipient is explicitly set to avoid Symfony error
        return (new ResetPasswordMail($notifiable, $this->token))
                    ->to($notifiable->email);
    }
}
