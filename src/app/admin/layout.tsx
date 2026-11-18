
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type MenuItem = {
  icon: string;
  title: string;
  href: string;
};

// เมนูจัดการระบบ
const adminMenus: MenuItem[] = [
  {
    icon: "📊",
    title: "ภาพรวมระบบ",
    href: "/admin",
  },
  {
    icon: "🎓",
    title: "จัดการทะเบียนนักเรียน",
    href: "/admin/students",
  },
  {
    icon: "📥",
    title: "นำเข้าเครื่องแบบ (CSV)",
    href: "/admin/uniform-import",
  },
  {
    icon: "🏫",
    title: "นำเข้าข้อมูลชุมนุม (CSV)",
    href: "/teacher/club/import",
  },
  {
    icon: "🤝",
    title: "จัดการกิจกรรมจิตอาสา",
    href: "/admin/volunteer",
  },
];

// เมนูเข้าสู่ระบบกิจกรรม
const activityMenus: MenuItem[] = [
  {
    icon: "✅",
    title: "เช็คชื่อประจำวัน",
    href: "/teacher/attendance",
  },
  {
    icon: "👥",
    title: "เช็คชื่อชุมนุม",
    href: "/teacher/club",
  },
  {
    icon: "🎽",
    title: "เช็คชื่อเครื่องแบบ",
    href: "/teacher/uniform",
  },
  {
    icon: "🤝",
    title: "ตรวจสอบกิจกรรมจิตอาสา",
    href: "/teacher/volunteer",
  },
];

const allMenus = [...adminMenus, ...activityMenus];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);

  // เลือกเมนูที่ตรงกับเส้นทางมากที่สุด
  const activeHref = [...allMenus]
    .filter(
      (menu) =>
        pathname === menu.href ||
        pathname.startsWith(menu.href + "/")
    )
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  const renderMenu = (menu: MenuItem) => {
    const isActive = activeHref === menu.href;

    return (
      <Link
        key={menu.href}
        href={menu.href}
        title={menu.title}
        aria-label={menu.title}
        aria-current={isActive ? "page" : undefined}
        className={`flex items-center gap-3 px-3 py-3
          rounded-xl text-sm font-medium transition-all
          ${!isOpen ? "justify-center" : ""}
          ${
            isActive
              ? "bg-blue-600 text-white font-bold shadow-md"
              : "text-slate-300 hover:bg-slate-800 hover:text-white"
          }`}
      >
        <span
          className="text-lg shrink-0"
          aria-hidden="true"
        >
          {menu.icon}
        </span>

        {isOpen && (
          <span className="leading-snug">
            {menu.title}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans flex">
      {/* Sidebar */}
      <aside
        className={`${
          isOpen ? "w-64" : "w-20"
        } bg-slate-900 text-slate-300
        transition-all duration-300
        shrink-0 flex flex-col
        shadow-xl sticky top-0 h-screen`}
      >
        {/* ส่วนหัว */}
        <div
          className="p-4 border-b border-slate-800
          flex justify-between items-center"
        >
          {isOpen && (
            <span className="font-bold text-white">
              ⚙️ Admin Panel
            </span>
          )}

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={
              isOpen ? "ย่อเมนู" : "ขยายเมนู"
            }
            className="p-2 rounded-xl
              hover:bg-slate-800
              text-slate-400 hover:text-white mx-auto"
          >
            {isOpen ? "◀" : "▶"}
          </button>
        </div>

        {/* รายการเมนู */}
        <nav
          aria-label="เมนูผู้ดูแลระบบ"
          className="flex-1 p-3 space-y-1 overflow-y-auto"
        >
          {isOpen && (
            <p className="text-[11px] font-bold
              text-slate-500 uppercase
              px-3 pt-2 pb-1"
            >
              จัดการระบบ
            </p>
          )}

          {adminMenus.map(renderMenu)}

          <div className="border-t border-slate-700 my-3" />

          {isOpen && (
            <p className="text-[11px] font-bold
              text-slate-500 uppercase
              px-3 pt-2 pb-1"
            >
              ระบบเช็คชื่อและกิจกรรม
            </p>
          )}

          {activityMenus.map(renderMenu)}
        </nav>

        {/* กลับหน้าหลัก */}
        <div className="p-3 border-t border-slate-800">
          <Link
            href="/"
            title="กลับหน้าหลัก"
            aria-label="กลับหน้าหลัก"
            className={`flex items-center gap-3
              px-3 py-3 rounded-xl
              text-sm font-bold
              text-slate-300 hover:text-white
              hover:bg-slate-800 transition-all
              ${!isOpen ? "justify-center" : ""}`}
          >
            <span className="text-lg shrink-0">
              🏠
            </span>

            {isOpen && (
              <span>กลับหน้าหลัก</span>
            )}
          </Link>
        </div>
      </aside>

      {/* เนื้อหาหน้า Admin */}
      <main className="flex-1 min-w-0 p-6 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
