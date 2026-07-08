"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  LogOut,
  ChevronDown,
  User as UserIcon,
  MessageCircle,
  Store,
  BarChart2,
} from "lucide-react";

import { useAuthStore } from "@/store/auth-store";

import NotifBell from "./NotifBell";

const NAV_TABS = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/seller/dashboard" },
  { label: "Produk", icon: Package, path: "/seller/produk" },
  { label: "Tren & Laporan", icon: BarChart2, path: "/seller/tren" },
  { label: "Chat", icon: MessageCircle, path: "/seller/chat" },
];

export default function SellerTopbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  const displayName = user?.name || user?.email || "Seller";
  const email = user?.email ?? "";

  return (
    <div className="w-full flex items-center justify-between px-2 relative z-50">
      {/* ── Left: logo + pill tabs ── */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm shadow-primary-200">
          <Store size={18} className="text-white" />
        </div>

        <nav className="flex items-center gap-2 ml-2">
          {NAV_TABS.map((tab) => {
            let isTabActive = false;

            if (tab.path === "/seller/dashboard") {
              const dashboardRoutes = [
                "/seller/dashboard",
                "/seller/pesanan",
                "/seller/pesanan-grosir",
                "/seller/rating",
                "/seller/kurir",
              ];
              isTabActive = dashboardRoutes.some(
                (r) => pathname === r || pathname.startsWith(r + "/"),
              );
            } else if (tab.path === "/seller/tren") {
              isTabActive =
                pathname === tab.path ||
                pathname.startsWith(tab.path + "/") ||
                pathname.startsWith("/seller/laporan");
            } else {
              isTabActive =
                pathname === tab.path || pathname.startsWith(tab.path + "/");
            }
            const Icon = tab.icon;

            return (
              <button
                key={tab.path}
                onClick={() => router.push(tab.path)}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all duration-150 border ${
                  isTabActive
                    ? "bg-primary-600 text-white border-primary-600 shadow-sm"
                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-800"
                }`}
              >
                <Icon size={11} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Right: Avatar/Email Dropdown ── */}
      <div className="flex items-center gap-2">
        <NotifBell />
        <div className="relative">
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-gray-50 transition-all text-right group"
          >
            <div className="hidden sm:flex items-center gap-2">
              <p className="text-[12px] font-medium text-gray-600 group-hover:text-gray-800 transition-colors tracking-tight">
                {email}
              </p>
              <ChevronDown
                size={12}
                className={`text-gray-500 group-hover:text-gray-700 transition-transform duration-200 ${
                  isProfileOpen ? "rotate-180" : ""
                }`}
              />
            </div>
            <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0 group-hover:bg-primary-50 group-hover:border-primary-100 transition-all duration-200 shadow-sm">
              <UserIcon
                size={15}
                className="text-gray-400 group-hover:text-primary-600 transition-colors"
              />
            </div>
          </button>

          {isProfileOpen && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-40 cursor-default"
                onClick={() => setIsProfileOpen(false)}
                aria-label="Close profile menu"
              />
              <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-100 rounded-2xl shadow-xl shadow-gray-200/50 p-1.5 z-50 animate-in fade-in zoom-in duration-200">
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    router.push("/seller/profil-toko");
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-700 hover:bg-gray-50 text-[12px] font-medium transition-all"
                >
                  <Store size={14} className="text-gray-500" />
                  Profil Toko
                </button>
                <div className="h-px bg-gray-100 my-1 mx-2" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-red-500 hover:bg-red-50 text-[12px] font-medium transition-all"
                >
                  <LogOut size={14} />
                  Keluar Sesi
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
