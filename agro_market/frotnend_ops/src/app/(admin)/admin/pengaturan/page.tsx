"use client";

import { Settings, Shield, Bell, User, Key, Globe } from "lucide-react";

import { useAuthStore } from "@/store/auth-store";

export default function PengaturanPage() {
  const { user } = useAuthStore();

  const settingsGroups = [
    {
      title: "Akun & Keamanan",
      items: [
        {
          icon: User,
          title: "Profil Saya",
          desc: "Kelola informasi pribadi Anda",
        },
        {
          icon: Key,
          title: "Kata Sandi",
          desc: "Perbarui kata sandi akun Anda",
        },
        { icon: Shield, title: "Keamanan 2FA", desc: "Autentikasi dua faktor" },
      ],
    },
    {
      title: "Preferensi Aplikasi",
      items: [
        {
          icon: Bell,
          title: "Notifikasi",
          desc: "Atur preferensi pemberitahuan",
        },
        {
          icon: Globe,
          title: "Bahasa & Wilayah",
          desc: "Pengaturan lokalisasi",
        },
        { icon: Settings, title: "Tampilan", desc: "Tema dan ukuran teks" },
      ],
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-[18px] font-semibold text-gray-900 leading-tight">
          Pengaturan Sistem
        </h1>
        <p className="text-[13px] text-gray-400 mt-0.5">
          Konfigurasi preferensi dan keamanan akun ({user?.email})
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {settingsGroups.map((group, i) => (
          <div key={i} className="space-y-3">
            <h2 className="text-[12px] font-bold text-gray-500 uppercase tracking-wider">
              {group.title}
            </h2>
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-100">
              {group.items.map((item, j) => (
                <button
                  key={j}
                  className="w-full flex items-start gap-4 p-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-gray-100">
                    <item.icon size={16} className="text-gray-500" />
                  </div>
                  <div>
                    <h3 className="text-[13px] font-semibold text-gray-800">
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {item.desc}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
