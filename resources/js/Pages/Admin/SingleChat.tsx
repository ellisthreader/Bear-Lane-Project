import React, { useEffect, useState, useRef } from "react";
import { Head } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { ArrowLeft, SendHorizonal } from "lucide-react";

interface Message {
  id: number;
  user_id: number | null;
  sender_type: "user" | "admin" | "system";
  content: string;
  created_at: string;
}

interface Props {
  chat_id: number;
  user: any;
}

export default function SingleChat({ chat_id, user }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const joinedRef = useRef(false); // ✅ Ref to prevent double join
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/admin/livechats/${chat_id}/messages`, {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setMessages(data.messages);
      setError(null);
    } catch (err: any) {
      console.error("❌ Fetch failed:", err);
      setError("Failed to load messages.");
    }
  };

  const joinChat = async () => {
    if (joinedRef.current) return; // prevent double call
    try {
      await fetch(`/admin/livechats/${chat_id}/join`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRF-TOKEN": (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || "",
        },
      });
      joinedRef.current = true;
    } catch (err) {
      console.error("❌ Failed to send join message:", err);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    setLoading(true);

    try {
      const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content;

      const res = await fetch(`/admin/livechats/${chat_id}/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRF-TOKEN": csrfToken || "",
        },
        credentials: "include",
        body: JSON.stringify({ content: newMessage }),
      });

      if (!res.ok) throw new Error("Failed to send message");

      setNewMessage("");
      fetchMessages();
    } catch (err: any) {
      console.error("❌ Send failed:", err);
      setError("Message failed to send.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      await joinChat();
      await fetchMessages();
    };
    init();

    const interval = setInterval(fetchMessages, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <AuthenticatedLayout>
      <Head title={`Chat #${chat_id}`} />

      <div className="min-h-screen p-10 bg-gray-100 dark:bg-gray-900 flex flex-col">
        <div className="flex items-center mb-6">
          <ArrowLeft
            className="h-6 w-6 text-gray-600 cursor-pointer"
            onClick={() => window.history.back()}
          />
          <h1 className="text-2xl font-bold ml-4">Chat #{chat_id}</h1>
        </div>

        <div className="flex-1 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md overflow-y-auto flex flex-col space-y-3">
          {messages.length === 0 && (
            <p className="text-gray-400 text-center mt-10">No messages yet.</p>
          )}
            {messages.map((msg) => {
              const isAdmin = msg.sender_type === "admin";
              const isSystem = msg.sender_type === "system";

              return (
                <div
                  key={msg.id}
                  className={`flex ${
                    isAdmin ? "justify-end" : isSystem ? "justify-center" : "justify-start"
                  }`}
                >
                  <span
                    className={`${
                      isSystem
                        ? "text-gray-500 dark:text-gray-400 italic text-sm text-center select-none"
                        : isAdmin
                        ? "bg-indigo-600 text-white px-4 py-2 rounded-xl max-w-[75%] break-words shadow"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2 rounded-xl max-w-[75%] break-words shadow"
                    }`}
                    style={isSystem ? { fontSize: "0.85rem", letterSpacing: "0.5px" } : {}}
                  >
                    {msg.content}
                  </span>
                </div>
              );
            })}

          <div ref={messagesEndRef}></div>
        </div>

        {error && (
          <div className="text-red-500 dark:text-red-400 text-sm mt-2 text-center">
            {error}
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 rounded-full border dark:border-gray-600 bg-white dark:bg-gray-700 text-black dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
            onKeyDown={(e) => {
              if (e.key === "Enter") sendMessage();
            }}
          />
          <button
            onClick={sendMessage}
            disabled={loading}
            className="p-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition flex items-center justify-center"
          >
            <SendHorizonal className="h-5 w-5" />
          </button>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
