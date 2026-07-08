"use client";

import React, { useState, useEffect } from "react";
import {
  Loader2,
  Trash2,
  Image as ImageIcon,
  Folder,
  AlertCircle,
  Trash,
} from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";

import { apiClient, formatTanggal } from "@/lib/ecommerce-api";

interface PhotoItem {
  name: string;
  url: string;
  size: number;
  createdAt: string;
}

const formatBytes = (bytes: number, decimals = 2) => {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

export default function KelolaFotoPage() {
  const folders = [
    { id: "produk", label: "Produk" },
    { id: "kurir", label: "Kurir" },
    { id: "pesanan", label: "Pesanan" },
    { id: "temp", label: "Temporary (Sampah)" },
  ];

  const [activeFolder, setActiveFolder] = useState(folders[0].id);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [cleaning, setCleaning] = useState(false);

  const fetchPhotos = async (folder: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await apiClient.get(`/upload/admin/list?folder=${folder}`);
      setPhotos(res.data?.data || []);
    } catch (err: any) {
      setError("Gagal memuat foto dari server.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotos(activeFolder);
  }, [activeFolder]);

  const handleDelete = async (fileName: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus foto ${fileName}?`)) return;

    setDeleteLoading(fileName);
    try {
      await apiClient.delete(
        `/upload/admin/file?folder=${activeFolder}&fileName=${fileName}`,
      );
      toast.success("Foto berhasil dihapus");
      setPhotos(photos.filter((p) => p.name !== fileName));
    } catch (err: any) {
      toast.error("Gagal menghapus foto");
      console.error(err);
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleCleanFolder = async () => {
    if (
      !confirm(
        `PERINGATAN: Apakah Anda yakin ingin menghapus SEMUA file di folder ${activeFolder}? Aksi ini tidak dapat dibatalkan.`,
      )
    )
      return;

    setCleaning(true);
    try {
      const res = await apiClient.delete(
        `/upload/admin/clean-folder?folder=${activeFolder}`,
      );
      toast.success(res.data?.message || "Folder berhasil dibersihkan");
      setPhotos([]);
    } catch (err: any) {
      toast.error("Gagal membersihkan folder");
      console.error(err);
    } finally {
      setCleaning(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col gap-2 border-b border-slate-100 pb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <ImageIcon className="text-emerald-600" />
          Kelola Foto
        </h1>
        <p className="text-sm text-slate-500">
          Kelola semua file foto yang diunggah ke server, termasuk foto produk,
          bukti pengiriman kurir, dan foto kondisi pesanan dari seller.
        </p>
      </div>

      {/* Actions & Folders Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-none w-full sm:w-auto">
          {folders.map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFolder(f.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeFolder === f.id
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                  : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Folder size={16} />
              {f.label}
            </button>
          ))}
        </div>

        {activeFolder === "temp" && photos.length > 0 && (
          <button
            onClick={handleCleanFolder}
            disabled={cleaning || loading}
            className="flex items-center gap-2 px-4 py-2 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 whitespace-nowrap"
          >
            {cleaning ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Trash size={16} />
            )}
            Bersihkan Folder Temp
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="animate-spin text-emerald-600" size={32} />
        </div>
      ) : error ? (
        <div className="bg-rose-50 text-rose-600 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} />
          <p>{error}</p>
        </div>
      ) : photos.length === 0 ? (
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-10 text-center flex flex-col items-center justify-center text-slate-400">
          <ImageIcon size={48} className="mb-4 opacity-50" />
          <h3 className="text-lg font-semibold text-slate-600 mb-1">
            Folder Kosong
          </h3>
          <p className="text-sm">Belum ada foto yang diunggah ke folder ini.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {photos.map((photo) => (
            <div
              key={photo.name}
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden group hover:shadow-md hover:border-emerald-200 transition-all"
            >
              <div className="relative aspect-square bg-slate-100">
                <Image
                  src={`/api/proxy${photo.url}`}
                  alt={photo.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={() => handleDelete(photo.name)}
                    disabled={deleteLoading === photo.name}
                    className="p-2 bg-rose-500 hover:bg-rose-600 text-white rounded-full transition-colors disabled:opacity-50"
                    title="Hapus Foto"
                  >
                    {deleteLoading === photo.name ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                </div>
              </div>
              <div className="p-3 text-xs">
                <p
                  className="font-semibold text-slate-800 truncate"
                  title={photo.name}
                >
                  {photo.name}
                </p>
                <div className="flex items-center justify-between mt-1 text-slate-500">
                  <span>{formatBytes(photo.size)}</span>
                  <span>{formatTanggal(photo.createdAt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
