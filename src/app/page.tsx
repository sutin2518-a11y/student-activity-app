"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function HomePage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800 pb-10 relative overflow-x-hidden">
      
      {/* 🟢 Sidebar (เมนูด้านข้าง) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl transform transition-transform duration-300 flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="bg-red-800 text-white p-5 flex justify-between items-center">
          <div>
            <h2 className="font-bold text-lg">เมนูทั้งหมด</h2>
            <p className="text-xs text-red-200">งานกิจกรรมพัฒนาผู้เรียน</p>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="text-white hover:bg-red-700 p-2 rounded-lg text-xl">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-1 font-semibold text-sm">
          <Link href="/" className="flex items-center gap-3 p-3 bg-red-50 text-red-700 rounded-xl"><span className="text-xl">🏠</span> หน้าหลัก</Link>
          <Link href="#" className="flex items-center gap-3 p-3 hover:bg-slate-50 text-slate-700 rounded-xl transition"><span className="text-xl">👥</span> กิจกรรมชุมนุม</Link>
          <Link href="#" className="flex items-center gap-3 p-3 hover:bg-slate-50 text-slate-700 rounded-xl transition"><span className="text-xl">👮</span> กิจกรรมในเครื่องแบบ</Link>
          <Link href="#" className="flex items-center gap-3 p-3 hover:bg-slate-50 text-slate-700 rounded-xl transition"><span className="text-xl">🤝</span> กิจกรรมเพื่อสังคมฯ</Link>
          <Link href="#" className="flex items-center gap-3 p-3 hover:bg-slate-50 text-slate-700 rounded-xl transition"><span className="text-xl">🧭</span> กิจกรรมแนะแนว</Link>
          <div className="border-t border-slate-100 my-2"></div>
          <Link href="#" className="flex items-center gap-3 p-3 hover:bg-slate-50 text-slate-700 rounded-xl transition"><span className="text-xl">📢</span> ข่าวประชาสัมพันธ์</Link>
          <Link href="#" className="flex items-center gap-3 p-3 hover:bg-slate-50 text-slate-700 rounded-xl transition"><span className="text-xl">📅</span> ปฏิทินกิจกรรม</Link>
          <Link href="#" className="flex items-center gap-3 p-3 hover:bg-slate-50 text-slate-700 rounded-xl transition"><span className="text-xl">📄</span> เอกสาร / ดาวน์โหลด</Link>
        </div>
        <div className="p-4 border-t border-slate-100">
          <Link href="/login" className="flex items-center justify-center gap-2 w-full p-3 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition">
            <span>👤</span> เข้าสู่ระบบ
          </Link>
        </div>
      </div>

      {/* 🔴 ส่วนหัว (Header Banner) - แบบใช้รูปภาพที่มีข้อความในตัว */}
      <header className="relative w-full h-[160px] md:h-[200px] lg:h-[250px] overflow-hidden shadow-lg flex items-center">
        {/* รูปแบนเนอร์พื้นหลัง (แนะนำขนาด 1200x300) */}
        <Image 
          src="/images/banner.jpg" 
          alt="Header Banner" 
          fill 
          priority
          className="object-cover object-center z-0" 
        />
        
        {/* เงาดำไล่สีเฉพาะฝั่งขวา เพื่อให้กล่อง Login อ่านง่ายขึ้น */}
        <div className="absolute inset-0 bg-gradient-to-l from-black/60 via-transparent to-transparent z-0 hidden md:block"></div>
        
        {/* คอนเทนต์ด้านบน (จัดกล่อง Login ไปไว้ขวาสุด ลบข้อความซ้ายออก) */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 flex justify-end">
          
          {/* 👤 กล่อง User / Login (แสดงเฉพาะหน้าจอใหญ่) */}
          <div className="hidden md:flex flex-col items-center bg-black/40 backdrop-blur-sm p-5 rounded-xl border border-white/20 shadow-xl min-w-[220px]">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl mb-2 shadow-inner">
              👤
            </div>
            <p className="text-white font-bold text-sm mb-1 drop-shadow-md">ผู้เยี่ยมชมทั่วไป</p>
            <p className="text-white/80 text-[11px] mb-3">กรุณาเข้าสู่ระบบเพื่อทำรายการ</p>
            <Link href="/login" className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold rounded-lg transition shadow-md">
              เข้าสู่ระบบ
            </Link>
          </div>

        </div>
      </header>

      {/* ⚪ แถบเมนูนำทาง */}
      <nav className="max-w-7xl mx-auto px-2 md:px-4 -mt-4 relative z-20">
        <div className="bg-white rounded-xl shadow-md p-2 flex items-center overflow-x-auto whitespace-nowrap hide-scrollbar gap-2 text-sm font-bold text-slate-700">
          
          <button 
            onClick={() => setIsSidebarOpen(true)} 
            className="flex items-center justify-center w-10 h-10 bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800 rounded-lg transition mr-1 shrink-0"
            title="เปิดเมนูทั้งหมด"
          >
            <span className="text-xl leading-none">☰</span>
          </button>

          <Link href="/" className="flex items-center gap-2 px-4 py-2 bg-red-800 text-white rounded-lg"><span className="text-lg">🏠</span> หน้าหลัก</Link>
          <Link href="#" className="flex items-center gap-2 px-3 py-2 hover:bg-slate-100 rounded-lg transition"><span className="text-blue-500 text-lg">👥</span> กิจกรรมชุมนุม</Link>
          <Link href="#" className="flex items-center gap-2 px-3 py-2 hover:bg-slate-100 rounded-lg transition"><span className="text-blue-600 text-lg">👮</span> กิจกรรมในเครื่องแบบ</Link>
          <Link href="#" className="flex items-center gap-2 px-3 py-2 hover:bg-slate-100 rounded-lg transition"><span className="text-emerald-500 text-lg">🤝</span> กิจกรรมเพื่อสังคมฯ</Link>
          <Link href="#" className="flex items-center gap-2 px-3 py-2 hover:bg-slate-100 rounded-lg transition"><span className="text-orange-500 text-lg">🧭</span> กิจกรรมแนะแนว</Link>
          <Link href="#" className="flex items-center gap-2 px-3 py-2 hover:bg-slate-100 rounded-lg transition"><span className="text-pink-500 text-lg">📢</span> ข่าวประชาสัมพันธ์</Link>
          
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 mt-6 space-y-6">
        
        {/* 📊 สรุปสถิติรวม */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-white px-6 py-3 rounded-xl shadow-sm border border-slate-200 gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">👥</span>
            <div>
              <p className="text-[10px] text-slate-500 font-bold leading-none mb-1">จำนวนนักเรียนทั้งหมด (ปีการศึกษา 2569)</p>
              <p className="text-lg font-black text-slate-800 leading-none">1,248 <span className="text-[10px] font-normal">คน</span></p>
            </div>
          </div>
          <div className="flex-1 max-w-md w-full">
            <div className="flex justify-between items-end mb-1">
              <p className="text-[10px] font-bold text-slate-700 flex items-center gap-1"><span className="text-red-600">📈</span> สรุปการเข้าร่วมกิจกรรม</p>
              <p className="text-[10px] font-bold text-red-600">95%</p>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div className="bg-red-600 h-2 rounded-full" style={{ width: '95%' }}></div>
            </div>
          </div>
        </div>

        {/* 🟡 1. การ์ดกิจกรรม 4 สี (ดึงรูปพื้นหลัง) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* ชุมนุม */}
          <div className="relative rounded-2xl p-5 border overflow-hidden flex flex-col justify-between shadow-sm bg-[url('/images/club.jpg')] bg-cover bg-center min-h-[200px]">
            <div className="absolute inset-0 bg-black/40 z-0 transition group-hover:bg-black/50"></div>
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-white font-extrabold text-xl drop-shadow-md">กิจกรรมชุมนุม</h3>
                <div className="w-10 h-10 bg-rose-500 text-white rounded-full flex items-center justify-center text-xl shadow-md shrink-0">🎵</div>
              </div>
              <p className="text-white/90 text-xs font-semibold leading-relaxed drop-shadow-md">ค้นหาความสนใจ<br/>พัฒนาความสามารถ<br/>สร้างสรรค์สิ่งใหม่</p>
            </div>
            <div className="relative z-10 mt-4 flex items-end justify-between border-t border-white/20 pt-4">
              <div>
                <p className="text-[10px] text-rose-300 font-bold drop-shadow-sm">สมาชิกลงทะเบียน</p>
                <p className="text-2xl font-black text-white leading-none drop-shadow-md">862 <span className="text-xs font-normal">คน</span></p>
              </div>
              <Link href="/login" className="bg-rose-500 hover:bg-rose-600 text-white text-[11px] font-bold py-2 px-3 rounded-full shadow-sm transition">ข้อมูล ➔</Link>
            </div>
          </div>

          {/* เครื่องแบบ */}
          <div className="relative rounded-2xl p-5 border overflow-hidden flex flex-col justify-between shadow-sm bg-[url('/images/scout.jpg')] bg-cover bg-center min-h-[200px]">
            <div className="absolute inset-0 bg-black/40 z-0"></div>
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-white font-extrabold text-xl leading-tight drop-shadow-md">กิจกรรม<br/>ในเครื่องแบบ</h3>
                <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center text-xl shadow-md shrink-0">👮‍♂️</div>
              </div>
              <p className="text-white/90 text-xs font-semibold leading-relaxed drop-shadow-md">วินัย ความเสียสละ<br/>ความรับผิดชอบ<br/>สู่ความเป็นผู้นำ</p>
            </div>
            <div className="relative z-10 mt-4 flex items-end justify-between border-t border-white/20 pt-4">
              <div>
                <p className="text-[10px] text-blue-300 font-bold drop-shadow-sm">สมาชิกลงทะเบียน</p>
                <p className="text-2xl font-black text-white leading-none drop-shadow-md">934 <span className="text-xs font-normal">คน</span></p>
              </div>
              <Link href="/login" className="bg-blue-500 hover:bg-blue-600 text-white text-[11px] font-bold py-2 px-3 rounded-full shadow-sm transition">ข้อมูล ➔</Link>
            </div>
          </div>

          {/* เพื่อสังคม */}
          <div className="relative rounded-2xl p-5 border overflow-hidden flex flex-col justify-between shadow-sm bg-[url('/images/volunteer.jpg')] bg-cover bg-center min-h-[200px]">
            <div className="absolute inset-0 bg-black/40 z-0"></div>
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-white font-extrabold text-xl leading-tight drop-shadow-md">กิจกรรม<br/>เพื่อสังคมฯ</h3>
                <div className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center text-xl shadow-md shrink-0">🤝</div>
              </div>
              <p className="text-white/90 text-xs font-semibold leading-relaxed drop-shadow-md">จิตอาสา แบ่งปัน<br/>สร้างสังคมที่ดี<br/>เริ่มได้จากเรา</p>
            </div>
            <div className="relative z-10 mt-4 flex items-end justify-between border-t border-white/20 pt-4">
              <div>
                <p className="text-[10px] text-emerald-300 font-bold drop-shadow-sm">สมาชิกลงทะเบียน</p>
                <p className="text-2xl font-black text-white leading-none drop-shadow-md">776 <span className="text-xs font-normal">คน</span></p>
              </div>
              <Link href="/login" className="bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold py-2 px-3 rounded-full shadow-sm transition">ข้อมูล ➔</Link>
            </div>
          </div>

          {/* แนะแนว */}
          <div className="relative rounded-2xl p-5 border overflow-hidden flex flex-col justify-between shadow-sm bg-[url('/images/guidance.jpg')] bg-cover bg-center min-h-[200px]">
            <div className="absolute inset-0 bg-black/40 z-0"></div>
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-white font-extrabold text-xl drop-shadow-md">กิจกรรมแนะแนว</h3>
                <div className="w-10 h-10 bg-orange-500 text-white rounded-full flex items-center justify-center text-xl shadow-md shrink-0">🧭</div>
              </div>
              <p className="text-white/90 text-xs font-semibold leading-relaxed drop-shadow-md">ค้นพบตนเอง<br/>วางแผนอนาคต<br/>สู่เส้นทางที่ใช่</p>
            </div>
            <div className="relative z-10 mt-4 flex items-end justify-between border-t border-white/20 pt-4">
              <div>
                <p className="text-[10px] text-orange-300 font-bold drop-shadow-sm">สมาชิกลงทะเบียน</p>
                <p className="text-2xl font-black text-white leading-none drop-shadow-md">1,102 <span className="text-xs font-normal">คน</span></p>
              </div>
              <Link href="/login" className="bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-bold py-2 px-3 rounded-full shadow-sm transition">ข้อมูล ➔</Link>
            </div>
          </div>

        </div>

        {/* 📰 2. คอลัมน์ด้านล่าง 3 ส่วน */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-2">
          {/* ข่าวประชาสัมพันธ์ */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <span className="text-red-600 text-xl">📢</span> กระดานประชาสัมพันธ์
              </h3>
              <Link href="#" className="text-xs text-blue-600 font-semibold hover:underline">ดูทั้งหมด ➔</Link>
            </div>
            <div className="space-y-3">
              {[
                { type: "ประกาศ", color: "bg-red-600", text: "กำหนดการรับสมัครกิจกรรมชุมนุม ปีการศึกษา 2569", date: "12 ม.ค. 2569" },
                { type: "ข่าวสาร", color: "bg-blue-500", text: "กิจกรรมจิตอาสา \"เชียงคำสะอาด เมืองน่าอยู่\"", date: "10 ม.ค. 2569" },
                { type: "ประชาสัมพันธ์", color: "bg-emerald-500", text: "เปิดรับสมัครชมรมดนตรีสากล", date: "8 ม.ค. 2569" },
                { type: "ประกาศ", color: "bg-red-600", text: "กำหนดการเข้าค่ายลูกเสือ - เนตรนารี ประจำปี 2569", date: "5 ม.ค. 2569" },
                { type: "ข่าวสาร", color: "bg-orange-500", text: "แนะแนวการศึกษาต่อระดับอุดมศึกษา", date: "3 ม.ค. 2569" },
              ].map((news, i) => (
                <div key={i} className="flex gap-3 items-center pb-2 border-b border-slate-50 last:border-0 last:pb-0">
                  <span className={`px-2 py-1 rounded-md text-[10px] font-bold text-white w-20 text-center shrink-0 ${news.color}`}>{news.type}</span>
                  <p className="text-xs text-slate-700 hover:text-red-600 cursor-pointer flex-1 truncate">{news.text}</p>
                  <span className="text-[9px] text-slate-400 shrink-0">{news.date}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ปฏิทินกิจกรรม */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <span className="text-red-600 text-xl">📅</span> ปฏิทินกิจกรรม
              </h3>
              <Link href="#" className="text-xs text-blue-600 font-semibold hover:underline">ดูทั้งหมด ➔</Link>
            </div>
            <div className="space-y-3">
              {[
                { day: "15", m: "ม.ค.", title: "อบรมแกนนำสภานักเรียน", loc: "หอประชุมโรงเรียน" },
                { day: "20", m: "ม.ค.", title: "กิจกรรมจิตอาสาพัฒนาชุมชน", loc: "ชุมชนในอำเภอเชียงคำ" },
                { day: "28", m: "ม.ค.", title: "การประชุมคณะกรรมการชุมนุม", loc: "ห้องประชุม 1" },
                { day: "5", m: "ก.พ.", title: "แนะแนวศึกษาต่อ ม.6", loc: "หอประชุมโรงเรียน" },
              ].map((cal, i) => (
                <div key={i} className="flex gap-4 items-center pb-2 border-b border-slate-50 last:border-0 last:pb-0">
                  <div className="text-center shrink-0">
                    <p className="text-lg font-black text-red-600 leading-none">{cal.day}</p>
                    <p className="text-[10px] text-slate-500 font-bold">{cal.m}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700">{cal.title}</p>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5"><span className="text-blue-500">📍</span> {cal.loc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ลิงก์ที่เกี่ยวข้อง */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <span className="text-slate-600 text-xl">🔗</span> ลิงก์ที่เกี่ยวข้อง
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <Link href="#" className="flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-2.5 rounded-lg border border-blue-100 hover:bg-blue-100 transition">
                <span className="text-base">📄</span> ดาวน์โหลดเอกสาร
              </Link>
              <Link href="#" className="flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-2.5 rounded-lg border border-blue-100 hover:bg-blue-100 transition">
                <span className="text-base">📖</span> ระเบียบ / แนวปฏิบัติ
              </Link>
              <Link href="#" className="flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-2.5 rounded-lg border border-blue-100 hover:bg-blue-100 transition">
                <span className="text-base">📋</span> แบบฟอร์มต่างๆ
              </Link>
              <Link href="#" className="flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-2.5 rounded-lg border border-blue-100 hover:bg-blue-100 transition">
                <span className="text-base">✉️</span> ติดต่อเรา
              </Link>
            </div>
            <Link href="/login" className="mt-auto group bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-4 flex items-center justify-between text-white hover:from-slate-700 hover:to-slate-600 transition shadow-md">
              <div>
                <p className="font-bold text-sm">ร่วมกิจกรรม สร้างประสบการณ์</p>
                <p className="text-xs text-slate-300 mt-1">พัฒนาตนเอง สู่อนาคตที่ดีกว่า</p>
              </div>
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center group-hover:translate-x-1 transition-transform">➔</div>
            </Link>
          </div>
        </div>
      </main>

      {/* 🛑 Footer */}
      <div className="mt-10 bg-red-800 text-white py-3 px-4 text-center text-xs font-medium flex flex-col md:flex-row justify-between items-center max-w-7xl mx-auto rounded-t-xl opacity-90">
        <p>"เชื่อมต่อกิจกรรม สร้างโอกาส พัฒนานักเรียนสู่สังคมที่ยั่งยืน"</p>
        <p className="mt-1 md:mt-0">งานกิจกรรมพัฒนาผู้เรียน โรงเรียนเชียงคำวิทยาคม</p>
      </div>

    </div>
  );
}