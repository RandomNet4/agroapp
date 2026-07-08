"use client";

import { useRouter, useParams } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft,
  Send,
  User,
  Loader2,
  Check,
  CheckCheck,
} from "lucide-react";

import { chatApi, formatRupiah } from "@/lib/ecommerce-api";
import { useAuthStore } from "@/store/auth-store";

interface MessageData {
  id: string;
  senderId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

interface ProductMeta {
  id: string;
  nama: string;
  harga: number;
  fotoUrl?: string | null;
  gambarUtama?: string | null;
}

interface OrderMeta {
  orderId: string;
  shortId: string;
  status: string;
  storeName: string;
  totalHarga: number;
  itemCount: number;
  firstItemName: string;
  firstItemImage: string | null;
}

interface ConvDetail {
  id: string;
  type: string;
  otherUser: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  } | null;
}

const AdminChatRoomPage: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const conversationId = params.id as string;

  const { user } = useAuthStore();
  const currentUserId = user?.id || "";

  const [conversation, setConversation] = useState<ConvDetail | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await chatApi.getConversation(conversationId, {
        limit: 100,
      });
      const data = res.data?.data || res.data;
      if (data?.conversation) {
        setConversation(data.conversation);
      }
      // Backend returns data.pesan (Prisma field), not data.messages
      if (data?.pesan && Array.isArray(data.pesan)) {
        const mapped = data.pesan.map((p: any) => ({
          id: p.id || `msg-${p.createdAt || Date.now()}-${Math.random()}`,
          senderId: p.pengirimId || p.senderId,
          content:
            p.isiPesan ||
            p.content ||
            p.text ||
            p.message ||
            p.body ||
            p.pesan ||
            "",
          isRead: p.sudahDibaca === true || p.status === "DIBACA",
          createdAt: p.createdAt || p.tanggalDibuat || new Date().toISOString(),
        }));
        const unique = mapped.filter(
          (msg: any, index: number, self: any[]) =>
            index === self.findIndex((t: any) => t.id === msg.id),
        );
        setMessages(unique);
      } else if (data?.messages && Array.isArray(data.messages)) {
        // Map fields for data.messages too
        const mapped = data.messages.map((p: any) => ({
          id: p.id || `msg-${p.createdAt || Date.now()}-${Math.random()}`,
          senderId: p.pengirimId || p.senderId,
          content:
            p.isiPesan ||
            p.content ||
            p.text ||
            p.message ||
            p.body ||
            p.pesan ||
            "",
          isRead: p.sudahDibaca === true || p.status === "DIBACA",
          createdAt: p.createdAt || p.tanggalDibuat || new Date().toISOString(),
        }));
        const unique = mapped.filter(
          (msg: any, index: number, self: any[]) =>
            index === self.findIndex((t: any) => t.id === msg.id),
        );
        setMessages(unique);
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  }, [conversationId]);

  useEffect(() => {
    const init = async () => {
      await fetchMessages();
      setLoading(false);
      chatApi.markAsRead(conversationId).catch(() => {});
    };
    init();

    // SSE Real-time Streaming
    const eventSource = new EventSource(
      `/api/proxy/chat/conversations/${conversationId}/stream`,
      { withCredentials: true },
    );

    eventSource.onmessage = (event) => {
      try {
        const rawData = JSON.parse(event.data);

        // Skip heartbeat messages
        if (
          rawData?.type === "heartbeat" ||
          rawData?.data?.type === "heartbeat"
        )
          return;

        const msgObj = rawData.data || rawData;

        // Skip if no real message ID or sender
        if (
          !msgObj.id &&
          !msgObj.pengirimId &&
          !msgObj.senderId &&
          !msgObj.message?.id
        )
          return;

        const newMessage: MessageData = {
          id:
            msgObj.id ||
            msgObj.message?.id ||
            `msg-${Date.now()}-${Math.random()}`,
          senderId:
            msgObj.pengirimId ||
            msgObj.senderId ||
            msgObj.message?.pengirimId ||
            msgObj.message?.senderId,
          content:
            msgObj.isiPesan ||
            msgObj.content ||
            msgObj.text ||
            msgObj.message?.isiPesan ||
            msgObj.message?.content ||
            msgObj.pesan ||
            "",
          isRead:
            msgObj.sudahDibaca || msgObj.isRead || msgObj.status === "DIBACA",
          createdAt:
            msgObj.createdAt ||
            msgObj.tanggalDibuat ||
            new Date().toISOString(),
        };

        // Extra safety check for empty content
        if (!newMessage.content && !newMessage.senderId) return;

        setMessages((prev) => {
          if (newMessage.id && prev.some((m) => m.id === newMessage.id))
            return prev;

          if (String(newMessage.senderId) === String(currentUserId)) {
            const tempIndex = prev.findIndex(
              (m) =>
                m.id &&
                m.id.startsWith("temp-") &&
                m.content === newMessage.content,
            );
            if (tempIndex !== -1) {
              const newArr = [...prev];
              newArr[tempIndex] = newMessage;
              return newArr;
            }
          }

          return [...prev, newMessage];
        });

        // Mark as read if not from us
        if (String(newMessage.senderId) !== String(currentUserId)) {
          chatApi.markAsRead(conversationId).catch(() => {});
        }
      } catch (err) {
        console.error("Failed to parse SSE message:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE connection error:", err);
    };

    return () => {
      eventSource.close();
    };
  }, [conversationId, fetchMessages, currentUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async () => {
    const content = newMessage.trim();
    if (!content || sending) return;

    setSending(true);
    setNewMessage("");

    const optimisticMsg: MessageData = {
      id: `temp-${Date.now()}`,
      senderId: currentUserId,
      content,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      await chatApi.sendMessage(conversationId, content);
      // Safety net: fetch messages after a short delay
      setTimeout(() => fetchMessages(), 500);
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      setNewMessage(content);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateSeparator = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Hari Ini";
    if (date.toDateString() === yesterday.toDateString()) return "Kemarin";
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const groupedMessages: { date: string; messages: MessageData[] }[] = [];
  messages.forEach((msg) => {
    const dateKey = new Date(msg.createdAt).toDateString();
    const lastGroup = groupedMessages[groupedMessages.length - 1];
    if (lastGroup && lastGroup.date === dateKey) {
      lastGroup.messages.push(msg);
    } else {
      groupedMessages.push({ date: dateKey, messages: [msg] });
    }
  });

  if (loading || !user?.id) {
    return (
      <div className="flex items-center justify-center py-20 h-full">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  const customerName =
    conversation?.otherUser?.name ||
    conversation?.otherUser?.email ||
    "Customer";

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 relative overflow-hidden">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center gap-3 shadow-sm z-20 border-b border-gray-100 flex-shrink-0">
        <button
          onClick={() => router.push("/cs/chat")}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600 md:hidden"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
          <User size={20} className="text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-gray-800 text-[15px] truncate">
            {customerName}
          </h1>
          <p className="text-gray-500 text-[12px] font-medium">
            Customer Service
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4 space-y-4 bg-slate-50">
        {groupedMessages.map((group) => (
          <div key={group.date}>
            <div className="flex justify-center mb-4 mt-2">
              <span className="bg-gray-200/60 text-gray-600 px-3 py-1 rounded-full text-[11px] font-medium">
                {formatDateSeparator(group.messages[0].createdAt)}
              </span>
            </div>
            <div className="space-y-2">
              {group.messages.map((msg) => {
                const isMe = String(msg.senderId) === String(currentUserId);

                let actualContent = msg.content || "";
                let productMeta: ProductMeta | null = null;
                let orderMeta: OrderMeta | null = null;

                // Parse PRODUCT_META
                const metaIndex = actualContent.indexOf("---PRODUCT_META---");
                if (metaIndex !== -1) {
                  try {
                    const jsonStr = actualContent
                      .substring(metaIndex + "---PRODUCT_META---".length)
                      .trim();
                    productMeta = JSON.parse(jsonStr);
                    actualContent = actualContent
                      .substring(0, metaIndex)
                      .trim();
                  } catch {
                    // Ignore parse error
                  }
                }

                // Parse ORDER_META
                const orderMetaIndex =
                  actualContent.indexOf("---ORDER_META---");
                if (orderMetaIndex !== -1) {
                  try {
                    const jsonStr = actualContent
                      .substring(orderMetaIndex + "---ORDER_META---".length)
                      .trim();
                    orderMeta = JSON.parse(jsonStr);
                    actualContent = actualContent
                      .substring(0, orderMetaIndex)
                      .trim();
                  } catch {
                    // Ignore parse error
                  }
                }

                return (
                  <div
                    key={msg.id || `cs-msg-${msg.createdAt}`}
                    className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[75%] px-4 py-2.5 shadow-sm relative group ${
                        isMe
                          ? "bg-blue-600 text-white rounded-2xl rounded-tr-sm"
                          : "bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-tl-sm"
                      }`}
                    >
                      <p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words">
                        {actualContent}
                      </p>

                      {/* Rich Order Meta Card */}
                      {orderMeta && (
                        <div
                          className={`mt-2 p-3 rounded-xl border ${
                            isMe
                              ? "bg-blue-700/40 border-blue-400/40"
                              : "bg-gray-50 border-gray-200"
                          }`}
                        >
                          <div className="flex gap-2.5">
                            <div className="w-12 h-12 rounded-lg flex-shrink-0 overflow-hidden bg-white shadow-sm border border-gray-100">
                              {orderMeta.firstItemImage ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={orderMeta.firstItemImage}
                                  alt={orderMeta.firstItemName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-lg bg-gray-100">
                                  📦
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-[12px] font-bold truncate ${isMe ? "text-white" : "text-gray-800"}`}
                              >
                                {orderMeta.firstItemName}
                                {orderMeta.itemCount > 1 && (
                                  <span
                                    className={`font-medium ${isMe ? "text-blue-200" : "text-gray-400"}`}
                                  >
                                    {" "}
                                    +{orderMeta.itemCount - 1} lainnya
                                  </span>
                                )}
                              </p>
                              <p
                                className={`text-[11px] font-semibold mt-0.5 ${isMe ? "text-white" : "text-blue-600"}`}
                              >
                                {formatRupiah(orderMeta.totalHarga)}
                              </p>
                            </div>
                          </div>
                          <div
                            className={`mt-2 pt-2 flex items-center justify-between border-t ${
                              isMe ? "border-blue-400/30" : "border-gray-200"
                            }`}
                          >
                            <span
                              className={`text-[10px] font-mono font-bold ${isMe ? "text-blue-200" : "text-gray-400"}`}
                            >
                              #{orderMeta.shortId}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                orderMeta.status?.toUpperCase() ===
                                "MENUNGGU_BAYAR"
                                  ? "bg-amber-100 text-amber-700"
                                  : orderMeta.status?.toUpperCase() ===
                                      "DIPROSES"
                                    ? "bg-blue-100 text-blue-700"
                                    : orderMeta.status?.toUpperCase() ===
                                        "DIKIRIM"
                                      ? "bg-orange-100 text-orange-700"
                                      : orderMeta.status?.toUpperCase() ===
                                          "SELESAI"
                                        ? "bg-green-100 text-green-700"
                                        : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {orderMeta.status}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Rich Product Meta Card */}
                      {productMeta && (
                        <div
                          className={`mt-2 p-2 rounded-xl flex gap-3 border items-center shadow-sm ${
                            isMe
                              ? "bg-blue-700/50 border-blue-500/50"
                              : "bg-gray-50 border-gray-200"
                          }`}
                        >
                          <div className="w-11 h-11 bg-white rounded-lg flex-shrink-0 overflow-hidden shadow-sm">
                            {productMeta.fotoUrl ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={productMeta.fotoUrl}
                                alt={productMeta.nama}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-200 flex items-center justify-center text-[10px]">
                                📷
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0 pr-1">
                            <p
                              className={`text-[12px] font-bold truncate leading-tight ${
                                isMe ? "text-white" : "text-gray-800"
                              }`}
                            >
                              {productMeta.nama}
                            </p>
                            <p
                              className={`text-[11px] font-medium mt-0.5 ${
                                isMe ? "text-blue-100" : "text-blue-600"
                              }`}
                            >
                              {formatRupiah(productMeta.harga)}
                            </p>
                          </div>
                        </div>
                      )}

                      <div
                        className={`flex items-center gap-1 mt-1 ${
                          isMe
                            ? "justify-end text-blue-100"
                            : "justify-start text-gray-400"
                        }`}
                      >
                        <span className="text-[10px]">
                          {formatTime(msg.createdAt)}
                        </span>
                        {isMe &&
                          (msg.id.startsWith("temp-") ? (
                            <Loader2
                              size={12}
                              className="animate-spin text-blue-100"
                            />
                          ) : msg.isRead ? (
                            <CheckCheck size={14} className="text-white" />
                          ) : (
                            <Check size={14} className="text-blue-200" />
                          ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} className="h-2" />
      </div>

      {/* Input */}
      <div className="bg-white px-4 py-3 sm:py-4 flex items-center gap-3 border-t border-gray-100 flex-shrink-0">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ketik balasan..."
            className="w-full py-3 px-5 bg-gray-100 hover:bg-gray-50 focus:bg-white border border-transparent focus:border-blue-300 rounded-full text-sm text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-50 transition-all font-medium"
          />
        </div>
        <button
          onClick={handleSend}
          disabled={!newMessage.trim() || sending}
          className="w-12 h-12 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center text-white shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex-shrink-0"
        >
          {sending ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Send size={20} className="ml-0.5" />
          )}
        </button>
      </div>
    </div>
  );
};

export default AdminChatRoomPage;
