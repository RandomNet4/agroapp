"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  MapPin,
  Clock,
  Phone,
  ArrowLeft,
  Package,
  ShoppingBag,
  Info,
  CalendarDays,
  Truck,
  Building2,
  Star,
  Loader2,
  AlertCircle,
} from "lucide-react";
import Image from "next/image";

import {
  storesApi,
  productsApi,
  ordersApi,
  formatTanggal,
  formatRupiah,
} from "@/lib/ecommerce-api";

interface StoreItem {
  id: string;
  nama: string;
  status: string;
  kabupaten?: string;
  wilayah?: string;
  lat?: number;
  lng?: number;
  telepon?: string;
  jamOperasional?: string;
  alamat?: string;
  createdAt?: string;
  courierStaff?: { name: string };
  warehouseAdmin?: { name: string };
}

interface ProductItem {
  id: string;
  nama: string;
  harga: number;
  status: string;
  gambarBase64?: string;
  gambarUtama?: string;
  gambarUrl?: string;
  fotoLainnya?: string[];
  stok?: number;
  rating?: number;
  grades?: Array<{ grade: string; stok: number }>;
}

interface OrderItem {
  id: string;
  createdAt: string;
  customer?: { name: string };
  user?: { name: string };
  totalAmount?: number;
  totalHarga?: number;
  status: string;
  orders?: { tokoId: string }[];
  tokoId?: string;
  items?: { product?: { tokoId: string } }[];
}

const stockHistoryMock = [
  {
    id: 1,
    tgl: new Date().toISOString(),
    produk: "Beras Premium Cianjur",
    tipe: "MASUK",
    qty: 500,
    note: "Restock dari Gudang Pusat",
  },
  {
    id: 2,
    tgl: new Date(Date.now() - 86400000).toISOString(),
    produk: "Minyak Goreng Kita 1L",
    tipe: "MASUK",
    qty: 200,
    note: "Pengiriman Rutin Mingguan",
  },
  {
    id: 3,
    tgl: new Date(Date.now() - 172800000).toISOString(),
    produk: "Beras Premium Cianjur",
    tipe: "KELUAR",
    qty: 50,
    note: "Koreksi Stok: Barang Rusak",
  },
  {
    id: 4,
    tgl: new Date(Date.now() - 259200000).toISOString(),
    produk: "Gula Pasir Kristal",
    tipe: "MASUK",
    qty: 150,
    note: "Restock Gudang",
  },
];

export default function DetailTokoPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [activeTab, setActiveTab] = useState<
    "info" | "produk" | "riwayat" | "stok"
  >("info");

  const [store, setStore] = useState<StoreItem | null>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(
    async (showLoading = true) => {
      if (!id) return;
      try {
        if (showLoading) setLoading(true);
        setError("");

        // Fetch store
        const storeRes = await storesApi.getById(id);
        const storeData = storeRes?.data?.data || storeRes?.data;
        setStore(storeData);

        // Fetch products
        try {
          const productsRes = await productsApi.getByStore(id);
          const productsData =
            productsRes?.data?.data || productsRes?.data || [];
          const prodList = Array.isArray(productsData)
            ? productsData
            : productsData.data || [];
          setProducts(prodList);
        } catch (err) {
          console.warn("Failed to fetch products", err);
        }

        // Fetch orders
        try {
          const ordersRes = await ordersApi.sellerGetOrders(id);
          const ordersData = ordersRes?.data?.data || ordersRes?.data || [];
          const ordList = Array.isArray(ordersData)
            ? ordersData
            : ordersData.data || [];
          setOrders(ordList);
        } catch (err) {
          console.warn("Could not fetch seller orders, trying admin", err);
          try {
            const adminOrdersRes = await ordersApi.adminGetAll({ tokoId: id });
            const adminOrdersData =
              adminOrdersRes?.data?.data || adminOrdersRes?.data || [];
            const adminOrdList = Array.isArray(adminOrdersData)
              ? adminOrdersData
              : adminOrdersData.data || [];
            const filteredOrders = adminOrdList.filter((o: OrderItem) => {
              const ordtokoId = o.orders?.[0]?.tokoId;
              const itemtokoId = o.items?.[0]?.product?.tokoId;
              return ordtokoId === id || o.tokoId === id || itemtokoId === id;
            });
            setOrders(
              filteredOrders.length > 0 ? filteredOrders : adminOrdList,
            );
          } catch {
            /* ignore */
          }
        }
      } catch {
        setError("Gagal memuat detail toko.");
      } finally {
        setLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    Promise.resolve().then(() => fetchData(false)); // Already loading by default
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 size={40} className="animate-spin text-emerald-600" />
        <p className="text-gray-400 font-medium">Memuat detail toko...</p>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-100 flex flex-col items-center gap-2 text-center">
        <AlertCircle size={32} className="mb-2" />
        <h2 className="text-lg font-bold">Data Tidak Ditemukan</h2>
        <p className="text-sm">{error || "Toko tidak ditemukan"}</p>
        <button
          onClick={() => router.back()}
          className="mt-4 px-4 py-1.5 bg-white rounded-lg shadow-sm text-red-600 font-semibold text-sm hover:bg-red-50 transition-colors"
        >
          Kembali
        </button>
      </div>
    );
  }

  const mapUrl =
    store.lat && store.lng
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${store.lng - 0.012}%2C${store.lat - 0.007}%2C${store.lng + 0.012}%2C${store.lat + 0.007}&layer=mapnik&marker=${store.lat}%2C${store.lng}`
      : "";

  return (
    <div className="space-y-4 w-full pb-8">
      {/* Header Info */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-500 p-6 text-white relative">
          <button
            onClick={() => router.back()}
            className="mb-6 flex items-center gap-1.5 text-emerald-50 hover:text-white transition-colors text-xs font-semibold bg-white/10 w-fit px-3 py-1.5 rounded-lg hover:bg-white/20"
          >
            <ArrowLeft size={14} /> Kembali ke Daftar
          </button>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center text-3xl shadow-inner backdrop-blur-sm border border-white/20 flex-shrink-0">
                {store.nama?.charAt(0) || "🏪"}
              </div>
              <div>
                <h1 className="text-2xl font-display font-semibold mb-1">
                  {store.nama}
                </h1>
                <p className="text-emerald-100 text-xs flex items-center gap-1.5 opacity-90 mb-2">
                  <MapPin size={14} /> {store.kabupaten}{" "}
                  {store.wilayah ? `• ${store.wilayah}` : ""}
                </p>
                <div className="flex items-center gap-2">
                  <span
                    className={`flex items-center gap-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-md uppercase tracking-wider ${
                      store.status === "ACTIVE"
                        ? "bg-emerald-400/20 text-emerald-50 border border-emerald-400/30"
                        : store.status === "PENDING"
                          ? "bg-amber-400/20 text-amber-50 border border-amber-400/30"
                          : "bg-red-400/20 text-red-50 border border-red-400/30"
                    }`}
                  >
                    {store.status === "ACTIVE"
                      ? "Aktif"
                      : store.status === "PENDING"
                        ? "Menunggu"
                        : "Nonaktif / Suspend"}
                  </span>
                </div>
              </div>
            </div>

            {/* Affiliations Cards in Header */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 flex items-center gap-3 min-w-[160px]">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <Truck size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-[9px] uppercase font-semibold text-emerald-100/80 tracking-wider mb-0.5">
                    Kurir Afiliasi
                  </p>
                  <p className="font-semibold text-xs">
                    {store.courierStaff?.name || "Belum Ada Kurir"}
                  </p>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 flex items-center gap-3 min-w-[160px]">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <Building2 size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-[9px] uppercase font-semibold text-emerald-100/80 tracking-wider mb-0.5">
                    Gudang Penyimpanan
                  </p>
                  <p className="font-semibold text-xs">
                    {store.warehouseAdmin?.name || "Belum Ada Gudang"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-6 px-6 border-b border-gray-200 overflow-x-auto">
          {[
            { id: "info", label: "Info & Lokasi", icon: Info },
            { id: "produk", label: "Produk Dijual", icon: Package },
            { id: "riwayat", label: "Riwayat Penjualan", icon: ShoppingBag },
            { id: "stok", label: "Riwayat Stok Gudang", icon: Truck },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() =>
                setActiveTab(tab.id as "info" | "produk" | "riwayat" | "stok")
              }
              className={`flex items-center gap-2 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "border-emerald-500 text-emerald-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Contents */}
      <div className="animate-in fade-in duration-300">
        {/* INFO TAB */}
        {activeTab === "info" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Map Card */}
            <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex flex-col group hover:border-emerald-200 transition-colors">
              <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
                <MapPin size={18} className="text-emerald-500" /> Peta Lokasi
              </h3>
              {mapUrl ? (
                <div className="flex-1 min-h-[250px] relative rounded-xl overflow-hidden border border-gray-200 shadow-inner group-hover:shadow-sm transition-shadow">
                  <iframe
                    title="store-detail-map"
                    width="100%"
                    height="100%"
                    style={{ border: 0, filter: "grayscale(0.1)" }}
                    src={mapUrl}
                  />
                  <div className="absolute inset-x-0 bottom-3 px-3">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${store.lat},${store.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full bg-white text-[11px] font-semibold text-emerald-700 px-3 py-2 rounded-lg shadow-md border border-emerald-50 text-center hover:bg-emerald-50 transition-colors"
                    >
                      Buka di Google Maps
                    </a>
                  </div>
                </div>
              ) : (
                <div className="flex-1 min-h-[250px] bg-gray-50 rounded-xl flex flex-col items-center justify-center p-5 text-center border border-gray-200">
                  <MapPin className="text-gray-300 w-10 h-10 mb-2" />
                  <p className="text-xs text-gray-500 font-medium">
                    Titik koordinat belum ditentukan oleh seller
                  </p>
                </div>
              )}
            </div>

            {/* Detail Card */}
            <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm group hover:border-emerald-200 transition-colors">
              <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
                <Info size={18} className="text-emerald-500" /> Detail Kontak
              </h3>
              <div className="space-y-2">
                {[
                  { label: "Telepon", val: store.telepon || "-", icon: Phone },
                  {
                    label: "Jam Buka",
                    val: store.jamOperasional || "-",
                    icon: Clock,
                  },
                  {
                    label: "Alamat Lengkap",
                    val: store.alamat || "-",
                    icon: MapPin,
                  },
                  {
                    label: "Tanggal Bergabung",
                    val: store.createdAt ? formatTanggal(store.createdAt) : "-",
                    icon: CalendarDays,
                  },
                ].map((r, i) => (
                  <div
                    key={i}
                    className="bg-gray-50 rounded-xl p-3 border border-transparent shadow-sm flex items-start gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-gray-500 flex-shrink-0 shadow-sm border border-gray-100">
                      <r.icon size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-semibold text-gray-500 uppercase tracking-widest mb-0.5">
                        {r.label}
                      </p>
                      <p className="text-xs text-gray-800 font-medium leading-relaxed">
                        {r.val}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PRODUK TAB */}
        {activeTab === "produk" && (
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <Package size={18} className="text-emerald-500" /> Katalog
                Produk Toko
              </h3>
              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-semibold px-2.5 py-1 rounded-md border border-emerald-100 tracking-widest uppercase">
                {products.length} Produk
              </span>
            </div>

            {products.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 rounded-xl border border-gray-200">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h4 className="font-semibold text-gray-900 text-base">
                  Belum ada produk
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  Toko ini belum menambahkan produk ke katalog merekam.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {products.map((prod) => (
                  <Link
                    href={`/admin/produk/${prod.id}`}
                    key={prod.id}
                    className="block cursor-pointer bg-white rounded-xl overflow-hidden border border-gray-200 group shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300"
                  >
                    <div className="aspect-square bg-gray-50 relative overflow-hidden border-b border-gray-100 p-3 shrink-0">
                      {prod.gambarUrl ||
                      prod.gambarBase64 ||
                      prod.gambarUtama ? (
                        <Image
                          src={
                            prod.gambarUrl ||
                            prod.gambarBase64 ||
                            prod.gambarUtama ||
                            ""
                          }
                          alt={prod.nama}
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          fill
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package size={32} className="text-gray-300" />
                        </div>
                      )}
                      {prod.status === "ACTIVE" ? (
                        <span className="absolute top-2 left-2 bg-emerald-500 text-white text-[9px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider">
                          Aktif
                        </span>
                      ) : (
                        <span className="absolute top-2 left-2 bg-gray-500 text-white text-[9px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider">
                          Nonaktif
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <h4 className="font-medium text-xs text-gray-900 group-hover:text-emerald-700 transition-colors line-clamp-2 min-h-[32px] mb-1.5">
                        {prod.nama}
                      </h4>
                      <p className="text-emerald-600 font-semibold text-sm mb-3">
                        {formatRupiah(prod.harga || 0)}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-gray-500 font-medium mb-2.5">
                        <span className="flex items-center gap-1">
                          <Package size={12} className="text-gray-400" /> Stok:{" "}
                          {prod.grades
                            ? prod.grades.reduce(
                                (acc, g) => acc + (g.stok || 0),
                                0,
                              )
                            : prod.stok || 0}
                        </span>
                        <span className="flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded text-amber-700 font-semibold">
                          <Star
                            size={10}
                            className="fill-amber-500 text-amber-500"
                          />{" "}
                          {Number(prod.rating || 0).toFixed(1)}
                        </span>
                      </div>

                      <div className="border-t border-gray-100 pt-2.5 flex gap-1 flex-wrap">
                        {prod.grades && prod.grades.length > 0 ? (
                          prod.grades.map(
                            (g: { grade: string; stok: number }) => (
                              <span
                                key={g.grade}
                                className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${g.stok > 0 ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-red-50 text-red-600 border-red-100"}`}
                              >
                                {g.grade}: {g.stok}
                              </span>
                            ),
                          )
                        ) : (
                          <span className="text-[9px] font-medium px-1.5 py-0.5 bg-gray-50 text-gray-600 rounded border border-gray-100">
                            Stok: {prod.stok || 0}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* RIWAYAT PENJUALAN TAB */}
        {activeTab === "riwayat" && (
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <ShoppingBag size={18} className="text-emerald-500" /> Riwayat
                Pesanan
              </h3>
              <span className="bg-blue-50 text-blue-700 text-[10px] font-semibold px-2.5 py-1 rounded-md border border-blue-100 uppercase tracking-widest">
                {orders.length} Pesanan
              </span>
            </div>

            {orders.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 rounded-xl border border-gray-200">
                <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h4 className="font-semibold text-gray-900 text-base">
                  Belum ada pesanan
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  Belum ada riwayat transaksi yang tercatat untuk toko ini.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                      <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[10px]">
                        Order ID
                      </th>
                      <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[10px]">
                        Tanggal
                      </th>
                      <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[10px]">
                        Pembeli
                      </th>
                      <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[10px]">
                        Total
                      </th>
                      <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[10px]">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {orders.map((order) => (
                      <tr
                        key={order.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono font-medium text-emerald-600">
                          #{order.id.slice(-8).toUpperCase()}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {formatTanggal(order.createdAt)}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-800">
                          {order.customer?.name || order.user?.name || "-"}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {formatRupiah(
                            order.totalAmount || order.totalHarga || 0,
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 text-[9px] font-semibold rounded uppercase tracking-wider ${
                              ["DELIVERED", "COMPLETED"].includes(order.status)
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : order.status === "CANCELLED"
                                  ? "bg-red-50 text-red-700 border border-red-200"
                                  : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        {/* RIWAYAT STOK GUDANG TAB */}
        {activeTab === "stok" && (
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <Truck size={18} className="text-emerald-500" /> Riwayat Mutasi
                Stok Gudang
              </h3>
              <div className="flex items-center gap-2">
                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-semibold px-2.5 py-1 rounded-md border border-emerald-100 uppercase tracking-widest">
                  Gudang: {store.warehouseAdmin?.name || "Utama"}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[10px]">
                      Tanggal
                    </th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[10px]">
                      Produk
                    </th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[10px]">
                      Tipe
                    </th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[10px]">
                      Jumlah
                    </th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[10px]">
                      Keterangan
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stockHistoryMock.map((item: any) => (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 text-gray-500">
                        {formatTanggal(item.tgl)}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {item.produk}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 text-[9px] font-semibold rounded uppercase tracking-wider ${
                            item.tipe === "MASUK"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {item.tipe}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {item.tipe === "MASUK" ? "+" : "-"}
                        {item.qty}
                      </td>
                      <td className="px-4 py-3 text-gray-500 italic">
                        {item.note}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-[10px] text-gray-400 italic">
              * Data di atas adalah riwayat mutasi stok dari gudang yang
              terafiliasi dengan toko ini.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
