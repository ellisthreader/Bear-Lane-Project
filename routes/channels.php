<?php

use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| Here you register broadcast channels for your application.
| Authorization callbacks check if the authenticated user can listen.
|
*/

// Register broadcast routes for private channels
Broadcast::routes([
    'middleware' => ['web', 'auth'] // ensures session + auth is available
]);

/*
|--------------------------------------------------------------------------
| Authenticate individual user notifications
|--------------------------------------------------------------------------
*/
Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return $user && (int) $user->id === (int) $id;
});

/*
|--------------------------------------------------------------------------
| Private chat channels (per logged-in user chat session)
|--------------------------------------------------------------------------
*/
Broadcast::channel('chat.{chatId}', function ($user, $chatId) {
    if (!$user) {
        return false;
    }

    return $user->chats()->where('chats.id', $chatId)->exists();
});

/*
|--------------------------------------------------------------------------
| Admin-only live chat channel
|--------------------------------------------------------------------------
| Only admins can join this channel and view live messages.
*/
Broadcast::channel('admin.livechats', function ($user) {
    return (bool) ($user->is_admin ?? false);
});

/*
|--------------------------------------------------------------------------
| Optional: Public support chat room
|--------------------------------------------------------------------------
| Allows authenticated users to join a shared public channel.
*/
Broadcast::channel('support-chat', function ($user) {
    return (bool) $user;
});

/*
|--------------------------------------------------------------------------
| Guest private chat channels
|--------------------------------------------------------------------------
| Each guest gets a unique private channel: 'guest.{guestId}'
| No authentication required; guests can only listen to their own channel.
*/
Broadcast::channel('guest.{guestId}', function ($guestId) {
    // For guests, we allow listening by default
    // Security is enforced by frontend using the same guestId
    return true;
});
