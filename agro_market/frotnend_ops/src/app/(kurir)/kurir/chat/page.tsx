"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { MessageCircle, Shield, Store, Loader2 } from "lucide-react";

import { useAuthStore } from "@/store/auth-store";
import { storesApi } from "@/lib/ecommerce-api";

export default function KurirChatPage() {
  const router = useRouter();
  const { user, _hasHydrated } = useAuthStore();
  const [affiliatedTokoId, setAffiliatedTokoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (_hasHydrated && user && user.role === "KURIR") {
      storesApi
        .getMyStore()
        .then((res) => {
          const data = res.data?.data || res.data;
          if (data?.id) setAffiliatedTokoId(data.id);
        })
        .catch((err) => console.error("Failed to fetch affiliated toko", err))
        .finally(() => setLoading(false));
    }
  }, [user, _hasHydrated]);

  if (!_hasHydrated || !user) return null;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50/50 pb-28">
      {/* --- Header --- */}
      <header className="bg-white px-6 py-6 border-b border-gray-100">
        <h2 className="font-bold text-xl text-gray-900">Pusat Pesan</h2>
        <p className="text-xs text-gray-400 mt-1">
          Pilih saluran komunikasi operasional
        </p>
      </header>

      <div className="p-5 space-y-4">
        {/* Chat Option: Admin */}
        <button
          onClick={() => router.push("/kurir/chat/admin")}
          className="w-full bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4 hover:border-emerald-200 transition-all active:scale-95 group"
        >
          <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-100 transition-colors">
            <Shield size={28} />
          </div>
          <div className="flex-1 text-left">
            <p className="font-bold text-gray-800 text-base">
              Admin Operasional
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Lapor masalah sistem & bantuan umum
            </p>
          </div>
          <MessageCircle size={20} className="text-gray-300" />
        </button>

        {/* Chat Option: Seller */}
        <button
          disabled={loading || !affiliatedTokoId}
          onClick={() =>
            affiliatedTokoId &&
            router.push(`/kurir/chat/seller/${affiliatedTokoId}`)
          }
          className={`w-full bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4 transition-all active:scale-95 group ${!affiliatedTokoId ? "opacity-60 grayscale" : "hover:border-primary-200"}`}
        >
          <div className="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600 group-hover:bg-primary-100 transition-colors">
            {loading ? (
              <Loader2 size={24} className="animate-spin" />
            ) : (
              <Store size={28} />
            )}
          </div>
          <div className="flex-1 text-left">
            <p className="font-bold text-gray-800 text-base">Seller / Toko</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {!loading && !affiliatedTokoId
                ? "Anda belum terhubung ke toko manapun"
                : "Koordinasi pickup & stok barang"}
            </p>
          </div>
          <MessageCircle size={20} className="text-gray-300" />
        </button>
      </div>

      <div className="mt-10 px-10 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <MessageCircle size={32} className="text-gray-300" />
        </div>
        <p className="text-[11px] text-gray-400 leading-relaxed">
          Semua percakapan diawasi oleh sistem untuk menjamin kualitas layanan
          operasional.
        </p>
      </div>
    </div>
  );
}
