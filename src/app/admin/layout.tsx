"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);

  const adminMenus = [
    { title: "📊 ภาพรวมระบบ", href: "/admin" },
    { title: "📥 นำเข้าเครื่องแบบ (CSV)", href: "/admin/uniform-import" },
    { title: "🏫 นำเข้าข้อมูลชุมนุม (CSV)", href: "/teacher/club/import" },
    { title: "🤝 จัดการกิจกรรมจิตอาสา", href: "/admin/volunteer" },
  ];

  return (
    <div className="min-h-screen bg-slate-100 font-sans flex">
      {/* Sidebar เมนู Admin */}
      <aside
        className={`${
          isOpen ? "w-64" : "w-20"
        } bg-slate-900 text-slate-300 transition-all duration-300 min-h-screen flex flex-col shadow-xl sticky top-0 h-screen`}
      >
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          {isOpen && <span className="font-bold text-white">⚙️ Admin Panel</span>}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white mx-auto"
          >
            {isOpen ? "◀" : "▶"}
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {adminMenus.map((menu) => {
            const isActive = pathname === menu.href;
            return (
              <Link
                key={menu.href}
                href={menu.href}
                className={`flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-blue-600 text-white font-bold"
                    : "hover:bg-slate-800 hover:text-white text-slate-400"
                }`}
              >
                <span>{menu.title}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-800">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
          >
            🏠 {isOpen && <span>กลับหน้าหลัก</span>}
          </Link>
        </div>
      </aside>

      <main className="flex-1 p-6 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}