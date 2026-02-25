"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ChatMessage = {
  id: number;
  userId: number;
  text: string;
  createdAt: string;
  user: {
    id: number;
    username: string;
    role: string;
  };
  replyToMessageId: number | null;
  replyToUsername: string | null;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<string>("USER");
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [updating, setUpdating] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const didInitialScrollRef = useRef(false);

  const canSend = text.trim().length > 0 && !loading;

  async function loadMessages() {
    const token = sessionStorage.getItem("token");
    if (!token) return;

    const res = await fetch("/api/chat/messages", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = "/login";
      }
      return;
    }

    const data = (await res.json()) as ChatMessage[];
    setMessages(data);
  }

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    const storedUserId = sessionStorage.getItem("userId");
    const storedRole = sessionStorage.getItem("role");

    if (!token) {
      window.location.href = "/login";
      return;
    }

    setUserId(storedUserId ? Number(storedUserId) : null);
    setRole(storedRole?.toUpperCase() || "USER");

    loadMessages();
    const interval = setInterval(loadMessages, 5000);

    return () => clearInterval(interval);
  }, []);

  const mappedById = useMemo(() => {
    const map = new Map<number, ChatMessage>();
    for (const msg of messages) {
      map.set(msg.id, msg);
    }
    return map;
  }, [messages]);

  useEffect(() => {
    if (didInitialScrollRef.current) return;
    if (messages.length === 0) return;

    const container = messagesContainerRef.current;
    if (!container) return;

    container.scrollTop = container.scrollHeight;
    didInitialScrollRef.current = true;
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!canSend) return;

    const token = sessionStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          text,
          replyToMessageId: replyTo?.id,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setMessage(data?.message || "❌ Hiba történt az üzenet küldésekor.");
        return;
      }

      setText("");
      setReplyTo(null);
      await loadMessages();
    } finally {
      setLoading(false);
    }
  }

  function startEdit(msg: ChatMessage) {
    setEditingMessageId(msg.id);
    setEditingText(msg.text);
    setMessage("");
  }

  async function saveEdit(messageId: number) {
    const token = sessionStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }

    const trimmed = editingText.trim();
    if (!trimmed) {
      setMessage("❌ Az üzenet nem lehet üres.");
      return;
    }

    if (trimmed.length > 500) {
      setMessage("❌ Az üzenet túl hosszú (max 500 karakter).");
      return;
    }

    setUpdating(true);
    setMessage("");

    try {
      const res = await fetch(`/api/chat/messages/${messageId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setMessage(data?.message || "❌ Hiba történt a szerkesztés közben.");
        return;
      }

      setEditingMessageId(null);
      setEditingText("");
      await loadMessages();
    } finally {
      setUpdating(false);
    }
  }

  async function deleteMessage(messageId: number) {
    const token = sessionStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }

    setUpdating(true);
    setMessage("");

    try {
      const res = await fetch(`/api/chat/messages/${messageId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setMessage(data?.message || "❌ Hiba történt a törlés közben.");
        return;
      }

      if (editingMessageId === messageId) {
        setEditingMessageId(null);
        setEditingText("");
      }

      await loadMessages();
    } finally {
      setUpdating(false);
    }
  }

  function addEmoji(emoji: string) {
    setText((prev) => `${prev}${emoji}`);
  }

  return (
    <div className="min-h-screen bg-gray-100 px-2 sm:px-4 py-4 sm:py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-4 sm:mb-6 text-center">💬 Chat</h1>

        <div
          ref={messagesContainerRef}
          className="bg-white border border-gray-200 rounded-2xl shadow-sm p-3 sm:p-4 h-[calc(100vh-290px)] sm:h-[60vh] overflow-y-auto space-y-3"
        >
          {messages.length === 0 && (
            <p className="text-center text-gray-600">Még nincs üzenet. Írj te elsőként! 👋</p>
          )}

          {messages.map((msg) => {
            const own = userId === msg.userId;
            const isAdmin = role === "ADMIN";
            const canDelete = own || isAdmin;
            const repliedMessage = msg.replyToMessageId ? mappedById.get(msg.replyToMessageId) : null;
            const isEditingThis = editingMessageId === msg.id;

            return (
              <div
                key={msg.id}
                className={`rounded-xl border p-3 ${
                  own ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between gap-4 mb-1">
                  <p className="text-sm font-bold text-gray-900">
                    {msg.user.username}
                    {msg.user.role === "ADMIN" ? " (Admin)" : ""}
                  </p>
                  <p className="text-[11px] sm:text-xs text-gray-500 whitespace-nowrap">
                    {new Date(msg.createdAt).toLocaleString("hu-HU", {
                      timeZone: "Europe/Budapest",
                    })}
                  </p>
                </div>

                {msg.replyToMessageId && (
                  <div className="mb-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                    <p className="text-xs font-semibold text-blue-800">
                      Válasz @{msg.replyToUsername || repliedMessage?.user.username || "ismeretlen"} üzenetére
                    </p>
                    {repliedMessage && (
                      <p className="text-xs text-blue-700 truncate">{repliedMessage.text}</p>
                    )}
                  </div>
                )}

                {isEditingThis ? (
                  <div className="space-y-2">
                    <textarea
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      maxLength={500}
                      className="w-full min-h-[80px] rounded-xl border-2 border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-500"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-gray-500">{editingText.length}/500</p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMessageId(null);
                            setEditingText("");
                          }}
                          className="h-8 px-3 rounded-lg border border-gray-300 text-gray-700 text-xs sm:text-sm font-semibold hover:bg-gray-50"
                        >
                          Mégse
                        </button>
                        <button
                          type="button"
                          onClick={() => saveEdit(msg.id)}
                          disabled={updating}
                          className="h-8 px-3 rounded-lg bg-blue-700 text-white text-xs sm:text-sm font-semibold hover:bg-blue-800 disabled:bg-blue-300"
                        >
                          Mentés
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-900 whitespace-pre-wrap break-words">{msg.text}</p>
                )}

                <div className="mt-2 flex items-center gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setReplyTo(msg)}
                    className="text-xs font-semibold text-blue-700 hover:text-blue-800"
                  >
                    Válasz
                  </button>
                  {own && !isEditingThis && (
                    <button
                      type="button"
                      onClick={() => startEdit(msg)}
                      className="text-xs font-semibold text-purple-700 hover:text-purple-800"
                    >
                      Szerkesztés
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => deleteMessage(msg.id)}
                      disabled={updating}
                      className="text-xs font-semibold text-red-700 hover:text-red-800 disabled:text-red-300"
                    >
                      {role === "ADMIN" && !own ? "Moderálás (törlés)" : "Törlés"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <form onSubmit={sendMessage} className="mt-3 sm:mt-4 bg-white border border-gray-200 rounded-2xl shadow-sm p-3 sm:p-4">
          {replyTo && (
            <div className="mb-3 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-purple-800">
                  Válasz @{replyTo.user.username} üzenetére
                </p>
                <p className="text-xs text-purple-700 truncate">{replyTo.text}</p>
              </div>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="text-xs font-bold text-purple-700 hover:text-purple-900"
              >
                Mégse
              </button>
            </div>
          )}

          <div className="flex gap-2 mb-3 flex-wrap">
            {["😀", "😂", "🔥", "⚽", "👏", "❤️"].map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => addEmoji(emoji)}
                className="h-9 w-9 rounded-lg border border-gray-200 hover:bg-gray-50"
              >
                {emoji}
              </button>
            ))}
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Írj üzenetet..."
            className="w-full min-h-[90px] rounded-xl border-2 border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-500"
            maxLength={500}
          />

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs text-gray-500">{text.length}/500</p>
            <button
              type="submit"
              disabled={!canSend || updating}
              className={`h-10 px-4 rounded-xl text-white font-bold transition ${
                canSend && !updating ? "bg-blue-700 hover:bg-blue-800" : "bg-blue-300 cursor-not-allowed"
              }`}
            >
              {loading ? "Küldés..." : "Üzenet küldése"}
            </button>
          </div>

          {message && <p className="mt-3 text-sm font-semibold text-red-700">{message}</p>}
        </form>
      </div>
    </div>
  );
}
