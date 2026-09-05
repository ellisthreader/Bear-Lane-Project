<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class AdminNotificationService
{
    public function __construct(private readonly StoreSettingsService $settings)
    {
    }

    public function inAppEnabled(string $eventKey): bool
    {
        return $this->settings->isAdminInAppNotificationEnabled($eventKey);
    }

    public function emailEnabled(string $eventKey): bool
    {
        return $this->settings->isAdminEmailNotificationEnabled($eventKey);
    }

    public function adminRecipients(?int $excludeUserId = null): Collection
    {
        return User::query()
            ->where('is_admin', true)
            ->whereNotNull('email')
            ->when($excludeUserId, fn ($query) => $query->where('id', '!=', $excludeUserId))
            ->select(['id', 'name', 'username', 'email'])
            ->get()
            ->filter(fn (User $user) => trim((string) $user->email) !== '')
            ->values();
    }

    public function sendAdminEventEmail(
        string $eventKey,
        string $subject,
        string $heading,
        string $messageBody,
        ?int $excludeUserId = null
    ): void {
        if (!$this->emailEnabled($eventKey)) {
            return;
        }

        $admins = $this->adminRecipients($excludeUserId);
        if ($admins->isEmpty()) {
            return;
        }

        foreach ($admins as $admin) {
            $recipientEmail = trim((string) $admin->email);
            if ($recipientEmail === '') {
                continue;
            }

            try {
                Mail::send('emails.admin-message', [
                    'heading' => $heading,
                    'type' => 'message',
                    'userName' => (string) ($admin->name ?: $admin->username ?: 'Admin'),
                    'messageBody' => $messageBody,
                    'logoUrl' => asset('images/BLText.png'),
                ], function ($mail) use ($recipientEmail, $subject) {
                    $mail->to($recipientEmail)->subject($subject);
                });
            } catch (\Throwable $exception) {
                Log::warning('Admin event email failed', [
                    'event_key' => $eventKey,
                    'recipient' => $recipientEmail,
                    'error' => $exception->getMessage(),
                ]);
            }
        }
    }
}
