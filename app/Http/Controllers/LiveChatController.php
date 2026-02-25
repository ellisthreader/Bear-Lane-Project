<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use App\Models\Chat;
use App\Models\Message;
use App\Events\MessageSent;
use App\Events\ChatDeleted;

class LiveChatController extends Controller
{
    /**
     * Send a message (guest or authenticated user)
     */
    public function sendMessage(Request $request)
    {
        $validated = $request->validate([
            'message' => 'required|string|max:2000',
        ]);

        $user = Auth::user();
        $content = $validated['message'];

        if ($user) {
            // Authenticated user
            $chat = Chat::firstOrCreate(
                ['user_id' => $user->id],
                ['is_closed' => false, 'admin_joined' => false, 'title' => null]
            );

            $senderType = 'user';
        } else {
            // Guest
            $sessionId = $request->cookie('chat_session_id') ?? Str::uuid();

            if (!$request->cookie('chat_session_id')) {
                cookie()->queue('chat_session_id', $sessionId, 60 * 24 * 7); // 7 days
            }

            // Try to find an existing chat with this session
            $chat = Chat::where('session_id', $sessionId)->first();

            if (!$chat || $chat->is_closed) {
                // Create a new chat if none exists or previous is closed
                $chat = Chat::create([
                    'session_id' => $sessionId,
                    'is_closed' => false,
                    'admin_joined' => false,
                ]);
            }

            $senderType = 'guest';
        }

        // Create the message
        $message = Message::create([
            'chat_id' => $chat->id,
            'user_id' => $user?->id,
            'sender_type' => $senderType,
            'content' => $content,
        ]);

        // Broadcast to others (Live updates)
        if ($chat->session_id) {
            broadcast(new MessageSent($message, $chat->session_id))->toOthers();
        }

        return response()->json(['message' => $message], 201);
    }

    /**
     * Fetch messages for a chat (returns chat_id always)
     */
    public function fetchMessages(Request $request)
    {
        $guestId = $request->query('guest_id');
        $user = Auth::user();

        if ($user) {
            // Authenticated user
            $chat = Chat::firstOrCreate(
                ['user_id' => $user->id],
                ['is_closed' => false, 'admin_joined' => false, 'title' => null]
            );
        } else {
            // Guest
            $sessionId = $guestId ?? $request->cookie('chat_session_id') ?? Str::uuid();

            if (!$request->cookie('chat_session_id')) {
                cookie()->queue('chat_session_id', $sessionId, 60 * 24 * 7); // 7 days
            }

            $chat = Chat::where('session_id', $sessionId)->first();

            if (!$chat || $chat->is_closed) {
                $chat = Chat::create([
                    'session_id' => $sessionId,
                    'is_closed' => false,
                    'admin_joined' => false,
                ]);
            }
        }

        $messages = $chat->messages()->orderBy('created_at')->get();

        return response()->json([
            'chat_id' => $chat->id,
            'messages' => $messages,
            'chat_deleted' => $chat->is_closed,
            'deleted_by' => $chat->deleted_by ?? null,
        ]);
    }

    /**
     * Delete (close) chat
     */
    public function deleteChat(Request $request, Chat $chat)
    {
        $user = Auth::user();
        $deletedBy = $user ? 'Admin' : 'Guest';

        $chat->update([
            'is_closed' => true,
            'deleted_by' => $deletedBy,
        ]);

        // Broadcast closure event
        if ($chat->session_id) {
            broadcast(new ChatDeleted($chat->id, $deletedBy))->toOthers();
        }

        return response()->json([
            'success' => true,
            'deleted_by' => $deletedBy,
        ]);
    }
}
