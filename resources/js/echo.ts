import Echo from "laravel-echo";
import Pusher from "pusher-js";

(window as any).Pusher = Pusher;

export const echo = new Echo({
  broadcaster: "pusher",
  key: import.meta.env.VITE_PUSHER_APP_KEY,
  cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER,
  forceTLS: true,
  wsHost: window.location.hostname,
  wsPort: 6001,
  wssPort: 6001,
  disableStats: true,
});
