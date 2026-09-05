<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use App\Models\Chat;
use App\Models\Message;
use App\Events\MessageSent;
use App\Services\OpenAiModerationService;

class ChatController extends Controller
{


    /**
     * Fetch or create active chat for current visitor (user or guest)
     */
    protected function getActiveChat(Request $request)
    {
        $user = Auth::user();
        $sessionId = $request->cookie('chat_session_id') ?: session()->getId();

        // Find existing active chat
        $chat = Chat::query()
            ->when($user, fn($q) => $q->where('user_id', $user->id))
            ->when(!$user, fn($q) => $q->where('session_id', $sessionId))
            ->where('is_closed', false)
            ->latest()
            ->first();

        // Create a new chat if none exists
        if (!$chat) {
            $chat = Chat::create([
                'user_id' => $user?->id,
                'session_id' => $user ? null : $sessionId,
                'is_closed' => false,
                'title' => $user ? "Chat with {$user->username}" : "Guest Chat",
            ]);
        }

        // Ensure cookie is set for guests
        if (!$user) {
            cookie()->queue('chat_session_id', $chat->session_id, 60 * 24 * 7);
        }

        return $chat;
    }

    /**
     * Load messages for current chat session
     */
    public function index(Request $request)
    {
        try {
            $chat = $this->getActiveChat($request);

            $messages = $chat->messages()
                ->with('user') // eager-load the user for username
                ->orderBy('created_at', 'asc')
                ->get()
                ->map(fn($msg) => [
                    'id' => $msg->id,
                    'user_id' => $msg->user_id,
                    'username' => $msg->user?->username ?? 'Guest',
                    'sender_type' => $msg->sender_type,
                    'content' => $msg->content,
                    'created_at' => $msg->created_at->toDateTimeString(),
                ]);

            return response()->json([
                'success' => true,
                'chat_id' => $chat->id,
                'messages' => $messages,
            ]);

        } catch (\Throwable $e) {
            Log::error('ChatController@index error', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'error' => 'Failed to load messages'], 500);
        }
    }

    /**
     * Send a message for the current chat session
     */
    public function send(Request $request, OpenAiModerationService $moderationService)
    {
        try {
            $validated = $request->validate([
                'content' => 'required|string|max:2000',
            ]);

            $user = Auth::user();
            $content = (string) $validated['content'];

            try {
                $moderation = $moderationService->moderate($content);
            } catch (\Throwable $exception) {
                Log::error('ChatController@send moderation failed', [
                    'error' => $exception->getMessage(),
                    'user_id' => $user?->id,
                    'guest_id' => (string) ($request->cookie('chat_session_id') ?? ''),
                    'ip' => $request->ip(),
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Message moderation is temporarily unavailable. Please try again.',
                ], 503);
            }

            if (!empty($moderation['blocked'])) {
                $moderationService->logFlaggedMessage($content, $moderation, [
                    'user_id' => $user?->id,
                    'guest_id' => (string) ($request->cookie('chat_session_id') ?? ''),
                    'ip' => $request->ip(),
                    'endpoint' => '/api/chat/send',
                ]);

                return response()->json([
                    'success' => false,
                    'warning' => true,
                    'message' => OpenAiModerationService::FLAGGED_WARNING_MESSAGE,
                ], 422);
            }

            $chat = $this->getActiveChat($request);

            if ((bool) ($chat->is_archived ?? false)) {
                $chat->update([
                    'is_archived' => false,
                    'archived_at' => null,
                ]);
            }

            // Upgrade guest chat to user if logged in
            if ($user && !$chat->user_id) {
                $chat->update([
                    'user_id' => $user->id,
                    'session_id' => null,
                    'title' => "Chat with {$user->username}",
                ]);
            }

            $message = Message::create([
                'chat_id' => $chat->id,
                'user_id' => $user?->id,
                'sender_type' => $user ? 'user' : 'guest',
                'content' => $content,
            ]);

            event(new MessageSent($message));

            return response()->json([
                'success' => true,
                'message' => [
                    'id' => $message->id,
                    'user_id' => $message->user_id,
                    'username' => $message->user?->username ?? 'Guest',
                    'sender_type' => $message->sender_type,
                    'content' => $message->content,
                    'created_at' => $message->created_at->toDateTimeString(),
                ],
            ], 201);

        } catch (\Throwable $e) {
            Log::error('ChatController@send error', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'error' => 'Failed to send message'], 500);
        }
    }

    /**
     * List all chats for admin livechat
     */
    public function listForAdmin()
    {
        $chats = Chat::query()
            ->with('user') // eager-load user
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn($chat) => [
                'chat_id' => $chat->id,
                'user_id' => $chat->user_id,
                'user_name' => $chat->user?->username ?? 'Guest',
                'updated_at' => $chat->updated_at->toDateTimeString(),
                'is_closed' => $chat->is_closed,
            ]);

        return response()->json([
            'success' => true,
            'chats' => $chats,
        ]);
    }
}
