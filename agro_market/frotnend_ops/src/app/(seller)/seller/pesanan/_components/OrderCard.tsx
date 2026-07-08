import React from "react";
import Image from "next/image";
import { Truck, ChevronRight, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";

import { formatRupiah, formatTanggal } from "@/lib/ecommerce-api";

import { OrderItem } from "../_hooks/useSellerOrders";
import {
  getStatusColor,
  getStatusLabel,
  getNextStatus,
} from "../../_utils/shipping-status";

interface OrderCardProps {
  order: OrderItem;
  onInitShipping: (order: OrderItem) => void;
  onAdvanceStatus: (order: OrderItem) => void;
}

const OrderCard: React.FC<OrderCardProps> = ({
  order,
  onInitShipping,
  onAdvanceStatus,
}) => {
  const router = useRouter();
  const shipping = order.shipping;
  const nextStatus = shipping ? getNextStatus(shipping.status) : null;
  const history = Array.isArray(shipping?.trackingHistory)
    ? shipping.trackingHistory
    : [];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 pb-4 border-b border-gray-50">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-gray-900">
              {order.penerima ||
                order.customer?.name ||
                order.customer?.email ||
                order.pembeli ||
                "Pelanggan"}
            </p>
            <span
              className={`px-2.5 py-1 rounded-md text-[10px] uppercase font-medium tracking-wider ${getStatusColor(order.status)}`}
            >
              {order.status}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
            ID: <span className="font-mono">{order.id.slice(0, 8)}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(order.id);
              }}
              className="text-gray-400 hover:text-emerald-600 transition-colors"
              title="Salin ID Pesanan"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </button>
            • {formatTanggal(order.createdAt)}
          </p>
        </div>
        <div className="mt-2 sm:mt-0 text-right">
          <p className="font-medium text-lg text-emerald-600">
            {formatRupiah(Number(order.totalHarga || 0))}
          </p>
          <p className="text-[10px] text-gray-400">
            Metode: {order.metodeBayar}
          </p>
        </div>
      </div>

      {/* Items — produk yang dibeli */}
      <div className="space-y-2 mb-4">
        {order.items && order.items.length > 0 ? (
          <>
            {order.items.slice(0, 3).map((item, i: number) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-50 rounded-xl overflow-hidden flex items-center justify-center text-base flex-shrink-0 border border-gray-100">
                  {item.product?.gambarUrl ? (
                    <div className="relative w-full h-full">
                      <Image
                        src={item.product.gambarUrl}
                        alt={item.product.nama || "Produk"}
                        fill
                        sizes="40px"
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  ) : (
                    "📦"
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {item.product?.namaEtalase || item.product?.nama || "—"}
                  </p>
                  <p className="text-xs text-gray-400">
                    {item.jumlah} {item.product?.satuan || "kg"} ×{" "}
                    {formatRupiah(Number(item.harga))}
                  </p>
                </div>
                <p className="text-xs font-bold text-gray-700 whitespace-nowrap">
                  {formatRupiah(Number(item.jumlah) * Number(item.harga))}
                </p>
              </div>
            ))}
            {order.items.length > 3 && (
              <p className="text-xs text-gray-400 pl-13">
                +{order.items.length - 3} produk lainnya
              </p>
            )}
          </>
        ) : (
          <p className="text-xs text-gray-400 italic">
            Data produk tidak tersedia
          </p>
        )}
      </div>

      {/* Address */}
      <div className="bg-gray-50 p-3 rounded-xl mb-4 text-xs">
        <span className="text-gray-500 font-medium">Alamat: </span>
        <span className="font-normal text-gray-700">{order.alamatKirim}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-2 flex-wrap">
        {order.status === "DIPROSES" && !shipping && (
          <button
            onClick={() => onInitShipping(order)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-xl hover:bg-blue-700 transition-all"
          >
            <Truck size={14} /> Proses Pengiriman
          </button>
        )}
        {shipping && nextStatus && (
          <button
            onClick={() => onAdvanceStatus(order)}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-medium rounded-xl hover:bg-emerald-700 transition-all"
          >
            <ChevronRight size={14} /> {getStatusLabel(nextStatus)}
          </button>
        )}
        {shipping?.status === "ARRIVED" && order.status !== "SELESAI" && (
          <span className="text-xs text-amber-600 font-medium">
            ⏳ Menunggu konfirmasi pembeli
          </span>
        )}
        {order.status === "SELESAI" && (
          <button
            onClick={() => router.push(`/seller/pesanan/${order.id}`)}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white text-xs font-semibold rounded-xl hover:bg-amber-600 transition-all"
          >
            <CheckCircle size={14} /> Cek & Konfirmasi
          </button>
        )}
        {order.status === "DITUTUP" && (
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
            <CheckCircle size={12} /> Ditutup
          </span>
        )}
        {shipping?.kurirPenggunaId && (
          <button
            onClick={() =>
              router.push(`/seller/kurir/${shipping.kurirPenggunaId}`)
            }
            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-medium rounded-xl hover:bg-gray-50 transition-all flex items-center gap-1.5"
          >
            <Truck size={14} /> Aktivitas Kurir
          </button>
        )}
        <button
          onClick={() => router.push(`/seller/pesanan/${order.id}`)}
          className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-medium rounded-xl hover:bg-gray-50 transition-all"
        >
          Lihat Detail
        </button>
      </div>
    </div>
  );
};

export default OrderCard;
