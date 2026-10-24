"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function HomePage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 font-sans relative overflow-x-hidden">
      
      {/* 🟢 แถบเมนูด้านข้าง (Sidebar) - ซ่อนไว้เปิดด้วยปุ่ม ☰ */}
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
          <Link href="/login" className="block px-4 py-3 hover:bg-slate-800 rounded-xl transition">🔑 เข้าสู่ระบบ</Link>
          <Link href="/admin" className="block px-4 py-3 hover:bg-slate-800 rounded-xl transition">⚙️ ระบบ Admin</Link>
          <Link href="/admin/uniform-import" className="block px-4 py-3 hover:bg-slate-800 rounded-xl transition">📥 นำเข้าเครื่องแบบ (CSV)</Link>
          <Link href="/teacher/club/import" className="block px-4 py-3 hover:bg-slate-800 rounded-xl transition">🏫 นำเข้าชุมนุม (CSV)</Link>
        </nav>
      </div>

      {/* ฉากหลังสีดำทึบแสงเมื่อเปิด Sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* 🔵 แถบด้านบนสุด (Header Top Bar) */}
      <div className="bg-white px-4 py-3 flex items-center justify-between shadow-sm relative z-40 border-b border-slate-100">
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
        <div>
          <Link href="/login" className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-full font-bold text-sm hover:bg-blue-100 transition">
            <span>👤</span> เข้าสู่ระบบ
          </Link>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 relative z-10">
        
        {/* 🟡 1. Hero Banner ส่วนต้อนรับ */}
        <div className="relative bg-gradient-to-r from-blue-100 via-white to-blue-50 rounded-3xl overflow-hidden shadow-sm h-[280px] md:h-[320px] flex items-center border border-blue-100/50">
          <div className="relative z-10 p-8 md:p-16 w-full text-center md:text-left">
            <h2 className="text-3xl md:text-5xl font-extrabold text-blue-900 tracking-tight">
              กิจกรรมพัฒนาผู้เรียน
            </h2>
            <h3 className="text-xl md:text-2xl font-bold text-slate-700 mt-2">
              โรงเรียนเชียงคำวิทยาคม
            </h3>
            <p className="mt-4 text-blue-600 font-medium text-base md:text-lg">
              สร้างประสบการณ์ ✨ สร้างเพื่อน 🤝 สร้างอนาคต 🚀
            </p>
          </div>
        </div>

        {/* 🔴 2. แถบสถิติ 3 กล่อง และปุ่มสมัคร (ปรับปรุงใหม่ตามเงื่อนไข) */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-4 md:p-6 -mt-16 relative z-20 flex flex-col xl:flex-row items-center justify-between gap-6 border border-slate-100">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full xl:w-auto divide-y md:divide-y-0 md:divide-x divide-slate-100">
            
            {/* กล่องที่ 1: นักเรียนทั้งหมด */}
            <div className="flex items-center gap-4 pt-2 md:pt-0">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl shrink-0">👥</div>
              <div>
                <p className="text-xs text-slate-500 font-medium">จำนวนนักเรียนทั้งหมด</p>
                <p className="text-xl font-bold text-blue-600">1,256 <span className="text-xs text-slate-500 font-normal">คน</span></p>
              </div>
            </div>

            {/* กล่องที่ 2: กิจกรรมชุมนุม */}
            <div className="flex items-center gap-4 pt-4 md:pt-0 md:pl-6">
              <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-2xl shrink-0">🎸</div>
              <div>
                <p className="text-xs text-slate-500 font-medium">กิจกรรมชุมนุม</p>
                <div className="flex items-center gap-2 text-xs font-bold mt-1">
                  <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">สมัครแล้ว 1,084</span>
                  <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">ยังไม่ลง 172</span>
                </div>
              </div>
            </div>

            {/* กล่องที่ 3: กิจกรรมเครื่องแบบ (เฉพาะ ม.ต้น) */}
            <div className="flex items-center gap-4 pt-4 md:pt-0 md:pl-6">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-2xl shrink-0">🏕️</div>
              <div>
                <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                  กิจกรรมเครื่องแบบ
                  <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded font-semibold">(ม.ต้น)</span>
                </p>
                <div className="flex items-center gap-2 text-xs font-bold mt-1">
                  <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">สมัครแล้ว 580</span>
                  <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">ยังไม่ลง 45</span>
                </div>
              </div>
            </div>

          </div>
          
          {/* ปุ่มสมัคร */}
          <Link href="/login" className="w-full xl:w-auto bg-rose-500 hover:bg-rose-600 text-white px-6 py-3.5 rounded-full font-bold text-base shadow-lg shadow-rose-500/30 transition-all text-center flex items-center justify-center gap-2 shrink-0">
            ⭐ สมัครเข้าร่วมกิจกรรม ➔
          </Link>

        </div>

        {/* 🟢 3. กล่องเมนูกิจกรรม 4 สี */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link href="/login" className="group bg-gradient-to-br from-rose-400 to-rose-600 rounded-3xl p-6 text-white shadow-lg hover:shadow-xl transition-all relative overflow-hidden h-40 flex flex-col justify-between">
            <div className="relative z-10">
              <h3 className="font-bold text-xl">ชุมนุม</h3>
              <p className="text-rose-100 text-xs mt-1">ค้นหาความสนใจ พัฒนาทักษะ</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-1.5 inline-flex items-center justify-between w-max gap-3 z-10">
              <span className="text-xs font-semibold">สมาชิก 432 คน</span>
              <span>➔</span>
            </div>
            <div className="absolute -right-4 -bottom-4 text-8xl opacity-20">🎸</div>
          </Link>

          <Link href="/login" className="group bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-3xl p-6 text-white shadow-lg hover:shadow-xl transition-all relative overflow-hidden h-40 flex flex-col justify-between">
            <div className="relative z-10">
              <h3 className="font-bold text-xl">กิจกรรมเครื่องแบบ</h3>
              <p className="text-emerald-100 text-xs mt-1">ระเบียบ วินัย ความเป็นผู้นำ</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-1.5 inline-flex items-center justify-between w-max gap-3 z-10">
              <span className="text-xs font-semibold">สมาชิก 368 คน</span>
              <span>➔</span>
            </div>
            <div className="absolute -right-4 -bottom-4 text-8xl opacity-20">🏕️</div>
          </Link>

          <Link href="/login" className="group bg-gradient-to-br from-blue-400 to-blue-600 rounded-3xl p-6 text-white shadow-lg hover:shadow-xl transition-all relative overflow-hidden h-40 flex flex-col justify-between">
            <div className="relative z-10">
              <h3 className="font-bold text-xl">กิจกรรมเพื่อสังคม</h3>
              <p className="text-blue-100 text-xs mt-1">จิตอาสา สาธารณประโยชน์</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-1.5 inline-flex items-center justify-between w-max gap-3 z-10">
              <span className="text-xs font-semibold">สมาชิก 256 คน</span>
              <span>➔</span>
            </div>
            <div className="absolute -right-4 -bottom-4 text-8xl opacity-20">🤝</div>
          </Link>

          <Link href="/login" className="group bg-gradient-to-br from-purple-400 to-purple-600 rounded-3xl p-6 text-white shadow-lg hover:shadow-xl transition-all relative overflow-hidden h-40 flex flex-col justify-between">
            <div className="relative z-10">
              <h3 className="font-bold text-xl">งานแนะแนว</h3>
              <p className="text-purple-100 text-xs mt-1">ค้นพบตัวเอง สู่เส้นทางอนาคต</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-1.5 inline-flex items-center justify-between w-max gap-3 z-10">
              <span className="text-xs font-semibold">สมาชิก 28 คน</span>
              <span>➔</span>
            </div>
            <div className="absolute -right-4 -bottom-4 text-8xl opacity-20">🎓</div>
          </Link>
        </div>

        {/* 🟣 4. ส่วนข่าวสาร, ปฏิทินกิจกรรม และ รูปภาพกราฟิกด้านล่าง */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* กล่องข่าวสาร */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-base flex items-center gap-2 text-slate-800">
                <span className="text-rose-500">📢</span> ประกาศ/ข่าวสาร
              </h3>
              <Link href="/login" className="text-xs text-blue-600 hover:underline">ดูทั้งหมด ➔</Link>
            </div>
            <div className="space-y-3">
              {[
                { tag: "ด่วน", color: "bg-rose-500", text: "เปิดรับสมัครสมาชิกชุมนุม ประจำภาคเรียนที่ 1/2569", date: "12 พ.ย. 2569" },
                { tag: "ใหม่", color: "bg-blue-500", text: "กิจกรรมจิตอาสา ทำความสะอาดโรงเรียน", date: "10 พ.ย. 2569" },
                { tag: "ประชาสัมพันธ์", color: "bg-emerald-500", text: "ตารางกิจกรรมเครื่องแบบ ประจำเดือนพฤศจิกายน", date: "8 พ.ย. 2569" },
              ].map((news, i) => (
                <div key={i} className="flex gap-3 items-start pb-3 border-b border-slate-50 last:border-0 last:pb-0">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white whitespace-nowrap mt-0.5 ${news.color}`}>{news.tag}</span>
                  <div>
                    <p className="text-xs text-slate-700 hover:text-blue-600 cursor-pointer font-medium leading-relaxed">{news.text}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{news.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* กล่องปฏิทินกิจกรรม */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-base flex items-center gap-2 text-slate-800">
                <span className="text-rose-500">📅</span> ปฏิทินกิจกรรม
              </h3>
              <Link href="/login" className="text-xs text-blue-600 hover:underline">ดูทั้งหมด ➔</Link>
            </div>
            <div className="space-y-3">
              {[
                { day: "15", m: "พ.ย.", title: "อบรมผู้นำเยาวชน (กิจกรรมเครื่องแบบ)", loc: "หอประชุมโรงเรียน", color: "text-emerald-500" },
                { day: "18", m: "พ.ย.", title: "กิจกรรมจิตอาสา ปลูกต้นไม้", loc: "บริเวณโรงเรียน", color: "text-blue-500" },
                { day: "22", m: "พ.ย.", title: "แนะแนว TCAS และอาชีพในอนาคต", loc: "หอประชุมโรงเรียน", color: "text-purple-500" },
              ].map((cal, i) => (
                <div key={i} className="flex gap-3 items-center p-2 rounded-xl hover:bg-slate-50 transition cursor-pointer">
                  <div className="text-center w-10 bg-slate-100 rounded-lg py-1">
                    <p className="text-base font-black text-slate-800 leading-none">{cal.day}</p>
                    <p className="text-[9px] text-slate-500 font-bold">{cal.m}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700"><span className={cal.color}>●</span> {cal.title}</p>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5"><span>📍</span> {cal.loc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* กล่องกราฟิกสีเหลือง */}
          <div className="bg-gradient-to-br from-amber-400 to-amber-500 rounded-3xl shadow-sm p-6 flex flex-col justify-center items-center text-center relative overflow-hidden min-h-[220px]">
             <div className="relative z-10 space-y-3">
                <h3 className="text-2xl font-black text-amber-950 leading-snug">
                  " เพื่อนกัน <br/> กิจกรรมดี ๆ <br/> ที่เชียงคำวิทยาคม "
                </h3>
                <p className="text-amber-900 font-semibold bg-amber-300/60 px-4 py-1.5 rounded-full text-xs backdrop-blur-sm inline-block">
                  ✨ More Than a School
                </p>
             </div>
          </div>

        </div>
      </main>
    </div>
  );
}