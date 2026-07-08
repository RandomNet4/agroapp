"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Leaf,
  LayoutDashboard,
  BarChart2,
  Activity,
  Settings,
  LogOut,
  ChevronDown,
  User as UserIcon,
  CalendarCheck,
  MessageCircle,
  Warehouse,
} from "lucide-react";

import { useAuthStore } from "@/store/auth-store";

import NotifBell from "./NotifBell";

const NAV_TABS = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/admin/dashboard" },
  { label: "Management Account", icon: UserIcon, path: "/admin/pengguna" },
  { label: "Gudang", icon: Warehouse, path: "/admin/gudang" },
  { label: "Pusat Bantuan", icon: MessageCircle, path: "/admin/chat" },
];

export default function AdminTopbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Mock booking count for demonstration. In real implementation, fetch this from API.
  const [bookingCount, setBookingCount] = useState(3);

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  /* Derive initials from name or email */
  const displayName = user?.name || user?.email || "Admin";
  const email = user?.email ?? "";
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="w-full flex items-center justify-between px-2">
      {/* ── Left: logo + pill tabs ── */}
      <div className="flex items-center gap-3">
        {/* Logo icon (Daun) - Lingkaran */}
        <div className="w-9 h-9 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm shadow-primary-200">
          <Leaf size={18} className="text-white" />
        </div>

        {/* Nav tabs (terpisah-pisah) */}
        <nav className="flex items-center gap-2 ml-2">
          {NAV_TABS.map((tab) => {
            let isActive =
              pathname === tab.path || pathname.startsWith(tab.path + "/");

            if (tab.label === "Dashboard") {
              const inOtherTab = NAV_TABS.some(
                (t) =>
                  t.label !== "Dashboard" &&
                  (pathname === t.path || pathname.startsWith(t.path + "/")),
              );
              if (pathname.startsWith("/admin") && !inOtherTab) {
                isActive = true;
              }
            }

            const Icon = tab.icon;
            return (
              <button
                key={tab.path}
                onClick={() => router.push(tab.path)}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all duration-150 border ${
                  isActive
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
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-gray-50 transition-all text-right group"
          >
            {/* Email and Chevron */}
            <div className="hidden sm:flex items-center gap-2">
              <p className="text-[12px] font-medium text-gray-600 group-hover:text-gray-800 transition-colors tracking-tight">
                {email}
              </p>
              <ChevronDown
                size={12}
                className={`text-gray-500 group-hover:text-gray-700 transition-transform duration-200 ${
                  isDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </div>

            {/* Avatar Circle with User Icon */}
            <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0 group-hover:bg-primary-50 group-hover:border-primary-100 transition-all duration-200 shadow-sm">
              <UserIcon
                size={15}
                className="text-gray-400 group-hover:text-primary-600 transition-colors"
              />
            </div>
          </button>

          {/* Floating Dropdown Menus */}
          {isDropdownOpen && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-40 cursor-default"
                onClick={() => setIsDropdownOpen(false)}
                aria-label="Close dropdown"
              />
              <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-100 rounded-2xl shadow-xl shadow-gray-200/50 p-1.5 z-50 animate-in fade-in zoom-in duration-200">
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
