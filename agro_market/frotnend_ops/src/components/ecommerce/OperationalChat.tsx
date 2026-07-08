"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, AlertCircle } from "lucide-react";

import { chatApi } from "@/lib/ecommerce-api";

import ChatHeader from "./chat/ChatHeader";
import ChatMessageList from "./chat/ChatMessageList";
import ChatInput from "./chat/ChatInput";

interface MessageData {
  id: string;
  senderId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export default function OperationalChat({
  currentUserId,
  chatType = "ADMIN_CS",
  tokoId,
  initialConversationId,
  onBack,
}: {
  currentUserId: string;
  chatType?: "ADMIN_CS" | "SELLER_CHAT";
  tokoId?: string;
  initialConversationId?: string;
  onBack?: () => void;
}) {
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId || null,
  );
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [otherPartyName, setOtherPartyName] = useState<string>("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const fetchMessages = useCallback(async (convId: string) => {
    try {
      const res = await chatApi.getConversation(convId, { limit: 100 });
      const data = res.data?.data || res.data;

      // Update other party name from conversation data
      if (data) {
        const otherUser = data.otherUser || data.pembeli;
        if (otherUser) {
          setOtherPartyName(
            otherUser.name || otherUser.nama || otherUser.email || "",
          );
        } else if (data.tipe === "ADMIN_CS" || data.type === "ADMIN_CS") {
          setOtherPartyName("Admin Operasional");
        } else if (data.store || data.toko) {
          setOtherPartyName(data.store?.nama || data.toko?.nama || "Toko");
        }
      }

      // Map backend fields to frontend interface
      if (data?.pesan && Array.isArray(data.pesan)) {
        const mappedMessages: MessageData[] = data.pesan.map((m: any) => ({
          id: m.id,
          senderId: m.pengirimId || m.senderId,
          content: m.isiPesan || m.content || m.text || "",
          isRead: m.sudahDibaca === true || m.status === "DIBACA",
          createdAt: m.createdAt || m.tanggalDibuat || new Date().toISOString(),
        }));

        // Ensure uniqueness by ID
        const uniqueMessages = mappedMessages.filter(
          (msg, index, self) =>
            index === self.findIndex((t) => t.id === msg.id),
        );

        setMessages(uniqueMessages);
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initChat = async () => {
      try {
        setLoading(true);
        setErrorText("");

        let activeConvId = initialConversationId;

        if (!activeConvId) {
          const res = await chatApi.createConversation({
            type: chatType,
            tokoId: tokoId,
          });
          const data = res.data?.data || res.data;
          activeConvId = data?.id;
        }

        if (activeConvId && isMounted) {
          setConversationId(activeConvId);
          await fetchMessages(activeConvId);
          chatApi.markAsRead(activeConvId).catch(() => {});

          // SSE Real-time Streaming
          const eventSource = new EventSource(
            `/api/proxy/chat/conversations/${activeConvId}/stream`,
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
              if (!msgObj.id && !msgObj.pengirimId && !msgObj.senderId) return;

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
                  msgObj.sudahDibaca ||
                  msgObj.isRead ||
                  msgObj.status === "DIBACA",
                createdAt:
                  msgObj.createdAt ||
                  msgObj.tanggalDibuat ||
                  new Date().toISOString(),
              };

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
                chatApi.markAsRead(activeConvId!).catch(() => {});
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
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorText(
            "Gagal terhubung ke layanan chat. Pastikan penerima tersedia.",
          );
          console.error(err);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initChat();

    return () => {
      isMounted = false;
    };
  }, [fetchMessages, chatType, tokoId, initialConversationId, currentUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      const scrollHeight = inputRef.current.scrollHeight;
      const targetHeight = Math.max(scrollHeight, 32);
      inputRef.current.style.height = `${targetHeight}px`;
    }
  }, [newMessage]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !conversationId) return;

    const content = newMessage.trim();
    setNewMessage("");
    if (inputRef.current) inputRef.current.style.height = "32px";
    setSending(true);

    try {
      // Optimistic update
      const tempId = `temp-${Date.now()}`;
      const optimisticMsg: MessageData = {
        id: tempId,
        senderId: currentUserId,
        content: content,
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticMsg]);
      scrollToBottom();

      await chatApi.sendMessage(conversationId, content);
      // Safety net: fetch messages after a short delay
      setTimeout(() => fetchMessages(conversationId), 500);
      scrollToBottom();
    } catch (error) {
      console.error("Failed to send message:", error);
      alert("Gagal mengirim pesan");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as unknown as React.FormEvent);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-blue-500 bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p className="text-sm font-medium">Menghubungkan...</p>
      </div>
    );
  }

  if (errorText) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center bg-slate-50">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
          <AlertCircle size={32} />
        </div>
        <h3 className="font-bold text-gray-800 mb-2">Gagal Terhubung</h3>
        <p className="text-sm text-gray-500">{errorText}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 text-primary-600 font-bold text-sm"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100 relative overflow-hidden">
      <ChatHeader
        title={
          otherPartyName ||
          (chatType === "ADMIN_CS" ? "Admin Operasional" : "Pelanggan")
        }
        chatType={chatType}
        onBack={onBack}
      />

      <ChatMessageList
        messages={messages}
        currentUserId={currentUserId}
        messagesEndRef={messagesEndRef}
      />

      <ChatInput
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        sending={sending}
        handleSend={handleSend}
        handleKeyDown={handleKeyDown}
        inputRef={inputRef}
      />
    </div>
  );
}
