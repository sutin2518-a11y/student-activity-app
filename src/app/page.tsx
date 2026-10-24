"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function HomePage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // 📌 ข้อมูลสำหรับการ์ดกิจกรรมทั้ง 4 หมวดหมู่
  const activities = [
    {
      title: "ชุมนุม",
      members: "862",
      image: "/images/club.jpg", 
      bgColor: "bg-red-500",
      textColor: "text-red-500",
      icon: "👥",
      link: "#" 
    },
    {
      title: "กิจกรรมเครื่องแบบ",
      members: "934",
      image: "/images/scout.jpg",
      bgColor: "bg-blue-500",
      textColor: "text-blue-500",
      icon: "🎓",
      link: "#"
    },
    {
      title: "กิจกรรมเพื่อสังคม\nและสาธารณประโยชน์",
      members: "776",
      image: "/images/volunteer.jpg",
      bgColor: "bg-emerald-500",
      textColor: "text-emerald-500",
      icon: "🌱",
      link: "#"
    },
    {
      title: "งานแนะแนว",
      members: "1,102",
      image: "/images/guidance.jpg",
      bgColor: "bg-amber-500",
      textColor: "text-amber-500",
      icon: "🧭",
      link: "#"
    }
  ];

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

      {/* 🔴 ส่วนหัว (Header Banner) */}
      <header className="relative w-full h-[160px] md:h-[200px] lg:h-[240px] overflow-hidden shadow-lg flex">
        {/* รูปแบนเนอร์พื้นหลัง */}
        <Image 
          src="/images/banner.jpg" 
          alt="Header Banner" 
          fill 
          priority
          className="object-cover object-center z-0" 
        />
        
        {/* เงาดำไล่สี */}
        <div className="absolute inset-0 bg-gradient-to-l from-black/40 via-transparent to-transparent z-0 hidden md:block"></div>
        
        {/* คอนเทนต์ด้านบน จัดให้อยู่มุมขวาบน และดันชิดขอบบน (ใช้ pt-2 md:pt-3 แทนของเดิม) */}
        <div className="relative z-10 w-full h-full max-w-7xl mx-auto px-4 flex justify-end items-start pt-2 md:pt-3">
          
          {/* 👤 กล่อง User / Login - เปลี่ยนพื้นหลังเป็นสีสว่างสดใส (ขาวโปร่งแสง) */}
          <div className="hidden md:flex items-center bg-white/95 backdrop-blur-md pl-2 pr-2 py-1.5 rounded-full border border-white/50 shadow-xl gap-3">
            
            {/* ไอคอน / รูปโปรไฟล์ */}
            <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm shadow-inner shrink-0">
              👤
            </div>
            
            {/* ข้อความชื่อผู้ใช้ (สีเทาเข้ม) */}
            <div className="flex flex-col justify-center">
              <span className="text-slate-800 font-extrabold text-xs">ผู้เยี่ยมชมทั่วไป</span>
            </div>

            {/* ปุ่มเข้าสู่ระบบ */}
            <Link href="/login" className="ml-1 px-4 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-slate-900 text-xs font-bold rounded-full transition shadow-md whitespace-nowrap">
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

        {/* 🟡 1. การ์ดกิจกรรม 4 สี (ดีไซน์ใหม่ - ย่อขนาดด้านล่าง) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {activities.map((item, index) => (
            <Link href={item.link} key={index} className={`relative rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col ${item.bgColor}`}>
              
              {/* 🖼️ รูปภาพครึ่งบน */}
              <div className="relative w-full h-40 bg-gray-200 shrink-0">
                <Image 
                  src={item.image} 
                  alt={item.title} 
                  fill 
                  className="object-cover"
                />
              </div>

              {/* 🎯 ไอคอนวงกลมทับเส้นรอยต่อ */}
              <div className={`absolute top-40 -translate-y-1/2 left-4 w-12 h-12 rounded-full ${item.bgColor} flex items-center justify-center text-white border-2 border-white/20 shadow-sm z-10 text-xl`}>
                {item.icon}
              </div>

              {/* 📝 เนื้อหาครึ่งล่าง (จัดข้อความและลูกศรให้อยู่บรรทัดเดียวกัน) */}
              <div className="px-5 pt-8 pb-4 text-white flex justify-between items-center gap-2">
                <div className="flex-1">
                  <h3 className="font-bold text-[15px] xl:text-lg leading-tight mb-1 whitespace-pre-line">{item.title}</h3>
                  <p className="text-xs text-white/90">สมาชิก {item.members} คน</p>
                </div>
                
                {/* ➡️ ปุ่มลูกศรวงกลม */}
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow hover:scale-110 transition-transform shrink-0">
                  <svg className={`w-4 h-4 ${item.textColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
              </div>

            </Link>
          ))}
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