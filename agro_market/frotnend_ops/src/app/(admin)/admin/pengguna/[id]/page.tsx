"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Mail,
  Phone,
  Calendar,
  CheckCircle2,
  ShoppingBag,
  MessageSquare,
  DollarSign,
  XCircle,
  Clock,
  Store,
  ChevronRight,
  ExternalLink,
  Lock,
  MessageCircle,
  Star,
  Package,
} from "lucide-react";
import { message, Modal } from "antd";

import { formatTanggal, formatRupiah } from "@/lib/ecommerce-api";
import { storesApi } from "@/lib/api/stores";
import { ordersApi } from "@/lib/api/orders";
import { apiClient } from "@/lib/api-client";
import PageHeader from "@/components/ui/PageHeader";

import UserRoleBadge from "../_components/UserRoleBadge";

// Local types
interface UserDetail {
  id: string;
  nama: string;
  email: string;
  peran: string;
  noTelepon?: string;
  emailTerverifikasiPada?: string | null;
  createdAt?: string;
}

interface OrderItem {
  id: string;
  createdAt: string;
  konsumenId: string;
  totalHarga: number;
  ongkir: number;
  status: string;
  item: Array<{
    id: string;
    produk?: {
      nama: string;
      toko?: {
        nama: string;
        id: string;
      };
    };
  }>;
}

interface ChatRoomItem {
  id: string;
  tipe: string;
  otherParticipantId: string;
  otherParticipantName: string;
  otherParticipantFoto: string | null;
  pesanTerakhir?: string;
  waktuPesanTerakhir?: string;
  unreadCount: number;
  updatedAt: string;
}

interface MessageItem {
  id: string;
  percakapanId: string;
  pengirimId: string;
  isiPesan: string;
  sudahDibaca: boolean;
  createdAt: string;
}

interface StoreSummary {
  id: string;
  nama: string;
  status: string;
  kabupaten?: string;
  wilayah?: string;
  alamat?: string;
  totalProduk?: number;
  totalPesanan?: number;
  rating?: number;
}

export default function PenggunaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  // States
  const [userData, setUserData] = useState<UserDetail | null>(null);
  const [activeTab, setActiveTab] = useState<"transaksi" | "toko" | "chat">(
    "transaksi",
  );

  // Role specific states
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [conversations, setConversations] = useState<ChatRoomItem[]>([]);
  const [storeData, setStoreData] = useState<StoreSummary | null>(null);

  // Common UI states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resendingEmail, setResendingEmail] = useState(false);

  const handleResendVerification = async () => {
    if (!userData?.email) return;
    try {
      setResendingEmail(true);
      await apiClient.post("/auth/resend-verification", {
        email: userData.email,
      });
      message.success(`Email verifikasi dikirim ulang ke ${userData.email}`);
    } catch (err: any) {
      message.error(
        err?.response?.data?.message || "Gagal mengirim ulang verifikasi",
      );
    } finally {
      setResendingEmail(false);
    }
  };

  // Audit Modal States
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoomItem | null>(null);
  const [roomMessages, setRoomMessages] = useState<MessageItem[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Determine role helpers
  const mappedRole = useMemo(() => {
    if (!userData) return "";
    return userData.peran === "KONSUMEN"
      ? "USER"
      : userData.peran === "PENJUAL"
        ? "SELLER"
        : userData.peran === "KURIR"
          ? "COURIER"
          : userData.peran === "ADMIN_CS"
            ? "CS"
            : userData.peran;
  }, [userData]);

  // Fetch complete details
  const fetchAllData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError("");

      // 1. Fetch User Profile
      const userRes = await apiClient.get(`/pengguna/${id}`);
      const user = userRes?.data?.data || userRes?.data;
      if (!user) {
        throw new Error("Data pengguna tidak ditemukan.");
      }
      setUserData(user);

      const role =
        user.peran === "KONSUMEN"
          ? "USER"
          : user.peran === "PENJUAL"
            ? "SELLER"
            : user.peran === "KURIR"
              ? "COURIER"
              : user.peran === "ADMIN_CS"
                ? "CS"
                : user.peran;

      // 2. Fetch specific role content
      if (role === "SELLER") {
        setActiveTab("toko");
        // Fetch seller store summary
        try {
          const storeRes = await storesApi.adminGetAll({ limit: 100 });
          const raw = storeRes?.data?.data || storeRes?.data || [];
          const arr = Array.isArray(raw) ? raw : (raw.data ?? []);
          const matchedStore = arr.find(
            (s: any) => s.penjual?.penggunaId === id,
          );
          if (matchedStore) {
            setStoreData(matchedStore);
          }
        } catch (err) {
          console.warn("Gagal memuat detail toko seller:", err);
        }

        // Fetch seller chat rooms
        try {
          const chatRes = await apiClient.get(
            `/chat/admin/conversations/user/${id}`,
          );
          setConversations(chatRes?.data?.data || chatRes?.data || []);
        } catch (err) {
          console.warn("Gagal memuat histori chat seller:", err);
        }
      } else if (role === "USER" || role === "KONSUMEN") {
        setActiveTab("transaksi");
        // Fetch consumer orders
        try {
          const ordersRes = await ordersApi.adminGetAll({ limit: 1000 });
          const raw = ordersRes?.data?.data || ordersRes?.data || [];
          const arr = Array.isArray(raw) ? raw : (raw.data ?? []);
          const userOrders = arr.filter(
            (ord: OrderItem) => ord.konsumenId === id,
          );
          setOrders(userOrders);
        } catch (err) {
          console.warn("Gagal memuat histori transaksi pembeli:", err);
        }

        // Fetch consumer chat rooms
        try {
          const chatRes = await apiClient.get(
            `/chat/admin/conversations/user/${id}`,
          );
          setConversations(chatRes?.data?.data || chatRes?.data || []);
        } catch (err) {
          console.warn("Gagal memuat histori chat pembeli:", err);
        }
      } else if (role === "CS") {
        setActiveTab("chat");
        // Fetch CS chat history handled directly
        try {
          const chatRes = await apiClient.get("/chat/admin/conversations");
          const arr = chatRes?.data?.data || chatRes?.data || [];
          if (Array.isArray(arr)) {
            const csConversations = arr
              .filter(
                (conv: any) =>
                  conv.partisipanA === id || conv.partisipanB === id,
              )
              .map((c: any) => ({
                id: c.id,
                tipe: "ADMIN_CS",
                otherParticipantId: c.customer?.id || "",
                otherParticipantName: c.customer?.name || "Pelanggan",
                otherParticipantFoto: null,
                pesanTerakhir: c.lastMessage,
                waktuPesanTerakhir: c.lastMessageAt,
                unreadCount: c.unreadCount,
                updatedAt: c.updatedAt,
              }));
            setConversations(csConversations);
          }
        } catch (err) {
          console.warn("Gagal memuat histori layanan CS:", err);
        }
      }
    } catch (err: any) {
      console.error("Error fetching details:", err);
      setError(err?.message || "Gagal memuat data detail pengguna.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Open read-only message logs
  const openChatAudit = async (room: ChatRoomItem) => {
    setSelectedRoom(room);
    setAuditModalOpen(true);
    setLoadingMessages(true);
    setRoomMessages([]);
    try {
      const res = await apiClient.get(`/chat/conversations/${room.id}`);
      const payload = res?.data?.data || res?.data;
      if (payload && payload.pesan) {
        setRoomMessages(payload.pesan);
      }
    } catch (err) {
      console.error("Gagal memuat pesan log chat:", err);
      message.error("Gagal mengambil isi obrolan.");
    } finally {
      setLoadingMessages(false);
    }
  };

  // Compute stats for buyer
  const consumerStats = useMemo(() => {
    if (orders.length === 0)
      return { total: 0, spent: 0, completed: 0, cancelled: 0 };
    let spent = 0;
    let completed = 0;
    let cancelled = 0;

    orders.forEach((o) => {
      if (["COMPLETED", "DELIVERED"].includes(o.status)) {
        spent += o.totalHarga;
        completed++;
      } else if (o.status === "CANCELLED") {
        cancelled++;
      }
    });

    return { total: orders.length, spent, completed, cancelled };
  }, [orders]);

  // Initials helper
  const initials = useMemo(() => {
    if (!userData?.nama) return "U";
    return userData.nama
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }, [userData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4 min-h-[500px]">
        <Loader2 size={40} className="animate-spin text-emerald-600" />
        <p className="text-gray-400 font-bold animate-pulse text-sm">
          Memuat data audit detail pengguna...
        </p>
      </div>
    );
  }

  if (error || !userData) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4">
        <div className="bg-red-50 text-red-600 p-8 rounded-[32px] border border-red-100 flex flex-col items-center gap-4 text-center shadow-lg shadow-red-50/50">
          <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-xl font-bold">Terjadi Kesalahan</h2>
          <p className="text-sm font-medium leading-relaxed">
            {error || "Pengguna tidak ditemukan"}
          </p>
          <button
            onClick={() => router.push("/admin/pengguna")}
            className="mt-4 px-6 py-2.5 bg-white border border-red-200 rounded-xl shadow-sm text-red-600 font-bold text-sm hover:bg-red-100/50 transition-colors"
          >
            Kembali ke Daftar Pengguna
          </button>
        </div>
      </div>
    );
  }

  const roleLabel =
    userData.peran === "KONSUMEN"
      ? "KONSUMEN (Pelanggan)"
      : userData.peran === "PENJUAL"
        ? "PENJUAL (Seller)"
        : userData.peran === "KURIR"
          ? "KURIR (Delivery)"
          : userData.peran === "ADMIN_CS"
            ? "ADMIN CS (Support)"
            : userData.peran;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 px-4 lg:px-8">
      {/* Back Button */}
      <div>
        <button
          onClick={() => router.push("/admin/pengguna")}
          className="inline-flex items-center gap-2 text-gray-500 hover:text-emerald-600 font-bold transition-all text-sm mb-6 bg-white border border-gray-100 px-4 py-2 rounded-2xl shadow-sm hover:shadow active:scale-95"
        >
          <ArrowLeft size={16} /> Kembali ke Daftar Pengguna
        </button>

        <PageHeader
          title="Detail Audit Pengguna"
          description={`Laporan detail profil lengkap, rincian e-commerce, dan audit histori chat obrolan untuk peran ${roleLabel}.`}
          icon={User}
          iconColor="text-emerald-600"
        />
      </div>

      {/* Profile & Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Col: Profile Details Card */}
        <div className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm h-fit space-y-8 hover:border-emerald-100 transition-colors">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[28px] flex items-center justify-center text-white font-extrabold text-2xl shadow-lg shadow-emerald-100">
              {initials}
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 leading-snug">
                {userData.nama || "—"}
              </h2>
              <p className="text-gray-400 text-xs mt-0.5">{userData.email}</p>
            </div>

            <div className="pt-2">
              <UserRoleBadge role={userData.peran} />
            </div>
          </div>

          <div className="border-t border-gray-50 pt-6 space-y-5">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
              Informasi Kontak
            </h3>

            <div className="flex items-center gap-4 text-sm font-medium">
              <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 flex-shrink-0">
                <Mail size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                  Email
                </p>
                <p className="text-gray-700 truncate">{userData.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm font-medium">
              <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 flex-shrink-0">
                <Phone size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                  Nomor Telepon
                </p>
                <p className="text-gray-700">{userData.noTelepon || "—"}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm font-medium">
              <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 flex-shrink-0">
                <Calendar size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                  Bergabung Pada
                </p>
                <p className="text-gray-700">
                  {userData.createdAt ? formatTanggal(userData.createdAt) : "—"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm font-medium">
              <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 flex-shrink-0">
                <CheckCircle2 size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                  Status Verifikasi
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {userData.emailTerverifikasiPada ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-green-50 text-green-700 text-[10px] font-bold uppercase tracking-wide border border-green-100">
                      Email Terverifikasi
                    </span>
                  ) : (
                    <div className="flex flex-col items-start gap-1.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-50 text-amber-700 text-[10px] font-bold uppercase tracking-wide border border-amber-100">
                        Email Belum Verifikasi
                      </span>
                      <button
                        onClick={handleResendVerification}
                        disabled={resendingEmail}
                        className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline disabled:opacity-50 disabled:hover:no-underline flex items-center gap-1"
                      >
                        {resendingEmail ? (
                          <>
                            <Loader2 size={10} className="animate-spin" />{" "}
                            Mengirim...
                          </>
                        ) : (
                          "Kirim Ulang Link"
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Custom Tabs & Dynamic Details */}
        <div className="lg:col-span-2 space-y-8">
          {/* Tab Selector for Consumers and Sellers */}
          {(mappedRole === "USER" || mappedRole === "SELLER") && (
            <div className="flex gap-2 p-1.5 bg-gray-50 rounded-2xl border border-gray-100 max-w-sm">
              {mappedRole === "USER" && (
                <button
                  onClick={() => setActiveTab("transaksi")}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all ${
                    activeTab === "transaksi"
                      ? "bg-white text-emerald-700 shadow"
                      : "text-gray-400 hover:text-gray-700"
                  }`}
                >
                  Daftar Transaksi
                </button>
              )}

              {mappedRole === "SELLER" && (
                <button
                  onClick={() => setActiveTab("toko")}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all ${
                    activeTab === "toko"
                      ? "bg-white text-emerald-700 shadow"
                      : "text-gray-400 hover:text-gray-700"
                  }`}
                >
                  Informasi Toko
                </button>
              )}

              <button
                onClick={() => setActiveTab("chat")}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all ${
                  activeTab === "chat"
                    ? "bg-white text-emerald-700 shadow"
                    : "text-gray-400 hover:text-gray-700"
                }`}
              >
                Histori Obrolan Chat
              </button>
            </div>
          )}

          {/* ── TABS: CONSUMER ORDERS ── */}
          {activeTab === "transaksi" && mappedRole === "USER" && (
            <div className="space-y-8">
              {/* Consumer Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
                  <ShoppingBag size={20} className="text-emerald-500 mb-2" />
                  <p className="text-2xl font-black text-gray-900">
                    {consumerStats.total}
                  </p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                    Total Pesanan
                  </p>
                </div>
                <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
                  <DollarSign size={20} className="text-blue-500 mb-2" />
                  <p className="text-2xl font-black text-gray-900 truncate">
                    {formatRupiah(consumerStats.spent)}
                  </p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                    Belanja Sukses
                  </p>
                </div>
                <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
                  <CheckCircle2 size={20} className="text-green-500 mb-2" />
                  <p className="text-2xl font-black text-gray-900">
                    {consumerStats.completed}
                  </p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                    Selesai
                  </p>
                </div>
                <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
                  <XCircle size={20} className="text-red-500 mb-2" />
                  <p className="text-2xl font-black text-gray-900">
                    {consumerStats.cancelled}
                  </p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                    Dibatalkan
                  </p>
                </div>
              </div>

              {/* Orders List Table */}
              <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-6 overflow-hidden">
                <h3 className="font-bold text-lg text-gray-800 mb-6 flex items-center gap-2">
                  <ShoppingBag size={20} className="text-emerald-500" /> Histori
                  Transaksi Belanja
                </h3>

                {orders.length === 0 ? (
                  <div className="text-center py-16 bg-gray-50 rounded-2xl border border-gray-100/50">
                    <ShoppingBag className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <h4 className="font-bold text-gray-900 text-base">
                      Belum Ada Transaksi
                    </h4>
                    <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                      Pengguna ini belum pernah melakukan transaksi pembelian di
                      platform.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto text-[13px] rounded-2xl border border-gray-100">
                    <table className="w-full text-left whitespace-nowrap">
                      <thead>
                        <tr className="bg-gray-50 text-gray-500 border-b border-gray-100 font-bold uppercase tracking-wider text-[10px]">
                          <th className="px-6 py-4">ID Transaksi</th>
                          <th className="px-6 py-4">Tanggal</th>
                          <th className="px-6 py-4">Toko / Seller</th>
                          <th className="px-6 py-4">Total</th>
                          <th className="px-6 py-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {orders.map((ord) => {
                          const storeName =
                            ord.item?.[0]?.produk?.toko?.nama || "Agro Market";
                          return (
                            <tr
                              key={ord.id}
                              className="hover:bg-emerald-50/20 transition-colors"
                            >
                              <td className="px-6 py-4 font-mono font-bold text-emerald-600">
                                #{ord.id.slice(-8).toUpperCase()}
                              </td>
                              <td className="px-6 py-4 text-gray-500 font-medium">
                                {formatTanggal(ord.createdAt)}
                              </td>
                              <td className="px-6 py-4">
                                <span className="font-bold text-gray-800 flex items-center gap-1.5">
                                  <Store
                                    size={14}
                                    className="text-orange-400 flex-shrink-0"
                                  />
                                  {storeName}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-bold text-gray-900">
                                {formatRupiah(ord.totalHarga)}
                              </td>
                              <td className="px-6 py-4">
                                <span
                                  className={`px-2.5 py-1 text-[9px] font-bold rounded-lg uppercase tracking-wider ${
                                    ["COMPLETED", "DELIVERED"].includes(
                                      ord.status,
                                    )
                                      ? "bg-green-50 text-green-700 border border-green-100"
                                      : ord.status === "CANCELLED"
                                        ? "bg-red-50 text-red-700 border border-red-100"
                                        : "bg-amber-50 text-amber-700 border border-amber-100"
                                  }`}
                                >
                                  {ord.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TABS: SELLER TOKO INFO ── */}
          {activeTab === "toko" && mappedRole === "SELLER" && (
            <div className="space-y-6">
              {storeData ? (
                <div className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-50 pb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-amber-500 text-white rounded-2xl flex items-center justify-center text-xl font-bold shadow-lg shadow-orange-100">
                        {storeData.nama?.charAt(0) || "🏪"}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">
                          {storeData.nama}
                        </h3>
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <Store size={12} className="text-orange-500" />
                          {storeData.kabupaten || "Daerah Belum Diset"}
                          {storeData.wilayah ? ` • ${storeData.wilayah}` : ""}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                        storeData.status === "ACTIVE"
                          ? "bg-green-50 text-green-700 border border-green-100"
                          : "bg-amber-50 text-amber-700 border border-amber-100"
                      }`}
                    >
                      {storeData.status === "ACTIVE"
                        ? "Aktif"
                        : "Menunggu / Nonaktif"}
                    </span>
                  </div>

                  {/* Quick Store Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-orange-50/40 border border-orange-50 rounded-2xl p-4 text-center">
                      <Package
                        size={18}
                        className="text-orange-600 mx-auto mb-1.5"
                      />
                      <p className="text-xl font-black text-gray-900">
                        {storeData.totalProduk || 0}
                      </p>
                      <p className="text-[9px] font-bold text-orange-800/60 uppercase mt-0.5">
                        Produk Aktif
                      </p>
                    </div>

                    <div className="bg-blue-50/40 border border-blue-50 rounded-2xl p-4 text-center">
                      <ShoppingBag
                        size={18}
                        className="text-blue-500 mx-auto mb-1.5"
                      />
                      <p className="text-xl font-black text-gray-900">
                        {storeData.totalPesanan || 0}
                      </p>
                      <p className="text-[9px] font-bold text-blue-800/60 uppercase mt-0.5">
                        Total Pesanan
                      </p>
                    </div>

                    <div className="bg-amber-50/40 border border-amber-50 rounded-2xl p-4 text-center">
                      <Star
                        size={18}
                        className="text-amber-500 fill-amber-500 mx-auto mb-1.5"
                      />
                      <p className="text-xl font-black text-gray-900">
                        {Number(storeData.rating || 0).toFixed(1)}
                      </p>
                      <p className="text-[9px] font-bold text-amber-800/60 uppercase mt-0.5">
                        Rating Toko
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5 bg-gray-50/50 p-5 rounded-2xl border border-gray-50 text-xs font-semibold text-gray-500">
                    <p className="text-gray-400 font-bold text-[10px] uppercase tracking-wider mb-1">
                      Lokasi Distribusi Toko
                    </p>
                    <p>
                      <span className="text-gray-400">Alamat Lengkap:</span>{" "}
                      {storeData.alamat || "Alamat belum diset."}
                    </p>
                  </div>

                  <button
                    onClick={() => router.push(`/admin/toko/${storeData.id}`)}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-sm font-bold shadow-lg shadow-emerald-100 transition-all active:scale-95"
                  >
                    <span>Masuk ke Dashboard Manajemen Seller</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-[32px] border border-gray-100 p-12 text-center shadow-sm">
                  <Store size={40} className="text-gray-200 mx-auto mb-4" />
                  <h4 className="font-bold text-gray-900 text-base">
                    Toko Belum Dibuat
                  </h4>
                  <p className="text-xs text-gray-400 mt-2 max-w-sm mx-auto">
                    Seller ini telah disetujui bergabung namun belum
                    menginisialisasi atau mendaftarkan toko fisiknya di
                    platform.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── TABS: HISTORI OBROLAN CHAT (AUDIT MONITOR) ── */}
          {activeTab === "chat" && (
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-6 overflow-hidden">
              <h3 className="font-bold text-lg text-gray-800 mb-6 flex items-center gap-2">
                <MessageSquare size={20} className="text-emerald-500" /> Audit
                Log Obrolan Chat
              </h3>

              {conversations.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-2xl border border-gray-100/50">
                  <MessageSquare className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                  <h4 className="font-bold text-gray-900 text-base">
                    Tidak Ada Log Obrolan
                  </h4>
                  <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                    Pengguna ini tidak memiliki rekam percakapan chat aktif di
                    database.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto text-[13px] rounded-2xl border border-gray-100">
                  <table className="w-full text-left whitespace-nowrap">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 border-b border-gray-100 font-bold uppercase tracking-wider text-[10px]">
                        <th className="px-6 py-4">Lawan Bicara</th>
                        <th className="px-6 py-4">Tipe Percakapan</th>
                        <th className="px-6 py-4">Pesan Terakhir</th>
                        <th className="px-6 py-4">Waktu</th>
                        <th className="px-6 py-4 text-right">Tindakan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {conversations.map((room) => {
                        const isCS = room.tipe === "ADMIN_CS";
                        return (
                          <tr
                            key={room.id}
                            className="hover:bg-emerald-50/20 transition-colors"
                          >
                            <td className="px-6 py-4">
                              <span className="font-bold text-gray-800 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                                  {room.otherParticipantName?.charAt(0) || "P"}
                                </span>
                                {room.otherParticipantName}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`px-2 py-0.5 text-[9px] font-bold rounded-lg uppercase tracking-wider ${
                                  isCS
                                    ? "bg-blue-50 text-blue-700 border border-blue-100"
                                    : "bg-purple-50 text-purple-700 border border-purple-100"
                                }`}
                              >
                                {isCS ? "Layanan CS" : "Transaksi Penjual"}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-gray-500 font-medium max-w-xs truncate">
                              {room.pesanTerakhir || (
                                <span className="italic text-gray-300">
                                  Belum ada obrolan
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-gray-500 font-medium">
                              {room.waktuPesanTerakhir
                                ? formatTanggal(room.waktuPesanTerakhir)
                                : formatTanggal(room.updatedAt)}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => openChatAudit(room)}
                                className="px-3.5 py-1.5 bg-gray-50 hover:bg-emerald-600 text-gray-600 hover:text-white rounded-xl text-xs font-bold transition-all border border-gray-200/50 hover:border-emerald-600"
                              >
                                Lihat Isi Chat
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── AUDIT LOG DIALOG MODAL (READ-ONLY VIEW) ── */}
      <Modal
        title={
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <MessageCircle className="text-emerald-600" size={20} />
            <div>
              <p className="text-sm font-black text-gray-900">
                Log Audit Obrolan:{" "}
                {selectedRoom?.otherParticipantName || "Unknown"}
              </p>
              <p className="text-[10px] text-gray-400 font-medium">
                ID Kamar: {selectedRoom?.id}
              </p>
            </div>
          </div>
        }
        open={auditModalOpen}
        onCancel={() => setAuditModalOpen(false)}
        footer={null}
        width={650}
        centered
        styles={{
          body: { padding: "16px" },
        }}
        className="custom-audit-modal"
      >
        <div className="space-y-4">
          {/* Read Only Locked Warning Banner */}
          <div className="flex items-center gap-2.5 p-3.5 bg-amber-50/70 border border-amber-100 text-amber-800 rounded-2xl text-[11px] font-semibold leading-relaxed">
            <Lock size={16} className="text-amber-600 flex-shrink-0" />
            <span>
              <strong>Mode Audit Terkunci:</strong> Anda memantau isi pesan
              secara *Read-Only*. Anda tidak memiliki otorisasi untuk meretas
              atau ikut campur mengirim pesan pada sesi percakapan mandiri ini.
            </span>
          </div>

          {/* Messages View Area */}
          <div className="h-[380px] overflow-y-auto bg-gray-50/70 rounded-3xl p-5 border border-gray-100 space-y-4 flex flex-col">
            {loadingMessages ? (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                <Loader2 className="animate-spin text-emerald-600" size={30} />
                <p className="text-[11px] text-gray-400 font-bold">
                  Mengunduh isi pesan log...
                </p>
              </div>
            ) : roomMessages.length === 0 ? (
              <div className="text-center my-auto text-gray-300 py-10">
                <MessageSquare
                  className="mx-auto text-gray-200 mb-2"
                  size={36}
                />
                <p className="text-xs font-bold">
                  Tidak ada pesan log di dalam kamar obrolan ini.
                </p>
              </div>
            ) : (
              roomMessages.map((msg) => {
                // If sender ID is the target user under review (id), it's "Sent" by them (right side)
                const isSentByTarget = msg.pengirimId === id;
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col max-w-[75%] ${
                      isSentByTarget
                        ? "self-end items-end"
                        : "self-start items-start"
                    }`}
                  >
                    <div
                      className={`p-3.5 rounded-2xl text-xs font-semibold leading-relaxed shadow-sm ${
                        isSentByTarget
                          ? "bg-emerald-600 text-white rounded-tr-none"
                          : "bg-white text-gray-800 border border-gray-100 rounded-tl-none"
                      }`}
                    >
                      {msg.isiPesan}
                    </div>
                    <span className="text-[9px] text-gray-400 mt-1 font-bold">
                      {formatTanggal(msg.createdAt)}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setAuditModalOpen(false)}
              className="px-6 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-colors shadow"
            >
              Tutup Audit
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
