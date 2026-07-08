"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  MapPin,
  User,
  Package,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Send,
  Crosshair,
} from "lucide-react";
import { message } from "antd";

import { ordersApi } from "@/lib/ecommerce-api";
import { useAuthStore } from "@/store/auth-store";
import { usePhotoUpload } from "@/hooks/ui/usePhotoUpload";

import PhotoGallery from "./_components/PhotoGallery";

interface OrderInfo {
  id: string;
  alamatKirim?: string;
  customer?: {
    name?: string;
    penerima?: string;
  };
  shipping?: { status: string };
}

export default function DeliveryProofPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  const { user, _hasHydrated } = useAuthStore();

  const {
    photos,
    error: photoError,
    addPhoto,
    removePhoto,
    getBase64Photos,
    reset,
  } = usePhotoUpload(3);
  const [catatan, setCatatan] = useState("");
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [gpsLoading, setGpsLoading] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      const res = await ordersApi.getCourierTasks({ limit: 100 });
      const all =
        res?.data?.data?.data?.data ||
        res?.data?.data?.data ||
        res?.data?.data ||
        [];
      const found = Array.isArray(all)
        ? all.find((o: any) => o.id === orderId)
        : null;
      if (found) setOrder(found as OrderInfo);
      return found;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (!_hasHydrated || !user) return;
    fetchOrder();
  }, [_hasHydrated, user, fetchOrder]);

  const captureGps = () => {
    if (!navigator.geolocation) {
      message.warning("GPS tidak tersedia di perangkat ini");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsLoading(false);
        message.success("Lokasi berhasil diambil");
      },
      () => {
        setGpsLoading(false);
        message.error("Gagal mengambil lokasi");
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const handleSubmit = async () => {
    if (photos.length === 0) {
      message.error("Minimal 1 foto wajib dilampirkan");
      return;
    }

    setSubmitting(true);
    try {
      // If still in transit, advance to ARRIVED first (proof requires ARRIVED status)
      if (order?.shipping?.status === "IN_TRANSIT") {
        await ordersApi.advanceShippingStatus(orderId, {
          note: `Tiba di tujuan — oleh Kurir ${user?.name || ""}`,
        });
      }

      const base64Photos = await getBase64Photos();
      await ordersApi.submitDeliveryProof(orderId, {
        buktiKirimFoto: base64Photos,
        buktiKirimCatatan: catatan || undefined,
        buktiKirimLat: coords?.lat,
        buktiKirimLng: coords?.lng,
      });

      message.success("Bukti pengiriman berhasil dikirim");
      reset();
      router.push(`/kurir/pesanan/${orderId}`);
    } catch (err: any) {
      message.error(
        err?.response?.data?.message ||
          err?.message ||
          "Gagal mengirim bukti pengiriman",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!_hasHydrated || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const status = order?.shipping?.status;
  const allowed = status === "IN_TRANSIT" || status === "ARRIVED";
  const penerima = order?.customer?.penerima || order?.customer?.name || "—";

  if (!order || !allowed) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3 px-6 text-center">
        <AlertCircle className="w-10 h-10 text-amber-400" />
        <p className="text-gray-600 text-sm font-semibold">
          {!order
            ? "Pesanan tidak ditemukan."
            : "Bukti pengiriman hanya bisa diisi saat paket sedang dikirim atau sudah tiba."}
        </p>
        <button
          onClick={() => router.push(`/kurir/pesanan/${orderId}`)}
          className="text-emerald-600 text-sm font-bold"
        >
          ← Kembali ke Detail
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="flex items-center gap-3 px-4 h-14">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-xl hover:bg-gray-50 text-gray-500 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-bold text-gray-900 text-[15px] flex-1">
            Bukti Penerimaan Barang
          </h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-3 pb-28">
        {/* Order summary */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <User size={18} className="text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Penerima
              </p>
              <p className="font-bold text-gray-900 text-[15px] leading-tight">
                {penerima}
              </p>
            </div>
            <span className="text-[10px] font-mono font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">
              AGJ-{orderId.slice(0, 6).toUpperCase()}
            </span>
          </div>
          {order.alamatKirim && (
            <div className="flex items-start gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
              <MapPin size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-[12px] text-gray-600 leading-relaxed">
                {order.alamatKirim}
              </p>
            </div>
          )}
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3">
          <Package
            size={16}
            className="text-emerald-600 flex-shrink-0 mt-0.5"
          />
          <p className="text-[12px] text-emerald-700 leading-relaxed">
            Lampirkan foto sebagai bukti barang telah diterima (minimal 1,
            maksimal 3 foto), lalu kirim untuk menyelesaikan pengiriman.
          </p>
        </div>

        {/* Photo gallery */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <PhotoGallery
            photos={photos}
            maxPhotos={3}
            onAddPhoto={addPhoto}
            onRemovePhoto={removePhoto}
            error={photoError}
          />
        </div>

        {/* Notes */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Catatan{" "}
            <span className="text-gray-400 font-normal">(Opsional)</span>
          </label>
          <textarea
            value={catatan}
            onChange={(e) => setCatatan(e.target.value.slice(0, 500))}
            placeholder="Contoh: Diterima langsung oleh penerima, dititipkan ke satpam, dll."
            rows={3}
            className="w-full text-sm rounded-xl border border-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 resize-none"
          />
          <p className="text-[11px] text-gray-400 mt-1 text-right">
            {catatan.length} / 500
          </p>
        </div>

        {/* GPS capture (optional) */}
        <button
          onClick={captureGps}
          disabled={gpsLoading}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold border transition-all active:scale-[0.98] ${
            coords
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
          }`}
        >
          {gpsLoading ? (
            <Loader2 size={15} className="animate-spin" />
          ) : coords ? (
            <CheckCircle2 size={15} />
          ) : (
            <Crosshair size={15} />
          )}
          {coords
            ? `Lokasi tersimpan (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`
            : "Tandai Lokasi Pengiriman (Opsional)"}
        </button>
      </div>

      {/* Bottom submit bar */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 px-4 py-3 z-30">
        <div className="max-w-2xl mx-auto flex gap-2">
          <button
            onClick={() => router.back()}
            disabled={submitting}
            className="px-4 py-3.5 rounded-xl font-bold text-gray-700 text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] bg-gray-100 hover:bg-gray-200 border border-gray-200 disabled:opacity-60"
          >
            <ArrowLeft size={16} strokeWidth={2.5} />
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || photos.length === 0}
            className="flex-1 py-3.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-200"
          >
            {submitting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <Send size={16} strokeWidth={2.5} />
                Kirim Bukti & Selesaikan
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
