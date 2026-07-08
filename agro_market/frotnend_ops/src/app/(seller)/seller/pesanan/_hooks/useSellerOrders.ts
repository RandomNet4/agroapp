import { useState, useEffect, useCallback } from "react";

import { storesApi, ordersApi, shippingApi } from "@/lib/ecommerce-api";

export interface OrderItem {
  id: string;
  status: string;
  totalHarga: number | string;
  metodeBayar: string;
  createdAt: string;
  customer?: { name?: string; email?: string };
  penerima?: string;
  pembeli?: string;
  alamatKirim?: string;
  items?: Array<{
    product?: {
      nama: string;
      gambarUrl?: string;
      namaEtalase?: string;
      satuan?: string;
    };
    jumlah: number | string;
    harga: number | string;
  }>;
  shipping?: {
    status: string;
    trackingHistory?: Array<{ status: string }>;
    kurirName?: string;
    kurirPhone?: string;
    kurirPenggunaId?: string;
  };
}

export const useSellerOrders = () => {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [myStore, setMyStore] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchOrders = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const storeRes = await storesApi.getMyStore();
      const storeData = storeRes?.data?.data || storeRes?.data;
      if (!storeData?.id) {
        setErrorText("Toko tidak ditemukan.");
        return;
      }
      setMyStore(storeData);
      const ordersRes = await ordersApi.sellerGetOrders(storeData.id);
      const rawList =
        ordersRes?.data?.data?.data ||
        ordersRes?.data?.data ||
        ordersRes?.data ||
        [];

      const list = Array.isArray(rawList)
        ? rawList.map((o: any) => ({
            ...o,
            shipping: o.shipping || o.pengiriman,
            items: (o.items || o.item || []).map((it: any) => ({
              ...it,
              product: it.product || it.produk,
            })),
          }))
        : [];

      setOrders(list);
    } catch (err) {
      console.error(err);
      setErrorText("Gagal memuat pesanan.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders(true);

    // SSE Real-time Updates for Seller Orders
    let eventSource: EventSource | null = null;
    let retryTimeout: NodeJS.Timeout | null = null;

    const connectSSE = () => {
      eventSource = new EventSource("/api/proxy/ecom-pesanan/stream", {
        withCredentials: true,
      });

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          // Skip heartbeat pings — they are just keep-alive signals, not real updates
          if (payload?.type === "heartbeat") return;
          console.log("[SSE] Seller Order Update received:", payload);
          fetchOrders(false);
        } catch {
          // Ignore parse errors on non-JSON frames
        }
      };

      eventSource.onerror = () => {
        // Silently close — backend may be unavailable, retry after delay
        eventSource?.close();
        retryTimeout = setTimeout(connectSSE, 30000); // retry in 30s
      };
    };

    connectSSE();

    return () => {
      eventSource?.close();
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [fetchOrders]);

  const handleInitShipping = async (orderId: string) => {
    if (!myStore?.courierStaff) {
      throw new Error(
        "Gudang Anda belum didaftarkan Kurir oleh Admin. Hubungi Admin Pusat untuk menugaskan kurir ke gudang Anda.",
      );
    }
    setActionLoading("init");
    try {
      await shippingApi.init(orderId);
      await fetchOrders();
    } finally {
      setActionLoading(null);
    }
  };

  const handleAdvanceStatus = async (
    orderId: string,
    note: string,
    kurirId?: string,
    sendEmailNotification?: boolean,
  ) => {
    setActionLoading("advance");
    try {
      const payload: any = { note, sendEmailNotification };
      if (kurirId) {
        // Find selected courier details
        const selectedCourier =
          myStore?.kurirStaffs?.find((c: any) => c.id === kurirId) ||
          (myStore?.courierStaff?.id === kurirId ? myStore.courierStaff : null);
        if (selectedCourier) {
          payload.kurirPenggunaId = selectedCourier.id;
          payload.kurirName =
            selectedCourier.nama || selectedCourier.name || "Kurir Toko";
          payload.kurirPhone =
            selectedCourier.noTelepon ||
            selectedCourier.phoneNumber ||
            undefined;
        }
      }
      await shippingApi.advance(orderId, payload);
      await fetchOrders();
    } finally {
      setActionLoading(null);
    }
  };

  return {
    orders,
    loading,
    errorText,
    myStore,
    actionLoading,
    fetchOrders,
    handleInitShipping,
    handleAdvanceStatus,
  };
};
