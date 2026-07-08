import React, { useState, useEffect, useRef } from "react";
import { X, Loader2, Truck, User, Upload as UploadIcon } from "lucide-react";

import { apiClient } from "@/lib/ecommerce-api";

import { OrderItem } from "../_hooks/useSellerOrders";
import {
  getNextStatus,
  getStatusIcon,
  getStatusLabel,
} from "../../_utils/shipping-status";

interface CourierItem {
  id: string;
  nama?: string;
  name?: string | null;
  noTelepon?: string | null;
  phoneNumber?: string | null;
}

interface AdvanceStatusModalProps {
  order: OrderItem | null;
  onClose: () => void;
  onConfirm: (
    note: string,
    kurirId?: string,
    sendEmailNotification?: boolean,
  ) => void;
  loading: boolean;
  couriers?: CourierItem[];
}

const AdvanceStatusModal: React.FC<AdvanceStatusModalProps> = ({
  order,
  onClose,
  onConfirm,
  loading,
  couriers = [],
}) => {
  const [note, setNote] = useState("");
  const [selectedCourierId, setSelectedCourierId] = useState("");
  const [sendEmailNotification, setSendEmailNotification] = useState(true);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const nextStatus = order ? getNextStatus(order.shipping?.status ?? "") : null;
  const isHandover = nextStatus === "PICKUP_CONFIRMATION";

  // Automatically select courier if there is only 1 available
  useEffect(() => {
    if (isHandover && couriers.length === 1) {
      setSelectedCourierId(couriers[0].id);
    }
  }, [couriers, isHandover]);

  if (!order) return null;

  const canConfirm =
    (!isHandover || (couriers.length > 0 && !!selectedCourierId)) && !uploading;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFotoFile(file);
      setFotoPreview(URL.createObjectURL(file));
    }
  };

  const handleConfirmAction = async () => {
    try {
      setUploading(true);
      let fotoUrl = undefined;

      if (fotoFile) {
        const formData = new FormData();
        formData.append("file", fotoFile);
        const uploadRes = await apiClient.post(
          "/upload/pesanan/gambar",
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          },
        );
        fotoUrl = uploadRes.data?.data?.url;
      }

      if (fotoUrl) {
        // Panggil update status order dulu dengan foto URL
        await apiClient.patch(`/ecom-pesanan/${order.id}/status`, {
          status: order.status,
          fotoSebelumKirimUrl: fotoUrl,
        });
      }

      onConfirm(
        note,
        isHandover ? selectedCourierId : undefined,
        isHandover ? sendEmailNotification : undefined,
      );
    } catch (err: any) {
      alert(
        "Gagal mengupload foto atau memperbarui pesanan: " +
          (err.message || ""),
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-in fade-in duration-250"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
        role="button"
        tabIndex={0}
        aria-label="Tutup"
      />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl w-full max-w-md p-6 lg:p-8 animate-in zoom-in-95 duration-250">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-gray-900 text-lg">
              Update Status Pengiriman
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-full transition-all"
            >
              <X size={18} />
            </button>
          </div>

          {/* Status Indicator */}
          <div className="bg-blue-50/70 border border-blue-100/50 rounded-2xl p-4 mb-5 flex items-center gap-3">
            <span className="text-2xl shrink-0">
              {getStatusIcon(nextStatus || "")}
            </span>
            <div>
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">
                Status Berikutnya
              </p>
              <p className="text-sm font-bold text-blue-900 mt-0.5">
                {getStatusLabel(nextStatus || "")}
              </p>
            </div>
          </div>

          {/* Courier Selector - Only for Handover step */}
          {isHandover && (
            <div className="border-t border-b border-slate-50 py-5 mb-5 space-y-4">
              {couriers.length === 0 ? (
                <div className="bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl p-4 text-xs font-semibold flex items-start gap-2.5">
                  <span>⚠️</span>
                  <p className="leading-relaxed">
                    Toko Anda tidak memiliki kurir terafiliasi. Silakan hubungi
                    admin pusat Agrojabar terlebih dahulu untuk menugaskan
                    kurir.
                  </p>
                </div>
              ) : couriers.length === 1 ? (
                // Auto-filled single courier display
                <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-4 flex items-center gap-3.5">
                  <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white font-extrabold text-base uppercase shrink-0">
                    {(couriers[0].nama || couriers[0].name || "K").charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 text-[8px] font-bold rounded uppercase tracking-wider">
                      Kurir Pengirim (Otomatis)
                    </span>
                    <p className="text-sm font-bold text-slate-800 mt-1 truncate">
                      {couriers[0].nama || couriers[0].name}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {couriers[0].noTelepon ||
                        couriers[0].phoneNumber ||
                        "Nomor tidak tersedia"}
                    </p>
                  </div>
                </div>
              ) : (
                // Dropdown selector for multiple couriers
                <div className="space-y-2">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">
                    Pilih Kurir Pengirim *
                  </label>
                  <div className="relative">
                    <User
                      size={16}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <select
                      value={selectedCourierId}
                      onChange={(e) => setSelectedCourierId(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 border border-slate-100 rounded-2xl text-sm outline-none bg-slate-50/50 hover:bg-slate-50/80 focus:bg-white focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 font-bold text-slate-800 transition-all cursor-pointer appearance-none"
                    >
                      <option value="" disabled>
                        -- Pilih Kurir --
                      </option>
                      {couriers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nama || c.name} (
                          {c.noTelepon || c.phoneNumber || "Tanpa nomor"})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Note Input */}
          <div className="space-y-2 mb-4">
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">
              Catatan Aktivitas
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-4 py-3.5 border border-slate-100 rounded-2xl text-sm focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 outline-none bg-slate-50/50 focus:bg-white transition-all font-medium text-slate-800"
              placeholder="Catatan (opsional, misal: diserahkan di pos 1)"
            />
          </div>

          {/* Foto Sebelum Kirim (Hanya untuk Handover) */}
          {isHandover && (
            <div className="space-y-2 mb-6">
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">
                Foto Sebelum Kirim (Opsional)
              </label>

              {!fotoPreview ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-blue-500 hover:border-blue-300 transition-all cursor-pointer"
                >
                  <UploadIcon size={24} className="mb-2" />
                  <span className="text-xs font-semibold">
                    Klik untuk upload foto pesanan
                  </span>
                </div>
              ) : (
                <div className="relative w-full h-40 rounded-2xl overflow-hidden border border-slate-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={fotoPreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => {
                      setFotoPreview(null);
                      setFotoFile(null);
                    }}
                    className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full hover:bg-red-500 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          )}

          {/* Email Notification Toggle - Only for Handover step */}
          {isHandover && couriers.length > 0 && (
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-6 flex items-center justify-between gap-4 transition-all">
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5">📧</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-800">
                    Kirim Notifikasi Email
                  </p>
                  <p className="text-[10px] text-slate-500 leading-normal mt-0.5">
                    Kirim rincian tugas pengantaran ini secara otomatis ke email
                    kurir.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSendEmailNotification(!sendEmailNotification)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  sendEmailNotification ? "bg-blue-600" : "bg-slate-200"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    sendEmailNotification ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          )}

          {/* Confirm Button */}
          <button
            onClick={handleConfirmAction}
            disabled={loading || uploading || !canConfirm}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-2xl font-bold transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-slate-100 active:scale-[0.98]"
          >
            {loading || uploading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Truck size={18} />
            )}
            Konfirmasi & Perbarui Status
          </button>
        </div>
      </div>
    </>
  );
};

export default AdvanceStatusModal;
