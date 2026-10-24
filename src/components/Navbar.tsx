"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  // รายการเมนูทั้งหมดในระบบ
  const navItems = [
    { label: "🏠 ลงทะเบียนกิจกรรม", href: "/" },
    { label: "🤝 บันทึกจิตอาสา", href: "/volunteer" },
    { label: "📋 สำหรับครู (เช็คชื่อ)", href: "/teacher" },
    { label: "⚙️ ระบบ Admin", href: "/admin" },
  ];

  return (
    <nav className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        
        {/* โลโก้ / ชื่อระบบ */}
        <Link href="/" className="flex items-center gap-2 font-bold text-base hover:opacity-90">
          <span className="text-xl">🎓</span>
          <span>ระบบกิจกรรมพัฒนาผู้เรียน</span>
        </Link>

        {/* แถบเมนูคลิกเปลี่ยนหน้า */}
        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

      </div>
    </nav>
  );
}