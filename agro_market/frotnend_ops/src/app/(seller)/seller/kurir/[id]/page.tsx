"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Truck,
  ArrowLeft,
  Mail,
  Phone,
  Shield,
  Clock,
  Loader2,
  AlertCircle,
  MapPin,
  CheckCircle2,
  ChevronRight,
  Inbox,
  User,
} from "lucide-react";

import {
  formatRupiah,
  formatTanggal,
  storesApi,
  ordersApi,
  chatApi,
} from "@/lib/ecommerce-api";

interface CourierData {
  id: string;
  name: string | null;
  email: string;
  noTelepon?: string | null;
  phoneNumber?: string | null;
}

interface OrderItem {
  id: string;
  status: string;
  totalHarga: number;
  metodeBayar: string;
  createdAt: string;
  customer?: { name?: string; email?: string; phoneNumber?: string };
  alamatKirim?: string;
  items?: Array<{
    product?: {
      nama: string;
      namaEtalase?: string;
      gambarUrl?: string;
    };
    jumlah: number;
    harga: number;
  }>;
  shipping?: {
    id?: string;
    status: string;
    kurirPenggunaId?: string | null;
    kurirName?: string;
    kurirPhone?: string;
    catatan?: string;
    updatedAt?: string;
  };
}

const ACTIVE_SHIPPING_STATUSES = [
  "PREPARING",
  "PICKUP_CONFIRMATION",
  "PICKED_UP",
  "IN_TRANSIT",
];

export default function CourierActivityDetailPage() {
  const router = useRouter();
  const params = useParams();
  const courierId = params.id as string;

  const [courier, setCourier] = useState<CourierData | null>(null);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "active" | "done">("all");
  const [redirecting, setRedirecting] = useState(false);

  const handleHubungiKurir = async () => {
    if (!courier) return;
    try {
      setRedirecting(true);
      const res = await chatApi.createConversation({
        type: "ADMIN_CS",
        targetUserId: courier.id,
      });
      const data = res?.data?.data || res?.data;
      if (data?.id) {
        router.push(`/seller/chat/${data.id}`);
      } else {
        alert("Gagal memulai obrolan dengan kurir.");
      }
    } catch (err) {
      console.error("Error starting chat:", err);
      alert("Gagal memulai obrolan dengan kurir.");
    } finally {
      setRedirecting(false);
    }
  };

  const fetchData = useCallback(async () => {
    if (!courierId) return;
    try {
      setLoading(true);
      setError("");

      // 1. Get my store to find courier details
      const storeRes = await storesApi.getMyStore();
      const storeData = storeRes?.data?.data || storeRes?.data;
      if (!storeData) throw new Error("Toko tidak ditemukan");

      // Find courier in kurirStaffs list
      const staffList: CourierData[] = storeData.kurirStaffs || [];
      let foundCourier = staffList.find((c) => c.id === courierId);

      // Fallback to legacy single courierStaff if matching
      if (
        !foundCourier &&
        storeData.courierStaff &&
        storeData.courierStaff.id === courierId
      ) {
        foundCourier = storeData.courierStaff;
      }

      if (!foundCourier) {
        throw new Error(
          "Kurir tidak terdaftar atau tidak terafiliasi dengan toko Anda",
        );
      }
      setCourier(foundCourier);

      // 2. Fetch store orders to filter courier shipments
      const ordersRes = await ordersApi.sellerGetOrders(storeData.id, {
        limit: 100,
      });
      const ordersList: OrderItem[] =
        ordersRes?.data?.data?.data ||
        ordersRes?.data?.data ||
        ordersRes?.data ||
        [];

      // Filter orders assigned to this courier
      const courierOrders = ordersList.filter(
        (order) => order.shipping?.kurirPenggunaId === courierId,
      );
      setOrders(courierOrders);
    } catch (err: unknown) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memuat data aktivitas kurir",
      );
    } finally {
      setLoading(false);
    }
  }, [courierId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = orders.length;
    const active = orders.filter((o) =>
      ACTIVE_SHIPPING_STATUSES.includes(o.shipping?.status || ""),
    ).length;
    const done = orders.filter((o) => o.shipping?.status === "ARRIVED").length;
    return { total, active, done };
  }, [orders]);

  // Display orders based on tab
  const displayedOrders = useMemo(() => {
    switch (activeTab) {
      case "active":
        return orders.filter((o) =>
          ACTIVE_SHIPPING_STATUSES.includes(o.shipping?.status || ""),
        );
      case "done":
        return orders.filter((o) => o.shipping?.status === "ARRIVED");
      default:
        return orders;
    }
  }, [orders, activeTab]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-40 space-y-4">
        <Loader2 className="w-8 h-8 text-emerald-600/80 animate-spin" />
        <p className="text-sm font-medium text-slate-400">
          Memuat aktivitas kurir...
        </p>
      </div>
    );
  }

  if (error || !courier) {
    return (
      <div className="max-w-2xl mx-auto mt-12 p-6 bg-rose-50/50 border border-rose-100 rounded-3xl">
        <div className="flex items-start gap-4 text-rose-750">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
          <div className="space-y-2">
            <h3 className="font-medium text-base text-rose-800">
              Gagal Memuat Halaman
            </h3>
            <p className="text-xs text-rose-600 leading-relaxed font-medium">
              {error || "Data kurir tidak ditemukan."}
            </p>
            <button
              onClick={() => router.push("/seller/kurir")}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-medium hover:bg-rose-700 transition-colors shadow-sm active:scale-[0.98]"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Kembali
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8">
      {/* Back & Breadcrumb */}
      <div>
        <button
          onClick={() => router.push("/seller/kurir")}
          className="group inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-emerald-600 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Kembali ke Daftar Kurir
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col items-center text-center space-y-4">
              {/* Large Avatar */}
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center text-white font-medium text-2xl shadow-sm shrink-0 uppercase">
                {courier.name ? courier.name.charAt(0) : "K"}
              </div>

              {/* Courier Info */}
              <div className="space-y-1">
                <h2 className="font-medium text-lg text-slate-750">
                  {courier.name || "Kurir Agrojabar"}
                </h2>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50/50 text-emerald-600 text-[10px] font-medium rounded-full uppercase border border-emerald-100/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  Aktif
                </span>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6 space-y-4">
              <div className="flex items-center gap-3 text-xs">
                <div className="p-2 bg-slate-50 text-slate-400 rounded-xl">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wider">
                    Email Resmi
                  </p>
                  <p className="text-slate-600 truncate font-medium">
                    {courier.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <div className="p-2 bg-slate-50 text-slate-400 rounded-xl">
                  <Phone className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wider">
                    No. Telepon
                  </p>
                  <p className="text-slate-600 font-medium">
                    {courier.noTelepon ||
                      courier.phoneNumber ||
                      "Tidak ada nomor"}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Action */}
            <button
              onClick={handleHubungiKurir}
              disabled={redirecting}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow active:scale-[0.98] disabled:opacity-50"
            >
              {redirecting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Hubungi Kurir Sekarang
            </button>
          </div>

          {/* Info Card */}
          <div className="bg-slate-50/50 border border-slate-100 rounded-3xl p-5 flex gap-3 text-slate-400">
            <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed font-medium">
              Semua detail pengiriman diupdate secara real-time oleh kurir
              menggunakan aplikasi kurir operasional Agro Jabar.
            </p>
          </div>
        </div>

        {/* Right Column: Statistics & Activities */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                label: "Total Pengantaran",
                val: stats.total,
                color: "text-slate-750",
                bg: "bg-white border-slate-100",
              },
              {
                label: "Sedang Dikirim",
                val: stats.active,
                color: "text-amber-600",
                bg: "bg-amber-50/40 border-amber-100/50",
              },
              {
                label: "Terkirim Selesai",
                val: stats.done,
                color: "text-emerald-600",
                bg: "bg-emerald-50/40 border-emerald-100/50",
              },
            ].map((s, idx) => (
              <div
                key={idx}
                className={`p-4 md:p-5 rounded-3xl border shadow-sm flex flex-col justify-between ${s.bg}`}
              >
                <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wider">
                  {s.label}
                </p>
                <p
                  className={`text-xl md:text-2xl font-medium mt-2 leading-none ${s.color}`}
                >
                  {s.val}
                </p>
              </div>
            ))}
          </div>

          {/* Deliveries Section */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-50 pb-4">
              <h3 className="font-medium text-base text-slate-755 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                Aktivitas Pengiriman
              </h3>

              {/* Tabs */}
              <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-100/50 shrink-0">
                {[
                  { id: "all" as const, label: "Semua" },
                  { id: "active" as const, label: "Aktif" },
                  { id: "done" as const, label: "Selesai" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`px-4 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      activeTab === t.id
                        ? "bg-white text-slate-800 shadow-sm"
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            {displayedOrders.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100 text-slate-300">
                  <Inbox className="w-6 h-6" />
                </div>
                <h4 className="font-medium text-slate-700">
                  Tidak Ada Aktivitas
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto font-medium">
                  Belum ada pesanan yang sesuai dengan filter aktivitas saat
                  ini.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {displayedOrders.map((order) => {
                  const status = order.shipping?.status || "UNKNOWN";
                  return (
                    <div
                      key={order.id}
                      className="group border border-slate-100 hover:border-emerald-200/60 rounded-3xl p-5 transition-all hover:shadow-lg hover:shadow-slate-100/60 space-y-4 bg-white"
                    >
                      {/* Top Header */}
                      <div className="flex items-center justify-between gap-4">
                        <div className="space-y-0.5">
                          <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest">
                            No. Resi
                          </p>
                          <p className="font-mono font-medium text-slate-700 text-xs tracking-wide">
                            AGJ{order.id.slice(0, 8).toUpperCase()}
                          </p>
                        </div>
                        <span
                          className={`text-[10px] font-medium px-3 py-1 rounded-full border uppercase ${
                            status === "ARRIVED"
                              ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                              : "bg-amber-50 text-amber-600 border-amber-100 animate-pulse"
                          }`}
                        >
                          {status === "ARRIVED" ? "Terkirim" : "Sedang Dikirim"}
                        </span>
                      </div>

                      {/* Recipient & Address */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-50">
                        <div className="space-y-1">
                          <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wider">
                            Penerima
                          </p>
                          <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                            <p className="text-xs font-medium text-slate-700">
                              {order.customer?.name || "Pelanggan"}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wider">
                            Alamat Pengiriman
                          </p>
                          <div className="flex items-start gap-2">
                            <MapPin className="w-3.5 h-3.5 text-slate-300 shrink-0 mt-0.5" />
                            <p className="text-xs text-slate-500 leading-relaxed truncate font-medium">
                              {order.alamatKirim}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Items */}
                      {order.items && order.items.length > 0 && (
                        <div className="bg-slate-50/50 rounded-2xl p-3 border border-slate-100/50">
                          {order.items.slice(0, 2).map((item, idx) => (
                            <div
                              key={idx}
                              className="flex justify-between items-center text-xs py-1"
                            >
                              <span className="text-slate-500 font-medium truncate mr-4">
                                {item.product?.namaEtalase ||
                                  item.product?.nama}{" "}
                                (x{item.jumlah})
                              </span>
                              <span className="font-medium text-slate-700 shrink-0">
                                {formatRupiah(item.harga * item.jumlah)}
                              </span>
                            </div>
                          ))}
                          {order.items.length > 2 && (
                            <p className="text-[9px] text-slate-400 font-medium mt-1">
                              +{order.items.length - 2} item lainnya
                            </p>
                          )}
                        </div>
                      )}

                      {/* Footer Info & Details Button */}
                      <div className="border-t border-slate-50 pt-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-1.5 text-[9px] font-medium text-slate-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Dibuat: {formatTanggal(order.createdAt)}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              router.push(`/seller/pesanan/${order.id}`)
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                            Maps
                          </button>
                          <button
                            onClick={() =>
                              router.push(`/seller/pesanan/${order.id}`)
                            }
                            className="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                          >
                            Lihat Detail Pesanan
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
