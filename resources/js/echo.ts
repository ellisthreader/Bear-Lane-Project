import Echo from "laravel-echo";
import Pusher from "pusher-js";

(window as any).Pusher = Pusher;

const pusherKey = import.meta.env.VITE_PUSHER_APP_KEY;

export const echo = pusherKey
  ? new Echo({
      broadcaster: "pusher",
      key: pusherKey,
      cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER,
      forceTLS: true,
      wsHost: window.location.hostname,
      wsPort: 6001,
      wssPort: 6001,
      disableStats: true,
    })
  : null;
