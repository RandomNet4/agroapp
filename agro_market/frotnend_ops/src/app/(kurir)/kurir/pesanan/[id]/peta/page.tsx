"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ArrowLeft,
  Navigation,
  Loader2,
  ExternalLink,
  Phone,
  MapPin,
  Locate,
  AlertCircle,
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import dynamic from "next/dynamic";

import { ordersApi } from "@/lib/ecommerce-api";
import { useAuthStore } from "@/store/auth-store";

/* ─── Types ─── */
interface LatLng {
  lat: number;
  lng: number;
}
interface OrderDetail {
  id: string;
  alamatKirim?: string;
  customer?: {
    name?: string;
    phoneNumber?: string;
    alamatLat?: number | null;
    alamatLng?: number | null;
    penerima?: string;
    teleponPenerima?: string;
  };
}

/* ─── Dynamic Leaflet Map (SSR disabled) ─── */
const MapView = dynamic(() => import("./_components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
    </div>
  ),
});

export default function KurirMapPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  const { user, _hasHydrated } = useAuthStore();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [destination, setDest] = useState<LatLng | null>(null);
  const [currentPos, setCurrentPos] = useState<LatLng | null>(null);
  const [loading, setLoading] = useState(true);
  const [geocoding, setGeocoding] = useState(false);
  const [gpsError, setGpsError] = useState("");
  const [geocodeError, setGeoError] = useState("");
  const [routeState, setRouteState] = useState<
    "idle" | "loading" | "done" | "error" | "no-gps"
  >("idle");
  const watchId = useRef<number | null>(null);
  const mapRef = useRef<any>(null);

  /* ── Fetch order ── */
  const fetchOrder = useCallback(async () => {
    try {
      const res = await ordersApi.getCourierTasks({ limit: 100 });
      const all: any[] =
        res?.data?.data?.data?.data ||
        res?.data?.data?.data ||
        res?.data?.data ||
        [];
      return Array.isArray(all)
        ? all.find((o: any) => o.id === orderId) || null
        : null;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  /* ── Geocode address ── */
  const geocodeAddress = useCallback(async (address: string) => {
    setGeocoding(true);
    setGeoError("");
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
        { headers: { "Accept-Language": "id,en" } },
      );
      const data = await res.json();
      if (data?.length > 0) {
        setDest({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
      } else {
        setGeoError("Lokasi tidak ditemukan.");
      }
    } catch {
      setGeoError("Gagal memuat lokasi tujuan.");
    } finally {
      setGeocoding(false);
    }
  }, []);

  /* ── Start GPS watch ── */
  const startGPS = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError("GPS tidak tersedia di perangkat ini.");
      return;
    }
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        setCurrentPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsError("");
      },
      () => setGpsError("Tidak bisa akses GPS. Aktifkan lokasi."),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
    );
  }, []);

  useEffect(() => {
    if (!_hasHydrated || !user) return;
    fetchOrder().then(async (found) => {
      if (!found) return;
      setOrder(found);

      // Resolve destination coordinates
      const lat = found?.customer?.alamatLat;
      const lng = found?.customer?.alamatLng;
      if (lat && lng) {
        setDest({ lat, lng });
      } else if (found?.alamatKirim) {
        await geocodeAddress(found.alamatKirim);
      }
    });

    // Start watching GPS
    startGPS();

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, [_hasHydrated, user, fetchOrder, geocodeAddress, startGPS]);

  const openGoogleMaps = () => {
    if (!order?.alamatKirim && !destination) return;
    const url = destination
      ? currentPos
        ? `https://www.google.com/maps/dir/${currentPos.lat},${currentPos.lng}/${destination.lat},${destination.lng}`
        : `https://www.google.com/maps?q=${destination.lat},${destination.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order?.alamatKirim || "")}`;
    window.open(url, "_blank");
  };

  const penerima = order?.customer?.penerima || order?.customer?.name || "—";
  const telepon =
    order?.customer?.teleponPenerima || order?.customer?.phoneNumber;
  const isReady = destination && !loading && !geocoding;

  return (
    <div
      className="relative w-full overflow-hidden bg-gray-900"
      style={{ height: "100dvh" }}
    >
      {/* ── Floating Top Bar ── */}
      <div className="absolute top-0 left-0 right-0 z-[999] px-3 pt-3">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl px-3 py-2.5 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors flex-shrink-0"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 mb-0.5">
              <MapPin size={11} className="text-red-500 flex-shrink-0" />
              <p className="text-[10px] text-gray-500 truncate">
                {order?.alamatKirim || "Memuat..."}
              </p>
            </div>
            <p className="text-[13px] font-bold text-gray-900 truncate">
              {penerima}
            </p>
          </div>

          <div className="flex gap-2 flex-shrink-0">
            {telepon && (
              <a
                href={`tel:${telepon}`}
                className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center border border-emerald-100"
              >
                <Phone size={15} className="text-emerald-600" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Google Maps floating button — top-right, separate from header */}
      <button
        onClick={openGoogleMaps}
        className="absolute top-20 right-3 z-[999] w-11 h-11 rounded-2xl flex items-center justify-center bg-white shadow-lg border border-gray-200 active:scale-95 transition-all"
        title="Buka di Google Maps"
      >
        <svg viewBox="0 0 24 24" className="w-6 h-6">
          <path
            fill="#4285F4"
            d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
          />
          <path fill="#FBBC04" d="M12 2C8.13 2 5 5.13 5 9h7V2z" />
          <path
            fill="#34A853"
            d="M12 9c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"
            opacity="0"
          />
          <circle cx="12" cy="9" r="2.5" fill="white" />
        </svg>
      </button>
      <div className="absolute inset-0">
        {/* Loading overlay */}
        {(loading || geocoding) && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-100 gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
            <p className="text-sm text-gray-500 font-medium">
              {loading ? "Memuat data pesanan..." : "Mencari lokasi tujuan..."}
            </p>
          </div>
        )}

        {/* Geocode error */}
        {!loading && !geocoding && geocodeError && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-100 gap-3 px-8 text-center">
            <MapPin size={36} className="text-gray-300" />
            <p className="text-sm text-gray-500">{geocodeError}</p>
            <button
              onClick={openGoogleMaps}
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold"
            >
              <ExternalLink size={15} />
              Buka Google Maps
            </button>
          </div>
        )}

        {/* Map */}
        {isReady && (
          <MapView
            destination={destination}
            currentPos={currentPos}
            onRouteStateChange={(s) => setRouteState(s)}
            onMapReady={(m) => {
              mapRef.current = m;
            }}
          />
        )}

        {/* GPS status pill */}
        <div className="absolute bottom-4 right-3 z-[998] flex flex-col gap-2 items-end">
          {gpsError ? (
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-semibold px-2.5 py-1.5 rounded-xl shadow">
              <AlertCircle size={11} />
              Lokasi tidak aktif
            </div>
          ) : currentPos ? (
            <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-semibold px-2.5 py-1.5 rounded-xl shadow">
              <Locate size={11} />
              GPS Aktif
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 text-gray-500 text-[10px] font-semibold px-2.5 py-1.5 rounded-xl shadow">
              <Loader2 size={11} className="animate-spin" />
              Mencari GPS...
            </div>
          )}
        </div>

        {/* Route loading banner */}
        {routeState === "loading" && (
          <div className="absolute bottom-4 left-3 z-[998] flex items-center gap-2 bg-white/95 backdrop-blur-sm border border-emerald-200 text-emerald-700 text-[11px] font-semibold px-3 py-2 rounded-xl shadow-md">
            <Loader2 size={12} className="animate-spin flex-shrink-0" />
            Menghitung jalur rute...
          </div>
        )}
        {routeState === "error" && (
          <div className="absolute bottom-4 left-3 z-[998] flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-semibold px-3 py-2 rounded-xl shadow-md">
            <AlertCircle size={12} className="flex-shrink-0" />
            Rute tidak tersedia
          </div>
        )}
        {routeState === "done" && (
          <div className="absolute bottom-4 left-3 z-[998] flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold px-3 py-2 rounded-xl shadow-md">
            <span className="text-sm">🛣️</span>
            Rute siap
          </div>
        )}

        {/* Custom Zoom buttons — above route pill */}
        {isReady && (
          <div className="absolute bottom-16 left-3 z-[998] flex flex-col overflow-hidden rounded-xl shadow-md border border-gray-200">
            <button
              onClick={() => mapRef.current?.zoomIn()}
              className="w-9 h-9 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-700 font-bold text-lg border-b border-gray-200 active:scale-95 transition-all"
            >
              +
            </button>
            <button
              onClick={() => mapRef.current?.zoomOut()}
              className="w-9 h-9 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-700 font-bold text-lg active:scale-95 transition-all"
            >
              −
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
