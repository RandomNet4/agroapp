"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Truck,
  Loader2,
  AlertCircle,
  RefreshCw,
  Mail,
  Phone,
  MessageSquare,
  Shield,
  TrendingUp,
  MapPin,
} from "lucide-react";

import { storesApi, chatApi } from "@/lib/ecommerce-api";

interface CourierData {
  id: string;
  name: string | null;
  email: string;
  noTelepon?: string | null;
  phoneNumber?: string | null;
}

interface StoreData {
  id: string;
  nama: string;
  courierStaffId: string | null;
  courierStaff: CourierData | null;
  kurirStaffs?: CourierData[] | null;
}

export default function SellerKurirPage() {
  const router = useRouter();
  const [store, setStore] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [redirectingCourierId, setRedirectingCourierId] = useState<
    string | null
  >(null);

  const handleHubungiKurir = async (courierId: string) => {
    try {
      setRedirectingCourierId(courierId);
      const res = await chatApi.createConversation({
        type: "ADMIN_CS",
        targetUserId: courierId,
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
      setRedirectingCourierId(null);
    }
  };

  const fetchStore = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await storesApi.getMyStore();
      const data = res?.data?.data || res?.data;
      setStore(data);
    } catch (err) {
      console.error(err);
      setError("Gagal memuat data toko.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => fetchStore(false));
  }, [fetchStore]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-32 space-y-4">
        <Loader2 className="w-8 h-8 text-emerald-600/80 animate-spin" />
        <p className="text-sm font-medium text-slate-400">
          Memuat kurir toko...
        </p>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="bg-rose-50/50 border border-rose-100 text-rose-700 p-6 rounded-2xl flex items-start gap-3 max-w-2xl mx-auto mt-8">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
        <div className="space-y-0.5">
          <h3 className="font-medium text-sm text-rose-800">
            Toko Tidak Ditemukan
          </h3>
          <p className="text-xs text-rose-600/90 leading-relaxed font-medium">
            Profil toko Anda tidak dapat ditemukan atau belum terdaftar.
          </p>
        </div>
      </div>
    );
  }

  const couriers =
    store.kurirStaffs && store.kurirStaffs.length > 0
      ? store.kurirStaffs
      : store.courierStaff
        ? [store.courierStaff]
        : [];

  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 pb-6 border-b border-slate-100/80">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <h1 className="text-2xl md:text-3xl font-medium tracking-tight text-slate-800">
              Kurir Afiliasi
            </h1>
          </div>
          <p className="text-xs md:text-sm text-slate-400 font-medium">
            Daftar kurir resmi yang ditugaskan khusus untuk mengirimkan produk
            toko Anda
          </p>
        </div>

        <button
          onClick={() => fetchStore()}
          className="self-start sm:self-center px-4 py-2 border border-slate-100 rounded-xl text-xs font-medium hover:bg-slate-50 active:scale-[0.98] transition-all text-slate-500 flex items-center gap-2 bg-white shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Perbarui
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl text-xs font-medium flex items-center gap-2">
          ⚠️ {error}
        </div>
      )}

      {/* Main Grid */}
      {couriers.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-100/80 shadow-sm max-w-xl mx-auto space-y-4">
          <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto border border-slate-100/50 text-slate-300">
            <Truck className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-medium text-base text-slate-700">
              Belum Ada Kurir Terafiliasi
            </h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto px-4 leading-relaxed font-medium">
              Toko Anda belum memiliki kurir yang ditugaskan oleh Admin. Silakan
              hubungi admin Agrojabar untuk menambahkan kurir.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {couriers.map((courier) => (
            <div
              key={courier.id}
              className="bg-white border border-slate-100 hover:border-emerald-200/60 rounded-3xl p-5 md:p-6 transition-all duration-300 hover:shadow-lg hover:shadow-slate-100/60 flex flex-col md:flex-row md:items-center justify-between gap-5 group relative overflow-hidden"
            >
              {/* Left & Middle combined in horizontal flow */}
              <div className="flex items-center gap-4 flex-1 min-w-0">
                {/* Initials Avatar */}
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center text-white font-medium text-lg shadow-sm shrink-0 uppercase">
                  {courier.name ? courier.name.charAt(0) : "K"}
                </div>

                {/* Text Info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="font-medium text-slate-750 group-hover:text-emerald-600 transition-colors truncate text-base">
                      {courier.name || "Kurir Agrojabar"}
                    </h3>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50/50 text-emerald-600 text-[10px] font-medium rounded-full uppercase border border-emerald-100/60 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Aktif
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-5 text-xs text-slate-400 font-medium">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Mail className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      <span className="truncate">{courier.email}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Phone className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      <span>
                        {courier.noTelepon ||
                          courier.phoneNumber ||
                          "Nomor tidak tersedia"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Action buttons stacked side-by-side */}
              <div className="flex items-center gap-3 shrink-0 pt-4 md:pt-0 border-t md:border-t-0 border-slate-50 flex-wrap">
                <button
                  onClick={() => router.push(`/seller/kurir/${courier.id}`)}
                  className="px-4 py-2 border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/50 text-slate-555 hover:text-emerald-600 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98]"
                >
                  <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                  Aktivitas Kurir
                </button>
                <button
                  onClick={() => router.push(`/seller/pesanan`)}
                  className="px-4 py-2 border border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-555 hover:text-slate-700 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98]"
                >
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  Maps
                </button>
                <button
                  onClick={() => handleHubungiKurir(courier.id)}
                  disabled={redirectingCourierId === courier.id}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5 shadow-sm hover:shadow active:scale-[0.98] disabled:opacity-50"
                >
                  {redirectingCourierId === courier.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <MessageSquare className="w-3.5 h-3.5" />
                  )}
                  Hubungi Kurir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-slate-50/50 border border-slate-100 rounded-3xl p-6 flex flex-col md:flex-row items-start gap-4">
        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shrink-0">
          <Shield className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h4 className="font-medium text-slate-700 text-sm md:text-base">
            Kebijakan Manajemen Kurir
          </h4>
          <p className="text-xs md:text-sm text-slate-400 font-medium leading-relaxed">
            Demi menjaga stabilitas operasional pengiriman, pelepasan,
            perubahan, atau penambahan kurir afiliasi hanya dapat dilakukan
            secara sah oleh{" "}
            <span className="text-emerald-600 font-medium">
              Admin Agrojabar
            </span>
            . Penjual tidak memiliki otorisasi untuk merubah status afiliasi
            kurir secara langsung. Apabila Anda membutuhkan pergantian staff
            pengantar, silakan hubungi pusat bantuan admin.
          </p>
        </div>
      </div>
    </div>
  );
}
