"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function HomePage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 font-sans relative overflow-x-hidden">
      
      {/* 🟢 แถบเมนูด้านข้าง (Sidebar) - ซ่อนไว้เป็นค่าเริ่มต้น */}
      <div 
        className={`fixed inset-y-0 left-0 z-[60] w-72 bg-slate-900 text-white shadow-2xl transform transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-5 border-b border-slate-800 flex justify-between items-center">
          <span className="font-bold text-lg">เมนูหลัก</span>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full transition text-slate-300 hover:text-white"
          >
            ✕
          </button>
        </div>
        <nav className="p-4 space-y-2">
          <Link href="/" className="block px-4 py-3 bg-blue-600 rounded-xl font-bold shadow-md">🏠 หน้าแรก</Link>
          <Link href="/admin" className="block px-4 py-3 hover:bg-slate-800 rounded-xl transition">⚙️ ระบบ Admin</Link>
          <Link href="/admin/uniform-import" className="block px-4 py-3 hover:bg-slate-800 rounded-xl transition">📥 นำเข้าเครื่องแบบ (CSV)</Link>
          <Link href="/teacher/club/import" className="block px-4 py-3 hover:bg-slate-800 rounded-xl transition">🏫 นำเข้าชุมนุม (CSV)</Link>
        </nav>
        <div className="absolute bottom-5 left-0 w-full px-4">
          <Link href="/login" className="block w-full text-center py-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition font-bold text-blue-400">
            เข้าสู่ระบบ ➔
          </Link>
        </div>
      </div>

      {/* ฉากหลังสีดำจางๆ เวลาเปิด Sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* 🔵 แถบด้านบนสุด (Top Bar) สำหรับเรียก Sidebar */}
      <div className="bg-white px-4 py-3 flex items-center justify-between shadow-sm relative z-40">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
            title="เปิดเมนู"
          >
            <span className="text-2xl leading-none">☰</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center text-xl">🏛️</div>
            <div>
              <h1 className="font-bold text-slate-800 leading-tight">โรงเรียนเชียงคำวิทยาคม</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Chiangkhamwittayakhom School</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="hidden sm:flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-full font-bold text-sm hover:bg-blue-100 transition">
            <span className="text-lg">👤</span> เข้าสู่ระบบ
          </Link>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 relative z-10">
        
        {/* 🟡 1. Hero Banner ส่วนต้อนรับ */}
        <div className="relative bg-gradient-to-r from-blue-100 via-white to-blue-50 rounded-3xl overflow-hidden shadow-sm h-[320px] flex items-center border border-blue-100/50">
          <div className="relative z-10 p-8 md:p-16 w-full text-center md:text-left">
            <h2 className="text-4xl md:text-6xl font-extrabold text-blue-900 tracking-tight drop-shadow-sm">
              กิจกรรมพัฒนาผู้เรียน
            </h2>
            <h3 className="text-2xl md:text-3xl font-bold text-slate-700 mt-2">
              โรงเรียนเชียงคำวิทยาคม
            </h3>
            <p className="mt-4 text-blue-600 font-medium text-lg">
              สร้างประสบการณ์ ✨ สร้างเพื่อน 🤝 สร้างอนาคต 🚀
            </p>
          </div>
        </div>

        {/* 🔴 2. แถบสถิติและปุ่มสมัคร */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-4 md:p-6 -mt-16 relative z-20 flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-100">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-3xl">👥</div>
              <div>
                <p className="text-sm text-slate-500 font-medium">จำนวนนักเรียนทั้งหมด</p>
                <p className="text-2xl font-bold text-blue-600">1,256 <span className="text-sm text-slate-500 font-normal">คน</span></p>
              </div>
            </div>
            <div className="hidden md:block w-px h-12 bg-slate-200"></div>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl">🎯</div>
              <div>
                <p className="text-sm text-slate-500 font-medium">เข้าร่วมอย่างน้อย 1 กิจกรรม</p>
                <p className="text-2xl font-bold text-emerald-600">1,084 <span className="text-sm text-slate-500 font-normal">คน</span></p>
              </div>
            </div>
          </div>
          
          <Link href="/login" className="w-full md:w-auto bg-rose-500 hover:bg-rose-600 text-white px-8 py-4 rounded-full font-bold text-lg shadow-lg shadow-rose-500/30 transition-all text-center flex items-center justify-center gap-2">
            ⭐ สมัครเข้าร่วมกิจกรรม ➔
          </Link>
        </div>

        {/* 🟢 3. กล่องเมนูกิจกรรม 4 สี */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link href="/login" className="group bg-gradient-to-br from-rose-400 to-rose-600 rounded-3xl p-6 text-white shadow-lg hover:shadow-xl transition-all relative overflow-hidden h-40 flex flex-col justify-between">
            <div className="relative z-10">
              <h3 className="font-bold text-xl">ชุมนุม</h3>
              <p className="text-rose-100 text-sm">ค้นหาความสนใจ พัฒนาทักษะ</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 inline-flex items-center justify-between w-max gap-4 z-10">
              <span className="text-sm font-semibold">สมาชิก 432 คน</span>
              <span>➔</span>
            </div>
            <div className="absolute -right-4 -bottom-4 text-8xl opacity-20">🎸</div>
          </Link>

          <Link href="/login" className="group bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-3xl p-6 text-white shadow-lg hover:shadow-xl transition-all relative overflow-hidden h-40 flex flex-col justify-between">
            <div className="relative z-10">
              <h3 className="font-bold text-xl">กิจกรรมเครื่องแบบ</h3>
              <p className="text-emerald-100 text-sm">ระเบียบ วินัย ความเป็นผู้นำ</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 inline-flex items-center justify-between w-max gap-4 z-10">
              <span className="text-sm font-semibold">สมาชิก 368 คน</span>
              <span>➔</span>
            </div>
            <div className="absolute -right-4 -bottom-4 text-8xl opacity-20">🏕️</div>
          </Link>

          <Link href="/login" className="group bg-gradient-to-br from-blue-400 to-blue-600 rounded-3xl p-6 text-white shadow-lg hover:shadow-xl transition-all relative overflow-hidden h-40 flex flex-col justify-between">
            <div className="relative z-10">
              <h3 className="font-bold text-xl">กิจกรรมเพื่อสังคม</h3>
              <p className="text-blue-100 text-sm">จิตอาสา สาธารณประโยชน์</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 inline-flex items-center justify-between w-max gap-4 z-10">
              <span className="text-sm font-semibold">สมาชิก 256 คน</span>
              <span>➔</span>
            </div>
            <div className="absolute -right-4 -bottom-4 text-8xl opacity-20">🤝</div>
          </Link>

          <Link href="/login" className="group bg-gradient-to-br from-purple-400 to-purple-600 rounded-3xl p-6 text-white shadow-lg hover:shadow-xl transition-all relative overflow-hidden h-40 flex flex-col justify-between">
            <div className="relative z-10">
              <h3 className="font-bold text-xl">งานแนะแนว</h3>
              <p className="text-purple-100 text-sm">ค้นพบตัวเอง สู่เส้นทางอนาคต</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 inline-flex items-center justify-between w-max gap-4 z-10">
              <span className="text-sm font-semibold">สมาชิก 28 คน</span>
              <span>➔</span>
            </div>
            <div className="absolute -right-4 -bottom-4 text-8xl opacity-20">🎓</div>
          </Link>
        </div>

      </main>
    </div>
  );
}