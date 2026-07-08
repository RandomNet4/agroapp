"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Truck,
  MapPin,
  Loader2,
  AlertCircle,
  Box,
  CheckCircle2,
  MessageCircle,
  Package,
  ArrowRight,
  Phone,
  ClipboardCheck,
  Navigation2,
  Clock,
  TrendingUp,
  CheckCheck,
  PackageCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { formatRupiah, ordersApi, deliveryBatchApi } from "@/lib/ecommerce-api";
import { useAuthStore } from "@/store/auth-store";

/* ─── Types ─── */
interface TrackingItem {
  status: string;
  label?: string;
  timestamp?: string;
  note?: string;
}

interface OrderItem {
  id: string;
  status: string;
  totalHarga: number;
  metodeBayar: string;
  createdAt: string;
  tokoNama?: string;
  customer?: { name?: string; email?: string; phoneNumber?: string };
  alamatKirim?: string;
  items?: Array<{
    product?: { nama: string; gambarUrl?: string };
    jumlah: number;
    harga: number;
  }>;
  shipping?: {
    id?: string;
    status: string;
    kurirName?: string;
    kurirPhone?: string;
    catatan?: string;
    trackingHistory?: TrackingItem[];
    updatedAt?: string;
  };
}

/* ─── Constants ─── */
const STEPS = [
  { key: "PREPARING", label: "Disiapkan", icon: "📦" },
  { key: "PICKUP_CONFIRMATION", label: "Siap Diambil", icon: "🤝" },
  { key: "PICKED_UP", label: "Diambil Kurir", icon: "✅" },
  { key: "IN_TRANSIT", label: "Dikirim", icon: "🚚" },
  { key: "ARRIVED", label: "Terkirim", icon: "📍" },
] as const;

const ACTIVE_STATUSES = [
  "PREPARING",
  "PICKUP_CONFIRMATION",
  "PICKED_UP",
  "IN_TRANSIT",
];

function getStepIdx(status: string) {
  return STEPS.findIndex((s) => s.key === status);
}

function getActionConfig(status: string) {
  switch (status) {
    case "PICKUP_CONFIRMATION":
      return { label: "Konfirmasi Ambil Paket", icon: ClipboardCheck };
    case "PICKED_UP":
      return { label: "Mulai Pengiriman", icon: Navigation2 };
    case "IN_TRANSIT":
      return { label: "Tandai Sudah Tiba", icon: MapPin };
    default:
      return null;
  }
}

function toResiId(orderId: string) {
  return `AGJ${orderId.slice(0, 8).toUpperCase()}`;
}

/* ─── Main Page ─── */
export default function KurirTasksPage() {
  const router = useRouter();
  const { user, _hasHydrated } = useAuthStore();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "done">("active");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [batches, setBatches] = useState<any[]>([]);

  const fetchOrders = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const [resOrders, resBatches] = await Promise.all([
        ordersApi.getCourierTasks({ limit: 100 }),
        deliveryBatchApi.getCourierBatches(),
      ]);

      let all =
        resOrders?.data?.data?.data?.data ||
        resOrders?.data?.data?.data ||
        resOrders?.data?.data ||
        [];
      all = Array.isArray(all) ? all : [];
      all.sort(
        (a: OrderItem, b: OrderItem) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setOrders(all);

      const b = resBatches?.data?.data || [];
      setBatches(Array.isArray(b) ? b : []);

      setErrorText("");
    } catch {
      setErrorText("Gagal memuat daftar pesanan atau batch.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!_hasHydrated || !user || user.role !== "KURIR") return;
    fetchOrders(true);
    const es = new EventSource("/api/proxy/ecom-pesanan/stream", {
      withCredentials: true,
    });
    es.onmessage = (ev) => {
      try {
        const p = JSON.parse(ev.data);
        if (p?.type === "heartbeat") return;
        fetchOrders(false);
      } catch {
        /* ignore */
      }
    };
    return () => es.close();
  }, [user, _hasHydrated, fetchOrders]);

  const handleAction = async (id: string) => {
    setActionLoading(id);
    try {
      await ordersApi.advanceShippingStatus(id, {
        note: `Di-update oleh Kurir ${user?.name || ""}`,
      });
      await fetchOrders(false);
    } catch (err: unknown) {
      alert((err as Error).message || "Gagal update status");
    } finally {
      setActionLoading(null);
    }
  };

  const today = useMemo(() => new Date().toDateString(), []);
  const activeOrders = orders.filter((o) =>
    ACTIVE_STATUSES.includes(o.shipping?.status || ""),
  );
  const doneOrders = orders.filter(
    (o) =>
      o.shipping?.status === "ARRIVED" &&
      new Date(o.createdAt).toDateString() === today,
  );
  const displayed = activeTab === "active" ? activeOrders : doneOrders;

  const stats = {
    pending: orders.filter((o) =>
      ["PREPARING", "PICKUP_CONFIRMATION"].includes(o.shipping?.status || ""),
    ).length,
    ongoing: orders.filter((o) =>
      ["PICKED_UP", "IN_TRANSIT"].includes(o.shipping?.status || ""),
    ).length,
    done: doneOrders.length,
  };

  if (!_hasHydrated || !user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Clean Minimalist Header (Sticky) ── */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200">
        {/* Top Bar */}
        <div className="px-6 py-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                <Truck size={18} className="text-gray-700" strokeWidth={2} />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600">
                  KURIR INTERNAL
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push("/kurir/chat")}
              className="w-10 h-10 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors relative"
            >
              <MessageCircle size={16} strokeWidth={2} />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white text-[9px] font-bold flex items-center justify-center text-white">
                3
              </span>
            </button>
          </div>
        </div>

        {/* Clean Stats Grid */}
        <div className="px-6 py-3">
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label: "Menunggu",
                val: stats.pending,
                icon: Clock,
                bg: "bg-gray-50",
                iconColor: "text-gray-600",
                textColor: "text-gray-900",
              },
              {
                label: "Dikirim",
                val: stats.ongoing,
                icon: TrendingUp,
                bg: "bg-emerald-50",
                iconColor: "text-emerald-600",
                textColor: "text-emerald-700",
                highlight: true,
              },
              {
                label: "Selesai",
                val: stats.done,
                icon: CheckCheck,
                bg: "bg-gray-50",
                iconColor: "text-gray-600",
                textColor: "text-gray-900",
              },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.label}
                  className={`${s.bg} rounded-lg p-3 border ${s.highlight ? "border-emerald-200" : "border-gray-200"}`}
                >
                  <Icon
                    size={14}
                    className={`${s.iconColor} mb-2`}
                    strokeWidth={2}
                  />
                  <p className={`text-xl font-bold mb-0.5 ${s.textColor}`}>
                    {s.val}
                  </p>
                  <p className="text-[9px] font-medium text-gray-500 uppercase tracking-wide">
                    {s.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Content (Scrollable) ── */}
      <div className="px-5 pt-5 pb-28">
        {/* Clean Tabs - Smaller */}
        <div className="flex bg-white rounded-md p-0.5 border border-gray-200 mb-5 gap-0.5">
          {[
            {
              id: "active" as const,
              label: "Tugas Aktif",
              icon: PackageCheck,
              count: activeOrders.length,
            },
            {
              id: "done" as const,
              label: "Selesai Hari Ini",
              icon: CheckCircle2,
              count: doneOrders.length,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2 rounded-md flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors
                  ${
                    active
                      ? "bg-emerald-600 text-white"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
              >
                <Icon size={14} strokeWidth={2} />
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.count > 0 && (
                  <span
                    className={`min-w-[18px] h-4 px-1 rounded-md text-[9px] font-bold flex items-center justify-center
                    ${active ? "bg-emerald-700 text-white" : "bg-gray-100 text-gray-600"}`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {errorText && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg flex gap-3 mb-4 border border-red-200">
            <AlertCircle
              size={18}
              className="flex-shrink-0 mt-0.5"
              strokeWidth={2}
            />
            <p className="text-sm font-medium">{errorText}</p>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center py-24">
            <Loader2
              className="w-10 h-10 animate-spin text-emerald-600 mb-4"
              strokeWidth={2}
            />
            <p className="text-sm text-gray-500 font-medium">
              Memuat tugas pengiriman...
            </p>
          </div>
        ) : displayed.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center border border-gray-200">
            <Box
              size={48}
              className="text-gray-300 mx-auto mb-4"
              strokeWidth={1.5}
            />
            <h3 className="font-bold text-gray-800 text-base mb-2">
              {activeTab === "active"
                ? "Tidak Ada Tugas Aktif"
                : "Belum Ada Selesai Hari Ini"}
            </h3>
            <p className="text-sm text-gray-500 max-w-[240px] mx-auto">
              {activeTab === "active"
                ? "Pesanan baru akan muncul setelah seller memproses paket."
                : "Pesanan yang berhasil diantar hari ini akan tampil di sini."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeTab === "active" &&
              batches.length > 0 &&
              batches.map((batch) => (
                <BatchCard
                  key={batch.id}
                  batch={batch}
                  onAction={async () => {
                    await fetchOrders(false);
                  }}
                />
              ))}

            {activeTab === "active" &&
              batches.length > 0 &&
              displayed.length > 0 && (
                <div className="flex items-center gap-3 pt-2">
                  <div className="h-px bg-gray-200 flex-1" />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Atau Kirim Individual
                  </span>
                  <div className="h-px bg-gray-200 flex-1" />
                </div>
              )}

            <div className="space-y-3">
              {displayed.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  actionLoading={actionLoading}
                  onAction={handleAction}
                  isCompleted={activeTab === "done"}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Order Card ─── */
function OrderCard({
  order,
  actionLoading,
  onAction,
  isCompleted,
}: {
  order: OrderItem;
  actionLoading: string | null;
  onAction: (id: string) => void;
  isCompleted: boolean;
}) {
  const router = useRouter();
  const status = order.shipping?.status || "UNKNOWN";
  const stepIdx = getStepIdx(status);
  const action = getActionConfig(status);
  const resiId = toResiId(order.id);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:border-emerald-200 transition-colors">
      {/* Card Header - Nama Penerima + Status (Clickable) */}
      <div
        role="button"
        onClick={() => router.push(`/kurir/pesanan/${order.id}`)}
        className="flex items-center justify-between px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
      >
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">
            {order.customer?.name || "Pelanggan"}
          </p>
          <p className="text-xs text-gray-500 mt-0.5 font-mono">
            Resi: {resiId}
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      <div
        role="button"
        onClick={() => router.push(`/kurir/pesanan/${order.id}`)}
        className="p-4 space-y-3 cursor-pointer hover:bg-gray-50/50 transition-colors"
      >
        {/* Address Only */}
        <div className="space-y-2 bg-gray-50 rounded-lg p-3 border border-gray-100">
          <div className="flex items-start gap-2">
            <MapPin
              size={11}
              className="text-red-500 flex-shrink-0 mt-0.5"
              strokeWidth={2}
            />
            <p className="text-xs text-gray-700 leading-relaxed flex-1">
              {order.alamatKirim}
            </p>
          </div>
        </div>

        {/* Items Summary */}
        {order.items && order.items.length > 0 && (
          <div className="border-t border-gray-100 pt-3 space-y-1">
            {order.items.slice(0, 2).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between py-1">
                <span className="text-xs text-gray-700 truncate mr-3 flex-1">
                  {item.product?.nama}
                </span>
                <span className="text-xs font-semibold text-gray-900 flex-shrink-0">
                  {formatRupiah(item.harga * item.jumlah)}
                </span>
              </div>
            ))}
            {order.items.length > 2 && (
              <p className="text-[10px] text-gray-500 mt-1">
                +{order.items.length - 2} item lainnya
              </p>
            )}
            <div className="flex items-center justify-between py-2 border-t border-gray-100 mt-2 pt-2">
              <span className="text-xs font-semibold text-gray-700">Total</span>
              <span className="text-sm font-bold text-emerald-600">
                {formatRupiah(order.totalHarga || 0)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer Action */}
      <div className="px-4 pb-4 space-y-2 relative z-10">
        {/* BIG BUTTON: Maps */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/kurir/pesanan/${order.id}/peta`);
          }}
          className="w-full py-3 rounded-lg font-semibold text-white text-sm flex items-center justify-center gap-2 transition-colors bg-emerald-600 hover:bg-emerald-700"
        >
          <MapPin size={15} strokeWidth={2} />
          Buka Peta & Rute
          <ArrowRight size={13} strokeWidth={2} />
        </button>

        {/* SMALL BUTTONS */}
        <div className="flex gap-2 pt-2">
          {/* Hubungi */}
          {order.customer?.phoneNumber ? (
            <a
              href={`tel:${order.customer.phoneNumber}`}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors border border-slate-200"
            >
              <Phone size={14} strokeWidth={2} />
              Hubungi
            </a>
          ) : (
            <div className="flex-1 py-2.5 rounded-lg bg-gray-50 text-gray-400 font-semibold text-xs flex items-center justify-center gap-1.5 border border-gray-100 cursor-not-allowed">
              <Phone size={14} strokeWidth={2} />
              Hubungi
            </div>
          )}
        </div>

        {!isCompleted && status === "PREPARING" && (
          <div className="flex items-center justify-center gap-2 py-3 mt-2 bg-amber-50 rounded-lg text-amber-700 text-sm font-semibold border border-amber-200">
            <Clock size={14} strokeWidth={2} />
            Menunggu Seller Menyiapkan Paket
          </div>
        )}

        {(isCompleted || status === "ARRIVED") && (
          <div className="flex items-center justify-center gap-2 py-3 mt-2 bg-emerald-50 rounded-lg text-emerald-700 text-sm font-semibold border border-emerald-200">
            <CheckCircle2 size={15} strokeWidth={2} />
            Paket Telah Terkirim
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Batch Card ─── */
function BatchCard({ batch, onAction }: { batch: any; onAction: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const isPagi = batch.tipeBatch === "PAGI";

  const handleStart = async () => {
    try {
      setLoading(true);
      await deliveryBatchApi.startBatch(batch.id);
      onAction();
    } catch (err: any) {
      alert(err.message || "Gagal memulai batch");
    } finally {
      setLoading(false);
    }
  };

  const statusMap: Record<string, { label: string; color: string }> = {
    MENUNGGU: { label: "Menunggu Kurir", color: "bg-amber-100 text-amber-800" },
    SIAP_KIRIM: { label: "Siap Dikirim", color: "bg-blue-100 text-blue-800" },
    DALAM_PERJALANAN: {
      label: "Dalam Perjalanan",
      color: "bg-emerald-100 text-emerald-800",
    },
    SELESAI: { label: "Selesai", color: "bg-gray-100 text-gray-800" },
  };

  const statusObj = statusMap[batch.status] || statusMap.MENUNGGU;

  return (
    <div
      className={`rounded-xl border-2 overflow-hidden ${isPagi ? "border-emerald-500 shadow-emerald-100" : "border-blue-500 shadow-blue-100"} shadow-sm bg-white relative`}
    >
      {/* Ribbon */}
      <div
        className={`absolute top-0 right-0 px-3 py-1 text-[10px] font-bold text-white rounded-bl-lg
        ${isPagi ? "bg-emerald-500" : "bg-blue-500"}`}
      >
        REKOMENDASI {batch.tipeBatch}
      </div>

      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
            ${isPagi ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600"}`}
          >
            <Package size={20} strokeWidth={2} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 leading-tight">
              Batch Pengiriman
            </h3>
            <p className="text-xs text-gray-500 font-mono mt-0.5">
              {batch.kodeResi}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100 flex flex-col justify-center items-center">
            <span className="text-[10px] text-gray-500 font-semibold mb-0.5">
              TOTAL PESANAN
            </span>
            <span className="font-bold text-gray-800">
              {batch.totalPesanan} Paket
            </span>
          </div>
          <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100 flex flex-col justify-center items-center">
            <span className="text-[10px] text-gray-500 font-semibold mb-0.5">
              ESTIMASI JARAK
            </span>
            <span className="font-bold text-gray-800">
              {batch.estimasiJarakKm ? `${batch.estimasiJarakKm} km` : "-"}
            </span>
          </div>
          <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100 flex flex-col justify-center items-center">
            <span className="text-[10px] text-gray-500 font-semibold mb-0.5">
              BERAT TOTAL
            </span>
            <span className="font-bold text-gray-800">
              {batch.totalBeratKg} kg
            </span>
          </div>
          <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100 flex flex-col justify-center items-center">
            <span className="text-[10px] text-gray-500 font-semibold mb-0.5">
              STATUS BATCH
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusObj.color}`}
            >
              {statusObj.label}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {batch.status === "DALAM_PERJALANAN" ? (
            <button
              onClick={() => router.push(`/kurir/batch/${batch.id}`)}
              className={`w-full py-3 rounded-lg font-bold text-white flex items-center justify-center gap-2 transition-colors
                ${isPagi ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"}`}
            >
              <Navigation2 size={18} strokeWidth={2.5} />
              Buka Peta Rute
            </button>
          ) : (
            <button
              onClick={handleStart}
              disabled={loading}
              className={`w-full py-3 rounded-lg font-bold text-white flex items-center justify-center gap-2 transition-colors
                ${isPagi ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"} disabled:opacity-70`}
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" strokeWidth={2.5} />
              ) : (
                <>
                  <Truck size={18} strokeWidth={2.5} />
                  Mulai Pengiriman Batch
                </>
              )}
            </button>
          )}

          <button
            onClick={() => router.push(`/kurir/batch/${batch.id}`)}
            className="w-full py-2.5 rounded-lg bg-gray-100 text-gray-700 font-semibold text-xs flex items-center justify-center transition-colors hover:bg-gray-200"
          >
            Lihat Daftar Pesanan ({batch.totalPesanan})
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Status Badge ─── */
function StatusBadge({ status }: { status: string }) {
  const step = STEPS.find((s) => s.key === status);
  const label = step?.label || status;

  const styleMap: Record<string, string> = {
    PREPARING: "bg-amber-50 text-amber-700 border-amber-200",
    PICKUP_CONFIRMATION: "bg-emerald-50 text-emerald-700 border-emerald-200",
    PICKED_UP: "bg-blue-50 text-blue-700 border-blue-200",
    IN_TRANSIT: "bg-cyan-50 text-cyan-700 border-cyan-200",
    ARRIVED: "bg-gray-100 text-gray-700 border-gray-200",
  };

  return (
    <span
      className={`text-[10px] font-semibold px-2.5 py-1.5 rounded-md border ${styleMap[status] || "bg-gray-50 text-gray-600 border-gray-200"}`}
    >
      {step?.icon} {label}
    </span>
  );
}
