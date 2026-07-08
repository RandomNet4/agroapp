"use client";

import { useState } from "react";
import { ClipboardList, AlertCircle, Loader2, Package } from "lucide-react";

import { useSellerOrders, OrderItem } from "./_hooks/useSellerOrders";
import OrderCard from "./_components/OrderCard";
import InitShippingModal from "./_components/InitShippingModal";
import AdvanceStatusModal from "./_components/AdvanceStatusModal";

export default function PesananMasukPage() {
  const [filterStatus, setFilterStatus] = useState("semua");
  const {
    orders,
    loading,
    errorText,
    myStore,
    actionLoading,
    handleInitShipping,
    handleAdvanceStatus,
  } = useSellerOrders();

  // Modal states
  const [initModalOrder, setInitModalOrder] = useState<OrderItem | null>(null);
  const [advanceModalOrder, setAdvanceModalOrder] = useState<OrderItem | null>(
    null,
  );

  const statusList = [
    { id: "semua", label: "Aktif" },
    { id: "MENUNGGU_BAYAR", label: "Belum Bayar" },
    { id: "DIPROSES", label: "Diproses" },
    { id: "DIKIRIM", label: "Dikirim" },
    { id: "TIBA", label: "Tiba" },
    { id: "SELESAI", label: "Selesai" },
    { id: "DIBATALKAN", label: "Dibatalkan" },
    { id: "DITUTUP", label: "Riwayat" },
  ];

  const filtered = orders.filter((p) => {
    if (filterStatus === "semua") {
      // Hanya tampilkan pesanan aktif (bukan selesai/dibatalkan/ditutup)
      return !["SELESAI", "DIBATALKAN", "DITUTUP"].includes(p.status);
    }
    if (filterStatus === "TIBA") {
      return p.shipping?.status === "ARRIVED";
    }
    if (filterStatus === "DIKIRIM") {
      return p.status === "DIKIRIM" && p.shipping?.status !== "ARRIVED";
    }
    return p.status === filterStatus;
  });

  if (loading)
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );

  if (errorText)
    return (
      <div className="bg-rose-50/50 text-rose-700 p-6 rounded-2xl flex items-center gap-3 border border-rose-100/60 shadow-sm max-w-2xl mx-auto mt-10">
        <AlertCircle size={20} />
        <div>
          <h3 className="font-medium text-sm">Terjadi Kesalahan</h3>
          <p className="text-xs text-rose-600 mt-0.5">{errorText}</p>
        </div>
      </div>
    );

  return (
    <div className="space-y-8 w-full">
      <div className="flex flex-col gap-4 pb-6 border-b border-slate-100">
        <div className="space-y-1.5">
          <h1 className="text-2xl md:text-3xl font-medium text-slate-800 flex items-center gap-2">
            <ClipboardList size={24} className="text-emerald-600" /> Pesanan
            Masuk
          </h1>
          <p className="text-xs md:text-sm text-slate-500 font-medium">
            Kelola pesanan dan status pengiriman pelanggan retail Anda.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none py-1.5">
          {statusList.map((tab) => {
            const count =
              tab.id === "semua"
                ? orders.filter(
                    (p) =>
                      !["SELESAI", "DIBATALKAN", "DITUTUP"].includes(p.status),
                  ).length
                : tab.id === "TIBA"
                  ? orders.filter((p) => p.shipping?.status === "ARRIVED")
                      .length
                  : tab.id === "DIKIRIM"
                    ? orders.filter(
                        (p) =>
                          p.status === "DIKIRIM" &&
                          p.shipping?.status !== "ARRIVED",
                      ).length
                    : orders.filter((p) => p.status === tab.id).length;
            const isActive = filterStatus === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all duration-200 hover:-translate-y-0.5 active:scale-95 ${
                  isActive
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-100"
                    : "bg-white text-gray-500 border-gray-100 hover:bg-gray-50 hover:border-gray-200 hover:text-gray-700"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium transition-colors ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-3xl py-20 text-center shadow-sm border border-slate-100 max-w-xl mx-auto space-y-4">
            <Package className="mx-auto text-slate-300 w-16 h-16" />
            <div className="space-y-1">
              <h3 className="font-medium text-lg text-slate-700">
                Tidak Ada Pesanan
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Belum ada pesanan masuk dengan kategori status ini.
              </p>
            </div>
          </div>
        ) : (
          filtered.map((p) => (
            <OrderCard
              key={p.id}
              order={p}
              onInitShipping={setInitModalOrder}
              onAdvanceStatus={setAdvanceModalOrder}
            />
          ))
        )}
      </div>

      {/* Modals */}
      <InitShippingModal
        order={initModalOrder}
        onClose={() => setInitModalOrder(null)}
        onConfirm={async () => {
          if (initModalOrder) {
            try {
              await handleInitShipping(initModalOrder.id);
              setInitModalOrder(null);
            } catch (err: any) {
              alert(err.message);
            }
          }
        }}
        loading={actionLoading === "init"}
      />

      <AdvanceStatusModal
        order={advanceModalOrder}
        onClose={() => setAdvanceModalOrder(null)}
        couriers={
          myStore?.kurirStaffs && myStore.kurirStaffs.length > 0
            ? myStore.kurirStaffs
            : myStore?.courierStaff
              ? [myStore.courierStaff]
              : []
        }
        onConfirm={async (note, kurirId, sendEmailNotification) => {
          if (advanceModalOrder) {
            try {
              await handleAdvanceStatus(
                advanceModalOrder.id,
                note,
                kurirId,
                sendEmailNotification,
              );
              setAdvanceModalOrder(null);
            } catch (err: any) {
              alert(err.message);
            }
          }
        }}
        loading={actionLoading === "advance"}
      />
    </div>
  );
}
