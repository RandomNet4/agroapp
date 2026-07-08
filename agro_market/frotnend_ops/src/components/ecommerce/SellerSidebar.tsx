"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  CreditCard,
  Truck,
  BarChart3,
  Warehouse,
  Star,
  TrendingUp,
} from "lucide-react";

import AppSidebar, { SidebarMenuItem } from "./AppSidebar";

const UTAMA_MENU: SidebarMenuItem[] = [
  { label: "Utama", isHeader: true },
  {
    path: "/seller/dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard size={17} />,
  },
  { label: "Pesanan", isHeader: true },
  {
    path: "/seller/pesanan",
    label: "Pesanan Masuk",
    icon: <ClipboardList size={17} />,
  },
  {
    path: "/seller/pesanan-grosir",
    label: "Pembelian Grosiran",
    icon: <CreditCard size={17} />,
  },
  {
    path: "/seller/rating",
    label: "Ulasan & Rating",
    icon: <Star size={17} />,
  },
  { path: "/seller/kurir", label: "Kurir Afiliasi", icon: <Truck size={17} /> },
];

const PRODUK_MENU: SidebarMenuItem[] = [
  { label: "Produk Saya", isHeader: true },
  {
    path: "/seller/produk",
    label: "Produk Saya",
    icon: <Package size={17} />,
  },
  {
    path: "/seller/stok",
    label: "Pengelolaan Stok",
    icon: <ClipboardList size={17} />,
  },
  {
    path: "/seller/gudang/produk",
    label: "Pembelian Stok",
    icon: <Warehouse size={17} />,
    children: [
      {
        path: "/seller/gudang/produk",
        label: "Daftar Produk Gudang",
      },
      {
        path: "/seller/gudang",
        label: "Daftar Gudang",
      },
      {
        path: "/seller/pengajuan-stok",
        label: "Status Pengajuan Stok",
      },
    ],
  },
  {
    path: "/seller/produk/margin",
    label: "Margin ",
    icon: <TrendingUp size={17} />,
  },
];

const PESANAN_MENU: SidebarMenuItem[] = [
  { label: "Transaksi & Penjualan", isHeader: true },
  {
    path: "/seller/pesanan",
    label: "Pesanan Masuk",
    icon: <ClipboardList size={17} />,
  },
  {
    path: "/seller/pesanan-grosir",
    label: "Pembelian Grosiran",
    icon: <CreditCard size={17} />,
  },
  {
    path: "/seller/rating",
    label: "Ulasan & Rating",
    icon: <Star size={17} />,
  },
  { path: "/seller/kurir", label: "Kurir Afiliasi", icon: <Truck size={17} /> },
];

const TREN_MENU: SidebarMenuItem[] = [
  { label: "Tren Penjualan", isHeader: true },
  {
    path: "/seller/tren",
    label: "Tren Bulanan",
    icon: <BarChart3 size={17} />,
  },
  {
    path: "/seller/tren/produk",
    label: "Tren Produk",
    icon: <TrendingUp size={17} />,
  },
  {
    path: "/seller/tren/pola",
    label: "Pola Penjualan",
    icon: <TrendingUp size={17} />, // Reusing TrendingUp since Activity might not be imported
  },
  { label: "Laporan", isHeader: true },
  {
    path: "/seller/laporan",
    label: "Riwayat Pesanan",
    icon: <ClipboardList size={17} />,
  },
  {
    path: "/seller/laporan/produk",
    label: "Laporan per Produk",
    icon: <Package size={17} />,
  },
];

const SellerSidebar: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();

  // Determine context based on current path
  const isProdukSection =
    pathname.startsWith("/seller/produk") ||
    pathname.startsWith("/seller/stok") ||
    pathname.startsWith("/seller/gudang") ||
    pathname.startsWith("/seller/pengajuan-stok");

  const isTrenSection =
    pathname.startsWith("/seller/tren") ||
    pathname.startsWith("/seller/laporan");

  const menuItems = isProdukSection
    ? PRODUK_MENU
    : isTrenSection
      ? TREN_MENU
      : UTAMA_MENU;

  return (
    <AppSidebar
      menuItems={menuItems}
      onLogout={() => router.push("/")}
      logoutLabel="Kembali ke Toko"
      theme="emerald"
    />
  );
};

export default SellerSidebar;
