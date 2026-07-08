// =====================================================
// ADMIN LAYOUT - AGRO TANI DENGAN NOTIFIKASI
// =====================================================

import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import { Bell, Check } from 'lucide-react';
import { useData } from '../context/DataContext';
import { formatTanggal } from '../data/adminDummy';

export const AdminLayout: React.FC = () => {
  const { notifikasi, readNotifikasi, refreshData } = useData();
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadCount = notifikasi ? notifikasi.filter(n => !n.dibaca).length : 0;

  const handleRead = async (id: string) => {
    await readNotifikasi(id);
    await refreshData();
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header / Navbar */}
        <header className="bg-white border-b border-gray-100 h-16 px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm shadow-gray-100/50">
          {/* Welcome Text, shifted right on mobile to prevent overlapping with mobile sidebar button */}
          <div className="text-sm font-semibold text-gray-500 pl-16 lg:pl-0">
            Selamat Datang, Admin Agro
          </div>
          
          <div className="relative">
            {/* Notification Bell */}
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all text-gray-600 active:scale-95 flex items-center justify-center border border-gray-100"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center ring-2 ring-white animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowNotifications(false)} 
                />
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-gray-100 shadow-xl z-50 overflow-hidden animate-fade-in max-h-[400px] flex flex-col">
                  <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                    <h4 className="font-bold text-sm text-gray-800">Notifikasi Admin</h4>
                    <span className="text-[10px] bg-primary-100 text-primary-700 font-bold px-2.5 py-0.5 rounded-full">
                      {unreadCount} Baru
                    </span>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto divide-y divide-gray-50 custom-scrollbar max-h-[300px]">
                    {!notifikasi || notifikasi.length === 0 ? (
                      <div className="p-8 text-center text-xs text-gray-400">
                        Tidak ada notifikasi baru
                      </div>
                    ) : (
                      notifikasi.map(n => (
                        <div 
                          key={n.id} 
                          className={`p-4 hover:bg-gray-50/50 transition-colors ${!n.dibaca ? 'bg-primary-50/10' : ''}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className={`text-xs ${!n.dibaca ? 'font-bold text-gray-800' : 'text-gray-600'}`}>
                                {n.judul}
                              </p>
                              <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                                {n.pesan}
                              </p>
                              <p className="text-[9px] text-gray-400 mt-2 font-medium">
                                {formatTanggal(n.tanggal)}
                              </p>
                            </div>
                            {!n.dibaca && (
                              <button 
                                onClick={() => handleRead(n.id)}
                                className="p-1 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-lg transition-colors shrink-0"
                                title="Tandai telah dibaca"
                              >
                                <Check size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Content Panel */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
