import Echo from "laravel-echo";
import Pusher from "pusher-js";
import axios from "@/lib/axios";

let echo = null;

/**
 * Reverb es opcional: si el tenant/despliegue no configuró sus variables Vite,
 * el consumidor conserva el polling actual sin errores ni conexiones externas.
 */
export function userNotificationChannel(userId, realtime, onNotification) {
    const key = realtime?.key || import.meta.env.VITE_REVERB_APP_KEY;
    if (!key || !userId || typeof window === "undefined") {
        return () => {};
    }

    if (!echo) {
        const scheme = import.meta.env.VITE_REVERB_SCHEME ||
            (window.location.protocol === "https:" ? "https" : "http");
        const encrypted = scheme === "https";
        const port = Number(import.meta.env.VITE_REVERB_PORT || (encrypted ? 443 : 80));

        window.Pusher = Pusher;
        echo = new Echo({
            broadcaster: "reverb",
            key,
            wsHost: import.meta.env.VITE_REVERB_HOST || window.location.hostname,
            wsPort: port,
            wssPort: port,
            forceTLS: encrypted,
            enabledTransports: ["ws", "wss"],
            authorizer: (channel) => ({
                authorize: (socketId, callback) => {
                    axios.post("/broadcasting/auth", {
                        socket_id: socketId,
                        channel_name: channel.name,
                    }).then((response) => callback(false, response.data))
                        .catch((error) => callback(error, null));
                },
            }),
        });
    }

    const channel = `App.Models.User.${userId}`;
    echo.private(channel).notification(onNotification);

    return () => echo?.leave(channel);
}
