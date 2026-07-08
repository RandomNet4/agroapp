"use client";

import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import {
  MessageCircle,
  User,
  Loader2,
  Search,
  Shield,
  ChevronRight,
  Truck,
  Users as UsersIcon,
  ArrowUpDown,
  Check,
  X,
} from "lucide-react";

import { chatApi, storesApi } from "@/lib/ecommerce-api";
import { useAuthStore } from "@/store/auth-store";

interface ConvData {
  id: string;
  type: "CHAT_PENJUAL" | "ADMIN_CS";
  tipe?: string; // Backend might use tipe or type
  lastMessage: string | null;
  lastMessageAt: string | null;
  otherUser: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  unreadCount: number;
}

const SellerChatSidebar: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuthStore();
  const activeId = params.id as string | undefined;

  const [conversations, setConversations] = useState<ConvData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [adminConvId, setAdminConvId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Courier Info
  const [courierStaff, setCourierStaff] = useState<any>(null);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchConversations = async () => {
    try {
      const res = await chatApi.getConversations();
      const data = res.data?.data || res.data || [];
      const convs = Array.isArray(data) ? data : [];

      // Ensure uniqueness
      const uniqueConvs = convs.filter(
        (c: any, index: number, self: any[]) =>
          index === self.findIndex((t) => t.id === c.id),
      );

      const adminConv = uniqueConvs.find(
        (c) => c.type === "ADMIN_CS" || c.tipe === "ADMIN_CS",
      );
      if (adminConv) setAdminConvId(adminConv.id);

      setConversations(uniqueConvs);
    } catch (error) {
      console.error("Failed to fetch seller conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStoreInfo = async () => {
    try {
      const res = await storesApi.getMyStore();
      const data = res.data?.data || res.data;
      if (data?.courierStaff) {
        setCourierStaff(data.courierStaff);
      }
    } catch (err) {
      console.error("Failed to fetch store courier info", err);
    }
  };

  useEffect(() => {
    fetchConversations();
    fetchStoreInfo();

    // SSE Real-time Updates for Seller Conversation List
    const eventSource = new EventSource("/api/proxy/chat/stream", {
      withCredentials: true,
    });

    eventSource.onmessage = (event) => {
      try {
        const rawData = JSON.parse(event.data);
        if (
          rawData?.type === "heartbeat" ||
          rawData?.data?.type === "heartbeat"
        )
          return;
        fetchConversations();
      } catch (err) {
        fetchConversations();
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE seller sidebar connection error:", err);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const handleContactAdmin = async () => {
    if (adminConvId) {
      router.push(`/seller/chat/${adminConvId}`);
      return;
    }
    try {
      setLoading(true);
      const res = await chatApi.createConversation({ type: "ADMIN_CS" });
      const data = res.data?.data || res.data;
      if (data?.id) {
        setAdminConvId(data.id);
        router.push(`/seller/chat/${data.id}`);
      }
    } catch (err) {
      console.error("Failed to initiate chat with admin", err);
      alert("Gagal memulai obrolan dengan admin.");
    } finally {
      setLoading(false);
    }
  };

  const handleContactCourier = async () => {
    if (!courierStaff) {
      alert("Toko Anda belum memiliki kurir afiliasi.");
      return;
    }
    try {
      setLoading(true);
      const res = await chatApi.createConversation({
        type: "ADMIN_CS", // Same backend endpoint handles CS/Staff chats
        targetUserId: courierStaff.id,
      });
      const data = res.data?.data || res.data;
      if (data?.id) {
        router.push(`/seller/chat/${data.id}`);
        setIsContactModalOpen(false);
      }
    } catch (err) {
      console.error("Failed to initiate chat with courier", err);
      alert("Gagal memulai obrolan dengan kurir.");
    } finally {
      setLoading(false);
    }
  };

  const sortedAndFilteredConversations = useMemo(() => {
    const filtered = conversations.filter((conv) => {
      const isChatPenjual =
        conv.type === "CHAT_PENJUAL" || conv.tipe === "CHAT_PENJUAL";
      const isAdminOrStaff =
        conv.type === "ADMIN_CS" || conv.tipe === "ADMIN_CS";
      if (!isChatPenjual && !isAdminOrStaff) return false;

      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const name = conv.otherUser?.name || conv.otherUser?.email || "";
      return name.toLowerCase().includes(q);
    });

    return filtered.sort((a, b) => {
      const timeA = new Date(a.lastMessageAt || 0).getTime();
      const timeB = new Date(b.lastMessageAt || 0).getTime();
      return sortOrder === "newest" ? timeB - timeA : timeA - timeB;
    });
  }, [conversations, searchQuery, sortOrder]);

  const formatTime = (dateStr: string | null) => {
    if (!dateStr || !isMounted) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diffDays === 0) {
      return date.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    if (diffDays === 1) return "Kemarin";
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  };

  if (!isMounted)
    return (
      <div className="w-full md:w-80 lg:w-96 bg-white border-r border-gray-100 flex-shrink-0" />
    );

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-100 w-full md:w-80 lg:w-96 flex-shrink-0 min-h-0 relative">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex-shrink-0 bg-white">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-display font-bold text-xl text-gray-900 flex items-center gap-2">
            <MessageCircle size={24} className="text-primary-600" />
            Chat
          </h1>
          <button
            onClick={() => setIsContactModalOpen(true)}
            className="w-8 h-8 flex items-center justify-center bg-primary-50 text-primary-600 rounded-full hover:bg-primary-100 hover:scale-105 transition-all shadow-sm"
            title="Daftar Kontak Kurir"
          >
            <UsersIcon size={16} />
          </button>
        </div>

        {/* Search & Sort Row */}
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Cari pelanggan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[13px] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300 transition-all"
            />
          </div>
          <div className="relative">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className={`p-2 rounded-lg border transition-all ${showSortMenu ? "bg-primary-50 border-primary-200 text-primary-600" : "bg-white border-gray-200 text-gray-400"}`}
            >
              <ArrowUpDown size={16} />
            </button>

            {showSortMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowSortMenu(false)}
                />
                <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-100 rounded-xl shadow-xl p-1.5 z-20 animate-in fade-in zoom-in duration-150">
                  <button
                    onClick={() => {
                      setSortOrder("newest");
                      setShowSortMenu(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium ${sortOrder === "newest" ? "bg-primary-50 text-primary-600" : "text-gray-600 hover:bg-gray-50"}`}
                  >
                    Terbaru ke Lama
                    {sortOrder === "newest" && <Check size={14} />}
                  </button>
                  <button
                    onClick={() => {
                      setSortOrder("oldest");
                      setShowSortMenu(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium ${sortOrder === "oldest" ? "bg-primary-50 text-primary-600" : "text-gray-600 hover:bg-gray-50"}`}
                  >
                    Lama ke Terbaru
                    {sortOrder === "oldest" && <Check size={14} />}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Priority Section */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleContactAdmin}
            className="flex items-center gap-2 p-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 rounded-xl transition-all text-left"
          >
            <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white flex-shrink-0">
              <Shield size={14} />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-[11px] text-emerald-900 truncate">
                Admin
              </p>
              <p className="text-[9px] text-emerald-600 truncate font-medium">
                Bantuan
              </p>
            </div>
          </button>

          <button
            onClick={handleContactCourier}
            className="flex items-center gap-2 p-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 rounded-xl transition-all text-left"
          >
            <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white flex-shrink-0">
              <Truck size={14} />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-[11px] text-emerald-900 truncate">
                Kurir
              </p>
              <p className="text-[9px] text-emerald-600 truncate font-medium">
                Logistik
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto bg-white min-h-0">
        {loading && conversations.length === 0 ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
          </div>
        ) : sortedAndFilteredConversations.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {sortedAndFilteredConversations.map((conv) => {
              const name =
                conv.otherUser?.name || conv.otherUser?.email || "Pelanggan";
              const isActive = activeId === conv.id;
              const isAdminChat =
                conv.type === "ADMIN_CS" || conv.tipe === "ADMIN_CS";

              // Detect if it's the courier chat
              const isCourierChat =
                isAdminChat && conv.otherUser?.id === courierStaff?.id;

              return (
                <button
                  key={conv.id}
                  onClick={() => router.push(`/seller/chat/${conv.id}`)}
                  className={`w-full flex items-center gap-3 p-4 transition-colors text-left ${
                    isActive ? "bg-primary-50/50" : "hover:bg-gray-50"
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isCourierChat
                          ? "bg-emerald-100 text-emerald-600"
                          : isAdminChat
                            ? "bg-emerald-100 text-emerald-600"
                            : isActive
                              ? "bg-primary-200 text-primary-700"
                              : "bg-primary-100 text-primary-600"
                      }`}
                    >
                      {isCourierChat ? (
                        <Truck size={18} />
                      ) : isAdminChat ? (
                        <Shield size={18} />
                      ) : (
                        <User size={18} />
                      )}
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center border border-white">
                        {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={`font-display text-sm truncate ${isActive ? "font-bold text-primary-900" : "font-semibold text-gray-900"}`}
                      >
                        {isCourierChat
                          ? `Kurir (${name})`
                          : isAdminChat
                            ? "Admin Operasional"
                            : name}
                      </p>
                      <span className="text-[10px] text-gray-400 flex-shrink-0">
                        {formatTime(conv.lastMessageAt)}
                      </span>
                    </div>
                    <p
                      className={`text-xs truncate mt-0.5 ${conv.unreadCount > 0 ? "text-gray-800 font-medium" : "text-gray-500"}`}
                    >
                      {conv.lastMessage || "Belum ada pesan"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center px-4 select-none">
            <Image
              src="/images/chat.svg"
              alt="Mulai percakapan"
              width={180}
              height={180}
              className="mb-3 opacity-90 mix-blend-multiply"
            />
            <p className="text-sm font-medium text-gray-600 mb-0.5">
              Mulai Percakapan
            </p>
            <p className="text-[11px] text-gray-400 font-normal leading-relaxed max-w-[180px]">
              Gunakan tombol Admin atau Kurir di atas untuk memulai.
            </p>
          </div>
        )}
      </div>

      {/* Courier Contact Modal */}
      {isContactModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800">Daftar Kontak Kurir</h2>
              <button
                onClick={() => setIsContactModalOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <div className="p-4">
              {courierStaff ? (
                <button
                  onClick={handleContactCourier}
                  className="w-full flex items-center gap-4 p-4 bg-emerald-50 hover:bg-emerald-100 rounded-2xl transition-all border border-emerald-100 group"
                >
                  <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-md">
                    <Truck size={24} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-bold text-emerald-900">
                      {courierStaff.name || courierStaff.email.split("@")[0]}
                    </p>
                    <p className="text-xs text-emerald-600 font-medium">
                      {courierStaff.email}
                    </p>
                    <span className="inline-block mt-2 px-2 py-0.5 bg-emerald-200 text-emerald-800 text-[10px] font-bold rounded">
                      KURIR AFILIASI
                    </span>
                  </div>
                  <ChevronRight
                    size={20}
                    className="text-emerald-300 group-hover:text-emerald-600 transition-colors"
                  />
                </button>
              ) : (
                <div className="py-10 text-center">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Truck size={32} className="text-gray-200" />
                  </div>
                  <p className="text-sm font-bold text-gray-800">
                    Tidak Ada Kurir
                  </p>
                  <p className="text-xs text-gray-500 mt-1 max-w-[200px] mx-auto leading-relaxed">
                    Toko Anda belum memiliki kurir yang terhubung secara
                    permanen.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerChatSidebar;
