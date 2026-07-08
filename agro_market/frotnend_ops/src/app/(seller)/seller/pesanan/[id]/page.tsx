"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Package,
  Truck,
  MapPin,
  User,
  ClipboardList,
  ChevronRight,
  CheckCircle,
  Copy,
} from "lucide-react";
import toast from "react-hot-toast";

import { formatRupiah, formatTanggal, ordersApi } from "@/lib/ecommerce-api";

const getStatusLabel = (s: string) => {
  switch (s) {
    case "PREPARING":
      return "Disiapkan Seller";
    case "PICKUP_CONFIRMATION":
      return "Diserahkan ke Kurir";
    case "PICKED_UP":
      return "Diterima Kurir";
    case "IN_TRANSIT":
      return "Dalam Perjalanan";
    case "ARRIVED":
      return "Sampai di Tujuan";
    default:
      return s;
  }
};
const getStatusIcon = (s: string) => {
  switch (s) {
    case "PREPARING":
      return "📦";
    case "PICKUP_CONFIRMATION":
      return "🤝";
    case "PICKED_UP":
      return "✅";
    case "IN_TRANSIT":
      return "🚚";
    case "ARRIVED":
      return "📍";
    default:
      return "";
  }
};

const TRACKING_STEPS = [
  "PREPARING",
  "PICKUP_CONFIRMATION",
  "PICKED_UP",
  "IN_TRANSIT",
  "ARRIVED",
];

interface OrderDetail {
  id: string;
  status: string;
  totalHarga: number | string;
  metodeBayar: string;
  alamatKirim: string;
  catatan?: string;
  createdAt: string;
  updatedAt?: string;
  customer?: { name?: string; email?: string; phone?: string };
  alamatLat?: number;
  alamatLng?: number;
  items?: Array<{
    id: string;
    jumlah: number;
    harga: number | string;
    grade?: string;
    product?: {
      nama: string;
      namaEtalase?: string;
      gambarUrl?: string;
      satuan?: string;
    };
  }>;
  shipping?: {
    id: string;
    status: string;
    kurirName?: string;
    kurirPhone?: string;
    catatan?: string;
    buktiKirimFoto?: string[];
    buktiKirimCatatan?: string;
    buktiKirimWaktu?: string;
    trackingHistory?: Array<{
      status: string;
      label?: string;
      note?: string;
      timestamp?: string;
      createdAt?: string;
    }>;
  };
}

const statusColor = (s: string) => {
  switch (s) {
    case "MENUNGGU_BAYAR":
      return "bg-amber-50 text-amber-600 border-amber-100/60";
    case "DIPROSES":
      return "bg-blue-50 text-blue-600 border-blue-100/60";
    case "DIKIRIM":
      return "bg-emerald-50 text-emerald-600 border-emerald-100/60";
    case "SELESAI":
      return "bg-amber-50 text-amber-600 border-amber-100/60";
    case "DITUTUP":
      return "bg-slate-50 text-slate-400 border-slate-200/60";
    case "DIBATALKAN":
      return "bg-rose-50/50 text-rose-600 border-rose-105/60";
    default:
      return "bg-slate-50 text-slate-500 border-slate-200/60";
  }
};

export default function DetailPesananSellerPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const handleCopyId = () => {
    if (!order?.id) return;
    navigator.clipboard.writeText(order.id);
    setCopiedId(true);
    toast.success("ID Pesanan disalin!");
    setTimeout(() => setCopiedId(false), 2000);
  };

  useEffect(() => {
    if (!id) return;
    const fetchOrder = async () => {
      try {
        const res = await ordersApi.getById(id);
        let data = res?.data?.data || res?.data;
        if (data) {
          data = {
            ...data,
            shipping: data.shipping || data.pengiriman,
            customer: data.customer || {
              name: data.konsumen?.nama,
              email: data.konsumen?.email,
              phone:
                data.konsumen?.noTelepon ||
                data.konsumen?.addresses?.[0]?.telepon,
            },
            items: (data.items || data.item || []).map((it: any) => ({
              ...it,
              product: it.product || it.produk,
            })),
          };
          if (data.konsumen?.addresses?.length > 0) {
            data.alamatLat = data.konsumen.addresses[0].lat;
            data.alamatLng = data.konsumen.addresses[0].lng;
          }
        }
        setOrder(data);
      } catch (err) {
        console.error("Failed to fetch order detail:", err);
        setError("Gagal memuat detail pesanan.");
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  const handleSellerConfirm = async () => {
    if (!order?.id || confirmLoading) return;
    try {
      setConfirmLoading(true);
      await ordersApi.sellerConfirm(order.id);
      toast.success("Pesanan berhasil dikonfirmasi & ditutup!");
      // Refresh order data
      const res = await ordersApi.getById(order.id);
      const data = res?.data?.data || res?.data;
      if (data) setOrder({ ...order, ...data, status: "DITUTUP" });
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Gagal mengkonfirmasi pesanan",
      );
    } finally {
      setConfirmLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
        </div>
        <p className="text-sm text-slate-400 font-medium">
          Memuat detail pesanan…
        </p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft size={14} /> Kembali
        </button>
        <div className="bg-rose-50/50 text-rose-700 p-6 rounded-2xl flex items-center gap-3 border border-rose-100/60 max-w-2xl mx-auto mt-10">
          <AlertCircle size={20} />
          <div>
            <h3 className="font-medium text-sm">Terjadi Kesalahan</h3>
            <p className="text-xs text-rose-600 mt-0.5">
              {error || "Pesanan tidak ditemukan."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const shipping = order.shipping;
  const history = Array.isArray(shipping?.trackingHistory)
    ? shipping.trackingHistory
    : [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/seller/pesanan")}
          className="p-2 hover:bg-gray-100 rounded-xl text-gray-500 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-display font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList size={20} className="text-amber-600" /> Detail
            Pesanan
          </h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <p className="text-xs text-gray-500 font-mono">#{order.id}</p>
            <button
              onClick={handleCopyId}
              className="p-1 text-gray-400 hover:text-amber-600 rounded transition-colors"
              title="Salin ID Pesanan"
            >
              {copiedId ? (
                <CheckCircle size={13} className="text-emerald-600" />
              ) : (
                <Copy size={13} />
              )}
            </button>
          </div>
        </div>
        <span
          className={`ml-auto px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wide ${statusColor(order.status)}`}
        >
          {order.status}
        </span>
      </div>

      {/* Customer Info */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-700 text-sm mb-3 flex items-center gap-2">
          <User size={16} className="text-gray-400" /> Informasi Pelanggan
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Nama</span>
            <span className="font-semibold text-gray-900">
              {order.customer?.name || "-"}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Email</span>
            <span className="font-semibold text-gray-900">
              {order.customer?.email || "-"}
            </span>
          </div>
          {order.customer?.phone && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">No. Telepon</span>
              <span className="font-semibold text-gray-900">
                {order.customer.phone}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Delivery Address */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-700 text-sm mb-3 flex items-center gap-2">
          <MapPin size={16} className="text-gray-400" /> Alamat Pengiriman
        </h3>
        <p className="text-sm text-gray-800 font-medium">
          {order.alamatKirim || "-"}
        </p>
        {order.catatan && (
          <p className="mt-2 text-xs text-amber-700 bg-amber-50 p-2 rounded-lg">
            💬 Catatan: {order.catatan}
          </p>
        )}

        {order.alamatLat && order.alamatLng && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <a
              href={`https://www.google.com/maps?q=${order.alamatLat},${order.alamatLng}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-xl text-sm font-semibold hover:bg-emerald-100 hover:text-emerald-700 transition-colors"
            >
              <MapPin size={16} /> Buka di Google Maps
            </a>
          </div>
        )}
      </div>

      {/* Order Items */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-700 text-sm mb-3 flex items-center gap-2">
          <Package size={16} className="text-gray-400" /> Item Pesanan
        </h3>
        <div className="space-y-3">
          {order.items?.map((item, i) => (
            <div
              key={item.id || i}
              className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0"
            >
              <div className="w-12 h-12 bg-gray-50 rounded-xl overflow-hidden flex items-center justify-center text-xl flex-shrink-0">
                {item.product?.gambarUrl ? (
                  <div className="relative w-full h-full">
                    <Image
                      src={item.product.gambarUrl}
                      alt={item.product.nama || "Produk"}
                      fill
                      sizes="48px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  "📦"
                )}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 text-sm">
                  {item.product?.namaEtalase || item.product?.nama || "Produk"}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {item.grade && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded font-semibold">
                      Grade {item.grade}
                    </span>
                  )}
                  <span className="text-xs text-gray-500">
                    {item.jumlah} {item.product?.satuan || "kg"} ×{" "}
                    {formatRupiah(item.harga)}
                  </span>
                </div>
              </div>
              <p className="font-bold text-gray-900 text-sm">
                {formatRupiah(item.jumlah * Number(item.harga))}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Summary */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-700 text-sm mb-3">
          Ringkasan Pembayaran
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Metode Bayar</span>
            <span className="font-semibold text-gray-900">
              {order.metodeBayar}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Tanggal Pesanan</span>
            <span className="font-semibold text-gray-900">
              {formatTanggal(order.createdAt)}
            </span>
          </div>
          <div className="flex justify-between text-sm pt-3 border-t border-gray-100">
            <span className="font-bold text-gray-900">Total</span>
            <span className="font-display font-black text-lg text-amber-700">
              {formatRupiah(order.totalHarga)}
            </span>
          </div>
        </div>
      </div>

      {/* Shipping Tracking */}
      {shipping && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-700 text-sm mb-3 flex items-center gap-2">
            <Truck size={16} className="text-gray-400" /> Status Pengiriman
          </h3>

          {shipping.kurirName && (
            <div className="bg-slate-50 rounded-xl p-3 mb-4 text-sm">
              <p className="text-gray-600">
                Kurir:{" "}
                <span className="font-semibold">{shipping.kurirName}</span>
                {shipping.kurirPhone && <span> • {shipping.kurirPhone}</span>}
              </p>
            </div>
          )}

          {/* Tracking Steps */}
          <div className="flex items-center gap-1 flex-wrap mb-4">
            {TRACKING_STEPS.map((st, idx) => {
              const stepIdx = TRACKING_STEPS.indexOf(st);
              const currentIdx = TRACKING_STEPS.indexOf(shipping.status);
              const done = stepIdx < currentIdx;
              const current = shipping.status === st;
              return (
                <div key={st} className="flex items-center gap-1">
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium border ${
                      current
                        ? "bg-blue-100 text-blue-700 border-blue-200"
                        : done
                          ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                          : "bg-gray-50 text-gray-400 border-gray-200"
                    }`}
                  >
                    {getStatusIcon(st)} {getStatusLabel(st)}
                  </span>
                  {idx < TRACKING_STEPS.length - 1 && (
                    <ChevronRight size={12} className="text-gray-300" />
                  )}
                </div>
              );
            })}
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="space-y-2 mt-3 border-t border-gray-100 pt-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Riwayat
              </p>
              {[...history].reverse().map((h, i) => (
                <div key={i} className="flex gap-3 text-xs">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full mt-1 flex-shrink-0" />
                    {i < history.length - 1 && (
                      <div className="w-0.5 bg-gray-200 flex-1 mt-1" />
                    )}
                  </div>
                  <div className="pb-3">
                    <p className="font-semibold text-gray-800">
                      {h.label || getStatusLabel(h.status)}
                    </p>
                    {h.note && <p className="text-gray-500">{h.note}</p>}
                    <p className="text-gray-400">
                      {formatTanggal(h.timestamp || h.createdAt || "")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {order.status === "SELESAI" && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-start gap-3">
            <CheckCircle
              size={20}
              className="text-amber-500 flex-shrink-0 mt-0.5"
            />
            <div>
              <p className="text-sm font-bold text-amber-800">
                Pembeli telah mengkonfirmasi penerimaan
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                Silakan periksa foto bukti pengiriman dari kurir, lalu klik
                tombol konfirmasi untuk menutup pesanan ini.
              </p>
            </div>
          </div>

          {/* Foto bukti dari kurir */}
          {shipping?.buktiKirimFoto && shipping.buktiKirimFoto.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-amber-700 mb-2">
                📷 Foto Bukti Pengiriman Kurir
              </p>
              <div className="flex gap-2 flex-wrap">
                {shipping.buktiKirimFoto.map((foto, i) => (
                  <a key={i} href={foto} target="_blank" rel="noreferrer">
                    <div className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-amber-200 hover:border-amber-400 transition-colors">
                      <Image
                        src={foto}
                        alt={`Bukti ${i + 1}`}
                        fill
                        sizes="96px"
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  </a>
                ))}
              </div>
              {shipping.buktiKirimCatatan && (
                <p className="text-xs text-amber-600 mt-2">
                  📝 {shipping.buktiKirimCatatan}
                </p>
              )}
            </div>
          )}

          {!shipping?.buktiKirimFoto?.length && (
            <p className="text-xs text-amber-500 italic">
              Kurir tidak mengunggah foto bukti pengiriman.
            </p>
          )}

          <button
            onClick={handleSellerConfirm}
            disabled={confirmLoading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          >
            {confirmLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <CheckCircle size={16} />
            )}
            {confirmLoading ? "Memproses..." : "Konfirmasi & Tutup Pesanan"}
          </button>
        </div>
      )}

      {order.status === "DITUTUP" && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle size={20} className="text-slate-400" />
          <p className="text-sm font-semibold text-slate-500">
            Pesanan ini sudah ditutup oleh seller.
          </p>
        </div>
      )}
    </div>
  );
}
