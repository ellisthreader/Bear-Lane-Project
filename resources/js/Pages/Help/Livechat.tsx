import React, { useEffect, useState, useRef } from "react";
import { Head, router } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { ArrowLeft, SendHorizonal, X } from "lucide-react";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

interface Message {
  id: string | number;
  chat_id?: string | number;
  user_id: number | null;
  username?: string;
  sender_type: "guest" | "user" | "admin" | "system";
  content: string;
  created_at: string;
}

export default function Livechat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [welcomeSent, setWelcomeSent] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [adminJoined, setAdminJoined] = useState(false);
  const [chatDeleted, setChatDeleted] = useState(false);
  const [deletedAt, setDeletedAt] = useState<string | null>(null);
  const [chatDeleter, setChatDeleter] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Persistent guest ID via cookie
  const [guestId] = useState(() => {
    const getCookie = (name: string) => {
      const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
      return match ? match[2] : null;
    };
    let id = getCookie("chat_session_id");
    if (!id) {
      id = uuidv4();
      document.cookie = `chat_session_id=${id}; path=/; max-age=${60 * 60 * 24 * 7}`;
    }
    return id;
  });

  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  const appendMessage = (msg: Message) => {
    setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
  };

  const simulateBotTyping = (callback: () => void, delay = 1000) => {
    setIsBotTyping(true);
    setTimeout(() => {
      setIsBotTyping(false);
      callback();
      scrollToBottom();
    }, delay);
  };

  const sendWelcomeMessage = () => {
    if (welcomeSent) return;
    setWelcomeSent(true);
    appendMessage({
      id: `welcome_${guestId}`,
      user_id: null,
      sender_type: "admin",
      content: "Hey there! 👋 I'm Ellis’ virtual assistant. How can I help you today?",
      created_at: new Date().toISOString(),
    });
    scrollToBottom();
  };

  // Fetch messages from backend
  const fetchMessages = async () => {
    try {
      const res = await axios.get(`/livechat/messages?guest_id=${guestId}`);
      const fetched: Message[] = res.data.messages || [];

      // ✅ Always set chatId from backend if not already
      if (!chatId && res.data.chat_id) {
        setChatId(res.data.chat_id.toString());
      }

      // Handle chat deletion state
      if (res.data.chat_deleted && chatId && !chatDeleted) {
        setChatDeleted(true);
        setDeletedAt(new Date().toISOString());
        setChatDeleter(res.data.deleted_by === "Guest" ? "You" : "Admin");

        let countdown = 5;
        const msgId = `system_deleted_${Date.now()}`;
        appendMessage({
          id: msgId,
          user_id: null,
          sender_type: "system",
          content: `${res.data.deleted_by === "Guest" ? "You" : "Admin"} deleted this chat (${countdown})`,
          created_at: new Date().toISOString(),
        });

        const interval = setInterval(() => {
          countdown--;
          setMessages(prev =>
            prev.map(m =>
              m.id === msgId
                ? { ...m, content: `${res.data.deleted_by === "Guest" ? "You" : "Admin"} deleted this chat (${countdown})` }
                : m
            )
          );
          if (countdown <= 0) clearInterval(interval);
        }, 1000);

        return;
      }

      // Reset state if a new chat is started after deletion
      if (chatDeleted && !res.data.chat_deleted) {
        setChatDeleted(false);
        setDeletedAt(null);
        setWelcomeSent(false);
        setMessages([]);
      }

      // Append only new messages
      setMessages(prev => {
        const existingIds = new Set(prev.map(m => m.id));
        const newMsgs = fetched.filter(m => !existingIds.has(m.id));
        return [...prev, ...newMsgs];
      });

      if (!welcomeSent) sendWelcomeMessage();
    } catch (err) {
      console.error("❌ Fetch failed:", err);
    } finally {
      scrollToBottom();
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 1500);
    return () => clearInterval(interval);
  }, [chatId]);

  const sendMessage = async () => {
    if (!newMessage.trim() || chatDeleted) return;
    setLoading(true);
    try {
      const res = await axios.post("/livechat/message", {
        message: newMessage,
        guest_id: guestId,
      });

      appendMessage(res.data.message);
      setNewMessage("");
      scrollToBottom();

      simulateBotTyping(() => {
        appendMessage({
          id: `bot_${Date.now()}`,
          user_id: null,
          sender_type: "admin",
          content: "Thanks! I've let a human agent know — they’ll join shortly 🧑‍💼",
          created_at: new Date().toISOString(),
        });
      });
    } catch (err) {
      console.error("Send failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!chatId) return;

    setShowDeleteConfirm(false);
    setChatDeleted(true);
    setDeletedAt(new Date().toISOString());
    setChatDeleter("You");

    let countdown = 5;
    const msgId = `system_delete_${Date.now()}`;

    appendMessage({
      id: msgId,
      user_id: null,
      sender_type: "system",
      content: `You deleted this chat (${countdown})`,
      created_at: new Date().toISOString(),
    });

    const interval = setInterval(() => {
      countdown--;
      setMessages(prev =>
        prev.map(m =>
          m.id === msgId ? { ...m, content: `You deleted this chat (${countdown})` } : m
        )
      );
      if (countdown <= 0) {
        clearInterval(interval);
        setMessages(prev => prev.filter(m => m.id !== msgId));
      }
    }, 1000);

    setTimeout(async () => {
      clearInterval(interval);
      try {
        await axios.delete(`/livechat/${chatId}`);
        setMessages([]);
        setChatId(null);
        document.cookie = "chat_session_id=; path=/; max-age=0";
      } catch (err) {
        console.error("❌ Delete failed:", err);
      }
    }, 5000);
  };

  return (
    <AuthenticatedLayout>
      <Head title="Live Chat Support" />
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="flex flex-col w-full max-w-2xl h-[700px] bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden">
          {/* HEADER */}
          <div className="flex items-center justify-between px-6 py-4 bg-indigo-600 text-white font-bold rounded-t-3xl">
            <ArrowLeft
              className="h-6 w-6 cursor-pointer hover:text-indigo-200 transition"
              onClick={() => window.history.back()}
            />
            <div className="flex items-center gap-3">
              <img
                src={adminJoined ? "/images/AdminPicture.jpeg" : "/images/chatbot.jpg"}
                alt={adminJoined ? "Admin" : "Ellis Bot"}
                className="w-7 h-7 rounded-full border border-white"
              />
              <span className="text-lg font-semibold">
                {adminJoined ? "Admin" : "Ellis Bot"}
              </span>
            </div>
            <X
              className="h-6 w-6 cursor-pointer hover:text-red-300 transition"
              onClick={() => setShowDeleteConfirm(true)}
            />
          </div>

          {/* MESSAGES */}
          <div className="flex-1 p-6 space-y-4 overflow-y-auto bg-gray-50 dark:bg-gray-900">
            {messages.map((msg) => {
              const isUser = msg.sender_type === "guest" || msg.sender_type === "user";
              const isSystem = msg.sender_type === "system";
              const isBot =
                msg.id.toString().startsWith("bot_") ||
                msg.id.toString().startsWith("welcome_");

              return (
                <div
                  key={msg.id}
                  className={`flex ${
                    isUser ? "justify-end" : isSystem ? "justify-center" : "justify-start"
                  }`}
                >
                  <span
                    className={`${
                      isSystem
                        ? "text-gray-500 dark:text-gray-400 italic text-sm"
                        : isUser
                        ? "bg-indigo-600 text-white px-5 py-2 rounded-br-none max-w-[70%]"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white px-5 py-2 rounded-bl-none max-w-[70%]"
                    }`}
                  >
                    {!isSystem && (
                      <div className="font-semibold text-xs opacity-75 mb-1">
                        {isUser ? "You" : isBot ? "Ellis Bot" : "Admin"}
                      </div>
                    )}
                    {msg.content}
                  </span>
                </div>
              );
            })}

            {isBotTyping && !adminJoined && (
              <div className="flex justify-start text-xs italic text-gray-500 dark:text-gray-400 px-4">
                Ellis Bot is typing<span className="animate-bounce">.</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* INPUT */}
          {!chatDeleted && (
            <div className="flex px-6 py-4 gap-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Type your message..."
                className="flex-1 px-4 py-3 rounded-full border dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 text-black dark:text-white"
              />
              <button
                onClick={sendMessage}
                disabled={loading || !newMessage.trim()}
                className="p-3 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition"
              >
                <SendHorizonal className="h-5 w-5" />
              </button>
            </div>
          )}

          {/* DELETE CONFIRM MODAL */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 w-96">
                <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
                  Are you sure you want to delete this chat?
                </h2>
                <p className="text-gray-700 dark:text-gray-300 mb-6">
                  This will remove all messages permanently.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    className="px-4 py-2 bg-gray-300 dark:bg-gray-700 rounded hover:bg-gray-400 dark:hover:bg-gray-600 transition"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                    onClick={confirmDelete}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CHAT DELETED OVERLAY */}
          {chatDeleted && deletedAt && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 w-96 text-center">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                  {chatDeleter ?? "Admin"} closed this chat
                </h2>
                <p className="text-gray-700 dark:text-gray-300 mb-6">
                  at {new Date(deletedAt).toLocaleString()}
                </p>
                <div className="flex justify-center gap-4">
                  <button
                    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
                    onClick={() => router.visit("/help")}
                  >
                    Go Back
                  </button>
                  <button
                    className="px-4 py-2 bg-gray-300 dark:bg-gray-700 rounded hover:bg-gray-400 dark:hover:bg-gray-600 transition"
                    onClick={() => alert("Download transcript")}
                  >
                    Download Transcript
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
