<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use App\Models\Chat;
use App\Models\Message;
use App\Models\User;
use App\Events\MessageSent;
use App\Events\ChatDeleted;
use App\Services\OpenAiModerationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class LiveChatController extends Controller
{
    private const IMAGE_PREFIX = '[image]';
    private const MESSAGE_RATE_LIMIT_MAX = 6;
    private const MESSAGE_RATE_LIMIT_WINDOW_SECONDS = 12;

    private function safeBroadcast(object $event): void
    {
        try {
            event($event);
        } catch (\Throwable $exception) {
            Log::warning('Live chat broadcast failed', [
                'error' => $exception->getMessage(),
            ]);
        }
    }

    private function notifyAdminsOfNewChat(Chat $chat, Request $request): void
    {
        $adminEmails = User::query()
            ->where('is_admin', true)
            ->whereNotNull('email')
            ->pluck('email')
            ->filter(fn ($email) => is_string($email) && trim($email) !== '')
            ->map(fn ($email) => trim((string) $email))
            ->unique()
            ->values();

        if ($adminEmails->isEmpty()) {
            return;
        }

        $chatUser = $chat->relationLoaded('user') ? $chat->user : $chat->user()->first();
        $customerName = $chatUser?->name ?: $chatUser?->username ?: 'Guest Visitor';
        $customerEmail = $chatUser?->email ?: null;
        $guestSession = $chat->session_id ?: (string) ($request->input('guest_id') ?: $request->cookie('chat_session_id') ?: '');
        $sessionPreview = $guestSession !== '' ? Str::limit($guestSession, 28, '...') : null;
        $chatType = $chat->user_id ? 'Registered user chat' : 'Guest chat';
        $chatUrl = url('/admin/support');

        foreach ($adminEmails as $email) {
            try {
                Mail::send('emails.livechat-new-admin-alert', [
                    'chatId' => $chat->id,
                    'chatType' => $chatType,
                    'customerName' => $customerName,
                    'customerEmail' => $customerEmail,
                    'sessionPreview' => $sessionPreview,
                    'createdAt' => now()->format('d M Y, H:i'),
                    'chatUrl' => $chatUrl,
                ], function ($mail) use ($email, $chat) {
                    $mail->to($email)->subject("New BearLane Live Chat #{$chat->id}");
                });
            } catch (\Throwable $exception) {
                Log::warning('Failed to send new live chat admin email', [
                    'chat_id' => $chat->id,
                    'admin_email' => $email,
                    'error' => $exception->getMessage(),
                ]);
            }
        }
    }

    private function resolveChat(Request $request): Chat
    {
        $user = Auth::user();

        if ($user) {
            $chat = Chat::query()->firstOrCreate(
                ['user_id' => $user->id, 'is_closed' => false],
                [
                    'is_closed' => false,
                    'admin_joined' => false,
                    'title' => null,
                ]
            );

            if ($chat->wasRecentlyCreated) {
                $this->notifyAdminsOfNewChat($chat, $request);
            }

            return $chat;
        }

        $sessionId = (string) ($request->input('guest_id') ?: $request->cookie('chat_session_id') ?: Str::uuid());

        if ($request->cookie('chat_session_id') !== $sessionId) {
            cookie()->queue('chat_session_id', $sessionId, 60 * 24 * 7);
        }

        $chat = Chat::query()
            ->where('session_id', $sessionId)
            ->where('is_closed', false)
            ->latest('updated_at')
            ->first();

        if (!$chat) {
            $chat = Chat::query()->create([
                'session_id' => $sessionId,
                'is_closed' => false,
                'admin_joined' => false,
            ]);

            $this->notifyAdminsOfNewChat($chat, $request);

            return $chat;
        }

        return $chat;
    }

    private function canAccessChat(Request $request, Chat $chat): bool
    {
        $user = Auth::user();
        $guestId = (string) ($request->input('guest_id') ?: $request->cookie('chat_session_id') ?: '');

        if ($user && (bool) $user->is_admin) {
            return true;
        }

        if ($user) {
            return (int) $chat->user_id === (int) $user->id;
        }

        return (bool) $chat->session_id && $guestId === $chat->session_id;
    }

    private function messageRateLimitKey(Request $request, ?Chat $chat = null): string
    {
        $user = Auth::user();
        $chatFragment = $chat?->id ? "chat:{$chat->id}" : 'chat:pending';
        $actorFragment = $user
            ? "user:{$user->id}"
            : 'guest:' . ($request->input('guest_id') ?: $request->cookie('chat_session_id') ?: $request->ip());

        return "livechat:message:{$actorFragment}:{$chatFragment}";
    }

    private function mapMessage(Message $message): array
    {
        $imageUrl = $this->extractImageUrl($message->content);
        $username = $message->user?->name ?: $message->user?->username;
        if (!$username) {
            $username = match ($message->sender_type) {
                'admin' => 'Support Team',
                'system' => 'System',
                default => 'Guest',
            };
        }

        return [
            'id' => $message->id,
            'chat_id' => $message->chat_id,
            'user_id' => $message->user_id,
            'sender_type' => $message->sender_type,
            'username' => $username,
            'avatar' => $message->user?->avatar,
            'is_image' => $imageUrl !== null,
            'image_url' => $imageUrl,
            'content' => $imageUrl ? 'Image attachment' : $message->content,
            'created_at' => $message->created_at->toDateTimeString(),
        ];
    }

    private function extractImageUrl(?string $content): ?string
    {
        if (!$content) {
            return null;
        }

        $trimmed = trim($content);
        if (!str_starts_with($trimmed, self::IMAGE_PREFIX)) {
            return null;
        }

        $url = trim(substr($trimmed, strlen(self::IMAGE_PREFIX)));
        return $url !== '' ? $url : null;
    }

    private function parseHandoverPayload(string $content): ?array
    {
        $trimmed = trim($content);
        if (!str_starts_with($trimmed, '[AI HANDOVER REQUEST]')) {
            return null;
        }

        $lines = preg_split('/\r?\n/', $trimmed) ?: [];
        $reason = null;
        $contextItems = [];

        foreach ($lines as $line) {
            $line = trim($line);
            if (str_starts_with($line, 'Reason:')) {
                $reason = trim(substr($line, strlen('Reason:')));
                continue;
            }

            if (str_starts_with($line, '- ')) {
                $item = trim(substr($line, 2));
                if ($item !== '') {
                    $contextItems[] = $item;
                }
            }
        }

        if (!$reason) {
            $reason = 'Customer requested agent handover';
        }

        return [
            'reason' => $reason,
            'context' => $contextItems,
        ];
    }

    private function buildAdminChatTitle(array $handover): string
    {
        $reason = trim((string) ($handover['reason'] ?? 'Agent handover'));
        return Str::limit($reason !== '' ? $reason : 'Agent handover', 255, '');
    }

    public function sendMessage(Request $request, OpenAiModerationService $moderationService): JsonResponse
    {
        $validated = $request->validate([
            'message' => ['required', 'string', 'max:2000'],
            'chat_id' => ['nullable', 'integer', 'min:1'],
            'guest_id' => ['nullable', 'string', 'max:100'],
        ]);

        $user = Auth::user();
        $content = (string) $validated['message'];

        try {
            $moderation = $moderationService->moderate($content);
        } catch (\Throwable $exception) {
            Log::error('Live chat moderation failed', [
                'error' => $exception->getMessage(),
                'user_id' => $user?->id,
                'guest_id' => (string) ($validated['guest_id'] ?? $request->cookie('chat_session_id') ?? ''),
                'ip' => $request->ip(),
            ]);

            return response()->json([
                'message' => 'Message moderation is temporarily unavailable. Please try again.',
            ], 503);
        }

        if (!empty($moderation['blocked'])) {
            $moderationService->logFlaggedMessage($content, $moderation, [
                'user_id' => $user?->id,
                'guest_id' => (string) ($validated['guest_id'] ?? $request->cookie('chat_session_id') ?? ''),
                'ip' => $request->ip(),
            ]);

            return response()->json([
                'message' => OpenAiModerationService::FLAGGED_WARNING_MESSAGE,
                'warning' => true,
            ], 422);
        }

        $chatId = (int) ($validated['chat_id'] ?? 0);
        $chat = $chatId > 0
            ? Chat::query()->findOrFail($chatId)
            : $this->resolveChat($request);
        abort_unless($this->canAccessChat($request, $chat), 403);
        $rateLimitKey = $this->messageRateLimitKey($request, $chat);

        if (RateLimiter::tooManyAttempts($rateLimitKey, self::MESSAGE_RATE_LIMIT_MAX)) {
            $wait = RateLimiter::availableIn($rateLimitKey);
            return response()->json([
                'message' => "You're sending messages too quickly. Please wait {$wait} seconds before sending again.",
                'warning' => true,
            ], 429);
        }

        RateLimiter::hit($rateLimitKey, self::MESSAGE_RATE_LIMIT_WINDOW_SECONDS);

        if ($chat->is_closed) {
            $chat->update([
                'is_closed' => false,
                'deleted_by' => null,
                'is_archived' => false,
                'archived_at' => null,
            ]);
        }

        $handover = $this->parseHandoverPayload($content);

        if ($handover) {
            $chat->update([
                'title' => $this->buildAdminChatTitle($handover),
            ]);
            $chat->touch();

            return response()->json([
                'chat_id' => $chat->id,
                'handover' => true,
            ], 201);
        }

        $message = Message::query()->create([
            'chat_id' => $chat->id,
            'user_id' => $user?->id,
            'sender_type' => $user ? 'user' : 'guest',
            'content' => $content,
        ]);

        $chat->touch();
        $message->load('user');

        $this->safeBroadcast(new MessageSent($message));

        return response()->json([
            'chat_id' => $chat->id,
            'message' => $this->mapMessage($message),
        ], 201);
    }

    public function uploadAttachment(Request $request, OpenAiModerationService $moderationService): JsonResponse
    {
        $request->validate([
            'image' => ['required', 'image', 'max:5120'],
            'chat_id' => ['nullable', 'integer', 'min:1'],
            'guest_id' => ['nullable', 'string', 'max:100'],
        ]);

        $chatId = (int) ($request->input('chat_id') ?: 0);
        $chat = $chatId > 0
            ? Chat::query()->findOrFail($chatId)
            : $this->resolveChat($request);

        abort_unless($this->canAccessChat($request, $chat), 403);

        if ($chat->is_closed) {
            $chat->update([
                'is_closed' => false,
                'deleted_by' => null,
                'is_archived' => false,
                'archived_at' => null,
            ]);
        }

        $user = Auth::user();
        $senderType = $user
            ? ((bool) $user->is_admin ? 'admin' : 'user')
            : 'guest';

        $uploadedFile = $request->file('image');
        $mimeType = (string) ($uploadedFile?->getMimeType() ?: 'application/octet-stream');
        $realPath = $uploadedFile?->getRealPath();
        $fileBytes = is_string($realPath) ? @file_get_contents($realPath) : false;

        if ($fileBytes === false) {
            return response()->json([
                'message' => 'Could not read uploaded image.',
            ], 422);
        }

        $imageDataUrl = 'data:' . $mimeType . ';base64,' . base64_encode($fileBytes);

        try {
            $moderation = $moderationService->moderateImageDataUrl($imageDataUrl);
        } catch (\Throwable $exception) {
            Log::error('Live chat image moderation failed', [
                'error' => $exception->getMessage(),
                'user_id' => $user?->id,
                'guest_id' => (string) ($request->input('guest_id') ?: $request->cookie('chat_session_id') ?: ''),
                'chat_id' => $chat->id,
                'ip' => $request->ip(),
            ]);

            return response()->json([
                'message' => 'Image moderation is temporarily unavailable. Please try again.',
            ], 503);
        }

        if (!empty($moderation['blocked'])) {
            $reason = $moderationService->summarizeViolationReason($moderation);
            $moderationService->logFlaggedMessage('[image-upload-blocked]', $moderation, [
                'user_id' => $user?->id,
                'guest_id' => (string) ($request->input('guest_id') ?: $request->cookie('chat_session_id') ?: ''),
                'chat_id' => $chat->id,
                'ip' => $request->ip(),
                'endpoint' => '/livechat/upload',
                'sender_type' => $senderType,
            ]);

            return response()->json([
                'message' => OpenAiModerationService::FLAGGED_WARNING_MESSAGE,
                'reason' => $reason,
                'warning' => true,
            ], 422);
        }

        $path = $uploadedFile->store('livechat', 'public');
        $publicUrl = url(Storage::url($path));

        $message = Message::query()->create([
            'chat_id' => $chat->id,
            'user_id' => $user?->id,
            'sender_type' => $senderType,
            'content' => self::IMAGE_PREFIX . $publicUrl,
        ]);

        $chat->touch();
        $message->load('user');
        $this->safeBroadcast(new MessageSent($message));

        return response()->json([
            'chat_id' => $chat->id,
            'message' => $this->mapMessage($message),
        ], 201);
    }

    public function fetchMessages(Request $request): JsonResponse
    {
        $chatId = (int) $request->query('chat_id', 0);
        if ($chatId > 0) {
            $chat = Chat::query()->findOrFail($chatId);
            abort_unless($this->canAccessChat($request, $chat), 403);
        } else {
            $user = Auth::user();
            $guestId = (string) ($request->query('guest_id') ?: $request->cookie('chat_session_id') ?: '');

            if ($user) {
                $chat = Chat::query()
                    ->where(function ($query) use ($user, $guestId) {
                        $query->where('user_id', $user->id);
                        if ($guestId !== '') {
                            $query->orWhere('session_id', $guestId);
                        }
                    })
                    ->where('is_closed', false)
                    ->latest('updated_at')
                    ->first();
            } else {
                $chat = $guestId !== ''
                    ? Chat::query()
                        ->where('session_id', $guestId)
                        ->where('is_closed', false)
                        ->latest('updated_at')
                        ->first()
                    : null;
            }

            if (!$chat) {
                return response()->json([
                    'chat_id' => null,
                    'messages' => [],
                    'chat_deleted' => false,
                    'deleted_by' => null,
                ]);
            }

            abort_unless($this->canAccessChat($request, $chat), 403);
        }

        $messages = $chat->messages()
            ->with('user:id,username,name,avatar')
            ->orderBy('created_at')
            ->get()
            ->map(fn (Message $message) => $this->mapMessage($message))
            ->values();

        return response()->json([
            'chat_id' => $chat->id,
            'messages' => $messages,
            'chat_deleted' => (bool) $chat->is_closed,
            'deleted_by' => $chat->deleted_by ?? null,
        ]);
    }

    public function deleteChat(Request $request, Chat $chat): JsonResponse
    {
        $user = Auth::user();
        $guestId = (string) ($request->input('guest_id') ?: $request->cookie('chat_session_id') ?: '');

        if ($user && (bool) $user->is_admin) {
            $deletedBy = 'Admin';
        } elseif ($user) {
            abort_if((int) $chat->user_id !== (int) $user->id, 403);
            $deletedBy = 'User';
        } else {
            abort_if(!$chat->session_id || $guestId !== $chat->session_id, 403);
            $deletedBy = 'Guest';
        }

        if ($chat->is_closed) {
            return response()->json([
                'success' => true,
                'deleted_by' => $chat->deleted_by ?: $deletedBy,
            ]);
        }

        $chat->update([
            'is_closed' => true,
            'deleted_by' => $deletedBy,
        ]);

        $closedMessage = Message::query()->create([
            'chat_id' => $chat->id,
            'user_id' => $user?->id,
            'sender_type' => 'system',
            'content' => "Chat closed by {$deletedBy}",
        ]);
        $closedMessage->load('user');

        $this->safeBroadcast(new MessageSent($closedMessage));
        $this->safeBroadcast(new ChatDeleted($chat->id, $deletedBy));

        return response()->json([
            'success' => true,
            'deleted_by' => $deletedBy,
        ]);
    }

    public function emailTranscript(Request $request, Chat $chat): JsonResponse
    {
        $user = Auth::user();
        $guestId = (string) ($request->input('guest_id') ?: $request->cookie('chat_session_id') ?: '');

        if ($user && !(bool) $user->is_admin) {
            abort_if((int) $chat->user_id !== (int) $user->id, 403);
        } elseif ($user && (bool) $user->is_admin) {
            // Admin may request transcript for audit/use cases.
        } else {
            abort_if(!$chat->session_id || $guestId !== $chat->session_id, 403);
        }

        $validator = Validator::make($request->all(), [
            'email' => ['nullable', 'email:rfc,dns', 'max:255'],
        ]);
        $validator->validate();

        $targetEmail = (string) ($request->input('email') ?: ($user?->email ?: ''));
        if ($targetEmail === '') {
            return response()->json([
                'message' => 'Email is required to send transcript.',
            ], 422);
        }

        $messages = $chat->messages()
            ->with('user:id,username,name')
            ->orderBy('created_at')
            ->get();

        $transcriptMessages = $messages->map(function (Message $message) {
            $imageUrl = $this->extractImageUrl($message->content);
            $sender = match ($message->sender_type) {
                'admin' => $message->user?->name ?: $message->user?->username ?: 'Support Agent',
                'system' => 'System',
                default => $message->user?->name ?: $message->user?->username ?: 'Customer',
            };

            return [
                'sender' => $sender,
                'sender_type' => $message->sender_type,
                'is_image' => $imageUrl !== null,
                'image_url' => $imageUrl,
                'content' => $imageUrl ? 'Image attachment' : $message->content,
                'time' => optional($message->created_at)?->format('d M Y, H:i'),
            ];
        })->values();

        try {
            Mail::send('emails.livechat-transcript', [
                'chatId' => $chat->id,
                'messages' => $transcriptMessages,
                'generatedAt' => now()->format('d M Y, H:i'),
            ], function ($mail) use ($targetEmail, $chat) {
                $mail->to($targetEmail)
                    ->subject("BearLane Live Chat Transcript #{$chat->id}");
            });
        } catch (\Throwable $exception) {
            Log::error('Failed to send live chat transcript email', [
                'chat_id' => $chat->id,
                'email' => $targetEmail,
                'error' => $exception->getMessage(),
            ]);

            return response()->json([
                'message' => 'Could not send transcript right now.',
            ], 500);
        }

        return response()->json([
            'success' => true,
            'email' => $targetEmail,
        ]);
    }
}
