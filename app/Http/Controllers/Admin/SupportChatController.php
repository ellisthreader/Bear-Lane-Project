<?php

namespace App\Http\Controllers\Admin;

use App\Events\ChatDeleted;
use App\Events\MessageSent;
use App\Http\Controllers\Controller;
use App\Models\Chat;
use App\Models\Message;
use App\Services\AdminActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SupportChatController extends Controller
{
    private const IMAGE_PREFIX = '[image]';

    public function __construct(private readonly AdminActivityLogService $activityLogService)
    {
    }

    private function safeBroadcast(object $event): void
    {
        try {
            event($event);
        } catch (\Throwable $exception) {
            Log::warning('Admin support broadcast failed', [
                'error' => $exception->getMessage(),
            ]);
        }
    }

    public function messages(Chat $chat): JsonResponse
    {
        $messages = $chat->messages()
            ->with('user:id,username,name,avatar')
            ->orderBy('created_at')
            ->get()
            ->map(fn (Message $message) => $this->mapMessage($message))
            ->values();

        return response()->json([
            'chat_id' => $chat->id,
            'messages' => $messages,
            'chat_closed' => (bool) $chat->is_closed,
        ]);
    }

    public function sendMessage(Request $request, Chat $chat): JsonResponse
    {
        $validated = $request->validate([
            'content' => ['required', 'string', 'max:2000'],
        ]);

        if ($chat->is_closed) {
            $chat->update([
                'is_closed' => false,
                'deleted_by' => null,
                'is_archived' => false,
                'archived_at' => null,
            ]);
        }

        $message = Message::query()->create([
            'chat_id' => $chat->id,
            'user_id' => $request->user()->id,
            'sender_type' => 'admin',
            'content' => (string) $validated['content'],
        ]);

        $chat->touch();
        $message->load('user');

        $this->safeBroadcast(new MessageSent($message));

        $chatLabel = trim((string) ($chat->title ?: "Chat #{$chat->id}"));
        $this->activityLogService->logFromRequest(
            $request,
            'live_chat_message_sent',
            'Live chat reply sent',
            "Replied in {$chatLabel}",
            [
                'icon' => 'message',
                ...$this->activityLogService->modelContext($chat, $chatLabel),
                'metadata' => [
                    'chat_id' => $chat->id,
                    'message_id' => $message->id,
                    'sender_type' => $message->sender_type,
                    'content_preview' => mb_substr((string) $validated['content'], 0, 180),
                ],
            ]
        );

        return response()->json([
            'chat_id' => $chat->id,
            'message' => $this->mapMessage($message),
        ], 201);
    }

    public function join(Request $request, Chat $chat): JsonResponse
    {
        if (!$chat->admin_joined) {
            $chat->update(['admin_joined' => true]);
        }

        $alreadyJoinedMessage = Message::query()
            ->where('chat_id', $chat->id)
            ->where('sender_type', 'system')
            ->whereIn('content', [
                'Support agent joined the chat',
                'Support agent joined chat',
            ])
            ->exists();

        if (!$alreadyJoinedMessage) {
            $message = Message::query()->create([
                'chat_id' => $chat->id,
                'user_id' => $request->user()->id,
                'sender_type' => 'system',
                'content' => 'Support agent joined chat',
            ]);

            $chat->touch();
            $this->safeBroadcast(new MessageSent($message));
        }

        $chatLabel = trim((string) ($chat->title ?: "Chat #{$chat->id}"));
        $this->activityLogService->logFromRequest(
            $request,
            'live_chat_joined',
            'Live chat joined',
            "Joined {$chatLabel}",
            [
                'icon' => 'message',
                ...$this->activityLogService->modelContext($chat, $chatLabel),
                'metadata' => [
                    'chat_id' => $chat->id,
                ],
            ]
        );

        return response()->json([
            'success' => true,
            'chat_id' => $chat->id,
        ]);
    }

    public function close(Request $request, Chat $chat): JsonResponse
    {
        if ($chat->is_closed) {
            return response()->json([
                'success' => true,
                'chat_id' => $chat->id,
                'deleted_by' => $chat->deleted_by ?: 'Admin',
            ]);
        }

        $chat->update([
            'is_closed' => true,
            'deleted_by' => 'Admin',
        ]);

        $message = Message::query()->create([
            'chat_id' => $chat->id,
            'sender_type' => 'system',
            'content' => 'Chat closed by Admin',
        ]);
        $message->load('user');

        $this->safeBroadcast(new MessageSent($message));
        $this->safeBroadcast(new ChatDeleted($chat->id, 'Admin'));

        $chatLabel = trim((string) ($chat->title ?: "Chat #{$chat->id}"));
        $this->activityLogService->logFromRequest(
            $request,
            'live_chat_closed',
            'Live chat closed',
            "Closed {$chatLabel}",
            [
                'icon' => 'message',
                ...$this->activityLogService->modelContext($chat, $chatLabel),
                'metadata' => [
                    'chat_id' => $chat->id,
                    'deleted_by' => 'Admin',
                ],
            ]
        );

        return response()->json([
            'success' => true,
            'chat_id' => $chat->id,
            'deleted_by' => 'Admin',
        ]);
    }

    public function archive(Request $request, Chat $chat): JsonResponse
    {
        if (!$chat->is_closed) {
            return response()->json([
                'message' => 'Chat must be closed before it can be archived.',
            ], 422);
        }

        if (!$chat->is_archived) {
            $chat->update([
                'is_archived' => true,
                'archived_at' => now(),
            ]);
        }

        $chatLabel = trim((string) ($chat->title ?: "Chat #{$chat->id}"));
        $this->activityLogService->logFromRequest(
            $request,
            'live_chat_archived',
            'Live chat archived',
            "Archived {$chatLabel}",
            [
                'icon' => 'archive',
                ...$this->activityLogService->modelContext($chat, $chatLabel),
                'metadata' => [
                    'chat_id' => $chat->id,
                    'archived_at' => optional($chat->archived_at)->toIso8601String(),
                ],
            ]
        );

        return response()->json([
            'success' => true,
            'chat_id' => $chat->id,
            'is_archived' => true,
            'archived_at' => optional($chat->archived_at)->toIso8601String(),
        ]);
    }

    public function rename(Request $request, Chat $chat): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
        ]);

        $title = trim((string) $validated['title']);
        if ($title === '') {
            return response()->json([
                'message' => 'Title cannot be empty.',
            ], 422);
        }

        $oldTitle = trim((string) ($chat->title ?: "Chat #{$chat->id}"));
        $chat->update(['title' => $title]);

        $this->activityLogService->logFromRequest(
            $request,
            'live_chat_renamed',
            'Live chat renamed',
            "Renamed chat from '{$oldTitle}' to '{$chat->title}'",
            [
                'icon' => 'message',
                ...$this->activityLogService->modelContext($chat, $chat->title ?: $oldTitle),
                'metadata' => [
                    'chat_id' => $chat->id,
                    'old_title' => $oldTitle,
                    'new_title' => $chat->title,
                ],
            ]
        );

        return response()->json([
            'success' => true,
            'chat_id' => $chat->id,
            'title' => $chat->title,
        ]);
    }

    public function destroy(Request $request, Chat $chat): JsonResponse
    {
        if (!$chat->is_closed) {
            return response()->json([
                'message' => 'Chat must be closed before it can be deleted.',
            ], 422);
        }

        $chatId = $chat->id;
        $chatLabel = trim((string) ($chat->title ?: "Chat #{$chat->id}"));
        $context = $this->activityLogService->modelContext($chat, $chatLabel);
        $chat->delete();

        $this->activityLogService->logFromRequest(
            $request,
            'live_chat_deleted',
            'Live chat deleted',
            "Deleted {$chatLabel}",
            [
                'icon' => 'archive',
                ...$context,
                'metadata' => [
                    'chat_id' => $chatId,
                ],
            ]
        );

        return response()->json([
            'success' => true,
            'chat_id' => $chatId,
        ]);
    }

    private function mapMessage(Message $message): array
    {
        $imageUrl = null;
        $content = (string) $message->content;
        $trimmed = trim($content);
        if (str_starts_with($trimmed, self::IMAGE_PREFIX)) {
            $candidate = trim(substr($trimmed, strlen(self::IMAGE_PREFIX)));
            if ($candidate !== '') {
                $imageUrl = $candidate;
            }
        }

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
}
