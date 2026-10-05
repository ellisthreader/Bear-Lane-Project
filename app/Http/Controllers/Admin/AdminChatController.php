<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Chat;
use App\Models\Message;
use App\Events\MessageSent;
use App\Events\ChatDeleted;
use Illuminate\Support\Facades\Mail;

class AdminChatController extends Controller
{
    /**
     * Show Live Chats Manager
     */
    public function index()
    {
        return Inertia::render('Admin/LiveChats', [
            'user' => auth()->user(),
        ]);
    }

    /**
     * Return active chats as JSON
     */
    public function activeChats()
    {
        $chats = Chat::orderByDesc('updated_at')
            ->with('user')
            ->get()
            ->map(function ($chat) {
                return [
                    'chat_id'      => $chat->id,
                    'title'        => $chat->title ?? "#{$chat->id}",
                    'updated_at'   => $chat->updated_at->toDateTimeString(),
                    'is_closed'    => $chat->is_closed,
                    'admin_joined' => (bool) $chat->admin_joined,
                    'user'         => $chat->user ? [
                        'id'       => $chat->user->id,
                        'username' => $chat->user->username,
                        'avatar'   => $chat->user->avatar_url,
                    ] : null,
                ];
            });

        return response()->json(['chats' => $chats], 200);
    }

    /**
     * Show single chat page for admin
     */
    public function show($chat_id)
    {
        return Inertia::render('Admin/SingleChat', [
            'chat_id' => $chat_id,
            'user'    => auth()->user(),
        ]);
    }

    /**
     * Fetch messages for a single chat
     */
    public function messages($chat_id)
    {
        $messages = Message::where('chat_id', $chat_id)
            ->with('user')
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(function ($msg) {
                return [
                    'id'          => $msg->id,
                    'user_id'     => $msg->user_id,
                    'username'    => $msg->user
                        ? $msg->user->username
                        : ($msg->sender_type === 'admin'
                            ? 'Admin'
                            : ($msg->sender_type === 'system' ? 'System' : 'Guest')),
                    'sender_type' => $msg->sender_type,
                    'content'     => $msg->content,
                    'created_at'  => $msg->created_at->toDateTimeString(),
                ];
            });

        return response()->json(['messages' => $messages]);
    }

    /**
     * Admin sends a message to a chat
     */
    public function sendMessage(Request $request, $chat_id)
    {
        $request->validate([
            'content' => 'required|string|max:2000',
        ]);

        $chat = Chat::findOrFail($chat_id);

        $message = Message::create([
            'chat_id'     => $chat->id,
            'user_id'     => auth()->id(),
            'sender_type' => 'admin',
            'content'     => $request->content,
        ]);

        // Broadcast message in real-time
        if ($chat->session_id) {
            broadcast(new MessageSent($message, $chat->session_id))->toOthers();
        }

        return response()->json([
            'message' => [
                'id'          => $message->id,
                'user_id'     => $message->user_id,
                'username'    => 'Admin',
                'sender_type' => $message->sender_type,
                'content'     => $message->content,
                'created_at'  => $message->created_at->toDateTimeString(),
            ]
        ], 201);
    }

    /**
     * Admin joins chat — triggers system message for guest (only once)
     */
    public function joinChat($chat_id)
    {
        $chat = Chat::findOrFail($chat_id);

        if ($chat->admin_joined) {
            return response()->json([
                'message' => 'Admin already in chat',
            ]);
        }

        $chat->update(['admin_joined' => true]);

        $alreadyExists = Message::where('chat_id', $chat->id)
            ->where('sender_type', 'system')
            ->where('content', 'Admin has joined the chat')
            ->exists();

        if (!$alreadyExists) {
            $message = Message::create([
                'chat_id'     => $chat->id,
                'user_id'     => null,
                'sender_type' => 'system',
                'content'     => 'Admin has joined the chat',
            ]);

            if ($chat->session_id) {
                broadcast(new MessageSent($message, $chat->session_id))->toOthers();
            }
        }

        return response()->json([
            'message' => 'Admin joined chat',
            'chat_id' => $chat->id,
        ]);
    }

    /**
     * Rename chat
     */
    public function renameChat(Request $request, $chat_id)
    {
        $request->validate([
            'title' => 'required|string|max:255',
        ]);

        $chat = Chat::findOrFail($chat_id);
        $chat->title = $request->title;
        $chat->save();

        return response()->json([
            'message' => 'Chat renamed successfully',
            'chat'    => [
                'chat_id' => $chat->id,
                'title'   => $chat->title,
            ]
        ], 200);
    }

    /**
     * Close (delete) chat — broadcast real-time event so guests see overlay instantly
     */
    public function destroy($chat_id)
    {
        $chat = Chat::findOrFail($chat_id);

        $chat->is_closed = true;
        $chat->deleted_by = 'Admin';
        $chat->save();

        // Broadcast closure event
        broadcast(new ChatDeleted($chat->id, 'Admin'))->toOthers();

        return response()->json([
            'success'     => true,
            'message'     => 'Chat closed successfully.',
            'chat_id'     => $chat->id,
            'deleted_by'  => 'Admin',
        ], 200);
    }

    /**
     * Email chat transcript to admin
     */
    public function emailTranscript($chat_id)
    {
        $chat = Chat::with('messages.user')->findOrFail($chat_id);

        $transcript = "Chat Transcript: " . ($chat->title ?? "#{$chat->id}") . "\n\n";

        foreach ($chat->messages as $msg) {
            $username = $msg->user
                ? $msg->user->username
                : ($msg->sender_type === 'admin'
                    ? 'Admin'
                    : ($msg->sender_type === 'system' ? 'System' : 'Guest'));

            $time = $msg->created_at->format('Y-m-d H:i');
            $transcript .= "[{$time}] {$username}: {$msg->content}\n";
        }

        try {
            Mail::raw($transcript, function ($message) use ($chat) {
                $message->to(auth()->user()->email)
                        ->subject("Chat Transcript: " . ($chat->title ?? "#{$chat->id}"));
            });

            return response()->json([
                'message' => 'Transcript emailed successfully.'
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to send transcript.',
                'error'   => $e->getMessage()
            ], 500);
        }
    }
}
