"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { Suspense } from "react";
import {
  Store,
  MapPin,
  Phone,
  Mail,
  FileText,
  Star,
  Package,
  ShoppingBag,
  Loader2,
  AlertCircle,
  Edit2,
  Save,
  X,
  CheckCircle,
  Clock,
} from "lucide-react";

import { useProfilToko } from "@/hooks/seller/useProfilToko";
import { formatRupiah } from "@/lib/ecommerce-api";

const MapPicker = dynamic(() => import("@/components/ui/MapPicker"), {
  ssr: false,
  loading: () => (
    <div className="rounded-2xl h-60 bg-gray-100 animate-pulse flex items-center justify-center">
      <Loader2 size={20} className="text-gray-400 animate-spin" />
    </div>
  ),
});

const ProfilTokoPage: React.FC = () => {
  const {
    store,
    loading,
    errorText,
    isEditing,
    setIsEditing,
    saving,
    toast,
    formData,
    setFormData,
    mapValue,
    setMapValue,
    handleSave,
    handleCancel,
  } = useProfilToko();

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (errorText || !store) {
    return (
      <div className="bg-red-50 text-red-600 p-6 rounded-2xl flex items-center gap-3">
        <AlertCircle size={24} />
        <div>
          <h3 className="font-bold">Terjadi Kesalahan</h3>
          <p className="text-sm">{errorText || "Gagal memuat profil toko."}</p>
        </div>
      </div>
    );
  }

  const t = store;

  const statusConfig: Record<string, { color: string; label: string }> = {
    ACTIVE: { color: "bg-emerald-500", label: "Aktif" },
    PENDING: { color: "bg-amber-500", label: "Menunggu" },
    INACTIVE: { color: "bg-gray-400", label: "Nonaktif" },
    SUSPENDED: { color: "bg-red-500", label: "Ditangguhkan" },
  };
  const stStatus = statusConfig[t.status || ""] || statusConfig["ACTIVE"];

  return (
    <div className="relative">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-[200] bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-slide-down">
          <CheckCircle size={16} className="text-emerald-400" />
          {toast}
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 flex items-center gap-2">
            <Store size={24} className="text-emerald-600" /> Profil Toko
          </h1>
          <p className="text-sm text-gray-500">
            Kelola informasi dan lokasi toko Anda
          </p>
        </div>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-all shadow-sm"
          >
            <Edit2 size={15} /> Edit Profil
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-all"
            >
              <X size={15} /> Batal
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-all disabled:opacity-60"
            >
              {saving ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Save size={15} />
              )}
              Simpan
            </button>
          </div>
        )}
      </div>

      {/* Store Header Card */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-6 text-white mb-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-8 -right-8 w-48 h-48 bg-white rounded-full" />
          <div className="absolute -bottom-12 right-24 w-32 h-32 bg-white rounded-full" />
        </div>
        <div className="relative flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl backdrop-blur-sm shadow-inner overflow-hidden flex-shrink-0 border-2 border-white/30">
            {t.fotoUrl ? (
              <div className="relative w-full h-full">
                <Image
                  src={t.fotoUrl}
                  alt={t.nama || "Toko"}
                  fill
                  sizes="64px"
                  className="object-cover"
                  unoptimized
                />
              </div>
            ) : (
              "🏪"
            )}
          </div>
          <div>
            <h2 className="font-display font-bold text-2xl line-clamp-1">
              {t.nama}
            </h2>
            <div className="flex items-center gap-2 text-emerald-100 text-sm mt-1">
              <MapPin size={14} />
              <span>
                {t.kabupaten || "Hanya Online"}
                {t.wilayah ? ` · ${t.wilayah}` : ""}
              </span>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${stStatus.color}`} />
            <span className="text-sm font-semibold text-white/90">
              {stStatus.label}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              icon: <Package size={18} />,
              val: t.totalProduk ?? 0,
              label: "Produk",
            },
            {
              icon: <ShoppingBag size={18} />,
              val: t.totalPesanan ?? 0,
              label: "Pesanan",
            },
            { icon: <Star size={18} />, val: t.rating ?? 0, label: "Rating" },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white/15 rounded-xl p-3 text-center backdrop-blur-sm"
            >
              <div className="flex justify-center mb-1">{s.icon}</div>
              <p className="text-xl font-bold">{s.val}</p>
              <p className="text-xs text-emerald-200">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Info Toko */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
              <Store size={18} className="text-emerald-600" />
              Informasi Toko
            </h3>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="namaToko"
                  className="text-xs text-gray-500 block mb-1 font-semibold uppercase tracking-wide"
                >
                  Nama Toko
                </label>
                {isEditing ? (
                  <input
                    id="namaToko"
                    type="text"
                    value={formData.nama}
                    onChange={(e) =>
                      setFormData((f) => ({ ...f, nama: e.target.value }))
                    }
                    className="w-full px-4 py-3 border border-emerald-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-300 focus:border-emerald-500 outline-none"
                  />
                ) : (
                  <p className="text-sm font-medium text-gray-800 px-4 py-3 bg-gray-50 rounded-xl">
                    {t.nama}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="descToko"
                  className="text-xs text-gray-500 block mb-1 font-semibold uppercase tracking-wide"
                >
                  Deskripsi Toko
                </label>
                {isEditing ? (
                  <textarea
                    id="descToko"
                    value={formData.deskripsi}
                    onChange={(e) =>
                      setFormData((f) => ({ ...f, deskripsi: e.target.value }))
                    }
                    rows={3}
                    placeholder="Tulis sedikit tentang toko Anda..."
                    className="w-full px-4 py-3 border border-emerald-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-300 focus:border-emerald-500 outline-none resize-none"
                  />
                ) : (
                  <p className="text-sm text-gray-600 px-4 py-3 bg-gray-50 rounded-xl min-h-[72px]">
                    {t.deskripsi || "—"}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="jamOperasional"
                  className="text-xs text-gray-500 block mb-1 font-semibold uppercase tracking-wide flex items-center gap-1"
                >
                  <Clock size={11} /> Jam Operasional
                </label>
                {isEditing ? (
                  <input
                    id="jamOperasional"
                    type="text"
                    value={formData.jamOperasional}
                    onChange={(e) =>
                      setFormData((f) => ({
                        ...f,
                        jamOperasional: e.target.value,
                      }))
                    }
                    placeholder="06:00 - 18:00"
                    className="w-full px-4 py-3 border border-emerald-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-300 focus:border-emerald-500 outline-none"
                  />
                ) : (
                  <p className="text-sm font-medium text-gray-800 px-4 py-3 bg-gray-50 rounded-xl">
                    {t.jamOperasional || "—"}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Kontak */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
              <Phone size={18} className="text-emerald-600" />
              Kontak &amp; Info
            </h3>
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="telp"
                  className="text-xs text-gray-500 block mb-1 font-semibold uppercase tracking-wide"
                >
                  No. Telepon
                </label>
                {isEditing ? (
                  <input
                    id="telp"
                    type="tel"
                    value={formData.telepon}
                    onChange={(e) =>
                      setFormData((f) => ({ ...f, telepon: e.target.value }))
                    }
                    placeholder="08xxxxxxxxxx"
                    className="w-full px-4 py-3 border border-emerald-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-300 focus:border-emerald-500 outline-none"
                  />
                ) : (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <Phone
                      size={18}
                      className="text-emerald-600 flex-shrink-0"
                    />
                    <p className="font-medium text-sm">
                      {t.telepon || t.noHp || t.noSewa || "—"}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <Mail size={18} className="text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="font-medium text-sm">{t.email || "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <FileText
                  size={18}
                  className="text-emerald-600 flex-shrink-0"
                />
                <div>
                  <p className="text-xs text-gray-500">SIUP / Izin Usaha</p>
                  <p className="font-mono font-medium text-sm">
                    {t.nomorSIUP || "—"}
                  </p>
                </div>
                {t.nomorSIUP && (
                  <span className="ml-auto px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] uppercase font-bold rounded">
                    Terdaftar
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Total Penjualan */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 p-6">
            <h3 className="font-display font-semibold text-lg mb-1">
              Total Penjualan
            </h3>
            <p className="text-3xl font-display font-bold text-emerald-700">
              {formatRupiah(t.totalPenjualan || 0)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Omset kumulatif sejak bergabung
            </p>
          </div>
        </div>

        {/* Right: Lokasi Toko */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
              <MapPin size={18} className="text-emerald-600" />
              Lokasi Toko
            </h3>

            {isEditing ? (
              <div className="space-y-4">
                <Suspense
                  fallback={
                    <div className="h-60 bg-gray-100 rounded-2xl animate-pulse" />
                  }
                >
                  <MapPicker
                    value={mapValue}
                    onChange={(val) => {
                      setMapValue(val);
                      if (val.displayName && !formData.alamat) {
                        setFormData((f) => ({
                          ...f,
                          alamat: val.displayName!,
                        }));
                      }
                    }}
                    height="260px"
                    placeholder="Cari lokasi toko..."
                  />
                </Suspense>
                <div>
                  <label
                    htmlFor="alamatToko"
                    className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1 block"
                  >
                    Alamat Lengkap Toko
                  </label>
                  <textarea
                    id="alamatToko"
                    value={formData.alamat}
                    onChange={(e) =>
                      setFormData((f) => ({ ...f, alamat: e.target.value }))
                    }
                    rows={3}
                    placeholder="Nama jalan, blok, RT/RW, kelurahan..."
                    className="w-full px-4 py-3 border border-emerald-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-300 focus:border-emerald-500 outline-none resize-none"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-xl">
                  <MapPin
                    size={16}
                    className="text-emerald-600 mt-0.5 flex-shrink-0"
                  />
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {t.alamat || "Alamat belum diset"}
                  </p>
                </div>

                {/* Map Preview */}
                {t.lat && t.lng ? (
                  <div className="rounded-2xl overflow-hidden border border-gray-200 h-52 relative">
                    <iframe
                      title="store-map-preview"
                      width="100%"
                      height="100%"
                      style={{ border: 0, pointerEvents: "none" }}
                      loading="lazy"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${t.lng - 0.008}%2C${t.lat - 0.005}%2C${t.lng + 0.008}%2C${t.lat + 0.005}&layer=mapnik&marker=${t.lat}%2C${t.lng}`}
                    />
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${t.lat}&mlon=${t.lng}#map=16/${t.lat}/${t.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm text-xs font-semibold text-emerald-600 px-3 py-1.5 rounded-lg shadow border border-emerald-100 hover:bg-emerald-50 transition-colors"
                    >
                      Buka di Maps ↗
                    </a>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="rounded-2xl border-2 border-dashed border-emerald-200 h-40 w-full flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-emerald-50 transition-colors"
                  >
                    <MapPin size={28} className="text-emerald-300" />
                    <p className="text-sm text-gray-400 font-medium">
                      Klik Edit Profil untuk menambah lokasi
                    </p>
                    <p className="text-xs text-gray-300">
                      Powered by OpenStreetMap
                    </p>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilTokoPage;
