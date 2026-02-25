"use client";

import React, { useEffect, useState } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { usePage, router } from "@inertiajs/react";

import { FiArrowLeftCircle, FiMail, FiEdit, FiTrash2 } from "react-icons/fi";
import { BsCircleFill, BsCircle } from "react-icons/bs";
import axios from "axios";

// Setup Axios globally
axios.defaults.withCredentials = true;
axios.defaults.headers.common['X-CSRF-TOKEN'] = document
  .querySelector('meta[name="csrf-token"]')
  ?.getAttribute("content") || '';

interface ActiveChat {
  chat_id: number;
  title: string;
  user_name?: string;
  updated_at: string;
  is_closed?: boolean;
}

export default function LiveChats() {
  const { props }: any = usePage();
  const user = props.auth.user;

  const [activeChats, setActiveChats] = useState<ActiveChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActiveChats = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await axios.get("/admin/active-chats");
      const data = res.data;

      setActiveChats(
        (data.chats || []).map((chat: any) => ({
          chat_id: chat.chat_id,
          title: chat.title || `#${chat.chat_id}`,
          user_name: chat.user?.username || "Guest",
          updated_at: new Date(chat.updated_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          is_closed: chat.is_closed ?? false,
        }))
      );
    } catch (err: any) {
      setError(err.message || "Unknown error");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveChats();

    const Echo = (window as any).Echo;
    if (!Echo) return;

    const channel = Echo.private("admin.livechats");
    channel.listen(".AdminChatBroadcast", fetchActiveChats);

    return () => {
      channel.stopListening(".AdminChatBroadcast");
    };
  }, []);

  const openChat = (chat_id: number) => router.get(`/admin/livechats/${chat_id}`);

  const renameChat = async (chat_id: number) => {
    const newTitle = prompt("Enter new title for this chat:");
    if (!newTitle) return;

    try {
      const res = await axios.patch(`/admin/livechats/${chat_id}/rename`, {
        title: newTitle,
      });

      const updatedChat = res.data.chat;
      setActiveChats((prev) =>
        prev.map((chat) =>
          chat.chat_id === chat_id ? { ...chat, title: updatedChat.title } : chat
        )
      );
    } catch (err: any) {
      console.error(err);
      alert("Failed to rename chat. Please try again.");
    }
  };

  const deleteChat = async (chat_id: number) => {
    if (!confirm("Are you sure you want to delete this chat?")) return;

    try {
      await axios.delete(`/admin/livechats/${chat_id}`);
      setActiveChats((prev) => prev.filter((chat) => chat.chat_id !== chat_id));
    } catch (err: any) {
      console.error(err);
      alert("Failed to delete chat. Please try again.");
    }
  };

  const emailTranscript = (chat_id: number) => {
    alert("Email transcript for chat " + chat_id);
  };

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <nav className="bg-white dark:bg-gray-900 shadow px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <FiArrowLeftCircle
              className="h-6 w-6 text-gray-600 dark:text-gray-300 cursor-pointer hover:text-indigo-500 transition-colors"
              onClick={() => router.get("/admin/dashboard")}
            />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Admin Panel</h2>
          </div>
          <div className="text-gray-700 dark:text-gray-300">
            Logged in as <span className="font-semibold">{user?.username}</span>
          </div>
        </nav>

        <header className="px-8 py-6">
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-2">
            Live Chat Manager
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Monitor active chats in real time.
          </p>
        </header>

        <main className="px-8 pb-12">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            {loading ? (
              <p className="text-gray-600 dark:text-gray-400 p-6 text-center">Loading chats...</p>
            ) : error ? (
              <p className="text-red-500 dark:text-red-400 p-6 text-center">{error}</p>
            ) : activeChats.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 italic p-6 text-center">
                No live chats currently active.
              </p>
            ) : (
              <table className="w-full table-fixed">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="py-4 px-6 text-left text-gray-600 dark:text-gray-300 text-sm font-semibold">
                      Chat
                    </th>
                    <th className="py-4 px-6 text-left text-gray-600 dark:text-gray-300 text-sm font-semibold">
                      User
                    </th>
                    <th className="py-4 px-6 text-left text-gray-600 dark:text-gray-300 text-sm font-semibold">
                      Last Updated
                    </th>
                    <th className="py-4 px-6 text-center text-gray-600 dark:text-gray-300 text-sm font-semibold">
                      Status
                    </th>
                    <th className="py-4 px-6 text-center text-gray-600 dark:text-gray-300 text-sm font-semibold">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {activeChats.map((chat) => (
                    <tr
                      key={chat.chat_id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                    >
                      <td
                        onClick={() => openChat(chat.chat_id)}
                        className="py-4 px-6 font-medium text-indigo-600 dark:text-indigo-400 cursor-pointer"
                      >
                        {chat.title}
                      </td>
                      <td className="py-4 px-6 text-gray-500 dark:text-gray-400">
                        {chat.user_name}
                      </td>
                      <td className="py-4 px-6 text-gray-500 dark:text-gray-400">
                        {chat.updated_at}
                      </td>
                      <td className="py-4 px-6 text-center">
                        {chat.is_closed ? (
                          <span className="text-red-500 font-semibold flex items-center justify-center gap-1">
                            <BsCircle className="w-3 h-3" /> Closed
                          </span>
                        ) : (
                          <span className="text-green-500 font-semibold flex items-center justify-center gap-1">
                            <BsCircleFill className="w-3 h-3" /> Open
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 flex items-center justify-center gap-4">
                        <button
                          className="text-blue-500 hover:text-blue-700 transition"
                          onClick={() => renameChat(chat.chat_id)}
                        >
                          <FiEdit size={18} />
                        </button>
                        <button
                          className="text-red-500 hover:text-red-700 transition"
                          onClick={() => deleteChat(chat.chat_id)}
                        >
                          <FiTrash2 size={18} />
                        </button>
                        <button
                          className="text-indigo-500 hover:text-indigo-700 transition"
                          onClick={() => emailTranscript(chat.chat_id)}
                        >
                          <FiMail size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>
    </AuthenticatedLayout>
  );
}
