"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  ShoppingCart,
  Info,
  Check,
  Megaphone,
  Truck,
  PackageCheck,
  AlertTriangle,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useNotifStore } from "@/store/notifikasi-store";
import { notificationsApi } from "@/lib/api/notifications";
import { queryKeys } from "@/hooks/query-keys";
import { useNotifSSE } from "@/hooks/notifikasi/useNotifSSE";

export default function NotifBell() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    notifications,
    unreadCount,
    setNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifStore();

  // Enable SSE
  useNotifSSE();

  // Fetch initial data
  const { data } = useQuery({
    queryKey: queryKeys.notifications.all,
    queryFn: () => notificationsApi.getAll({ limit: 5 }),
    refetchInterval: false,
  });

  useEffect(() => {
    if (data?.data) {
      setNotifications(data.data.data, data.data.unreadCount);
    }
  }, [data, setNotifications]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotifClick = async (id: string, isRead: boolean) => {
    setIsOpen(false);
    if (!isRead) {
      markAsRead(id);
      try {
        await notificationsApi.markAsRead(id);
        queryClient.invalidateQueries({
          queryKey: queryKeys.notifications.all,
        });
      } catch (err) {
        console.error("Failed to mark as read", err);
      }
    }
    router.push("/notifikasi");
  };

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    markAllAsRead();
    try {
      await notificationsApi.markAllAsRead();
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    } catch (err) {
      console.error("Failed to mark all as read", err);
    }
  };

  const getIcon = (tipe: string) => {
    switch (tipe) {
      case "PESANAN":
        return <ShoppingCart size={16} />;
      case "PESANAN_BARU":
        return <PackageCheck size={16} />;
      case "TUGAS_BARU":
        return <Truck size={16} />;
      case "ESKALASI":
        return <AlertTriangle size={16} />;
      case "BROADCAST":
        return <Megaphone size={16} />;
      default:
        return <Info size={16} />;
    }
  };

  const getColor = (tipe: string) => {
    switch (tipe) {
      case "PESANAN_BARU":
        return "bg-amber-100 text-amber-600";
      case "TUGAS_BARU":
        return "bg-indigo-100 text-indigo-600";
      case "BROADCAST":
        return "bg-orange-100 text-orange-600";
      case "ESKALASI":
        return "bg-red-100 text-red-600";
      default:
        return "bg-blue-100 text-blue-600";
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center relative"
      >
        <Bell size={16} className="text-gray-600" />
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center border-2 border-white shadow-sm">
            {unreadCount > 99 ? "99+" : unreadCount}
          </div>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-100 rounded-2xl shadow-xl shadow-gray-200/50 overflow-hidden z-50 animate-in fade-in zoom-in duration-200">
          <div className="flex items-center justify-between p-3 border-b border-gray-100 bg-gray-50/50">
            <h3 className="font-bold text-sm text-gray-800">Notifikasi</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] font-semibold text-primary-600 hover:bg-primary-50 px-2 py-1 rounded-md transition-colors"
              >
                Tandai Dibaca
              </button>
            )}
          </div>

          <div className="max-h-[320px] overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.slice(0, 5).map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotifClick(notif.id, notif.isRead)}
                  className={`p-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer flex gap-3 transition-colors ${
                    !notif.isRead ? "bg-primary-50/30" : ""
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getColor(notif.tipe)}`}
                  >
                    {getIcon(notif.tipe)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-xs truncate ${!notif.isRead ? "font-bold text-gray-900" : "font-medium text-gray-700"}`}
                    >
                      {notif.judul}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
                      {notif.pesan}
                    </p>
                  </div>
                  {!notif.isRead && (
                    <div className="w-2 h-2 rounded-full bg-primary-600 flex-shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Bell size={20} className="text-gray-300" />
                </div>
                <p className="text-xs text-gray-500">Belum ada notifikasi</p>
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-2 border-t border-gray-100">
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push("/notifikasi");
                }}
                className="w-full py-1.5 text-center text-[11px] font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Lihat Semua
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
