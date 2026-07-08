import React from "react";
import { Truck, X, Loader2 } from "lucide-react";

import { OrderItem } from "../_hooks/useSellerOrders";

interface InitShippingModalProps {
  order: OrderItem | null;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}

const InitShippingModal: React.FC<InitShippingModalProps> = ({
  order,
  onClose,
  onConfirm,
  loading,
}) => {
  if (!order) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
        role="button"
        tabIndex={0}
        aria-label="Tutup"
      />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">🚚 Proses Pengiriman</h3>
            <button onClick={onClose}>
              <X size={18} />
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            Order ID:{" "}
            <span className="font-mono font-semibold">
              {order.id.slice(0, 12)}...
            </span>
          </p>
          <div className="space-y-3">
            <p className="text-sm text-gray-700 mb-4">
              Apakah Anda yakin ingin menyiapkan pesanan ini? Status pesanan
              akan berubah menjadi <b>Sedang Disiapkan</b> dan diteruskan ke
              daftar tugas Kurir.
            </p>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-3 transition-colors"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin shrink-0" />
              ) : (
                <Truck size={20} className="shrink-0" />
              )}
              <div className="flex flex-col items-start leading-tight text-left">
                <span>Mulai Proses Pengiriman</span>
                <span className="text-xs font-normal text-blue-100 mt-0.5">
                  Status: Sedang Disiapkan
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default InitShippingModal;
