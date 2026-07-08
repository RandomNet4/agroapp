"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  MapPin,
  Phone,
  User,
  Package,
  Navigation,
  ExternalLink,
  Copy,
  CheckCircle2,
  Truck,
  Clock,
  ChevronDown,
  ChevronUp,
  Loader2,
  ArrowRight,
  ClipboardCheck,
  Navigation2,
} from "lucide-react";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";

import { formatRupiah, formatTanggal, ordersApi } from "@/lib/ecommerce-api";
import { useAuthStore } from "@/store/auth-store";

/* ─── Types ─── */
interface TrackingItem {
  status: string;
  label?: string;
  timestamp?: string;
  note?: string;
}

interface OrderDetail {
  id: string;
  status: string;
  totalHarga: number;
  metodeBayar: string;
  createdAt: string;
  tokoNama?: string;
  alamatKirim?: string;
  customer?: {
    name?: string;
    email?: string;
    phoneNumber?: string;
    alamatLat?: number | null;
    alamatLng?: number | null;
    penerima?: string;
    teleponPenerima?: string;
  };
  items?: Array<{ product?: { nama: string }; jumlah: number; harga: number }>;
  shipping?: {
    status: string;
    kurirName?: string;
    trackingHistory?: TrackingItem[];
    buktiKirimFoto?: string[];
    buktiKirimCatatan?: string;
    buktiKirimWaktu?: string;
  };
}

const STEPS = [
  { key: "PREPARING", label: "Disiapkan", icon: "📦" },
  { key: "PICKUP_CONFIRMATION", label: "Siap Diambil", icon: "🤝" },
  { key: "PICKED_UP", label: "Diambil", icon: "✅" },
  { key: "IN_TRANSIT", label: "Dikirim", icon: "🚚" },
  { key: "ARRIVED", label: "Terkirim", icon: "📍" },
] as const;

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

export default function KurirOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  const { user, _hasHydrated } = useAuthStore();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [geocoords, setGeocoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      const res = await ordersApi.getCourierTasks({ limit: 100 });
      const all: OrderDetail[] =
        res?.data?.data?.data?.data ||
        res?.data?.data?.data ||
        res?.data?.data ||
        [];
      const found = Array.isArray(all)
        ? all.find((o: any) => o.id === orderId)
        : null;
      if (found) setOrder(found as any);
      return found;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (!_hasHydrated || !user) return;
    fetchOrder().then(async (found: any) => {
      if (!found?.alamatKirim) return;
      // Auto-resolve coordinates
      const lat = found?.customer?.alamatLat;
      const lng = found?.customer?.alamatLng;
      if (lat && lng) {
        setGeocoords({ lat, lng });
      } else {
        // Geocode from address text
        setGeocoding(true);
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(found.alamatKirim)}&format=json&limit=1`,
            { headers: { "Accept-Language": "id,en" } },
          );
          const data = await res.json();
          if (data?.length > 0) {
            setGeocoords({
              lat: parseFloat(data[0].lat),
              lng: parseFloat(data[0].lon),
            });
          } else {
            setGeocodeError("Lokasi tidak ditemukan di peta.");
          }
        } catch {
          setGeocodeError("Gagal memuat peta.");
        } finally {
          setGeocoding(false);
        }
      }
    });
  }, [_hasHydrated, user, fetchOrder]);

  const handleAction = async () => {
    if (!order) return;

    const currentStatus = order.shipping?.status || "UNKNOWN";

    // If status is IN_TRANSIT, go to the delivery proof page to finish delivery
    if (currentStatus === "IN_TRANSIT") {
      router.push(`/kurir/pesanan/${order.id}/bukti`);
      return;
    }

    setActionLoading(true);
    try {
      await ordersApi.advanceShippingStatus(order.id, {
        note: `Di-update oleh Kurir ${user?.name || ""}`,
      });
      await fetchOrder();
    } catch (err: any) {
      alert(err.message || "Gagal update status");
    } finally {
      setActionLoading(false);
    }
  };

  const copyAddress = () => {
    if (order?.alamatKirim) {
      navigator.clipboard.writeText(order.alamatKirim);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getOsmEmbedUrl = () => {
    if (!geocoords) return "";
    const { lat, lng } = geocoords;
    const delta = 0.008;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - delta},${lat - delta},${lng + delta},${lat + delta}&layer=mapnik&marker=${lat},${lng}`;
  };

  const getOsmFullUrl = () => {
    if (!geocoords)
      return `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(order?.alamatKirim || "")}`;
    const { lat, lng } = geocoords;
    return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;
  };

  const openGoogleMaps = () => {
    if (!order?.alamatKirim) return;
    const lat = geocoords?.lat ?? order.customer?.alamatLat;
    const lng = geocoords?.lng ?? order.customer?.alamatLng;
    const url =
      lat && lng
        ? `https://www.google.com/maps?q=${lat},${lng}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.alamatKirim)}`;
    window.open(url, "_blank");
  };

  if (!_hasHydrated || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3">
        <p className="text-gray-500 text-sm">Pesanan tidak ditemukan.</p>
        <button
          onClick={() => router.back()}
          className="text-emerald-600 text-sm font-bold"
        >
          ← Kembali
        </button>
      </div>
    );
  }

  const status = order.shipping?.status || "UNKNOWN";
  const stepIdx = getStepIdx(status);
  const action = getActionConfig(status);
  const history = order.shipping?.trackingHistory || [];

  // Delivery proof (bukti penerimaan)
  const buktiFoto = order.shipping?.buktiKirimFoto || [];
  const buktiCatatan = order.shipping?.buktiKirimCatatan;
  const buktiWaktu = order.shipping?.buktiKirimWaktu;
  const hasBukti = buktiFoto.length > 0;

  // Account holder (who ordered)
  const namaAkun = order.customer?.name || "—";
  const telpAkun = order.customer?.phoneNumber;

  // Address recipient (who receives the package)
  const penerima = order.customer?.penerima || namaAkun;
  const telpPenerima = order.customer?.teleponPenerima || telpAkun;

  // Primary contact for calling (prefer address recipient phone)
  const teleponUtama = telpPenerima || telpAkun;

  // Whether address recipient differs from account holder
  const isDifferent =
    order.customer?.penerima && order.customer.penerima !== namaAkun;

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
            Detail Pengiriman
          </h1>
          <span
            className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
              status === "ARRIVED"
                ? "bg-gray-100 text-gray-600 border-gray-200"
                : status === "IN_TRANSIT"
                  ? "bg-blue-50 text-blue-600 border-blue-100"
                  : status === "PICKED_UP"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                    : status === "PICKUP_CONFIRMATION"
                      ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                      : "bg-amber-50 text-amber-600 border-amber-100"
            }`}
          >
            {STEPS.find((s) => s.key === status)?.icon}{" "}
            {STEPS.find((s) => s.key === status)?.label || status}
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-3 pb-6">
        {/* Penerima Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">
            Informasi Penerima
          </p>

          {/* Penerima utama */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <User size={18} className="text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 text-[15px] leading-tight">
                {penerima}
              </p>
              {telpPenerima && (
                <p className="text-[12px] text-emerald-700 font-semibold mt-0.5">
                  {telpPenerima}
                </p>
              )}
              {isDifferent && (
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Penerima di alamat
                </p>
              )}
            </div>
            {teleponUtama && (
              <a
                href={`tel:${teleponUtama}`}
                className="flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-2 rounded-xl text-xs font-bold active:scale-95 transition-all flex-shrink-0"
              >
                <Phone size={13} />
                Telepon
              </a>
            )}
          </div>

          {/* Jika penerima berbeda dari akun, tampilkan info akun juga */}
          {isDifferent && (
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5 mb-3">
              <div className="w-7 h-7 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
                <User size={13} className="text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-gray-400 font-semibold">
                  Akun Pemesan
                </p>
                <p className="text-[12px] font-semibold text-gray-700">
                  {namaAkun}
                </p>
                {telpAkun && (
                  <p className="text-[11px] text-gray-500">{telpAkun}</p>
                )}
              </div>
              {telpAkun && (
                <a
                  href={`tel:${telpAkun}`}
                  className="w-7 h-7 bg-white border border-gray-200 rounded-lg flex items-center justify-center"
                >
                  <Phone size={12} className="text-gray-500" />
                </a>
              )}
            </div>
          )}

          {/* Jika penerima SAMA dengan akun, tampilkan info kontak saja */}
          {!isDifferent && telpAkun && (
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5 mb-3">
              <Phone size={12} className="text-gray-400 flex-shrink-0" />
              <span className="text-[12px] text-gray-600 font-medium flex-1">
                {telpAkun}
              </span>
            </div>
          )}

          {/* WhatsApp button */}
          {teleponUtama && (
            <a
              href={`https://wa.me/${teleponUtama.replace(/[^0-9]/g, "").replace(/^0/, "62")}`}
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-100 py-2.5 rounded-xl text-xs font-bold active:scale-95 transition-all"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-emerald-600">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WhatsApp {penerima}
            </a>
          )}
        </div>

        {/* Destination / Map Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">
              Alamat Pengiriman
            </p>
            <div className="flex items-start gap-2 mb-3">
              <MapPin size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-[12px] text-gray-700 leading-relaxed flex-1">
                {order.alamatKirim}
              </p>
              <button
                onClick={copyAddress}
                className="w-7 h-7 flex items-center justify-center bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-all flex-shrink-0 ml-1"
              >
                {copied ? (
                  <CheckCircle2 size={12} className="text-emerald-500" />
                ) : (
                  <Copy size={12} className="text-gray-400" />
                )}
              </button>
            </div>
            {/* Two equal buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => router.push(`/kurir/pesanan/${order.id}/peta`)}
                className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white py-2.5 rounded-xl text-xs font-bold transition-all"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                  <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
                  <path d="M3 16v3a2 2 0 0 0 2 2h3" />
                  <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
                </svg>
                Lihat Peta Full
              </button>
              <button
                onClick={openGoogleMaps}
                className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white py-2.5 rounded-xl text-xs font-bold transition-all"
              >
                <ExternalLink size={13} />
                Google Maps
              </button>
            </div>
          </div>

          {/* Map embed — always visible */}
          <div className="border-t border-gray-100">
            {geocodeError ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <MapPin size={20} className="text-gray-300" />
                <p className="text-xs text-gray-400 text-center px-4">
                  {geocodeError}
                </p>
              </div>
            ) : !geocoords ? (
              <div className="flex items-center justify-center h-32 gap-2">
                <Loader2 size={18} className="animate-spin text-emerald-500" />
                <p className="text-xs text-gray-400">
                  Mencari lokasi di peta...
                </p>
              </div>
            ) : (
              <div className="relative">
                <iframe
                  src={getOsmEmbedUrl()}
                  className="w-full h-48"
                  frameBorder="0"
                  scrolling="no"
                  title="Peta Lokasi"
                  allowFullScreen
                />
              </div>
            )}
            <div className="px-4 py-2 bg-gray-50 flex items-center justify-between">
              <p className="text-[10px] text-gray-400">
                OpenStreetMap • ©️ kontributor
              </p>
              <a
                href={getOsmFullUrl()}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-emerald-600 font-bold flex items-center gap-1"
              >
                Buka OSM <ExternalLink size={10} />
              </a>
            </div>
          </div>
        </div>

        {/* Progress Stepper */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-4">
            Status Pengiriman
          </p>
          <div className="relative py-1">
            <div className="absolute top-[18px] left-3 right-3 h-[2px] bg-gray-100 rounded-full z-0" />
            <div
              className="absolute top-[18px] left-3 h-[2px] bg-emerald-500 rounded-full z-0 transition-all duration-700"
              style={{
                width:
                  stepIdx < 0
                    ? "0%"
                    : `${(stepIdx / (STEPS.length - 1)) * 94}%`,
              }}
            />
            <div className="relative z-10 flex justify-between">
              {STEPS.map((step, i) => {
                const done = i < stepIdx;
                const current = i === stepIdx;
                return (
                  <div
                    key={step.key}
                    className="flex flex-col items-center gap-1.5"
                    style={{ width: `${100 / STEPS.length}%` }}
                  >
                    <div
                      className={`w-[30px] h-[30px] rounded-full flex items-center justify-center transition-all duration-300
                      ${
                        current
                          ? "bg-emerald-500 ring-4 ring-emerald-100"
                          : done
                            ? "bg-emerald-500"
                            : "bg-white border-2 border-gray-200"
                      }`}
                    >
                      {done ? (
                        <CheckCircle2 size={13} className="text-white" />
                      ) : (
                        <span
                          className={`text-xs ${current ? "text-white" : "text-gray-300"}`}
                        >
                          {step.icon}
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-[8px] font-semibold text-center leading-tight
                      ${current ? "text-emerald-600" : done ? "text-emerald-400" : "text-gray-300"}`}
                    >
                      {step.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tracking history */}
          {history.length > 0 && (
            <div className="mt-4 border-t border-gray-50 pt-3">
              <button
                onClick={() => setHistoryExpanded((v) => !v)}
                className="w-full flex items-center justify-between text-[11px] font-semibold text-gray-400 hover:text-emerald-600 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Clock size={10} />
                  Riwayat Pengiriman
                  <span className="bg-gray-100 text-gray-500 rounded-full px-1.5 py-0.5 text-[9px] font-bold">
                    {history.length}
                  </span>
                </span>
                {historyExpanded ? (
                  <ChevronUp size={13} />
                ) : (
                  <ChevronDown size={13} />
                )}
              </button>
              {historyExpanded && (
                <div className="mt-2 space-y-0 pl-1">
                  {[...history].reverse().map((h, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0 ${i === 0 ? "bg-emerald-500" : "bg-gray-300"}`}
                        />
                        {i < history.length - 1 && (
                          <div className="w-px bg-gray-200 flex-1 my-1" />
                        )}
                      </div>
                      <div className="pb-2.5 flex-1">
                        <p className="text-[11px] font-semibold text-gray-800">
                          {h.label || h.status}
                        </p>
                        {h.note && (
                          <p className="text-[10px] text-gray-400">{h.note}</p>
                        )}
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {formatTanggal(h.timestamp || "")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Items */}
        {order.items && order.items.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">
              Isi Paket
            </p>
            <div className="space-y-2">
              {order.items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-1"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0 mr-3">
                    <div className="w-7 h-7 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Package size={12} className="text-gray-400" />
                    </div>
                    <span className="text-[12px] text-gray-700 truncate">
                      {item.product?.nama}
                    </span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[11px] font-bold text-gray-800">
                      {formatRupiah(item.harga * item.jumlah)}
                    </p>
                    <p className="text-[10px] text-gray-400">×{item.jumlah}</p>
                  </div>
                </div>
              ))}
              <div className="border-t border-gray-50 pt-2 flex justify-between items-center">
                <span className="text-[11px] text-gray-500 font-semibold">
                  Total
                </span>
                <span className="text-sm font-bold text-emerald-700">
                  {formatRupiah(order.totalHarga)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Bukti Penerimaan Barang */}
        {hasBukti && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 size={14} className="text-emerald-500" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Bukti Penerimaan
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {buktiFoto.map((foto, idx) => (
                <a
                  key={idx}
                  href={foto}
                  target="_blank"
                  rel="noreferrer"
                  className="relative aspect-square rounded-lg overflow-hidden border border-gray-100"
                >
                  <Image
                    src={foto}
                    alt={`Bukti ${idx + 1}`}
                    fill
                    className="object-cover"
                  />
                </a>
              ))}
            </div>
            {buktiCatatan && (
              <div className="mt-3 bg-gray-50 rounded-xl px-3 py-2.5">
                <p className="text-[10px] font-semibold text-gray-400 mb-0.5">
                  Catatan
                </p>
                <p className="text-[12px] text-gray-700 leading-relaxed">
                  {buktiCatatan}
                </p>
              </div>
            )}
            {buktiWaktu && (
              <p className="text-[10px] text-gray-400 mt-2">
                Dikirim {formatTanggal(buktiWaktu)}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Bottom Action Bar - Sticky */}
      {action && status !== "ARRIVED" && status !== "PREPARING" && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.05)] z-20 pb-safe">
          <div className="max-w-2xl mx-auto px-4 py-3">
            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={actionLoading}
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60 bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-200"
            >
              {actionLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <action.icon size={16} strokeWidth={2.5} />
                  {action.label}
                  <ArrowRight size={15} strokeWidth={2.5} />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {status === "PREPARING" && (
        <div className="flex items-center justify-center gap-2 py-3.5 bg-amber-50 rounded-xl text-amber-600 text-sm font-semibold border border-amber-100 mt-4 mb-20 mx-4">
          <Clock size={15} />
          Menunggu Seller Menyiapkan Paket
        </div>
      )}

      {status === "ARRIVED" &&
        (hasBukti ? (
          <div className="flex items-center justify-center gap-2 py-3.5 bg-emerald-50 rounded-xl text-emerald-700 text-sm font-bold border border-emerald-100 mt-4 mb-20 mx-4">
            <CheckCircle2 size={16} strokeWidth={2.5} />
            Paket Terkirim — Bukti Penerimaan Tersimpan
          </div>
        ) : (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.05)] z-20 pb-safe">
            <div className="max-w-2xl mx-auto px-4 py-3">
              <button
                onClick={() => router.push(`/kurir/pesanan/${order.id}/bukti`)}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white text-sm transition-all active:scale-[0.98] bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-200"
              >
                <ClipboardCheck size={16} strokeWidth={2.5} />
                Lengkapi Bukti Penerimaan
              </button>
            </div>
          </div>
        ))}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200">
            <div className="p-5 text-center">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <ClipboardCheck size={24} className="text-amber-600" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-2">
                Konfirmasi Aksi
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Apakah Anda yakin ingin {action?.label.toLowerCase()}?
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-2.5 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors text-sm"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    handleAction();
                  }}
                  className="flex-1 py-2.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors text-sm"
                >
                  Ya, Lanjutkan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
