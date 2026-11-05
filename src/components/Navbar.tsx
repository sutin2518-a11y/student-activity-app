"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  const menuItems = [
    { name: "หน้าหลัก", href: "/", icon: "🏠" },
    { name: "กิจกรรมชุมนุม", href: "/teacher/club", icon: "👥" },
    { name: "กิจกรรมในเครื่องแบบ", href: "/student/uniform", icon: "👔" },
    { name: "กิจกรรมเพื่อสังคมฯ", href: "/student/volunteer", icon: "🤝" },
    { name: "กิจกรรมแนะแนว", href: "/student/guidance", icon: "💡" },
    { name: "ระบบเช็คชื่อ", href: "/teacher/attendance", icon: "✅" },
  ];

  return (
    <nav className="bg-white border-b shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-2 overflow-x-auto py-2 scrollbar-none">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${
                  isActive
                    ? "bg-rose-600 text-white shadow-sm"
                    : "text-gray-700 hover:bg-gray-100 hover:text-rose-600"
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}