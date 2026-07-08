"use client";

import React, { useState, useEffect } from "react";
import {
  Loader2,
  Image as ImageIcon,
  Plus,
  Trash2,
  Edit2,
  ArrowUp,
  ArrowDown,
  ExternalLink,
} from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";

import { bannerApi, apiClient } from "@/lib/ecommerce-api";

interface Banner {
  id: string;
  judul: string;
  subjudul?: string;
  imageUrl?: string;
  gradient?: string;
  linkUrl?: string;
  urutan: number;
  isAktif: boolean;
}

const GRADIENTS = [
  {
    value: "bg-gradient-to-br from-green-600 to-emerald-800",
    label: "Green Emerald",
  },
  {
    value: "bg-gradient-to-bl from-teal-600 to-green-800",
    label: "Teal Green",
  },
  {
    value: "bg-gradient-to-r from-emerald-500 to-teal-500",
    label: "Bright Emerald",
  },
  {
    value: "bg-gradient-to-r from-green-500 to-green-700",
    label: "Forest Green",
  },
];

export default function AdminBannerPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);

  // Form State
  const [judul, setJudul] = useState("");
  const [subjudul, setSubjudul] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [gradient, setGradient] = useState(GRADIENTS[0].value);
  const [isAktif, setIsAktif] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchBanners = async () => {
    setLoading(true);
    try {
      const res = await bannerApi.getAdminBanners();
      setBanners(res.data?.data || []);
    } catch (err) {
      toast.error("Gagal memuat banner");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleOpenModal = (banner?: Banner) => {
    if (banner) {
      setEditingBanner(banner);
      setJudul(banner.judul);
      setSubjudul(banner.subjudul || "");
      setLinkUrl(banner.linkUrl || "");
      setGradient(banner.gradient || GRADIENTS[0].value);
      setIsAktif(banner.isAktif);
      setImagePreview(banner.imageUrl ? `/api/proxy${banner.imageUrl}` : null);
      setImageFile(null);
    } else {
      setEditingBanner(null);
      setJudul("");
      setSubjudul("");
      setLinkUrl("");
      setGradient(GRADIENTS[0].value);
      setIsAktif(true);
      setImagePreview(null);
      setImageFile(null);
    }
    setIsModalOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Ukuran maksimal 5MB");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let finalImageUrl = editingBanner?.imageUrl;

      // Upload image first if new file is selected
      if (imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);
        const uploadRes = await apiClient.post(
          "/upload/banner/gambar",
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          },
        );
        finalImageUrl = uploadRes.data?.data?.url;
      }

      const payload = {
        judul,
        subjudul,
        linkUrl,
        gradient,
        isAktif,
        imageUrl: finalImageUrl,
      };

      if (editingBanner) {
        await bannerApi.updateBanner(editingBanner.id, payload);
        toast.success("Banner diperbarui");
      } else {
        await bannerApi.createBanner(payload);
        toast.success("Banner ditambahkan");
      }

      setIsModalOpen(false);
      fetchBanners();
    } catch (err) {
      toast.error("Gagal menyimpan banner");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus banner ini?")) return;
    try {
      await bannerApi.deleteBanner(id);
      toast.success("Banner dihapus");
      fetchBanners();
    } catch (err) {
      toast.error("Gagal menghapus");
    }
  };

  const handleReorder = async (index: number, direction: "up" | "down") => {
    const newBanners = [...banners];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newBanners.length) return;

    // Swap
    const temp = newBanners[index];
    newBanners[index] = newBanners[targetIndex];
    newBanners[targetIndex] = temp;

    setBanners(newBanners);

    // Save to server
    try {
      await bannerApi.reorderBanners(newBanners.map((b) => b.id));
      toast.success("Urutan diperbarui");
    } catch (err) {
      toast.error("Gagal memperbarui urutan");
      fetchBanners(); // revert
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="animate-spin text-emerald-600" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ImageIcon className="text-emerald-600" />
            Kelola Banner Promo
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Atur banner yang tampil di halaman utama aplikasi pengguna.
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-emerald-600/20"
        >
          <Plus size={18} />
          Tambah Banner
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-xs">
              <tr>
                <th className="p-4">Preview</th>
                <th className="p-4">Detail</th>
                <th className="p-4">Link URL</th>
                <th className="p-4 text-center">Urutan</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {banners.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Belum ada banner. Silakan tambah baru.
                  </td>
                </tr>
              ) : (
                banners.map((banner, idx) => (
                  <tr key={banner.id} className="hover:bg-slate-50">
                    <td className="p-4">
                      {banner.imageUrl ? (
                        <div className="relative w-32 h-16 rounded-lg overflow-hidden bg-slate-100">
                          <Image
                            src={`/api/proxy${banner.imageUrl}`}
                            alt={banner.judul}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div
                          className={`w-32 h-16 rounded-lg ${banner.gradient} flex items-center justify-center`}
                        >
                          <span className="text-white/50 text-xs font-semibold">
                            GRADIENT
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="p-4 max-w-[200px]">
                      <div
                        className="font-semibold text-slate-800 truncate"
                        title={banner.judul}
                      >
                        {banner.judul}
                      </div>
                      <div
                        className="text-xs text-slate-500 truncate"
                        title={banner.subjudul || ""}
                      >
                        {banner.subjudul || "-"}
                      </div>
                    </td>
                    <td className="p-4">
                      {banner.linkUrl ? (
                        <a
                          href={banner.linkUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-600 hover:underline flex items-center gap-1 text-xs"
                        >
                          {banner.linkUrl.substring(0, 30)}...{" "}
                          <ExternalLink size={12} />
                        </a>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleReorder(idx, "up")}
                          disabled={idx === 0}
                          className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-30 transition-colors"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <span className="w-6 font-semibold">{idx + 1}</span>
                        <button
                          onClick={() => handleReorder(idx, "down")}
                          disabled={idx === banners.length - 1}
                          className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-30 transition-colors"
                        >
                          <ArrowDown size={14} />
                        </button>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-bold ${banner.isAktif ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                      >
                        {banner.isAktif ? "AKTIF" : "NONAKTIF"}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(banner)}
                          className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(banner.id)}
                          className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors"
                          title="Hapus"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-bold text-slate-800">
                {editingBanner ? "Edit Banner" : "Tambah Banner"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-grow">
              <form id="bannerForm" onSubmit={handleSave} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Foto Banner (Opsional)
                  </label>
                  <p className="text-xs text-slate-500 mb-2">
                    Jika tidak diunggah, akan menggunakan warna gradien. Format:
                    PNG/JPG/WebP, Maks 5MB.
                  </p>

                  {imagePreview ? (
                    <div className="relative w-full h-32 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 mb-3 group">
                      <Image
                        src={imagePreview}
                        alt="Preview"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => {
                            setImageFile(null);
                            setImagePreview(null);
                            if (editingBanner)
                              editingBanner.imageUrl = undefined;
                          }}
                          className="px-3 py-1 bg-white text-rose-600 text-sm font-semibold rounded-lg"
                        >
                          Hapus Foto
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`w-full h-32 rounded-xl mb-3 ${gradient} flex flex-col items-center justify-center border border-slate-200`}
                    >
                      <span className="text-white font-bold mb-1">
                        Preview Fallback
                      </span>
                    </div>
                  )}

                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={handleImageChange}
                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Warna Gradien Default
                  </label>
                  <select
                    value={gradient}
                    onChange={(e) => setGradient(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                  >
                    {GRADIENTS.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Judul Utama <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={judul}
                    onChange={(e) => setJudul(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                    placeholder="Contoh: Promo Spesial Petani Lokal 70%"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Subjudul
                  </label>
                  <input
                    type="text"
                    value={subjudul}
                    onChange={(e) => setSubjudul(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                    placeholder="Contoh: Diskon besar-besaran..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Link URL Tujuan
                  </label>
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                    placeholder="Contoh: https://..."
                  />
                </div>

                <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAktif}
                      onChange={(e) => setIsAktif(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
                  </label>
                  <span className="text-sm font-semibold text-slate-700">
                    Banner Aktif Tampil di Aplikasi
                  </span>
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
                disabled={saving}
              >
                Batal
              </button>
              <button
                type="submit"
                form="bannerForm"
                disabled={saving}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 disabled:opacity-70"
              >
                {saving && <Loader2 size={18} className="animate-spin" />}
                {saving ? "Menyimpan..." : "Simpan Banner"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
