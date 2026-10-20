import axios from "axios";
import Echo from "laravel-echo";
import Pusher from "pusher-js";

// Axios Setup
window.axios = axios;
window.axios.defaults.withCredentials = true;
window.axios.defaults.headers.common["X-Requested-With"] = "XMLHttpRequest";

// Make CSRF Token accessible
const csrfToken = document
  .querySelector('meta[name="csrf-token"]')
  ?.getAttribute("content");

window.Pusher = Pusher;

const pusherKey = import.meta.env.VITE_PUSHER_APP_KEY;
const pusherCluster = import.meta.env.VITE_PUSHER_APP_CLUSTER;

if (pusherKey) {
  // ✅ Pusher Cloud WebSockets Only
  window.Echo = new Echo({
    broadcaster: "pusher",
    key: pusherKey,
    cluster: pusherCluster,
    forceTLS: true, // Use secure websocket
    encrypted: true,
    disableStats: true,
    authEndpoint: "/broadcasting/auth",
    withCredentials: true,
    authorizer: (channel, options) => ({
      authorize: (socketId, callback) => {
        fetch("/broadcasting/auth", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...(csrfToken ? { "X-CSRF-TOKEN": csrfToken } : {}),
          },
          credentials: "include",
          body: JSON.stringify({
            socket_id: socketId,
            channel_name: channel.name,
          }),
        })
          .then((res) => res.json())
          .then((data) => callback(null, data))
          .catch((err) => callback(err));
      },
    }),
  });

  console.log("✅ Laravel Echo initialized:", window.Echo);

  // Debug Logs
  const pusher = window.Echo.connector?.pusher;
  pusher?.connection.bind("connected", () =>
    console.log("🔗 WebSocket connected ✅")
  );
  pusher?.connection.bind("error", (err) =>
    console.error("🚨 WebSocket error:", err)
  );
  pusher?.connection.bind("disconnected", () =>
    console.warn("⚠️ WebSocket disconnected")
  );
} else {
  console.info("Pusher disabled: VITE_PUSHER_APP_KEY is not set.");
}
